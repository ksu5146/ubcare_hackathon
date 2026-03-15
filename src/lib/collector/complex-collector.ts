import { getClient } from '../db';
import { fetchComplexList, fetchAllComplexList, fetchComplexBasic, fetchComplexDetail } from './api-client';
import { upsertPending, markInProgress, markCompleted, markFailed } from './state';
import { KAKAO_LOCAL_API_URL } from '../constants';
import type { ComplexListItem, ComplexBasicInfo, ComplexDetailInfo, CollectionResult } from './types';

/**
 * 전체 단지 목록을 페이지네이션으로 가져온다 (getTotalAptList3).
 * getLegaldongAptList3가 비활성화된 경우의 대안.
 */
export async function fetchAllComplexes(
  options?: { pageSize?: number; delayMs?: number },
): Promise<ComplexListItem[]> {
  const pageSize = options?.pageSize ?? 1000;
  const delayMs = options?.delayMs ?? 300;
  const allItems: ComplexListItem[] = [];

  // 첫 페이지로 totalCount 확인
  const first = await fetchAllComplexList(1, pageSize);
  allItems.push(...first.items);

  const totalPages = Math.ceil(first.totalCount / pageSize);
  console.log(`[complex-collector] Total complexes: ${first.totalCount}, pages: ${totalPages}`);

  for (let page = 2; page <= totalPages; page++) {
    const result = await fetchAllComplexList(page, pageSize);
    allItems.push(...result.items);

    if (delayMs > 0) {
      await sleep(delayMs);
    }
  }

  return allItems;
}

/**
 * 특정 법정동의 단지 목록 → 기본정보 → 상세정보를 순차 수집하여 DB에 저장한다.
 * INSERT OR REPLACE로 최신 정보로 갱신한다.
 */
export async function collectComplexes(
  lawdCd: string,
  options?: { concurrency?: number; delayMs?: number },
): Promise<CollectionResult> {
  const concurrency = options?.concurrency ?? 2;
  const delayMs = options?.delayMs ?? 300;

  const state = await upsertPending('complex', lawdCd);
  await markInProgress(state.id);

  try {
    // 1) 법정동 기준 단지 목록 조회
    const bjdCode = lawdCd.length === 5 ? lawdCd + '00000' : lawdCd;
    const listItems = await fetchComplexList(bjdCode) as ComplexListItem[];

    if (listItems.length === 0) {
      await markCompleted(state.id, 0);
      return { lawdCd, recordCount: 0, isNew: 0 };
    }

    // 2) 단지별 기본정보 + 상세정보 조회 (동시성 제한)
    let processed = 0;
    const kaptCodes = listItems.map((item) => ({
      kaptCode: item.kaptCode,
      kaptName: item.kaptName,
      bjdCode: item.bjdCode,
      as1: item.as1,
      as2: item.as2,
      as3: item.as3,
    }));

    for (let i = 0; i < kaptCodes.length; i += concurrency) {
      const batch = kaptCodes.slice(i, i + concurrency);

      await Promise.all(
        batch.map((item) => fetchAndUpsertComplex(item)),
      );

      processed += batch.length;

      if (i + concurrency < kaptCodes.length && delayMs > 0) {
        await sleep(delayMs);
      }
    }

    await markCompleted(state.id, processed);
    return { lawdCd, recordCount: listItems.length, isNew: processed };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await markFailed(state.id, message);
    return { lawdCd, recordCount: 0, isNew: 0, error: message };
  }
}

/**
 * 미리 가져온 단지 목록에서 특정 지역의 단지를 DB에 수집한다.
 * getTotalAptList3 → 필터링 → 기본/상세정보 조회 방식.
 */
