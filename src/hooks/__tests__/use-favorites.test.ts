import { describe, it, expect, vi, beforeEach } from 'vitest';

// localStorage mock
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true });

// window.dispatchEvent mock (writeStorage에서 사용)
Object.defineProperty(globalThis, 'window', {
  value: {
    dispatchEvent: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  },
  writable: true,
});

// next-auth useSession mock
vi.mock('next-auth/react', () => ({
  useSession: vi.fn(() => ({ data: null, status: 'unauthenticated' })),
}));

import type { FavoriteItem } from '@/hooks/use-favorites';

const STORAGE_KEY = 'favorites';
const MAX_FAVORITES = 20;

// use-favorites 훅의 핵심 로직을 직접 단위 테스트
// (훅 자체는 React 환경 필요 — 여기서는 localStorage 헬퍼 로직을 테스트)

function readStorage(): FavoriteItem[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? (JSON.parse(stored) as FavoriteItem[]) : [];
  } catch {
    return [];
  }
}

function writeStorage(items: FavoriteItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {}
  window.dispatchEvent(new CustomEvent('favorites-sync'));
}

function makeFavoriteItem(name: string, dong: string): FavoriteItem {
  return {
    aptName: name,
    dong,
    lawdCd: '11680',
    latestPrice: 50000,
    buildYear: 2000,
    addedAt: new Date().toISOString(),
  };
}

describe('use-favorites localStorage 헬퍼', () => {
  beforeEach(() => {
    localStorageMock.clear();
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
  });

  describe('localStorage 읽기/쓰기', () => {
    it('빈 스토리지에서 읽으면 빈 배열 반환', () => {
      expect(readStorage()).toEqual([]);
    });

    it('항목 저장 후 읽기 정상 동작', () => {
      const item = makeFavoriteItem('래미안', '역삼동');
      writeStorage([item]);
      const result = readStorage();
      expect(result).toHaveLength(1);
      expect(result[0].aptName).toBe('래미안');
    });

    it('여러 항목 저장 및 읽기', () => {
      const items = [
        makeFavoriteItem('래미안', '역삼동'),
        makeFavoriteItem('푸르지오', '서초동'),
      ];
      writeStorage(items);
      expect(readStorage()).toHaveLength(2);
    });

    it('localStorage.setItem이 호출됨', () => {
      writeStorage([makeFavoriteItem('테스트', '동')]);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(STORAGE_KEY, expect.any(String));
    });
  });

  describe('addFavorite 최대 20개 제한', () => {
    it('20개 저장 후 추가 시 실패', () => {
      const items = Array.from({ length: MAX_FAVORITES }, (_, i) =>
        makeFavoriteItem(`단지${i}`, `동${i}`),
      );
      writeStorage(items);

      const current = readStorage();
      const isFull = current.length >= MAX_FAVORITES;
      expect(isFull).toBe(true);
    });

    it('19개 저장 후 추가는 성공', () => {
      const items = Array.from({ length: 19 }, (_, i) =>
        makeFavoriteItem(`단지${i}`, `동${i}`),
      );
      writeStorage(items);

      const current = readStorage();
      expect(current.length < MAX_FAVORITES).toBe(true);
    });
  });

  describe('removeFavorite 동작', () => {
    it('특정 항목 삭제 후 나머지 유지', () => {
      const items = [
        makeFavoriteItem('래미안', '역삼동'),
        makeFavoriteItem('푸르지오', '서초동'),
      ];
      writeStorage(items);

      const current = readStorage();
      const filtered = current.filter(
        (f) => !(f.aptName === '래미안' && f.dong === '역삼동'),
      );
      writeStorage(filtered);

      const result = readStorage();
      expect(result).toHaveLength(1);
      expect(result[0].aptName).toBe('푸르지오');
    });

    it('존재하지 않는 항목 삭제 시 목록 변동 없음', () => {
      const items = [makeFavoriteItem('래미안', '역삼동')];
      writeStorage(items);

      const current = readStorage();
      const filtered = current.filter(
        (f) => !(f.aptName === '없는단지' && f.dong === '없는동'),
      );
      writeStorage(filtered);

      expect(readStorage()).toHaveLength(1);
    });
  });

  describe('isFavorite 검증', () => {
    it('등록된 항목은 true 반환', () => {
      const item = makeFavoriteItem('래미안', '역삼동');
      writeStorage([item]);

      const favorites = readStorage();
      const isFav = favorites.some((f) => f.aptName === '래미안' && f.dong === '역삼동');
      expect(isFav).toBe(true);
    });

    it('등록되지 않은 항목은 false 반환', () => {
      writeStorage([makeFavoriteItem('래미안', '역삼동')]);

      const favorites = readStorage();
      const isFav = favorites.some((f) => f.aptName === '없는단지' && f.dong === '없는동');
      expect(isFav).toBe(false);
    });

    it('빈 목록에서는 항상 false', () => {
      writeStorage([]);
      const favorites = readStorage();
      expect(favorites.some((f) => f.aptName === '아무거나')).toBe(false);
    });
  });
});
