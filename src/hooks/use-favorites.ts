'use client';

import { useState, useEffect, useCallback, useSyncExternalStore } from 'react';
import { useSession } from 'next-auth/react';

const STORAGE_KEY = 'favorites';
const MAX_FAVORITES = 20;
const SYNC_EVENT = 'favorites-sync';

export interface FavoriteItem {
  aptName: string;
  dong: string;
  lawdCd: string;
  latestPrice: number;
  buildYear: number;
  addedAt: string;
}

interface AddResult {
  success: boolean;
  message?: string;
}

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
  } catch {
    // storage full or unavailable
  }
  window.dispatchEvent(new CustomEvent(SYNC_EVENT));
}

// useSyncExternalStore를 사용하여 모든 훅 인스턴스가 동일 상태를 참조
let snapshot = readStorage();
let listeners = new Set<() => void>();

function notifyAll() {
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);

  const handleSync = () => {
    snapshot = readStorage();
    notifyAll();
  };

  const handleStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) handleSync();
  };

  window.addEventListener(SYNC_EVENT, handleSync);
  window.addEventListener('storage', handleStorage);

  return () => {
    listeners.delete(listener);
    window.removeEventListener(SYNC_EVENT, handleSync);
    window.removeEventListener('storage', handleStorage);
  };
}

function getSnapshot() {
  return snapshot;
}

const SERVER_SNAPSHOT: FavoriteItem[] = [];
function getServerSnapshot() {
  return SERVER_SNAPSHOT;
}

/** 서버에 즐겨찾기 추가 */
async function serverAdd(item: Omit<FavoriteItem, 'addedAt'>) {
  try {
    await fetch('/api/user/favorites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
  } catch {
    // 실패해도 로컬은 유지
  }
}

/** 서버에서 즐겨찾기 삭제 */
async function serverRemove(aptName: string, dong: string) {
  try {
    await fetch('/api/user/favorites', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ aptName, dong }),
    });
  } catch {
    // 실패해도 로컬은 유지
  }
}

/** 로그인 시 로컬 → 서버 동기화, 서버 목록으로 병합 */
async function syncToServer(localFavorites: FavoriteItem[]): Promise<FavoriteItem[]> {
  try {
    const res = await fetch('/api/user/favorites/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ favorites: localFavorites }),
    });
    if (!res.ok) return localFavorites;
    const { favorites } = await res.json();
    return favorites as FavoriteItem[];
  } catch {
    return localFavorites;
  }
}

export function useFavorites() {
  const { data: session, status } = useSession();
  const favorites = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [synced, setSynced] = useState(false);

  // 로그인 시 서버와 동기화
  useEffect(() => {
    if (status !== 'authenticated' || !session?.kakaoId || synced) return;

    const doSync = async () => {
      const local = readStorage();
      const merged = await syncToServer(local);
      snapshot = merged;
      writeStorage(merged);
      notifyAll();
      setSynced(true);
    };

    doSync();
  }, [status, session?.kakaoId, synced]);

  // 로그아웃 시 localStorage 초기화 + synced 리셋
  useEffect(() => {
    if (status === 'unauthenticated') {
      snapshot = [];
      writeStorage([]);
      notifyAll();
      setSynced(false);
    }
  }, [status]);

  const isLoggedIn = status === 'authenticated';

  const isFavorite = useCallback(
    (aptName: string, dong: string): boolean => {
      return favorites.some((f) => f.aptName === aptName && f.dong === dong);
    },
    [favorites],
  );

  const addFavorite = useCallback(
    (item: Omit<FavoriteItem, 'addedAt'>): AddResult => {
      const current = readStorage();
      if (current.length >= MAX_FAVORITES) {
        return {
          success: false,
          message: `관심단지는 최대 ${MAX_FAVORITES}개까지 등록할 수 있습니다.`,
        };
      }

      if (current.some((f) => f.aptName === item.aptName && f.dong === item.dong)) {
        return { success: true };
      }

      const newItem: FavoriteItem = {
        ...item,
        addedAt: new Date().toISOString(),
      };

      snapshot = [...current, newItem];
      writeStorage(snapshot);

      // 로그인 상태면 서버에도 저장
      if (isLoggedIn) {
        serverAdd(item);
      }

      return { success: true };
    },
    [isLoggedIn],
  );

  const removeFavorite = useCallback(
    (aptName: string, dong: string): void => {
      const current = readStorage();
      snapshot = current.filter((f) => !(f.aptName === aptName && f.dong === dong));
      writeStorage(snapshot);

      // 로그인 상태면 서버에서도 삭제
      if (isLoggedIn) {
        serverRemove(aptName, dong);
      }
    },
    [isLoggedIn],
  );

  const getFavorites = useCallback((): FavoriteItem[] => {
    return favorites;
  }, [favorites]);

  return {
    favorites,
    addFavorite,
    removeFavorite,
    isFavorite,
    getFavorites,
  };
}