export async function collectComplexesFromList(
  lawdCd: string,
  preloadedList: ComplexListItem[],
  options?: { concurrency?: number; delayMs?: number },
): Promise<CollectionResult> {
  const concurrency = options?.concurrency ?? 2;
  const delayMs = options?.delayMs ?? 300;

  const state = await upsertPending('complex', lawdCd);
  await markInProgress(state.id);

  try {
    // lawdCd(5자리)로 필터
    const filtered = preloadedList.filter(
      (item) => item.bjdCode.substring(0, 5) === lawdCd,
    );

    if (filtered.length === 0) {
      await markCompleted(state.id, 0);
      return { lawdCd, recordCount: 0, isNew: 0 };
    }

    let processed = 0;
    const kaptCodes = filtered.map((item) => ({
      kaptCode: item.kaptCode,
      kaptName: item.kaptName,
      bjdCode: item.bjdCode,
      as1: item.as1,
      as2: item.as2,
      as3: item.as3,
    }));

    for (let i = 0; i < kaptCodes.length; i += concurrency) {
      const batch = kaptCodes.slice(i, i + concurrency);

      await Promise.all(
        batch.map((item) => fetchAndUpsertComplex(item)),
      );

      processed += batch.length;

      if (i + concurrency < kaptCodes.length && delayMs > 0) {
        await sleep(delayMs);
      }
    }

    await markCompleted(state.id, processed);
    return { lawdCd, recordCount: filtered.length, isNew: processed };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await markFailed(state.id, message);
    return { lawdCd, recordCount: 0, isNew: 0, error: message };
  }
}

// ─── 내부 함수 ───

interface ListItemMeta {
  kaptCode: string;
  kaptName: string;
  bjdCode: string;
  as1: string;
  as2: string;
  as3: string;
}

async function fetchAndUpsertComplex(meta: ListItemMeta): Promise<void> {
  try {
    // 기본정보 + 상세정보 병렬 조회
    const [basicItems, detailItems] = await Promise.all([
      fetchComplexBasic(meta.kaptCode) as Promise<ComplexBasicInfo[]>,
      fetchComplexDetail(meta.kaptCode) as Promise<ComplexDetailInfo[]>,
    ]);

    const basic = basicItems[0];
    const detail = detailItems[0];

    // 도로명주소가 있으면 지오코딩하여 좌표 저장
    const address = basic?.doroJuso ?? basic?.kaptAddr;
    let coords: { lat: number; lng: number } | null = null;
    if (address) {
      coords = await geocodeAddress(address);
    }

    await upsertComplex(meta, basic, detail, coords);
  } catch {
    // 개별 단지 실패는 무시하고 계속 진행
    console.warn(`[complex-collector] Failed to fetch ${meta.kaptCode} (${meta.kaptName})`);
  }
}

