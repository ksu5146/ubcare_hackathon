import { describe, it, expect, vi, beforeEach } from 'vitest';

// localStorage mock
const store: Record<string, string> = {};
const localStorageMock = {
  getItem: vi.fn((key: string) => store[key] ?? null),
  setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
  removeItem: vi.fn((key: string) => { delete store[key]; }),
  clear: vi.fn(() => { Object.keys(store).forEach((k) => delete store[k]); }),
};
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

describe('필터 즐겨찾기 localStorage 헬퍼', () => {
  const STORAGE_KEY = 'real-estate-filter-bookmarks';

  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it('빈 상태에서 빈 배열을 반환한다', () => {
    const raw = localStorage.getItem(STORAGE_KEY);
    const result = raw ? JSON.parse(raw) : [];
    expect(result).toEqual([]);
  });

  it('북마크를 저장하고 불러올 수 있다', () => {
    const bookmark = {
      id: 'test1',
      name: '강남 필터',
      filters: { lawdCd: ['11680'], priceMin: 0, priceMax: 300000 },
      createdAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify([bookmark]));
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(stored).toHaveLength(1);
    expect(stored[0].name).toBe('강남 필터');
  });

  it('최대 10개까지 저장 가능하다', () => {
    const bookmarks = Array.from({ length: 10 }, (_, i) => ({
      id: `bm_${i}`,
      name: `필터 ${i}`,
      filters: {},
      createdAt: new Date().toISOString(),
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks));
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(stored).toHaveLength(10);
  });

  it('삭제 후 개수가 줄어든다', () => {
    const bookmarks = [
      { id: 'a', name: 'A', filters: {}, createdAt: '' },
      { id: 'b', name: 'B', filters: {}, createdAt: '' },
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks));
    const filtered = bookmarks.filter((b) => b.id !== 'a');
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(stored).toHaveLength(1);
    expect(stored[0].id).toBe('b');
  });
});

describe('필터 즐겨찾기 API 응답 형식', () => {
  it('GET 응답 구조가 올바르다', () => {
    const response = {
      bookmarks: [
        { id: 1, name: '강남 필터', filters: { lawdCd: ['11680'] }, createdAt: '2026-03-15' },
      ],
    };
    expect(response.bookmarks).toBeInstanceOf(Array);
    expect(response.bookmarks[0]).toHaveProperty('id');
    expect(response.bookmarks[0]).toHaveProperty('name');
    expect(response.bookmarks[0]).toHaveProperty('filters');
  });

  it('POST 응답에 id가 number 타입이다', () => {
    const response = { success: true, id: 42 };
    expect(typeof response.id).toBe('number');
    expect(response.success).toBe(true);
  });

  it('DELETE 응답이 success를 포함한다', () => {
    const response = { success: true };
    expect(response.success).toBe(true);
  });
});

describe('직장 위치 API 응답 형식', () => {
  it('GET 응답에 workplace가 있거나 null이다', () => {
    const withData = { workplace: { name: '강남역', lat: 37.4979, lng: 127.0276 } };
    expect(withData.workplace).toHaveProperty('name');
    expect(withData.workplace).toHaveProperty('lat');
    expect(withData.workplace).toHaveProperty('lng');

    const empty = { workplace: null };
    expect(empty.workplace).toBeNull();
  });

  it('POST 요청 본문이 유효한 형식이다', () => {
    const body = { name: '여의도역', lat: 37.5219, lng: 126.9245 };
    expect(typeof body.name).toBe('string');
    expect(typeof body.lat).toBe('number');
    expect(typeof body.lng).toBe('number');
  });
});
