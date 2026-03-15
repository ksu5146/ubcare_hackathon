import { getClient } from '../db';
import { upsertPending, markInProgress, markCompleted, markFailed } from './state';
import type { SeoulAptInfoRaw, CollectionResult } from './types';

const SEOUL_APT_API_BASE = 'http://openapi.seoul.go.kr:8088';
const PAGE_SIZE = 1000;

function getSeoulApiKey(): string {
  return process.env.SEOUL_OPEN_DATA_KEY ?? '';
}

/** 서울시 공동주택 정보 API 페이지 단위 호출 */
async function fetchSeoulAptPage(
  start: number,
  end: number,
): Promise<{ rows: SeoulAptInfoRaw[]; totalCount: number }> {
  const key = getSeoulApiKey();
  if (!key) throw new Error('SEOUL_OPEN_DATA_KEY 환경변수가 설정되지 않았습니다.');

  const url = `${SEOUL_APT_API_BASE}/${key}/json/OpenAptInfo/${start}/${end}/`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);

  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);

    const json = await res.json();
    const info = json?.OpenAptInfo;

    if (!info) throw new Error('Unexpected response structure');

    const result = info.RESULT;
    if (result?.CODE !== 'INFO-000') {
      throw new Error(`API Error [${result?.CODE}]: ${result?.MESSAGE}`);
    }

    return {
      rows: info.row ?? [],
      totalCount: info.list_total_count ?? 0,
    };
  } finally {
    clearTimeout(timer);
  }
}

/** 서울시 공동주택 정보 전체 수집 */
export async function collectSeoulAptInfo(
  options?: { delayMs?: number },
): Promise<CollectionResult> {
  const delayMs = options?.delayMs ?? 300;
  const state = await upsertPending('seoul_apt', 'SEOUL');
  await markInProgress(state.id);

  try {
    // 첫 페이지로 총 건수 확인
    const first = await fetchSeoulAptPage(1, PAGE_SIZE);
    const totalCount = first.totalCount;
    const totalPages = Math.ceil(totalCount / PAGE_SIZE);

    console.log(`[seoul-apt-collector] Total: ${totalCount}, Pages: ${totalPages}`);

    let processed = 0;
    await upsertBatch(first.rows);
    processed += first.rows.length;
    console.log(`[seoul-apt-collector] Page 1/${totalPages} — ${processed}/${totalCount}`);

    for (let page = 2; page <= totalPages; page++) {
      if (delayMs > 0) await sleep(delayMs);

      const start = (page - 1) * PAGE_SIZE + 1;
      const end = page * PAGE_SIZE;
      const result = await fetchSeoulAptPage(start, end);

      await upsertBatch(result.rows);
      processed += result.rows.length;
      console.log(`[seoul-apt-collector] Page ${page}/${totalPages} — ${processed}/${totalCount}`);
    }

    // 수집 후 complexes 테이블 보강
    const enriched = await enrichComplexesFromSeoulData();
    console.log(`[seoul-apt-collector] Enriched ${enriched} complexes with Seoul data`);

    await markCompleted(state.id, processed);
    return { lawdCd: 'SEOUL', recordCount: totalCount, isNew: processed };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await markFailed(state.id, message);
    console.error('[seoul-apt-collector] Failed:', message);
    return { lawdCd: 'SEOUL', recordCount: 0, isNew: 0, error: message };
  }
}