async function upsertComplex(
  meta: ListItemMeta,
  basic?: ComplexBasicInfo,
  detail?: ComplexDetailInfo,
  coords?: { lat: number; lng: number } | null,
): Promise<void> {
  const client = getClient();

  await client.execute({
    sql: `
    INSERT INTO complexes (
      kapt_code, apt_nm, bjd_code, addr, road_addr,
      as1, as2, as3, lat, lng,
      total_unit, ho_cnt, dong_cnt, top_floor, base_floor,
      heat_type, hall_type, sale_type, apt_type, mgr_type,
      builder, developer, use_date, total_area,
      area_under60, area_60_85, area_85_135, area_over135,
      parking_ground, parking_underground, elevator_cnt, cctv_cnt,
      structure, subway_line, subway_time,
      welfare_facility, education_facility, convenient_facility,
      updated_at
    ) VALUES (
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?,
      ?, ?, ?,
      datetime('now')
    )
    ON CONFLICT(kapt_code) DO UPDATE SET
      apt_nm = excluded.apt_nm,
      addr = excluded.addr,
      road_addr = excluded.road_addr,
      lat = COALESCE(excluded.lat, complexes.lat),
      lng = COALESCE(excluded.lng, complexes.lng),
      total_unit = excluded.total_unit,
      ho_cnt = excluded.ho_cnt,
      dong_cnt = excluded.dong_cnt,
      top_floor = excluded.top_floor,
      base_floor = excluded.base_floor,
      heat_type = excluded.heat_type,
      hall_type = excluded.hall_type,
      sale_type = excluded.sale_type,
      apt_type = excluded.apt_type,
      mgr_type = excluded.mgr_type,
      builder = excluded.builder,
      developer = excluded.developer,
      total_area = excluded.total_area,
      area_under60 = excluded.area_under60,
      area_60_85 = excluded.area_60_85,
      area_85_135 = excluded.area_85_135,
      area_over135 = excluded.area_over135,
      parking_ground = excluded.parking_ground,
      parking_underground = excluded.parking_underground,
      elevator_cnt = excluded.elevator_cnt,
      cctv_cnt = excluded.cctv_cnt,
      structure = excluded.structure,
      subway_line = excluded.subway_line,
      subway_time = excluded.subway_time,
      welfare_facility = excluded.welfare_facility,
      education_facility = excluded.education_facility,
      convenient_facility = excluded.convenient_facility,
      updated_at = datetime('now')
  `,
    args: [
      meta.kaptCode,
      basic?.kaptName ?? meta.kaptName,
      meta.bjdCode,
      basic?.kaptAddr ?? null,
      basic?.doroJuso ?? null,
      meta.as1,
      meta.as2,
      meta.as3,
      coords?.lat ?? null,
      coords?.lng ?? null,
      basic?.kaptdaCnt ?? null,
      basic?.hoCnt ?? null,
      parseIntSafe(basic?.kaptDongCnt),
      basic?.kaptTopFloor ?? null,
      basic?.kaptBaseFloor ?? null,
      basic?.codeHeatNm ?? null,
      basic?.codeHallNm ?? null,
      basic?.codeSaleNm ?? null,
      basic?.codeAptNm ?? null,
      basic?.codeMgrNm ?? null,
      basic?.kaptBcompany ?? null,
      basic?.kaptAcompany ?? null,
      basic?.kaptUsedate ?? null,
      basic?.kaptTarea ?? null,
      basic?.kaptMparea60 ?? null,
      basic?.kaptMparea85 ?? null,
      basic?.kaptMparea135 ?? null,
      basic?.kaptMparea136 ?? null,
      parseIntSafe(detail?.kaptdPcnt),
      parseIntSafe(detail?.kaptdPcntu),
      detail?.kaptdEcnt ?? null,
      parseIntSafe(detail?.kaptdCccnt),
      detail?.codeStr ?? null,
      detail?.subwayLine ?? null,
      detail?.kaptdWtimesub ?? null,
      detail?.welfareFacility ?? null,
      detail?.educationFacility ?? null,
      detail?.convenientFacility ?? null,
    ],
  });
}

function parseIntSafe(val: string | number | null | undefined): number | null {
  if (val == null || val === '') return null;
  const num = typeof val === 'number' ? val : parseInt(val, 10);
  return isNaN(num) ? null : num;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  const apiKey = process.env.KAKAO_REST_API_KEY;
  if (!apiKey) return null;

  try {
    const client = getClient();

    // DB 캐시 확인
    const cacheResult = await client.execute({
      sql: 'SELECT lat, lng FROM geocode_cache WHERE address = ?',
      args: [address],
    });
    const cached = cacheResult.rows[0] as unknown as { lat: number; lng: number } | undefined;
    if (cached) return cached;

    // Kakao 주소 검색
    const url = `${KAKAO_LOCAL_API_URL}/search/address.json?query=${encodeURIComponent(address)}&size=1`;
    const res = await fetch(url, {
      headers: { Authorization: `KakaoAK ${apiKey}` },
      signal: AbortSignal.timeout(5000),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.documents?.length > 0) {
        const coords = { lat: parseFloat(data.documents[0].y), lng: parseFloat(data.documents[0].x) };
        await client.execute({
          sql: 'INSERT OR REPLACE INTO geocode_cache (address, lat, lng) VALUES (?, ?, ?)',
          args: [address, coords.lat, coords.lng],
        });
        return coords;
      }
    }

    return null;
  } catch {
    return null;
  }
}
