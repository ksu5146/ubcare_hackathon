import { createClient } from '@libsql/client';
import path from 'path';

const DB_URL = process.env.TURSO_DATABASE_URL
  || `file:${process.env.SQLITE_DB_PATH || path.join(process.cwd(), 'real-estate.db')}`;

const db = createClient({
  url: DB_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// 시도별 단지 수
const byRegionResult = await db.execute({ sql: 'SELECT as1, COUNT(*) as cnt FROM complexes GROUP BY as1 ORDER BY cnt DESC', args: [] });
const byRegion = byRegionResult.rows as unknown as Array<{ as1: string; cnt: number }>;
console.log('=== 시도별 단지 수 ===');
byRegion.forEach((r) => console.log(`  ${r.as1}: ${r.cnt}`));
console.log(`  전체: ${byRegion.reduce((s, r) => s + r.cnt, 0)}`);

// 서울
console.log('\n=== 서울 구별 단지 수 ===');
const seoulResult = await db.execute({ sql: "SELECT as2, COUNT(*) as cnt FROM complexes WHERE as1='서울특별시' GROUP BY as2 ORDER BY as2", args: [] });
const seoul = seoulResult.rows as unknown as Array<{ as2: string; cnt: number }>;
seoul.forEach((r) => console.log(`  ${r.as2}: ${r.cnt}`));
console.log(`  서울 합계: ${seoul.reduce((s, r) => s + r.cnt, 0)} (${seoul.length}개 구)`);

// 경기
console.log('\n=== 경기 시구별 단지 수 ===');
const ggResult = await db.execute({ sql: "SELECT as2, COUNT(*) as cnt FROM complexes WHERE as1='경기도' GROUP BY as2 ORDER BY as2", args: [] });
const gg = ggResult.rows as unknown as Array<{ as2: string; cnt: number }>;
gg.forEach((r) => console.log(`  ${r.as2}: ${r.cnt}`));
console.log(`  경기 합계: ${gg.reduce((s, r) => s + r.cnt, 0)} (${gg.length}개 시/구)`);

// 인천
console.log('\n=== 인천 구별 단지 수 ===');
const icResult = await db.execute({ sql: "SELECT as2, COUNT(*) as cnt FROM complexes WHERE as1='인천광역시' GROUP BY as2 ORDER BY as2", args: [] });
const ic = icResult.rows as unknown as Array<{ as2: string; cnt: number }>;
ic.forEach((r) => console.log(`  ${r.as2}: ${r.cnt}`));
console.log(`  인천 합계: ${ic.reduce((s, r) => s + r.cnt, 0)} (${ic.length}개 구)`);

// 거래 데이터와 비교: 거래에는 있지만 단지정보가 없는 지역
console.log('\n=== 거래 데이터 지역 vs 단지정보 지역 비교 ===');
const tradeLawdsResult = await db.execute({ sql: 'SELECT DISTINCT lawd_cd FROM trades ORDER BY lawd_cd', args: [] });
const complexLawdsResult = await db.execute({ sql: 'SELECT DISTINCT substr(bjd_code, 1, 5) as lawd_cd FROM complexes ORDER BY lawd_cd', args: [] });

const tradeLawds = tradeLawdsResult.rows as unknown as Array<{ lawd_cd: string }>;
const complexLawds = complexLawdsResult.rows as unknown as Array<{ lawd_cd: string }>;

const tradeSet = new Set(tradeLawds.map((r) => r.lawd_cd));
const complexSet = new Set(complexLawds.map((r) => r.lawd_cd));

const missingInComplex = [...tradeSet].filter(lc => !complexSet.has(lc));

console.log(`  거래 데이터 지역 수: ${tradeSet.size}`);
console.log(`  단지정보 지역 수: ${complexSet.size}`);
console.log(`  거래O 단지X (누락): ${missingInComplex.length}개`);
if (missingInComplex.length > 0) {
  console.log(`  누락 lawdCd: ${missingInComplex.join(', ')}`);
}

// 좌표 현황
const coordStatsResult = await db.execute({
  sql: "SELECT COUNT(*) as total, SUM(CASE WHEN lat IS NOT NULL AND lat != 0 THEN 1 ELSE 0 END) as has_coords, SUM(CASE WHEN road_addr IS NOT NULL AND road_addr != '' THEN 1 ELSE 0 END) as has_addr FROM complexes",
  args: [],
});
const coordStats = coordStatsResult.rows[0] as unknown as { total: number; has_coords: number; has_addr: number };
console.log(`\n=== 좌표/주소 현황 ===`);
console.log(`  전체: ${coordStats.total}`);
console.log(`  좌표 있음: ${coordStats.has_coords}`);
console.log(`  도로명주소 있음: ${coordStats.has_addr}`);

db.close();
