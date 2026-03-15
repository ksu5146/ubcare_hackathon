'use client';

import { useState, useCallback, useEffect } from 'react';
import type { FilterState } from '@/types/filter';

export interface FilterBookmark {
  id: string;
  name: string;
  filters: FilterState;
  createdAt: string;
}

const STORAGE_KEY = 'real-estate-filter-bookmarks';
const MAX_BOOKMARKS = 10;

function loadBookmarks(): FilterBookmark[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveBookmarks(bookmarks: FilterBookmark[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks));
  } catch {
    // localStorage full or unavailable
  }
}

export function useFilterBookmarks() {
  const [bookmarks, setBookmarks] = useState<FilterBookmark[]>([]);

  // 초기 로드
  useEffect(() => {
    setBookmarks(loadBookmarks());
  }, []);

  const addBookmark = useCallback((name: string, filters: FilterState): boolean => {
    const current = loadBookmarks();
    if (current.length >= MAX_BOOKMARKS) return false;

    const bookmark: FilterBookmark = {
      id: Date.now().toString(36),
      name,
      filters,
      createdAt: new Date().toISOString(),
    };

    const next = [bookmark, ...current];
    saveBookmarks(next);
    setBookmarks(next);
    return true;
  }, []);

  const removeBookmark = useCallback((id: string) => {
    const next = loadBookmarks().filter((b) => b.id !== id);
    saveBookmarks(next);
    setBookmarks(next);
  }, []);

  const renameBookmark = useCallback((id: string, name: string) => {
    const current = loadBookmarks();
    const target = current.find((b) => b.id === id);
    if (!target) return;
    target.name = name;
    saveBookmarks(current);
    setBookmarks([...current]);
  }, []);

  return { bookmarks, addBookmark, removeBookmark, renameBookmark, maxBookmarks: MAX_BOOKMARKS };
}
