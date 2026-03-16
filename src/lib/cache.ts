/**
 * @module cache
 * @description 서버 인스턴스 내 인메모리 캐시 (Map + TTL).
 *
 * Vercel Serverless 환경에서 외부 API 응답(학교, 재개발 등)을 일시적으로
 * 보관하여 중복 호출을 줄인다. cold start 시 초기화되므로 영속 캐시가
 * 아님에 주의. 핵심 데이터(실거래가/단지)는 Turso DB에서 직접 조회하므로
 * 이 캐시의 대상이 아니다.
 *
 * TTL 기본값 (constants.ts):
 *   - 외부 API 학교/재개발: 30일
 *   - ODsay 대중교통: 미캐시 (요청마다 호출)
 */

/** 캐시 엔트리 — 데이터 본체와 만료 타임스탬프(ms)를 함께 보관 */
interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class InMemoryCache {
  private store = new Map<string, CacheEntry<unknown>>();

  get<T>(key: string): T | null {
    const entry = this.store.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      console.log(`[Cache EXPIRED] ${key}`);
      return null;
    }

    console.log(`[Cache HIT] ${key}`);
    return entry.data;
  }

  set<T>(key: string, data: T, ttl: number): void {
    this.store.set(key, {
      data,
      expiresAt: Date.now() + ttl,
    });
    console.log(`[Cache SET] ${key} (TTL: ${Math.round(ttl / 1000)}s)`);
  }

  has(key: string): boolean {
    const entry = this.store.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return false;
    }
    return true;
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  get size(): number {
    return this.store.size;
  }
}

// 싱글톤 인스턴스
export const cache = new InMemoryCache();
