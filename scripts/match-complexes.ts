/**
 * 거래 데이터와 단지 정보 매칭 테이블 생성
 *
 * 매칭 전략:
 * 1. 정확 이름 매칭 (lawd_cd + apt_nm)
 * 2. 이름 포함 매칭 (거래 이름이 단지 이름에 포함 또는 반대)
 * 3. 주소(동+지번) 매칭
 * 4. 도로명 매칭
 */

import { createClient } from '@libsql/client';
import path from 'path';

const DB_URL = process.env.TURSO_DATABASE_URL
  || `file:${process.env.SQLITE_DB_PATH || path.join(process.cwd(), 'real-estate.db')}`;

const db = createClient({
  url: DB_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// 매칭 테이블 생성
await db.executeMultiple(`
  CREATE TABLE IF NOT EXISTS trade_complex_map (
    lawd_cd TEXT NOT NULL,
    trade_apt_nm TEXT NOT NULL,
    kapt_code TEXT NOT NULL,
    complex_apt_nm TEXT NOT NULL,
    match_type TEXT NOT NULL,
    PRIMARY KEY (lawd_cd, trade_apt_nm)
  )
`);

// 기존 매칭 초기화
await db.execute({ sql: 'DELETE FROM trade_complex_map', args: [] });

// 미매칭 거래 단지 목록
interface TradeApt {
  apt_nm: string;
  lawd_cd: string;
  umd_nm: string;
  jibun: string;
  road_nm: string;
}

interface ComplexRow {
  kapt_code: string;
  apt_nm: string;
  bjd_code: string;
  addr: string | null;
  road_addr: string | null;
}

const allTradeAptsResult = await db.execute({
  sql: `
    SELECT DISTINCT apt_nm, lawd_cd, umd_nm,
      MIN(jibun) as jibun, MIN(road_nm) as road_nm
    FROM trades
    WHERE cancel_yn = 'N'
    GROUP BY apt_nm, lawd_cd
  `,
  args: [],
});
const allTradeApts = allTradeAptsResult.rows as unknown as TradeApt[];

console.log(`총 거래 단지: ${allTradeApts.length}개`);

// 지역별 단지 캐시
const complexCache = new Map<string, ComplexRow[]>();
async function getComplexes(lawdCd: string): Promise<ComplexRow[]> {
  if (!complexCache.has(lawdCd)) {
    const result = await db.execute({
      sql: `
        SELECT kapt_code, apt_nm, bjd_code, addr, road_addr
        FROM complexes
        WHERE substr(bjd_code, 1, 5) = ?
      `,
      args: [lawdCd],
    });
    complexCache.set(lawdCd, result.rows as unknown as ComplexRow[]);
  }
  return complexCache.get(lawdCd)!;
}

// 이름 정규화 (비교용)
function normalize(name: string): string {
  return name
    .replace(/\s+/g, '')
    .replace(/[()（）]/g, '')
    .replace(/아파트$/g, '')
    .toLowerCase();
}

// 지번에서 본번 추출 (예: "731-2" → "731")
function mainJibun(jibun: string): string {
  return jibun.split('-')[0].trim();
}

let stats = { exact: 0, nameContains: 0, normalized: 0, address: 0, road: 0, total: 0 };
const matched = new Set<string>();
const insertBatch: Array<{ sql: string; args: (string | number)[] }> = [];

function markMatched(t: TradeApt, c: ComplexRow, type: string) {
  const key = `${t.lawd_cd}::${t.apt_nm}`;
  if (matched.has(key)) return;
  matched.add(key);
  insertBatch.push({
    sql: 'INSERT OR IGNORE INTO trade_complex_map (lawd_cd, trade_apt_nm, kapt_code, complex_apt_nm, match_type) VALUES (?, ?, ?, ?, ?)',
    args: [t.lawd_cd, t.apt_nm, c.kapt_code, c.apt_nm, type],
  });
  (stats as Record<string, number>)[type]++;
  stats.total++;
}

for (const t of allTradeApts) {
  const complexes = await getComplexes(t.lawd_cd);
  const key = `${t.lawd_cd}::${t.apt_nm}`;
  if (matched.has(key)) continue;

  // 1. 정확 매칭
  const exact = complexes.find((c) => c.apt_nm === t.apt_nm);
  if (exact) {
    markMatched(t, exact, 'exact');
    continue;
  }

  // 2. 이름 포함 매칭 (거래이름이 단지이름에 포함 or 반대)
  const containsMatch = complexes.find(
    (c) => c.apt_nm.includes(t.apt_nm) || t.apt_nm.includes(c.apt_nm),
  );
  if (containsMatch) {
    markMatched(t, containsMatch, 'nameContains');
    continue;
  }

  // 3. 정규화 이름 매칭
  const tNorm = normalize(t.apt_nm);
  const normMatch = complexes.find((c) => {
    const cNorm = normalize(c.apt_nm);
    return cNorm === tNorm || cNorm.includes(tNorm) || tNorm.includes(cNorm);
  });
  if (normMatch) {
    markMatched(t, normMatch, 'normalized');
    continue;
  }

  // 4. 주소(동+지번) 매칭 — 단지 주소에 "읍면동 지번"이 포함
  if (t.umd_nm && t.jibun) {
    const mj = mainJibun(t.jibun);
    const addrMatch = complexes.find((c) => {
      if (!c.addr) return false;
      return c.addr.includes(t.umd_nm) && c.addr.includes(` ${mj}`);
    });
    if (addrMatch) {
      markMatched(t, addrMatch, 'address');
      continue;
    }
  }

  // 5. 도로명 매칭 — 단지 도로주소에 거래 도로명이 포함 + 동일 읍면동
  if (t.road_nm && t.umd_nm) {
    const roadMatch = complexes.find((c) => {
      if (!c.road_addr) return false;
      return c.road_addr.includes(t.road_nm) && c.addr?.includes(t.umd_nm);
    });
    if (roadMatch) {
      markMatched(t, roadMatch, 'road');
      continue;
    }
  }
}

// batch insert
if (insertBatch.length > 0) {
  await db.batch(insertBatch, 'write');
}

console.log('\n=== 매칭 결과 ===');
console.log(`정확 매칭: ${stats.exact}개`);
console.log(`이름 포함: ${stats.nameContains}개`);
console.log(`정규화 매칭: ${stats.normalized}개`);
console.log(`주소 매칭: ${stats.address}개`);
console.log(`도로명 매칭: ${stats.road}개`);
console.log(`총 매칭: ${stats.total} / ${allTradeApts.length} (${Math.round(stats.total / allTradeApts.length * 100)}%)`);
console.log(`미매칭: ${allTradeApts.length - stats.total}개`);

db.close();
