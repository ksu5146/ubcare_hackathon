/**
 * Kakao Maps JS SDK 지오코딩 유틸리티 (클라이언트 전용)
 * - BusinessDistrictCommute, CommuteCompare 등에서 공유
 */

declare global {
  interface Window {
    kakao: any;
  }
}

/** Promise에 타임아웃 적용 */
function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

// 모듈 레벨 지오코딩 캐시
const geocodeCache = new Map<string, { lat: number; lng: number }>();

/**
 * 전역 Kakao SDK (layout.tsx의 <Script>)가 로드될 때까지 대기.
 * autoload=false이므로 maps.load()를 호출해야 services가 활성화된다.
 */
export function waitForKakaoSdk(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(false);
      return;
    }

    if (window.kakao?.maps?.services) {
      resolve(true);
      return;
    }

    if (window.kakao?.maps) {
      window.kakao.maps.load(() => resolve(!!window.kakao.maps.services));
      return;
    }

    let elapsed = 0;
    const check = setInterval(() => {
      elapsed += 200;
      if (window.kakao?.maps?.services) {
        clearInterval(check);
        resolve(true);
      } else if (window.kakao?.maps) {
        clearInterval(check);
        window.kakao.maps.load(() => resolve(!!window.kakao.maps.services));
      } else if (elapsed >= 10000) {
        clearInterval(check);
        resolve(false);
      }
    }, 200);
  });
}

/** 주소 → 좌표 변환 (Kakao Geocoder), 5초 타임아웃 */
export function geocodeWithKakao(query: string): Promise<{ lat: number; lng: number } | null> {
  if (!query.trim()) return Promise.resolve(null);

  const cached = geocodeCache.get(`addr:${query}`);
  if (cached) return Promise.resolve(cached);

  const inner = new Promise<{ lat: number; lng: number } | null>((resolve) => {
    if (!window.kakao?.maps?.services) {
      resolve(null);
      return;
    }

    const geocoder = new window.kakao.maps.services.Geocoder();
    geocoder.addressSearch(query, (result: any[], status: string) => {
      if (status === window.kakao.maps.services.Status.OK && result.length > 0) {
        const pos = { lat: parseFloat(result[0].y), lng: parseFloat(result[0].x) };
        geocodeCache.set(`addr:${query}`, pos);
        resolve(pos);
      } else {
        resolve(null);
      }
    });
  });

  return withTimeout(inner, 5000, null);
}

/** 키워드 → 좌표 변환 (Kakao Places), 5초 타임아웃 */
export function keywordSearchWithKakao(query: string): Promise<{ lat: number; lng: number } | null> {
  if (!query.trim()) return Promise.resolve(null);

  const cached = geocodeCache.get(`kw:${query}`);
  if (cached) return Promise.resolve(cached);

  const inner = new Promise<{ lat: number; lng: number } | null>((resolve) => {
    if (!window.kakao?.maps?.services) {
      resolve(null);
      return;
    }

    const places = new window.kakao.maps.services.Places();
    places.keywordSearch(query, (result: any[], status: string) => {
      if (status === window.kakao.maps.services.Status.OK && result.length > 0) {
        const pos = { lat: parseFloat(result[0].y), lng: parseFloat(result[0].x) };
        geocodeCache.set(`kw:${query}`, pos);
        resolve(pos);
      } else {
        resolve(null);
      }
    });
  });

  return withTimeout(inner, 5000, null);
}

/** 3대 업무지구 좌표 (대표 역 기준) */
export const BUSINESS_DISTRICTS = [
  { name: '강남', station: '강남역', lat: 37.4979, lng: 127.0276 },
  { name: '여의도', station: '여의도역', lat: 37.5219, lng: 126.9245 },
  { name: '종로', station: '광화문역', lat: 37.5710, lng: 126.9769 },
] as const;

/**
 * 단지명+법정동으로 좌표 조회.
 * 도로명주소 → 키워드(동+이름) → 키워드(이름만) → 동 주소 순으로 폴백.
 */
export async function geocodeComplex(
  aptName: string,
  dong: string,
  lawdCd: string,
): Promise<{ lat: number; lng: number } | null> {
  const sdkReady = await waitForKakaoSdk();
  if (!sdkReady) return null;

  // 캐시 확인
  const cacheKey = `complex:${lawdCd}:${aptName}`;
  const cached = geocodeCache.get(cacheKey);
  if (cached) return cached;

  // 단지 도로명주소 조회 (타임아웃 3초)
  let roadAddr: string | null = null;
  try {
    const params = new URLSearchParams();
    if (lawdCd) params.set('lawdCd', lawdCd);
    const qs = params.toString();
    const url = `/api/complex/${encodeURIComponent(aptName)}${qs ? `?${qs}` : ''}`;
    const res = await withTimeout(
      fetch(url).then((r) => r.json()),
      3000,
      null,
    );
    if (res?.success && res.data) {
      roadAddr = res.data.roadAddress || res.data.address || null;
    }
  } catch {
    // 도로명주소 없이 진행
  }

  // 지오코딩 시도 순서 (빈 문자열은 자동 스킵됨)
  const queries: { query: string; type: 'address' | 'keyword' }[] = [];
  if (roadAddr) queries.push({ query: roadAddr, type: 'address' });
  if (dong) queries.push({ query: `${dong} ${aptName}`, type: 'keyword' });
  queries.push({ query: aptName, type: 'keyword' }); // 아파트명만으로도 시도
  if (dong) queries.push({ query: dong, type: 'address' });

  for (const { query, type } of queries) {
    const result = type === 'address'
      ? await geocodeWithKakao(query)
      : await keywordSearchWithKakao(query);
    if (result) {
      geocodeCache.set(cacheKey, result);
      return result;
    }
  }

  return null;
}
