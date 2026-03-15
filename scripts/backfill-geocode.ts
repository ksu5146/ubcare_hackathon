/**
 * 기존 complexes 테이블의 도로명주소를 Kakao 지오코딩하여 lat/lng를 채워넣는 스크립트.
 * 이미 좌표가 있는 단지는 건너뛰고, geocode_cache도 동시에 채움.
 *
 * 사용: npx tsx scripts/backfill-geocode.ts
 * 환경변수: KAKAO_REST_API_KEY 필요 (.env.local에서 자동 로드)
 */
import { createClient } from '@libsql/client';
import path from 'path';
import fs from 'fs';

// .env.local 수동 로드
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[key]) process.env[key] = val;
  }
}

const KAKAO_REST_API_KEY = process.env.KAKAO_REST_API_KEY;
if (!KAKAO_REST_API_KEY) {
  console.error('KAKAO_REST_API_KEY 환경변수가 필요합니다 (.env.local)');
  process.exit(1);
}

const KAKAO_API_URL = 'https://dapi.kakao.com/v2/local';
const BATCH_SIZE = 5;     // 동시 요청 수
const BATCH_DELAY = 200;  // 배치 간 딜레이 (ms)

const DB_URL = process.env.TURSO_DATABASE_URL
  || `file:${process.env.SQLITE_DB_PATH || path.join(process.cwd(), 'real-estate.db')}`;

const db = createClient({
  url: DB_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// geocode_cache 테이블 보장
await db.executeMultiple(`
  CREATE TABLE IF NOT EXISTS geocode_cache (
    address TEXT PRIMARY KEY,
    lat     REAL NOT NULL,
    lng     REAL NOT NULL,
    cached_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

interface Row {
  kapt_code: string;
  apt_nm: string;
  road_addr: string | null;
  addr: string | null;
}

async function geocode(address: string): Promise<{ lat: number; lng: number } | null> {
  // 캐시 확인
  const cacheResult = await db.execute({
    sql: 'SELECT lat, lng FROM geocode_cache WHERE address = ?',
    args: [address],
  });
  if (cacheResult.rows.length > 0) {
    const r = cacheResult.rows[0] as unknown as { lat: number; lng: number };
    return r;
  }

  try {
    const url = `${KAKAO_API_URL}/search/address.json?query=${encodeURIComponent(address)}&size=1`;
    const res = await fetch(url, {
      headers: { Authorization: `KakaoAK ${KAKAO_REST_API_KEY}` },
      signal: AbortSignal.timeout(5000),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.documents?.length > 0) {
        const coords = { lat: parseFloat(data.documents[0].y), lng: parseFloat(data.documents[0].x) };
        await db.execute({
          sql: 'INSERT OR IGNORE INTO geocode_cache (address, lat, lng) VALUES (?, ?, ?)',
          args: [address, coords.lat, coords.lng],
        });
        return coords;
      }
    }

    // 키워드 검색 fallback
    const kwUrl = `${KAKAO_API_URL}/search/keyword.json?query=${encodeURIComponent(address)}&size=1`;
    const kwRes = await fetch(kwUrl, {
      headers: { Authorization: `KakaoAK ${KAKAO_REST_API_KEY}` },
      signal: AbortSignal.timeout(5000),
    });

    if (kwRes.ok) {
      const kwData = await kwRes.json();
      if (kwData.documents?.length > 0) {
        const coords = { lat: parseFloat(kwData.documents[0].y), lng: parseFloat(kwData.documents[0].x) };
        await db.execute({
          sql: 'INSERT OR IGNORE INTO geocode_cache (address, lat, lng) VALUES (?, ?, ?)',
          args: [address, coords.lat, coords.lng],
        });
        return coords;
      }
    }
  } catch {
    // 타임아웃 등 무시
  }

  return null;
}

async function main() {
  // 좌표가 없고 주소가 있는 단지만 대상
  const rowsResult = await db.execute({
    sql: `
      SELECT kapt_code, apt_nm, road_addr, addr
      FROM complexes
      WHERE (lat IS NULL OR lat = 0)
        AND (road_addr IS NOT NULL AND road_addr != '')
      ORDER BY kapt_code
    `,
    args: [],
  });
  const rows = rowsResult.rows as unknown as Row[];

  const total = rows.length;
  console.log(`지오코딩 대상: ${total}건`);

  let success = 0;
  let fail = 0;
  const startTime = Date.now();

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);

    const results = await Promise.all(
      batch.map(async (row) => {
        const address = row.road_addr || row.addr;
        if (!address) return { row, coords: null };
        const coords = await geocode(address);
        return { row, coords };
      }),
    );

    for (const { row, coords } of results) {
      if (coords) {
        await db.execute({
          sql: 'UPDATE complexes SET lat = ?, lng = ? WHERE kapt_code = ?',
          args: [coords.lat, coords.lng, row.kapt_code],
        });
        success++;
      } else {
        fail++;
      }
    }

    const processed = Math.min(i + BATCH_SIZE, total);
    if (processed % 100 === 0 || processed === total) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      const pct = ((processed / total) * 100).toFixed(1);
      console.log(`  [${elapsed}s] ${processed}/${total} (${pct}%) — 성공: ${success}, 실패: ${fail}`);
    }

    if (i + BATCH_SIZE < rows.length) {
      await new Promise((r) => setTimeout(r, BATCH_DELAY));
    }
  }

  // 주소 없는 단지 수 확인
  const noAddrResult = await db.execute({
    sql: "SELECT COUNT(*) as cnt FROM complexes WHERE (lat IS NULL OR lat = 0) AND (road_addr IS NULL OR road_addr = '')",
    args: [],
  });
  const noAddr = noAddrResult.rows[0] as unknown as { cnt: number };

  console.log(`\n완료! 성공: ${success}, 실패: ${fail}, 주소없음: ${noAddr.cnt}`);
  console.log(`총 소요시간: ${((Date.now() - startTime) / 1000).toFixed(1)}초`);

  // 최종 현황
  const statsResult = await db.execute({
    sql: "SELECT COUNT(*) as total, SUM(CASE WHEN lat IS NOT NULL AND lat != 0 THEN 1 ELSE 0 END) as has FROM complexes",
    args: [],
  });
  const stats = statsResult.rows[0] as unknown as { total: number; has: number };
  console.log(`좌표 현황: ${stats.has}/${stats.total} (${((stats.has / stats.total) * 100).toFixed(1)}%)`);

  db.close();
}

main().catch(console.error);
