import { getClient } from '../db';
import { BUILDING_HUB_BASE_URL, API_PATHS } from '../constants';
import { upsertPending, markInProgress, markCompleted, markFailed } from './state';
import type { BuildingLedgerRaw, CollectionResult } from './types';

function getServiceKey(): string {
  return process.env.DATA_GO_KR_API_KEY ?? '';
}

/**
 * 건축물대장 총괄표제부 API 호출 (건축HUB)
 * - 시군구코드 + 법정동코드 기준으로 조회
 * - 아파트(공동주택) 건축물의 용적률, 건폐율, 대지면적, 건축면적 등 취득
 */
async function fetchBuildingLedgerPage(
  sigunguCd: string,
  bjdongCd: string,
  pageNo: number,
  numOfRows: number = 100,
): Promise<{ items: BuildingLedgerRaw[]; totalCount: number }> {
  const key = getServiceKey();
  if (!key) throw new Error('DATA_GO_KR_API_KEY 환경변수가 설정되지 않았습니다.');

  const params = new URLSearchParams();
  params.set('_type', 'json');
  params.set('sigunguCd', sigunguCd);
  params.set('bjdongCd', bjdongCd);
  params.set('numOfRows', String(numOfRows));
  params.set('pageNo', String(pageNo));

  const url = `${BUILDING_HUB_BASE_URL}${API_PATHS.BUILDING_LEDGER_RECAP}?serviceKey=${key}&${params.toString()}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);

  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);

    const json = await res.json();
    const header = json?.response?.header;

    if (header?.resultCode !== '00' && header?.resultCode !== '000') {
      throw new Error(`API Error [${header?.resultCode}]: ${header?.resultMsg ?? 'unknown'}`);
    }

    const body = json?.response?.body;
    if (!body) return { items: [], totalCount: 0 };

    const items = body.items?.item ?? body.item;
    if (!items) return { items: [], totalCount: body.totalCount ?? 0 };

    const list = Array.isArray(items) ? items : [items];
    return { items: list as BuildingLedgerRaw[], totalCount: body.totalCount ?? list.length };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 특정 법정동(lawdCd 5자리)의 건축물대장 총괄표제부 수집
 * lawdCd 앞 5자리 → sigunguCd(앞5자리), bjdongCd(뒤5자리)로 분리하여 호출
 */
export async function collectBuildingLedger(
  lawdCd: string,
  options?: { delayMs?: number },
): Promise<CollectionResult> {
  const delayMs = options?.delayMs ?? 300;
  const sigunguCd = lawdCd.substring(0, 5);

  const state = await upsertPending('building_ledger', lawdCd);
  await markInProgress(state.id);

  try {
    // 법정동코드 목록 조회: complexes 테이블에서 해당 시군구의 고유 법정동코드 추출
    const client = getClient();
    const dongResult = await client.execute({
      sql: `
      SELECT DISTINCT substr(bjd_code, 6, 5) as dong_cd
      FROM complexes
      WHERE substr(bjd_code, 1, 5) = ?
    `,
      args: [sigunguCd],
    });

    const dongCodes = dongResult.rows as unknown as { dong_cd: string }[];

    if (dongCodes.length === 0) {
      // 법정동코드가 없으면 00000으로 전체 조회 시도
      dongCodes.push({ dong_cd: '00000' });
    }

    let totalProcessed = 0;

    for (const { dong_cd } of dongCodes) {
      const bjdongCd = dong_cd;
      let pageNo = 1;
      let hasMore = true;

      while (hasMore) {
        const result = await fetchBuildingLedgerPage(sigunguCd, bjdongCd, pageNo, 100);

        if (result.items.length > 0) {
          await upsertBuildingBatch(result.items);
          totalProcessed += result.items.length;
        }

        hasMore = totalProcessed < result.totalCount && result.items.length > 0;
        pageNo++;

        if (hasMore && delayMs > 0) await sleep(delayMs);
      }

      if (delayMs > 0) await sleep(delayMs);
    }

    console.log(`[building-ledger] ${lawdCd}: ${totalProcessed} records`);
    await markCompleted(state.id, totalProcessed);
    return { lawdCd, recordCount: totalProcessed, isNew: totalProcessed };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await markFailed(state.id, message);
    console.error(`[building-ledger] ${lawdCd} failed:`, message);
    return { lawdCd, recordCount: 0, isNew: 0, error: message };
  }
}

async function upsertBuildingBatch(rows: BuildingLedgerRaw[]): Promise<void> {
  if (rows.length === 0) return;

  const client = getClient();

  const sql = `
    INSERT INTO building_ledger (
      sigungu_cd, bjdong_cd, plat_gb_cd, bun, ji,
      bld_nm, plat_plc, new_plat_plc,
      main_purps_cd_nm, etc_purps,
      plat_area, arch_area, bc_rat, tot_area,
      vl_rat_estm_tot_area, vl_rat,
      hhld_cnt, fmly_cnt, main_bld_cnt, tot_pkng_cnt,
      pms_day, stcns_day, use_apr_day,
      engr_grade, engr_rat, gn_bld_grade, itg_bld_grade,
      crtn_day, collected_at
    ) VALUES (
      ?, ?, ?, ?, ?,
      ?, ?, ?,
      ?, ?,
      ?, ?, ?, ?,
      ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?,
      ?, ?, ?, ?,
      ?, datetime('now')
    )
    ON CONFLICT(sigungu_cd, bjdong_cd, plat_gb_cd, bun, ji) DO UPDATE SET
      bld_nm = excluded.bld_nm,
      plat_plc = excluded.plat_plc,
      new_plat_plc = excluded.new_plat_plc,
      main_purps_cd_nm = excluded.main_purps_cd_nm,
      etc_purps = excluded.etc_purps,
      plat_area = excluded.plat_area,
      arch_area = excluded.arch_area,
      bc_rat = excluded.bc_rat,
      tot_area = excluded.tot_area,
      vl_rat_estm_tot_area = excluded.vl_rat_estm_tot_area,
      vl_rat = excluded.vl_rat,
      hhld_cnt = excluded.hhld_cnt,
      fmly_cnt = excluded.fmly_cnt,
      main_bld_cnt = excluded.main_bld_cnt,
      tot_pkng_cnt = excluded.tot_pkng_cnt,
      pms_day = excluded.pms_day,
      stcns_day = excluded.stcns_day,
      use_apr_day = excluded.use_apr_day,
      engr_grade = excluded.engr_grade,
      engr_rat = excluded.engr_rat,
      gn_bld_grade = excluded.gn_bld_grade,
      itg_bld_grade = excluded.itg_bld_grade,
      crtn_day = excluded.crtn_day,
      collected_at = datetime('now')
  `;

  const statements = rows.map((r) => ({
    sql,
    args: [
      r.sigunguCd ?? '',
      r.bjdongCd ?? '',
      r.platGbCd ?? '0',
      r.bun ?? '0000',
      r.ji ?? '0000',
      r.bldNm ?? null,
      r.platPlc ?? null,
      r.newPlatPlc ?? null,
      r.mainPurpsCdNm ?? null,
      r.etcPurps ?? null,
      parseFloat2(r.platArea),
      parseFloat2(r.archArea),
      parseFloat2(r.bcRat),
      parseFloat2(r.totArea),
      parseFloat2(r.vlRatEstmTotArea),
      parseFloat2(r.vlRat),
      parseNum(r.hhldCnt),
      parseNum(r.fmlyCnt),
      parseNum(r.mainBldCnt),
      parseNum(r.totPkngCnt),
      r.pmsDay ?? null,
      r.stcnsDay ?? null,
      r.useAprDay ?? null,
      r.engrGrade ?? null,
      parseFloat2(r.engrRat),
      r.gnBldGrade ?? null,
      r.itgBldGrade ?? null,
      r.crtnDay ?? null,
    ] as (string | number | null)[],
  }));

  await client.batch(statements, 'write');
}

/**
 * complexes.addr에서 본번/부번 추출
 * 예: "서울특별시 강남구 역삼동 707-18 역삼우정에쉐르2" → { bun: '0707', ji: '0018' }
 * 예: "서울특별시 강남구 역삼동 710 현대까르띠에710아파트" → { bun: '0710', ji: '0000' }
 */
function extractBunJi(addr: string): { bun: string; ji: string } | null {
  const m = addr.match(/동\s+(\d+)(?:-(\d+))?\s/);
  if (!m) return null;
  const bun = m[1].padStart(4, '0');
  const ji = (m[2] ?? '0').padStart(4, '0');
  return { bun, ji };
}

/** 공백·특수문자 제거 후 소문자 정규화 */
function normalizeName(name: string): string {
  return name.replace(/[\s\u3000'·.]/g, '').toLowerCase();
}

/** 도로명주소에서 "(동명)" 접미사 제거 */
function normalizeRoadAddr(addr: string): string {
  return addr.replace(/\s*\([^)]+\)\s*$/, '').trim();
}

interface BuildingRow {
  rowid: number;
  bld_nm: string;
  bun: string;
  ji: string;
  new_plat_plc: string;
  vl_rat: number | null;
  bc_rat: number | null;
  plat_area: number | null;
  arch_area: number | null;
  engr_grade: string | null;
  hhld_cnt: number;
}

interface ComplexRow {
  rowid: number;
  apt_nm: string;
  bjd_code: string;
  addr: string;
  road_addr: string;
}

/**
 * building_ledger → complexes 보강 (다단계 정밀 매칭)
 *
 * 매칭 우선순위:
 *  1. 본번/부번 일치 (complexes.addr에서 추출 ↔ building_ledger.bun/ji)
 *  2. 도로명주소 일치 (complexes.road_addr ↔ building_ledger.new_plat_plc)
 *  3. 건물명 정확 일치 (공백 제거)
 *  4. 건물명 부분 일치 (세대수 큰 것 우선)
 *
 * 각 단계에서 매칭된 complex는 다음 단계에서 스킵한다.
 */
export async function enrichComplexesFromBuildingLedger(): Promise<number> {
  const client = getClient();

  // complexes 테이블에 건축물대장 컬럼이 없으면 추가
  const tableInfoResult = await client.execute({ sql: 'PRAGMA table_info(complexes)', args: [] });
  const cols = tableInfoResult.rows as unknown as { name: string }[];
  const colNames = new Set(cols.map((c) => c.name));

  const newCols = [
    ['vl_rat', 'REAL'],
    ['bc_rat', 'REAL'],
    ['plat_area', 'REAL'],
    ['arch_area', 'REAL'],
    ['engr_grade', 'TEXT'],
    ['bldg_match_type', 'TEXT'],  // 매칭 방식 기록 (디버깅용)
  ];

  for (const [col, type] of newCols) {
    if (!colNames.has(col)) {
      await client.executeMultiple(`ALTER TABLE complexes ADD COLUMN ${col} ${type}`);
    }
  }

  // 보강 대상 complexes 로드 (아직 매칭 안 된 것만)
  const complexesResult = await client.execute({
    sql: `
    SELECT rowid, apt_nm, bjd_code, addr, road_addr
    FROM complexes WHERE bldg_match_type IS NULL
  `,
    args: [],
  });
  const complexes = complexesResult.rows as unknown as ComplexRow[];

  if (complexes.length === 0) return 0;

  // 건축물대장 공동주택 데이터를 시군구+법정동 기준으로 인덱싱
  const buildingsResult = await client.execute({
    sql: `
    SELECT rowid, sigungu_cd, bjdong_cd, bld_nm, bun, ji, new_plat_plc,
           vl_rat, bc_rat, plat_area, arch_area, engr_grade, hhld_cnt
    FROM building_ledger
    WHERE main_purps_cd_nm IN ('공동주택', '아파트')
  `,
    args: [],
  });
  const buildingsWithDong = buildingsResult.rows as unknown as (BuildingRow & { sigungu_cd: string; bjdong_cd: string })[];

  const dongIndex = new Map<string, (BuildingRow & { sigungu_cd: string; bjdong_cd: string })[]>();
  for (const b of buildingsWithDong) {
    const key = b.sigungu_cd + b.bjdong_cd;
    let arr = dongIndex.get(key);
    if (!arr) { arr = []; dongIndex.set(key, arr); }
    arr.push(b);
  }

  let matched = 0;
  const stats = { bun_ji: 0, road_addr: 0, name_exact: 0, name_partial: 0 };

  const updateStatements: { sql: string; args: (string | number | null)[] }[] = [];

  for (const c of complexes) {
    const sigunguCd = c.bjd_code.substring(0, 5);
    const bjdongCd = c.bjd_code.substring(5, 10);
    const candidates = dongIndex.get(sigunguCd + bjdongCd);
    if (!candidates || candidates.length === 0) continue;

    let bestMatch: (BuildingRow & { sigungu_cd: string; bjdong_cd: string }) | null = null;
    let matchType = '';

    // Tier 1: 본번/부번 매칭
    const bunJi = extractBunJi(c.addr);
    if (bunJi) {
      const found = candidates.find(b => b.bun === bunJi.bun && b.ji === bunJi.ji);
      if (found) {
        bestMatch = found;
        matchType = 'bun_ji';
      }
    }

    // Tier 2: 도로명주소 매칭
    if (!bestMatch && c.road_addr) {
      const normRoad = c.road_addr.trim();
      if (normRoad) {
        const found = candidates.find(b => {
          if (!b.new_plat_plc || b.new_plat_plc.trim() === '') return false;
          return normalizeRoadAddr(b.new_plat_plc) === normRoad;
        });
        if (found) {
          bestMatch = found;
          matchType = 'road_addr';
        }
      }
    }

    // Tier 3: 이름 정확 일치 (공백 제거)
    if (!bestMatch) {
      const normApt = normalizeName(c.apt_nm);
      const found = candidates.find(b =>
        b.bld_nm && b.bld_nm.trim() !== '' && normalizeName(b.bld_nm) === normApt,
      );
      if (found) {
        bestMatch = found;
        matchType = 'name_exact';
      }
    }

    // Tier 4: 이름 부분 일치 (세대수 큰 것 우선, 오매칭 방지를 위해 최소 3글자)
    if (!bestMatch) {
      const normApt = normalizeName(c.apt_nm);
      if (normApt.length >= 3) {
        const partials = candidates
          .filter(b => {
            if (!b.bld_nm || b.bld_nm.trim() === '') return false;
            const normBld = normalizeName(b.bld_nm);
            if (normBld.length < 3) return false;
            return normApt.includes(normBld) || normBld.includes(normApt);
          })
          .sort((a, b2) => b2.hhld_cnt - a.hhld_cnt);

        if (partials.length === 1) {
          // 1건만 매칭되면 안전
          bestMatch = partials[0];
          matchType = 'name_partial';
        } else if (partials.length > 1) {
          // 여러 건이면 세대수 최대인 것 선택, 단 이름 길이가 더 가까운 것 우선
          const sorted = partials.sort((a, b2) => {
            const diffA = Math.abs(normalizeName(a.bld_nm).length - normApt.length);
            const diffB = Math.abs(normalizeName(b2.bld_nm).length - normApt.length);
            if (diffA !== diffB) return diffA - diffB;
            return b2.hhld_cnt - a.hhld_cnt;
          });
          bestMatch = sorted[0];
          matchType = 'name_partial';
        }
      }
    }

    if (bestMatch) {
      const b = bestMatch;
      updateStatements.push({
        sql: `
          UPDATE complexes SET
            vl_rat = ?, bc_rat = ?, plat_area = ?, arch_area = ?,
            engr_grade = ?, bldg_match_type = ?, updated_at = datetime('now')
          WHERE rowid = ?
        `,
        args: [
          (b.vl_rat && b.vl_rat > 0) ? b.vl_rat : null,
          (b.bc_rat && b.bc_rat > 0) ? b.bc_rat : null,
          (b.plat_area && b.plat_area > 0) ? b.plat_area : null,
          (b.arch_area && b.arch_area > 0) ? b.arch_area : null,
          (b.engr_grade && b.engr_grade.trim()) ? b.engr_grade.trim() : null,
          matchType,
          c.rowid,
        ],
      });
      (stats as Record<string, number>)[matchType]++;
      matched++;
    }
  }

  if (updateStatements.length > 0) {
    await client.batch(updateStatements, 'write');
  }

  console.log(`[building-ledger enrich] ${matched}/${complexes.length} matched`);
  console.log(`  본번/부번: ${stats.bun_ji}, 도로명: ${stats.road_addr}, 이름정확: ${stats.name_exact}, 이름부분: ${stats.name_partial}`);

  return matched;
}

function parseNum(val: unknown): number | null {
  if (val == null || val === '') return null;
  const n = parseInt(String(val), 10);
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
