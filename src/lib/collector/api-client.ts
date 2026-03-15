import { DATA_GO_KR_BASE_URL, API_PATHS } from '../constants';
import type { ComplexListItem } from './types';

function getServiceKey(): string {
  return process.env.DATA_GO_KR_API_KEY ?? '';
}

/**
 * data.go.kr API 호출 공통 클라이언트
 *
 * 주의: 서비스키는 .env.local에 이미 URL-인코딩된 상태로 저장되어 있으므로
 * URLSearchParams를 사용하면 이중 인코딩된다.
 * 따라서 URL 문자열을 직접 조립한다.
 */
export async function fetchDataGoKr<T>(
  apiPath: string,
  params: Record<string, string | number>,
  options?: { timeoutMs?: number },
): Promise<T[]> {
  const timeoutMs = options?.timeoutMs ?? 10_000;

  // 서비스키를 제외한 파라미터를 URLSearchParams로 인코딩
  const searchParams = new URLSearchParams();
  searchParams.set('_type', 'json');
  searchParams.set('numOfRows', '9999');
  for (const [key, value] of Object.entries(params)) {
    searchParams.set(key, String(value));
  }

  // 서비스키는 이미 인코딩되어 있으므로 직접 붙인다
  const url = `${DATA_GO_KR_BASE_URL}${apiPath}?serviceKey=${getServiceKey()}&${searchParams.toString()}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, { signal: controller.signal });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText} — ${url}`);
    }

    const json = await res.json();

    // data.go.kr 공통 응답 구조 파싱
    const header = json?.response?.header;
    // data.go.kr returns '00' or '000' for success
    if (header?.resultCode !== '00' && header?.resultCode !== '000') {
      throw new Error(
        `API Error [${header?.resultCode}]: ${header?.resultMsg ?? 'unknown'} — ${apiPath}`,
      );
    }

    const body = json?.response?.body;
    if (!body) return [];

    // data.go.kr 응답 구조 2가지:
    // 1) body.items.item (실거래가 등 다건 응답)
    // 2) body.item (V4 단지정보 등 단건 응답)
    const items = body.items?.item ?? body.item;
    if (!items) return [];

    // 단건이면 배열로 감싸기
    return Array.isArray(items) ? items : [items];
  } finally {
    clearTimeout(timer);
  }
}

/** 실거래가 조회 */
export function fetchTrades(lawdCd: string, dealYmd: string) {
  return fetchDataGoKr(API_PATHS.APARTMENT_TRADE, {
    LAWD_CD: lawdCd,
    DEAL_YMD: dealYmd,
  }, { timeoutMs: 15_000 });
}

/** 법정동 기준 단지 목록 조회 (V3) — getLegaldongAptList3 */
export function fetchComplexList(bjdCode: string) {
  return fetchDataGoKr(API_PATHS.COMPLEX_LIST, {
    bjdCode,
  });
}

/**
 * 전체 단지 목록 조회 (V3) — getTotalAptList3
 *
 * getLegaldongAptList3가 비활성화된 경우 대안으로 사용한다.
 * 이 API는 bjdCode 필터를 지원하지 않으므로 전체를 페이지네이션으로 가져온 뒤
 * 호출자가 직접 필터링해야 한다.
 *
 * 응답 구조가 다름: body.items 가 바로 배열 (body.items.item 아님)
 */
export async function fetchAllComplexList(
  pageNo: number,
  numOfRows: number,
): Promise<{ items: ComplexListItem[]; totalCount: number }> {
  const timeoutMs = 15_000;
  const searchParams = new URLSearchParams();
  searchParams.set('_type', 'json');
  searchParams.set('pageNo', String(pageNo));
  searchParams.set('numOfRows', String(numOfRows));

  const url = `${DATA_GO_KR_BASE_URL}${API_PATHS.COMPLEX_LIST_ALL}?serviceKey=${getServiceKey()}&${searchParams.toString()}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, { signal: controller.signal });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const json = await res.json();
    const header = json?.response?.header;
    if (header?.resultCode !== '00' && header?.resultCode !== '000') {
      throw new Error(
        `API Error [${header?.resultCode}]: ${header?.resultMsg ?? 'unknown'}`,
      );
    }

    const body = json?.response?.body;
    if (!body) return { items: [], totalCount: 0 };

    // getTotalAptList3: body.items 가 바로 배열
    const items = body.items;
    if (!items) return { items: [], totalCount: body.totalCount ?? 0 };

    const list = Array.isArray(items) ? items : [items];
    return { items: list as ComplexListItem[], totalCount: body.totalCount ?? list.length };
  } finally {
    clearTimeout(timer);
  }
}

/** 단지 기본정보 조회 (V4) */
export function fetchComplexBasic(kaptCode: string) {
  return fetchDataGoKr(API_PATHS.COMPLEX_DETAIL, {
    kaptCode,
  });
}

/** 단지 상세정보 조회 (V4) */
export function fetchComplexDetail(kaptCode: string) {
  return fetchDataGoKr(API_PATHS.COMPLEX_DETAIL_EXT, {
    kaptCode,
  });
}
