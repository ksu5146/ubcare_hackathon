/**
 * 로컬 SQLite DB → Turso 마이그레이션 스크립트
 *
 * Usage: node --use-system-ca scripts/migrate-to-turso.mjs
 */
import { createClient } from '@libsql/client';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', 'real-estate.db');

const TURSO_URL = process.env.TURSO_DATABASE_URL;
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN;

if (!TURSO_URL || !TURSO_TOKEN) {
  console.error('TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be set');
  process.exit(1);
}

// 로컬 DB (better-sqlite3로 읽기 전용)
const local = new Database(DB_PATH, { readonly: true });

// Turso 원격 DB
const remote = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });

// 마이그레이션할 테이블 목록 (순서 중요 — 외래키 의존성)
const TABLES = [
  'complexes',
  'trades',
  'collection_state',
  'geocode_cache',
  'seoul_apt_info',
  'building_ledger',
  'land_use_regulation',
  'trade_complex_map',
];

async function getTableSchema(tableName) {
  const row = local.prepare(
    `SELECT sql FROM sqlite_master WHERE type='table' AND name=?`
  ).get(tableName);
  return row?.sql || null;
}

async function getIndexSchemas(tableName) {
  const rows = local.prepare(
    `SELECT sql FROM sqlite_master WHERE type='index' AND tbl_name=? AND sql IS NOT NULL`
  ).all(tableName);
  return rows.map(r => r.sql);
}

async function migrateTable(tableName) {
  const schema = await getTableSchema(tableName);
  if (!schema) {
    console.log(`  ⚠ Table ${tableName} not found locally, skipping`);
    return;
  }

  // 1. Create table
  console.log(`  Creating table ${tableName}...`);
  await remote.execute(`DROP TABLE IF EXISTS ${tableName}`);
  await remote.execute(schema);

  // 2. Count rows
  const countRow = local.prepare(`SELECT COUNT(*) as cnt FROM ${tableName}`).get();
  const totalRows = countRow.cnt;
  console.log(`  Total rows: ${totalRows.toLocaleString()}`);

  if (totalRows === 0) return;

  // 3. Get columns
  const columns = local.prepare(`PRAGMA table_info(${tableName})`).all();
  const colNames = columns.map(c => c.name);
  const placeholders = colNames.map(() => '?').join(', ');
  const insertSql = `INSERT OR IGNORE INTO ${tableName} (${colNames.join(', ')}) VALUES (${placeholders})`;

  // 4. Batch insert
  const BATCH_SIZE = 100;
  let offset = 0;
  let inserted = 0;

  while (offset < totalRows) {
    const rows = local.prepare(
      `SELECT * FROM ${tableName} LIMIT ${BATCH_SIZE} OFFSET ${offset}`
    ).all();

    if (rows.length === 0) break;

    const statements = rows.map(row => ({
      sql: insertSql,
      args: colNames.map(col => row[col] ?? null),
    }));

    try {
      await remote.batch(statements, 'write');
      inserted += rows.length;
    } catch (err) {
      console.error(`  ✗ Batch error at offset ${offset}: ${err.message}`);
      // 개별 삽입으로 폴백
      for (const stmt of statements) {
        try {
          await remote.execute(stmt);
          inserted++;
        } catch (e) {
          // 개별 에러는 무시 (중복 등)
        }
      }
    }

    offset += BATCH_SIZE;
    if (offset % 5000 === 0 || offset >= totalRows) {
      const pct = Math.min(100, Math.round((offset / totalRows) * 100));
      process.stdout.write(`\r  Progress: ${inserted.toLocaleString()} / ${totalRows.toLocaleString()} (${pct}%)`);
    }
  }

  console.log(`\r  ✓ ${tableName}: ${inserted.toLocaleString()} rows inserted`);
}

async function migrateIndexes() {
  console.log('\nCreating indexes...');
  for (const table of TABLES) {
    const indexes = await getIndexSchemas(table);
    for (const idx of indexes) {
      try {
        await remote.execute(idx);
      } catch (err) {
        // index already exists 등 무시
      }
    }
  }
  console.log('  ✓ Indexes created');
}

async function main() {
  console.log('=== Local SQLite → Turso Migration ===');
  console.log(`Source: ${DB_PATH}`);
  console.log(`Target: ${TURSO_URL}\n`);

  const start = Date.now();

  for (const table of TABLES) {
    await migrateTable(table);
  }

  await migrateIndexes();

  // user tables (from auth.ts)
  const userTables = ['users', 'user_favorites', 'user_comparisons'];
  for (const table of userTables) {
    const schema = await getTableSchema(table);
    if (schema) {
      console.log(`\nMigrating user table: ${table}`);
      await migrateTable(table);
    }
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`\n=== Migration complete in ${elapsed}s ===`);

  local.close();
  remote.close();
}

main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
