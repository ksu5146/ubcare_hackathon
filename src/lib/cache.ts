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
