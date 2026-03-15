import * as fs from 'fs';
import * as path from 'path';

const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i > 0) process.env[t.substring(0, i)] = t.substring(i + 1);
  }
}

import { getClient, initSchema } from '../src/lib/db';

await initSchema();
const db = getClient();

async function q(sql: string): Promise<Record<string, unknown>> {
  const result = await db.execute({ sql, args: [] });
  return result.rows[0] as unknown as Record<string, unknown>;
}
async function qa(sql: string): Promise<Record<string, unknown>[]> {
  const result = await db.execute({ sql, args: [] });
  return result.rows as unknown as Record<string, unknown>[];
}

const cTotal = await q("SELECT COUNT(*) as cnt FROM complexes WHERE substr(bjd_code,1,2)='11'");
const sTotal = await q("SELECT COUNT(*) as cnt FROM seoul_apt_info");

console.log('=== 데이터 건수 비교 ===');
console.log('data.go.kr complexes (서울): ' + cTotal.cnt);
console.log('서울시 OpenAptInfo:          ' + sTotal.cnt);

const matched = await q(`
  SELECT COUNT(DISTINCT c.kapt_code) as cnt
  FROM complexes c
  JOIN seoul_apt_info s ON s.apt_nm = c.apt_nm
  WHERE substr(c.bjd_code,1,2) = '11'
`);
console.log('이름 매칭 단지:              ' + matched.cnt);

const seoulOnly = await q(`
  SELECT COUNT(*) as cnt FROM seoul_apt_info s
  WHERE NOT EXISTS (
    SELECT 1 FROM complexes c WHERE c.apt_nm = s.apt_nm AND substr(c.bjd_code,1,2)='11'
  )
`);
console.log('서울시에만 존재:             ' + seoulOnly.cnt);

const complexOnly = await q(`
  SELECT COUNT(*) as cnt FROM complexes c
  WHERE substr(c.bjd_code,1,2) = '11'
  AND NOT EXISTS (SELECT 1 FROM seoul_apt_info s WHERE s.apt_nm = c.apt_nm)
`);
console.log('data.go.kr에만 존재:         ' + complexOnly.cnt);

console.log('\n=== data.go.kr 보강 효과 (서울 단지) ===');
const seoulCnt = cTotal.cnt as number;
const fields = [
  ['lat (좌표)', "lat IS NOT NULL AND lat != 0"],
  ['builder (시공사)', "builder IS NOT NULL AND builder != ''"],
  ['developer (시행사)', "developer IS NOT NULL AND developer != ''"],
  ['hall_type (복도유형)', "hall_type IS NOT NULL AND hall_type != ''"],
  ['heat_type (난방)', "heat_type IS NOT NULL AND heat_type != ''"],
  ['mgr_type (관리방식)', "mgr_type IS NOT NULL AND mgr_type != ''"],
  ['parking_ground (주차)', "parking_ground IS NOT NULL AND parking_ground > 0"],
];
for (const [label, cond] of fields) {
  const r = await q(`SELECT COUNT(*) as cnt FROM complexes WHERE substr(bjd_code,1,2)='11' AND ${cond}`);
  console.log(`  ${label}: ${r.cnt}/${seoulCnt} (${((r.cnt as number) / seoulCnt * 100).toFixed(1)}%)`);
}

console.log('\n=== 서울시 고유 데이터 커버리지 ===');
const sCnt = sTotal.cnt as number;
const seoulFields = [
  ['xcrd/ycrd (좌표)', "xcrd IS NOT NULL AND xcrd != 0"],
  ['bldr (시공사)', "bldr IS NOT NULL AND bldr != ''"],
  ['dvlr (시행사)', "dvlr IS NOT NULL AND dvlr != ''"],
  ['prk_cntom (주차대수)', "prk_cntom IS NOT NULL AND prk_cntom > 0"],
  ['gfa (연면적)', "gfa IS NOT NULL AND gfa > 0"],
  ['rsdt_xuar (주거전용면적)', "rsdt_xuar IS NOT NULL AND rsdt_xuar > 0"],
  ['bdar (대지면적)', "bdar IS NOT NULL AND bdar > 0"],
  ['hh_type (분양/임대)', "hh_type IS NOT NULL AND hh_type != ''"],
  ['se_cd (의무/임의관리)', "se_cd IS NOT NULL AND se_cd != ''"],
  ['use_aprv_ymd (사용승인일)', "use_aprv_ymd IS NOT NULL AND use_aprv_ymd != ''"],
  ['road_type (복도유형)', "road_type IS NOT NULL AND road_type != ''"],
  ['mn_mthd (난방방식)', "mn_mthd IS NOT NULL AND mn_mthd != ''"],
  ['tnohsh (세대수)', "tnohsh IS NOT NULL AND tnohsh > 0"],
];
for (const [label, cond] of seoulFields) {
  const r = await q(`SELECT COUNT(*) as cnt FROM seoul_apt_info WHERE ${cond}`);
  console.log(`  ${label}: ${r.cnt}/${sCnt} (${((r.cnt as number) / sCnt * 100).toFixed(1)}%)`);
}

console.log('\n=== 서울시만의 추가 데이터 (data.go.kr에 없는 필드) ===');
console.log('  - gfa (연면적)');
console.log('  - rsdt_xuar (주거전용면적)');
console.log('  - mnco_levy_area (관리비부과면적)');
console.log('  - bdar (대지면적)');
console.log('  - hh_type (분양/임대 구분)');
console.log('  - se_cd (의무/임의 관리 구분)');
console.log('  - dvlr (시행사) — data.go.kr는 kaptAcompany로 있긴 함');

console.log('\n=== 샘플 비교 (동일 단지 5건) ===');
const samples = await qa(`
  SELECT
    c.apt_nm as 단지명,
    c.total_unit as "data.go.kr_세대수", s.tnohsh as "서울시_세대수",
    c.builder as "data.go.kr_시공사", s.bldr as "서울시_시공사",
    c.hall_type as "data.go.kr_복도유형", s.road_type as "서울시_복도유형",
    c.heat_type as "data.go.kr_난방", s.mn_mthd as "서울시_난방",
    ROUND(c.lat, 6) as "data.go.kr_lat", ROUND(CAST(s.ycrd AS REAL), 6) as "서울시_lat",
    s.gfa as "서울시_연면적", s.bdar as "서울시_대지면적", s.prk_cntom as "서울시_주차"
  FROM complexes c
  JOIN seoul_apt_info s ON s.apt_nm = c.apt_nm
  WHERE substr(c.bjd_code,1,2)='11'
  ORDER BY c.total_unit DESC
  LIMIT 5
`);
for (const row of samples) {
  console.log(JSON.stringify(row, null, 2));
}

process.exit(0);
