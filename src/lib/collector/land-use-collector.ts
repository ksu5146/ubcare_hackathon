import { getClient } from '../db';
import { LAND_USE_BASE_URL, API_PATHS } from '../constants';
import { upsertPending, markInProgress, markCompleted, markFailed } from './state';
import type { LandUseRegulationRaw, CollectionResult } from './types';

function getServiceKey(): string {
  return process.env.DATA_GO_KR_API_KEY ?? '';
}

/**
 * PNU(필지고유번호) 조합
 * PNU(19자리) = 법정동코드(10자리) + 산구분코드(1자리: 1=토지,2=산) + 본번(4자리) + 부번(4자리)
 */
function buildPnu(bjdCode10: string, platGbCd: string, bun: string, ji: string): string {
  const gb = platGbCd === '1' ? '2' : '1'; // 0=대지→1, 1=산→2
  return `${bjdCode10}${gb}${bun.padStart(4, '0')}${ji.padStart(4, '0')}`;
}

/**
 * 토지이용규제정보 API 호출
 * - PNU(필지고유번호) 기준으로 해당 필지의 용도지역/지구/구역 정보 조회
 */
async function fetchLandUseRegulation(
  pnu: string,
): Promise<LandUseRegulationRaw[]> {
  const key = getServiceKey();
  if (!key) throw new Error('DATA_GO_KR_API_KEY 환경변수가 설정되지 않았습니다.');

  const params = new URLSearchParams();
  params.set('_type', 'json');
  params.set('pnu', pnu);
  params.set('numOfRows', '100');
  params.set('pageNo', '1');

  const url = `${LAND_USE_BASE_URL}${API_PATHS.LAND_USE_REGULATION}?serviceKey=${key}&${params.toString()}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);

  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);

    const json = await res.json();
    const header = json?.response?.header;

    if (header?.resultCode !== '00' && header?.resultCode !== '000') {
      throw new Error(`API Error [${header?.resultCode}]: ${header?.resultMsg ?? 'unknown'}`);
    }

    const body = json?.response?.body;
    if (!body) return [];

    const items = body.items?.item ?? body.item;
    if (!items) return [];

    const list = Array.isArray(items) ? items : [items];
    return list as LandUseRegulationRaw[];
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 특정 법정동(lawdCd 5자리)의 건축물대장 데이터를 기반으로 토지이용규제 수집
 * building_ledger 테이블에서 해당 시군구의 필지 정보를 추출하여 PNU를 조합하고
 * 각 필지의 용도지역/지구/구역 정보를 수집한다.
 */
export async function collectLandUseRegulation(
  lawdCd: string,
  options?: { delayMs?: number; maxParcels?: number },
): Promise<CollectionResult> {
  const delayMs = options?.delayMs ?? 500;
  const maxParcels = options?.maxParcels ?? 500;

  const state = await upsertPending('land_use', lawdCd);
  await markInProgress(state.id);

  try {
    const client = getClient();

    // complexes 테이블에서 해당 시군구의 단지 목록 추출 → PNU 조합
    const parcelsResult = await client.execute({
      sql: `
      SELECT DISTINCT b.sigungu_cd, b.bjdong_cd, b.plat_gb_cd, b.bun, b.ji
      FROM building_ledger b
      WHERE b.sigungu_cd = ?
        AND b.main_purps_cd_nm IN ('공동주택', '아파트')
      LIMIT ?
    `,
      args: [lawdCd.substring(0, 5), maxParcels],
    });

    const parcels = parcelsResult.rows as unknown as {
      sigungu_cd: string; bjdong_cd: string; plat_gb_cd: string; bun: string; ji: string;
    }[];

    if (parcels.length === 0) {
      console.log(`[land-use] ${lawdCd}: No parcels found in building_ledger`);
      await markCompleted(state.id, 0);
      return { lawdCd, recordCount: 0, isNew: 0 };
    }

    let totalProcessed = 0;

    for (const parcel of parcels) {
      const bjdCode10 = parcel.sigungu_cd + parcel.bjdong_cd;
      const pnu = buildPnu(bjdCode10, parcel.plat_gb_cd, parcel.bun, parcel.ji);

      try {
        const items = await fetchLandUseRegulation(pnu);
        if (items.length > 0) {
          await upsertLandUseBatch(pnu, items);
          totalProcessed += items.length;
        }
      } catch {
        // 개별 필지 실패는 무시하고 계속 진행
      }

      if (delayMs > 0) await sleep(delayMs);
    }

    console.log(`[land-use] ${lawdCd}: ${totalProcessed} records from ${parcels.length} parcels`);
    await markCompleted(state.id, totalProcessed);
    return { lawdCd, recordCount: parcels.length, isNew: totalProcessed };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await markFailed(state.id, message);
    console.error(`[land-use] ${lawdCd} failed:`, message);
    return { lawdCd, recordCount: 0, isNew: 0, error: message };
  }
}

async function upsertLandUseBatch(pnu: string, rows: LandUseRegulationRaw[]): Promise<void> {
  const client = getClient();

  // 기존 데이터 삭제 후 재삽입 (한 필지에 여러 레코드가 올 수 있으므로)
  const insertSql = `
    INSERT INTO land_use_regulation (
      pnu, ld_code, ld_code_nm, lndcgr_code_nm, lndpcl_ar,
      prpos_area1_nm, prpos_area2_nm,
      prpos_district1_nm, prpos_district2_nm,
      prpos_zone1_nm, prpos_zone2_nm,
      cnflc_at, collected_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `;

  const statements: { sql: string; args: (string | number | null)[] }[] = [
    { sql: 'DELETE FROM land_use_regulation WHERE pnu = ?', args: [pnu] },
    ...rows.map((r) => ({
      sql: insertSql,
      args: [
        pnu,
        r.ldCode ?? null,
        r.ldCodeNm ?? null,
        r.lndcgrCodeNm ?? null,
        parseFloat2(r.lndpclAr),
        r.prposArea1Nm ?? null,
        r.prposArea2Nm ?? null,
        r.prposDistrict1Nm ?? null,
        r.prposDistrict2Nm ?? null,
        r.prposZone1Nm ?? null,
        r.prposZone2Nm ?? null,
        r.cnflcAt ?? null,
      ] as (string | number | null)[],
    })),
  ];

  await client.batch(statements, 'write');
}

function parseFloat2(val: unknown): number | null {
  if (val == null || val === '') return null;
  const n = parseFloat(String(val));
  return isNaN(n) ? null : n;
}

/**
 * land_use_regulation → complexes 보강
 * 용도지역 정보를 complexes에 반영한다.
 */
export async function enrichComplexesFromLandUse(): Promise<number> {
  const client = getClient();

  // complexes 테이블에 용도지역 컬럼 추가
  const tableInfoResult = await client.execute({ sql: 'PRAGMA table_info(complexes)', args: [] });
  const cols = tableInfoResult.rows as unknown as { name: string }[];
  const colNames = new Set(cols.map((c) => c.name));

  if (!colNames.has('land_use_zone')) {
    await client.executeMultiple('ALTER TABLE complexes ADD COLUMN land_use_zone TEXT');
  }

  // building_ledger를 통해 PNU를 연결하고 용도지역 정보를 가져옴
  const result = await client.execute({
    sql: `
    UPDATE complexes SET
      land_use_zone = COALESCE(complexes.land_use_zone, (
        SELECT COALESCE(l.prpos_area1_nm, '') ||
          CASE WHEN l.prpos_area2_nm IS NOT NULL AND l.prpos_area2_nm != ''
            THEN ', ' || l.prpos_area2_nm ELSE '' END
        FROM land_use_regulation l
        JOIN building_ledger b ON
          l.pnu LIKE b.sigungu_cd || b.bjdong_cd || '%'
        WHERE b.sigungu_cd = substr(complexes.bjd_code, 1, 5)
          AND b.bjdong_cd = substr(complexes.bjd_code, 6, 5)
          AND b.main_purps_cd_nm IN ('공동주택', '아파트')
          AND l.prpos_area1_nm IS NOT NULL
        LIMIT 1
      )),
      updated_at = datetime('now')
    WHERE complexes.land_use_zone IS NULL
      AND EXISTS (
        SELECT 1 FROM building_ledger b
        WHERE b.sigungu_cd = substr(complexes.bjd_code, 1, 5)
          AND b.bjdong_cd = substr(complexes.bjd_code, 6, 5)
      )
  `,
    args: [],
  });

  return result.rowsAffected;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
