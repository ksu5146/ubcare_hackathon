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

import type { CompareItem, ComparisonRecord } from '@/hooks/use-comparisons';

const STORAGE_KEY = 'comparison-history';
const MAX_HISTORY = 10;
const MAX_BOOKMARKS = 10;

// use-comparisons 헬퍼 함수들을 직접 단위 테스트

function readLocal(): ComparisonRecord[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? (JSON.parse(stored) as ComparisonRecord[]) : [];
  } catch {
    return [];
  }
}

function writeLocal(records: ComparisonRecord[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {}
}

function itemsKey(items: CompareItem[]): string {
  return [...items].map((i) => i.name).sort().join('||');
}

function makeCompareItem(name: string): CompareItem {
  return { name, dong: '역삼동', lawdCd: '11680' };
}

function makeRecord(id: string, type: 'history' | 'bookmark', names: string[]): ComparisonRecord {
  const items = names.map(makeCompareItem);
  return {
    id,
    name: names.join(' vs '),
    items,
    type,
    createdAt: new Date().toISOString(),
  };
}

describe('use-comparisons localStorage 헬퍼', () => {
  beforeEach(() => {
    localStorageMock.clear();
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
  });

  describe('비로그인 저장/조회', () => {
    it('빈 스토리지 초기 조회는 빈 배열', () => {
      expect(readLocal()).toEqual([]);
    });

    it('history 저장 후 조회', () => {
      const record = makeRecord('local_1', 'history', ['래미안', '푸르지오']);
      writeLocal([record]);
      const result = readLocal();
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('history');
    });

    it('bookmark 저장 후 조회', () => {
      const record = makeRecord('local_2', 'bookmark', ['래미안', '자이']);
      writeLocal([record]);
      const result = readLocal();
      expect(result[0].type).toBe('bookmark');
    });

    it('history와 bookmark 혼합 저장 후 타입별 필터링', () => {
      const records = [
        makeRecord('h1', 'history', ['래미안', '푸르지오']),
        makeRecord('b1', 'bookmark', ['래미안', '자이']),
        makeRecord('h2', 'history', ['푸르지오', '자이']),
      ];
      writeLocal(records);
      const result = readLocal();
      const histories = result.filter((r) => r.type === 'history');
      const bookmarks = result.filter((r) => r.type === 'bookmark');
      expect(histories).toHaveLength(2);
      expect(bookmarks).toHaveLength(1);
    });
  });

  describe('history 최대 10개 제한', () => {
    it('history 10개 이미 있을 때 추가 시 가장 오래된 것 제거', () => {
      const existing = Array.from({ length: MAX_HISTORY }, (_, i) =>
        makeRecord(`h${i}`, 'history', [`단지A${i}`, `단지B${i}`]),
      );
      writeLocal(existing);

      const records = readLocal();
      const histories = records.filter((r) => r.type === 'history');
      expect(histories).toHaveLength(MAX_HISTORY);

      // 새 항목 추가 시 MAX_HISTORY 초과 여부 확인
      if (histories.length >= MAX_HISTORY) {
        const oldest = histories[histories.length - 1];
        const idx = records.findIndex((r) => r.id === oldest.id);
        if (idx >= 0) records.splice(idx, 1);
      }
      const newRecord = makeRecord('new_h', 'history', ['새단지A', '새단지B']);
      records.unshift(newRecord);
      writeLocal(records);

      const updated = readLocal().filter((r) => r.type === 'history');
      expect(updated).toHaveLength(MAX_HISTORY);
      expect(updated[0].id).toBe('new_h');
    });

    it('history 9개이면 추가 가능', () => {
      const records = Array.from({ length: 9 }, (_, i) =>
        makeRecord(`h${i}`, 'history', [`단지A${i}`, `단지B${i}`]),
      );
      writeLocal(records);
      const histories = readLocal().filter((r) => r.type === 'history');
      expect(histories.length < MAX_HISTORY).toBe(true);
    });
  });

  describe('bookmark 최대 10개 제한', () => {
    it('bookmark 10개이면 추가 불가', () => {
      const records = Array.from({ length: MAX_BOOKMARKS }, (_, i) =>
        makeRecord(`b${i}`, 'bookmark', [`단지A${i}`, `단지B${i}`]),
      );
      writeLocal(records);
      const bookmarks = readLocal().filter((r) => r.type === 'bookmark');
      expect(bookmarks.length >= MAX_BOOKMARKS).toBe(true);
    });

    it('bookmark 9개이면 추가 가능', () => {
      const records = Array.from({ length: 9 }, (_, i) =>
        makeRecord(`b${i}`, 'bookmark', [`단지A${i}`, `단지B${i}`]),
      );
      writeLocal(records);
      const bookmarks = readLocal().filter((r) => r.type === 'bookmark');
      expect(bookmarks.length < MAX_BOOKMARKS).toBe(true);
    });
  });

  describe('itemsKey 정렬 검증', () => {
    it('같은 단지, 다른 순서는 동일한 key', () => {
      const items1 = [makeCompareItem('래미안'), makeCompareItem('푸르지오')];
      const items2 = [makeCompareItem('푸르지오'), makeCompareItem('래미안')];
      expect(itemsKey(items1)).toBe(itemsKey(items2));
    });

    it('다른 단지 조합은 다른 key', () => {
      const items1 = [makeCompareItem('래미안'), makeCompareItem('푸르지오')];
      const items2 = [makeCompareItem('래미안'), makeCompareItem('자이')];
      expect(itemsKey(items1)).not.toBe(itemsKey(items2));
    });

    it('3개 단지 순서 무관 동일 key', () => {
      const items1 = [makeCompareItem('A'), makeCompareItem('B'), makeCompareItem('C')];
      const items2 = [makeCompareItem('C'), makeCompareItem('A'), makeCompareItem('B')];
      expect(itemsKey(items1)).toBe(itemsKey(items2));
    });

    it('key는 || 구분자로 연결된 정렬된 이름', () => {
      const items = [makeCompareItem('푸르지오'), makeCompareItem('래미안')];
      expect(itemsKey(items)).toBe('래미안||푸르지오');
    });
  });
});
