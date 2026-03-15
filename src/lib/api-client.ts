import { API_CONFIG } from './constants';
import { cache } from './cache';

interface FetchWithCacheOptions {
  /** 캐시 키 */
  cacheKey?: string;
  /** 캐시 TTL (밀리초) */
  cacheTtl?: number;
  /** 타임아웃 (밀리초) */
  timeout?: number;
}

/**
 * 공공데이터 API 공통 호출 함수
 * - 타임아웃 처리
 * - 1회 자동 재시도
 * - 캐시 레이어
 */
export async function fetchWithCache<T>(
  url: string,
  options: FetchWithCacheOptions = {},
): Promise<T> {
  const {
    cacheKey,
    cacheTtl,
    timeout = API_CONFIG.TIMEOUT,
  } = options;

  // 캐시 확인
  if (cacheKey && cacheTtl) {
    const cached = cache.get<T>(cacheKey);
    if (cached) return cached;
  }

  // 요청 실행 (재시도 포함)
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= API_CONFIG.MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`API 응답 오류: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as T;

      // 캐시 저장
      if (cacheKey && cacheTtl) {
        cache.set(cacheKey, data, cacheTtl);
      }

      return data;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < API_CONFIG.MAX_RETRIES) {
        console.warn(`[API 재시도] ${attempt + 1}/${API_CONFIG.MAX_RETRIES}: ${url}`);
      }
    }
  }

  throw lastError ?? new Error('알 수 없는 API 오류');
}

/**
 * data.go.kr API URL 빌더
 */
export function buildDataGoKrUrl(
  basePath: string,
  params: Record<string, string | number>,
): string {
  const serviceKey = process.env.DATA_GO_KR_API_KEY;
  if (!serviceKey) throw new Error('DATA_GO_KR_API_KEY 환경변수가 설정되지 않았습니다');

  const searchParams = new URLSearchParams({
    serviceKey,
    _type: 'json',
    ...Object.fromEntries(
      Object.entries(params).map(([k, v]) => [k, String(v)]),
    ),
  });

  return `https://apis.data.go.kr/1613000${basePath}?${searchParams.toString()}`;
}
