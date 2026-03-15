'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';

const STORAGE_KEY = 'comparison-history';
const MAX_HISTORY = 10;
const MAX_BOOKMARKS = 10;

export interface CompareItem {
  name: string;
  dong: string;
  lawdCd: string;
}

export interface ComparisonRecord {
  id: number | string;
  name: string;
  /** 전체 비교 항목 (name + dong + lawdCd) */
  items: CompareItem[];
  type: 'history' | 'bookmark';
  createdAt: string;
}

// ── localStorage 헬퍼 (비로그인 사용자용) ──

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

function addLocalHistory(items: CompareItem[]): void {
  const records = readLocal();
  const key = itemsKey(items);

  const existing = records.findIndex(
    (r) => r.type === 'history' && itemsKey(r.items) === key,
  );
  if (existing >= 0) {
    records[existing].createdAt = new Date().toISOString();
    records[existing].items = items; // 최신 데이터로 갱신
    records.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    writeLocal(records);
    return;
  }

  const names = items.map((i) => i.name);
  const newRecord: ComparisonRecord = {
    id: `local_${Date.now()}`,
    name: names.slice(0, 3).join(' vs ') + (names.length > 3 ? ` 외 ${names.length - 3}` : ''),
    items,
    type: 'history',
    createdAt: new Date().toISOString(),
  };

  const histories = records.filter((r) => r.type === 'history');
  if (histories.length >= MAX_HISTORY) {
    const oldest = histories[histories.length - 1];
    const idx = records.findIndex((r) => r.id === oldest.id);
    if (idx >= 0) records.splice(idx, 1);
  }

  records.unshift(newRecord);
  writeLocal(records);
}

function bookmarkLocal(id: string | number, name?: string): boolean {
  const records = readLocal();
  const bookmarks = records.filter((r) => r.type === 'bookmark');
  if (bookmarks.length >= MAX_BOOKMARKS) return false;

  const idx = records.findIndex((r) => String(r.id) === String(id));
  if (idx >= 0) {
    records[idx].type = 'bookmark';
    if (name) records[idx].name = name;
    writeLocal(records);
  }
  return true;
}

function removeLocal(id: string | number): void {
  const records = readLocal().filter((r) => String(r.id) !== String(id));
  writeLocal(records);
}

// ── Hook ──

export function useComparisons() {
  const { data: session, status } = useSession();
  const [records, setRecords] = useState<ComparisonRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const isLoggedIn = status === 'authenticated';

  const fetchRecords = useCallback(async () => {
    if (isLoggedIn) {
      setLoading(true);
      try {
        const res = await fetch('/api/user/comparisons');
        if (res.ok) {
          const { comparisons } = await res.json();
          setRecords(comparisons);
        }
      } catch {} finally {
        setLoading(false);
      }
    } else {
      setRecords(readLocal());
    }
  }, [isLoggedIn]);

  useEffect(() => {
    if (status !== 'loading') fetchRecords();
  }, [status, fetchRecords]);

  const saveHistory = useCallback(
    async (items: CompareItem[]) => {
      if (items.length < 2) return;

      if (isLoggedIn) {
        try {
          const res = await fetch('/api/user/comparisons', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items, type: 'history' }),
          });
          if (res.ok) fetchRecords();
        } catch {}
      } else {
        addLocalHistory(items);
        setRecords(readLocal());
      }
    },
    [isLoggedIn, fetchRecords],
  );

  const bookmarkComparison = useCallback(
    async (id: number | string, name?: string): Promise<{ success: boolean; error?: string }> => {
      if (isLoggedIn) {
        try {
          const res = await fetch('/api/user/comparisons', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, type: 'bookmark', name }),
          });
          if (!res.ok) {
            const data = await res.json();
            return { success: false, error: data.error };
          }
          fetchRecords();
          return { success: true };
        } catch {
          return { success: false, error: '서버 오류' };
        }
      } else {
        const ok = bookmarkLocal(id, name);
        if (!ok) return { success: false, error: `즐겨찾기는 최대 ${MAX_BOOKMARKS}개까지 저장 가능합니다.` };
        setRecords(readLocal());
        return { success: true };
      }
    },
    [isLoggedIn, fetchRecords],
  );

  const saveBookmark = useCallback(
    async (items: CompareItem[], name: string): Promise<{ success: boolean; error?: string }> => {
      if (items.length < 2) return { success: false, error: '2개 이상 필요' };

      if (isLoggedIn) {
        try {
          const res = await fetch('/api/user/comparisons', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, items, type: 'bookmark' }),
          });
          if (!res.ok) {
            const data = await res.json();
            return { success: false, error: data.error };
          }
          fetchRecords();
          return { success: true };
        } catch {
          return { success: false, error: '서버 오류' };
        }
      } else {
        const recs = readLocal();
        const bms = recs.filter((r) => r.type === 'bookmark');
        if (bms.length >= MAX_BOOKMARKS) {
          return { success: false, error: `즐겨찾기는 최대 ${MAX_BOOKMARKS}개까지 저장 가능합니다.` };
        }
        const newRec: ComparisonRecord = {
          id: `local_${Date.now()}`,
          name,
          items,
          type: 'bookmark',
          createdAt: new Date().toISOString(),
        };
        recs.unshift(newRec);
        writeLocal(recs);
        setRecords(readLocal());
        return { success: true };
      }
    },
    [isLoggedIn, fetchRecords],
  );

  const removeComparison = useCallback(
    async (id: number | string) => {
      if (isLoggedIn) {
        try {
          await fetch('/api/user/comparisons', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id }),
          });
          fetchRecords();
        } catch {}
      } else {
        removeLocal(id);
        setRecords(readLocal());
      }
    },
    [isLoggedIn, fetchRecords],
  );

  const histories = records.filter((r) => r.type === 'history');
  const bookmarks = records.filter((r) => r.type === 'bookmark');

  return {
    records,
    histories,
    bookmarks,
    loading,
    saveHistory,
    saveBookmark,
    bookmarkComparison,
    removeComparison,
    refresh: fetchRecords,
  };
}
