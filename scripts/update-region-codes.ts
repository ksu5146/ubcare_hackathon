import fs from 'fs';
import path from 'path';
import { createClient } from '@libsql/client';

const DB_URL = process.env.TURSO_DATABASE_URL
  || `file:${process.env.SQLITE_DB_PATH || path.resolve('./real-estate.db')}`;
const JSON_PATH = path.resolve('./src/data/region-codes.json');

const db = createClient({
  url: DB_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

interface RegionEntry {
  code: string;
  name: string;
  children?: RegionEntry[];
}

// Read existing
const existing: RegionEntry[] = JSON.parse(fs.readFileSync(JSON_PATH, 'utf-8'));

// Extract dong data for 경기(41) and 인천(28)
const rowsResult = await db.execute({
  sql: `
    SELECT DISTINCT substr(bjd_code, 1, 2) as sido,
      substr(bjd_code, 1, 5) as sigungu_code,
      as1, as2, as3, bjd_code
    FROM complexes
    WHERE as3 IS NOT NULL AND as3 != ''
      AND substr(bjd_code, 1, 2) IN ('41', '28')
    ORDER BY bjd_code
  `,
  args: [],
});
const rows = rowsResult.rows as unknown as Array<{
  sido: string;
  sigungu_code: string;
  as1: string;
  as2: string;
  as3: string;
  bjd_code: string;
}>;

// Group: sigungu_code -> { name, dongs }
const sigunguMap: Record<string, { name: string; dongs: Map<string, string> }> = {};

for (const r of rows) {
  if (!sigunguMap[r.sigungu_code]) {
    sigunguMap[r.sigungu_code] = { name: r.as2, dongs: new Map() };
  }
  if (!sigunguMap[r.sigungu_code].dongs.has(r.as3)) {
    sigunguMap[r.sigungu_code].dongs.set(r.as3, r.bjd_code);
  }
}

function buildSidoChildren(sidoCode: string): RegionEntry[] {
  const children: RegionEntry[] = [];
  for (const [code, data] of Object.entries(sigunguMap)) {
    if (code.startsWith(sidoCode)) {
      children.push({
        code,
        name: data.name,
        children: Array.from(data.dongs.entries())
          .sort((a, b) => a[1].localeCompare(b[1]))
          .map(([name, bjd]) => ({ code: bjd, name })),
      });
    }
  }
  return children.sort((a, b) => a.code.localeCompare(b.code));
}

// Update
for (const entry of existing) {
  if (entry.code === '41') {
    entry.children = buildSidoChildren('41');
    console.log(`경기도: ${entry.children.length} 시/군/구`);
  } else if (entry.code === '28') {
    entry.children = buildSidoChildren('28');
    console.log(`인천광역시: ${entry.children.length} 구/군`);
  }
}

fs.writeFileSync(JSON_PATH, JSON.stringify(existing, null, 2) + '\n');
console.log('region-codes.json updated');

// Verify
const updated: RegionEntry[] = JSON.parse(fs.readFileSync(JSON_PATH, 'utf-8'));
for (const entry of updated) {
  if (['11', '28', '41'].includes(entry.code)) {
    const dongCount = (entry.children ?? []).reduce(
      (sum, c) => sum + (c.children?.length ?? 0), 0,
    );
    console.log(`${entry.name}: ${entry.children?.length ?? 0} 시/군/구, ${dongCount} 동`);
  }
}

db.close();