async function upsertBatch(rows: SeoulAptInfoRaw[]): Promise<void> {
  if (rows.length === 0) return;

  const client = getClient();

  const sql = `
    INSERT INTO seoul_apt_info (
      apt_cd, apt_nm, cmpx_clsf, apt_stdg_addr, apt_rdn_addr,
      ctpv_addr, sgg_addr, emd_addr,
      hh_type, mng_mthd, road_type, mn_mthd,
      whol_dong_cnt, tnohsh, bldr, dvlr,
      use_aprv_ymd, gfa, rsdt_xuar, mnco_levy_area,
      xuar_hh_stts60, xuar_hh_stts85, xuar_hh_stts135, xuar_hh_stts136,
      bdar, prk_cntom, se_cd,
      xcrd, ycrd, use_yn,
      collected_at
    ) VALUES (
      ?, ?, ?, ?, ?,
      ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?,
      ?, ?, ?,
      datetime('now')
    )
    ON CONFLICT(apt_cd) DO UPDATE SET
      apt_nm = excluded.apt_nm,
      cmpx_clsf = excluded.cmpx_clsf,
      apt_rdn_addr = excluded.apt_rdn_addr,
      hh_type = excluded.hh_type,
      mng_mthd = excluded.mng_mthd,
      road_type = excluded.road_type,
      mn_mthd = excluded.mn_mthd,
      whol_dong_cnt = excluded.whol_dong_cnt,
      tnohsh = excluded.tnohsh,
      bldr = excluded.bldr,
      dvlr = excluded.dvlr,
      use_aprv_ymd = excluded.use_aprv_ymd,
      gfa = excluded.gfa,
      rsdt_xuar = excluded.rsdt_xuar,
      mnco_levy_area = excluded.mnco_levy_area,
      xuar_hh_stts60 = excluded.xuar_hh_stts60,
      xuar_hh_stts85 = excluded.xuar_hh_stts85,
      xuar_hh_stts135 = excluded.xuar_hh_stts135,
      xuar_hh_stts136 = excluded.xuar_hh_stts136,
      bdar = excluded.bdar,
      prk_cntom = excluded.prk_cntom,
      se_cd = excluded.se_cd,
      xcrd = excluded.xcrd,
      ycrd = excluded.ycrd,
      use_yn = excluded.use_yn,
      collected_at = datetime('now')
  `;

  const statements = rows.map((r) => ({
    sql,
    args: [
      r.APT_CD,
      r.APT_NM?.trim() ?? '',
      r.CMPX_CLSF ?? null,
      r.APT_STDG_ADDR ?? null,
      r.APT_RDN_ADDR ?? null,
      r.CTPV_ADDR ?? null,
      r.SGG_ADDR ?? null,
      r.EMD_ADDR ?? null,
      r.HH_TYPE ?? null,
      r.MNG_MTHD ?? null,
      r.ROAD_TYPE ?? null,
      r.MN_MTHD ?? null,
      parseNum(r.WHOL_DONG_CNT),
      parseNum(r.TNOHSH),
      r.BLDR ?? null,
      r.DVLR ?? null,
      r.USE_APRV_YMD ?? null,
      parseFloat2(r.GFA),
      parseFloat2(r.RSDT_XUAR),
      parseFloat2(r.MNCO_LEVY_AREA),
      parseNum(r.XUAR_HH_STTS60),
      parseNum(r.XUAR_HH_STTS85),
      parseNum(r.XUAR_HH_STTS135),
      parseNum(r.XUAR_HH_STTS136),
      parseFloat2(r.BDAR),
      parseNum(r.PRK_CNTOM),
      r.SE_CD ?? null,
      parseFloat2(r.XCRD),
      parseFloat2(r.YCRD),
      r.USE_YN ?? 'Y',
    ] as (string | number | null)[],
  }));

  await client.batch(statements, 'write');
}

/**
 * seoul_apt_info 데이터를 기반으로 complexes 테이블을 보강한다.
 * - 단지명 + 구명(as2 = sgg_addr) 매칭 (서울 지역만)
 * - 좌표, 시공사, 시행사, 관리방식, 주차대수 등 누락 데이터 보완
 */
async function enrichComplexesFromSeoulData(): Promise<number> {
  const client = getClient();

  // 단지명 + 구명으로 매칭하여 동명 단지 오매칭 방지
  const matchCond = 's.apt_nm = complexes.apt_nm AND s.sgg_addr = complexes.as2';

  const result = await client.execute({
    sql: `
    UPDATE complexes SET
      lat = COALESCE(complexes.lat, (
        SELECT CAST(s.ycrd AS REAL) FROM seoul_apt_info s
        WHERE ${matchCond} AND s.ycrd IS NOT NULL AND s.ycrd != 0
        LIMIT 1
      )),
      lng = COALESCE(complexes.lng, (
        SELECT CAST(s.xcrd AS REAL) FROM seoul_apt_info s
        WHERE ${matchCond} AND s.xcrd IS NOT NULL AND s.xcrd != 0
        LIMIT 1
      )),
      builder = COALESCE(complexes.builder, (
        SELECT s.bldr FROM seoul_apt_info s
        WHERE ${matchCond} AND s.bldr IS NOT NULL AND s.bldr != ''
        LIMIT 1
      )),
      developer = COALESCE(complexes.developer, (
        SELECT s.dvlr FROM seoul_apt_info s
        WHERE ${matchCond} AND s.dvlr IS NOT NULL AND s.dvlr != ''
        LIMIT 1
      )),
      mgr_type = COALESCE(complexes.mgr_type, (
        SELECT s.mng_mthd FROM seoul_apt_info s
        WHERE ${matchCond} AND s.mng_mthd IS NOT NULL
        LIMIT 1
      )),
      hall_type = COALESCE(complexes.hall_type, (
        SELECT s.road_type FROM seoul_apt_info s
        WHERE ${matchCond} AND s.road_type IS NOT NULL
        LIMIT 1
      )),
      heat_type = COALESCE(complexes.heat_type, (
        SELECT s.mn_mthd FROM seoul_apt_info s
        WHERE ${matchCond} AND s.mn_mthd IS NOT NULL
        LIMIT 1
      )),
      updated_at = datetime('now')
    WHERE substr(complexes.bjd_code, 1, 2) = '11'
      AND EXISTS (
        SELECT 1 FROM seoul_apt_info s WHERE ${matchCond}
      )
  `,
    args: [],
  });

  return result.rowsAffected;
}

function parseNum(val: unknown): number | null {
  if (val == null || val === '') return null;
  const str = String(val).replace(/\.0$/, '');
  const n = parseInt(str, 10);
  return isNaN(n) ? null : n;
}

function parseFloat2(val: unknown): number | null {
  if (val == null || val === '') return null;
  const n = parseFloat(String(val));
  return isNaN(n) ? null : n;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
