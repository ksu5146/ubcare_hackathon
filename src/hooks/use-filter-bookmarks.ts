'use client';

import { useState, useCallback, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import type { FilterState } from '@/types/filter';

export interface FilterBookmark {
  id: string | number;
  name: string;
  filters: FilterState;
  createdAt: string;
}

const STORAGE_KEY = 'real-estate-filter-bookmarks';
const MAX_BOOKMARKS = 10;

// ── localStorage 헬퍼 (비로그인 사용자용) ──

function loadLocalBookmarks(): FilterBookmark[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as FilterBookmark[]) : [];
  } catch {
    return [];
  }
}

function saveLocalBookmarks(bookmarks: FilterBookmark[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks));
  } catch {
    // localStorage full or unavailable
  }
}

export function useFilterBookmarks() {
  const { data: session, status } = useSession();
  const [bookmarks, setBookmarks] = useState<FilterBookmark[]>([]);
  const [loading, setLoading] = useState(false);

  const isLoggedIn = status === 'authenticated';

  // 초기 로드 및 로그인 상태 변화 시 재로드
  const fetchBookmarks = useCallback(async () => {
    if (isLoggedIn) {
      setLoading(true);
      try {
        const res = await fetch('/api/user/filter-bookmarks');
        if (res.ok) {
          const { bookmarks: data } = await res.json();
          setBookmarks(data);
        }
      } catch {
        // 실패 시 빈 목록 유지
      } finally {
        setLoading(false);
      }
    } else {
      setBookmarks(loadLocalBookmarks());
    }
  }, [isLoggedIn]);

  useEffect(() => {
    if (status !== 'loading') fetchBookmarks();
  }, [status, fetchBookmarks]);

  const addBookmark = useCallback(
    async (name: string, filters: FilterState): Promise<boolean> => {
      if (isLoggedIn) {
        try {
          const res = await fetch('/api/user/filter-bookmarks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, filters }),
          });
          if (!res.ok) return false;
          await fetchBookmarks();
          return true;
        } catch {
          return false;
        }
      } else {
        const current = loadLocalBookmarks();
        if (current.length >= MAX_BOOKMARKS) return false;

        const bookmark: FilterBookmark = {
          id: Date.now().toString(36),
          name,
          filters,
          createdAt: new Date().toISOString(),
        };

        const next = [bookmark, ...current];
        saveLocalBookmarks(next);
        setBookmarks(next);
        return true;
      }
    },
    [isLoggedIn, fetchBookmarks],
  );

  const removeBookmark = useCallback(
    async (id: string | number) => {
      if (isLoggedIn) {
        try {
          await fetch('/api/user/filter-bookmarks', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id }),
          });
          await fetchBookmarks();
        } catch {
          // 실패해도 로컬 UI는 유지
        }
      } else {
        const next = loadLocalBookmarks().filter((b) => String(b.id) !== String(id));
        saveLocalBookmarks(next);
        setBookmarks(next);
      }
    },
    [isLoggedIn, fetchBookmarks],
  );

  const renameBookmark = useCallback(
    async (id: string | number, name: string) => {
      if (isLoggedIn) {
        // 서버에는 rename 전용 엔드포인트가 없으므로 로컬 낙관적 업데이트만 수행
        setBookmarks((prev) =>
          prev.map((b) => (String(b.id) === String(id) ? { ...b, name } : b)),
        );
      } else {
        const current = loadLocalBookmarks();
        const target = current.find((b) => String(b.id) === String(id));
        if (!target) return;
        target.name = name;
        saveLocalBookmarks(current);
        setBookmarks([...current]);
      }
    },
    [isLoggedIn],
  );

  return {
    bookmarks,
    loading,
    addBookmark,
    removeBookmark,
    renameBookmark,
    maxBookmarks: MAX_BOOKMARKS,
  };
}
