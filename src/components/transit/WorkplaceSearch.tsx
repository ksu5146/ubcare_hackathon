'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, MapPin, Clock, X } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { cn } from '@/lib/utils';
import type { LocationSearchResult } from '@/types/location';

interface WorkplaceSearchProps {
  onSelect: (place: { name: string; lat: number; lng: number }) => void;
}

const STORAGE_KEY = 'recentWorkplaces';
const MAX_RECENT = 5;

interface RecentPlace {
  name: string;
  lat: number;
  lng: number;
}

function getRecentSearches(): RecentPlace[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? (JSON.parse(stored) as RecentPlace[]) : [];
  } catch {
    return [];
  }
}

function saveRecentSearch(place: RecentPlace): void {
  try {
    const recents = getRecentSearches().filter((r) => r.name !== place.name);
    recents.unshift(place);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recents.slice(0, MAX_RECENT)));
  } catch {
    // localStorage 사용 불가 시 무시
  }
}

// ── DB API 헬퍼 (로그인 사용자용) ──

async function fetchSavedWorkplace(): Promise<RecentPlace | null> {
  try {
    const res = await fetch('/api/user/workplace');
    if (!res.ok) return null;
    const { workplace } = await res.json();
    return workplace ? { name: workplace.name, lat: workplace.lat, lng: workplace.lng } : null;
  } catch {
    return null;
  }
}

async function saveWorkplaceToDb(place: RecentPlace): Promise<void> {
  try {
    await fetch('/api/user/workplace', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(place),
    });
  } catch {
    // 실패 시 무시 — 로컬 동작은 유지됨
  }
}

export function WorkplaceSearch({ onSelect }: WorkplaceSearchProps) {
  const { data: session, status } = useSession();
  const isLoggedIn = status === 'authenticated' && !!(session as any)?.kakaoId;

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<LocationSearchResult[]>([]);
  const [recents, setRecents] = useState<RecentPlace[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 최근 검색 로드: 로그인 시 DB, 비로그인 시 localStorage
  useEffect(() => {
    if (status === 'loading') return;

    if (isLoggedIn) {
      fetchSavedWorkplace().then((saved) => {
        if (saved) {
          setRecents([saved]);
        } else {
          setRecents(getRecentSearches());
        }
      });
    } else {
      setRecents(getRecentSearches());
    }
  }, [isLoggedIn, status]);

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 디바운스 검색
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/location/search?query=${encodeURIComponent(trimmed)}`);
        const json = await res.json();
        if (json.success) {
          setResults(json.data as LocationSearchResult[]);
        } else {
          setResults([]);
        }
      } catch {
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const handleSelect = useCallback(
    (place: { name: string; lat: number; lng: number }) => {
      setQuery(place.name);
      setIsOpen(false);
      setActiveIndex(-1);

      if (isLoggedIn) {
        saveWorkplaceToDb(place);
        setRecents([place]);
      } else {
        saveRecentSearch(place);
        setRecents(getRecentSearches());
      }

      onSelect(place);
    },
    [isLoggedIn, onSelect],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const items = query.trim() ? results : recents;
    if (!items.length) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev < items.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : items.length - 1));
    } else if (e.key === 'Enter' && activeIndex >= 0 && activeIndex < items.length) {
      e.preventDefault();
      const item = items[activeIndex];
      handleSelect({ name: item.name, lat: item.lat, lng: item.lng });
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const showRecents = isOpen && !query.trim() && recents.length > 0;
  const showResults = isOpen && query.trim() && (results.length > 0 || isLoading);

  return (
    <div ref={containerRef} className="relative w-full">
      {/* 검색 입력 */}
      <div
        className={cn(
          'flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2',
          'transition-colors focus-within:border-estate-500 focus-within:ring-1 focus-within:ring-estate-500/30',
        )}
      >
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            setActiveIndex(-1);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="직장 또는 장소를 검색하세요"
          className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setResults([]);
              inputRef.current?.focus();
            }}
            className="shrink-0 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* 드롭다운 */}
      {(showRecents || showResults) && (
        <div
          className={cn(
            'absolute z-50 mt-1 w-full overflow-hidden rounded-lg border border-border bg-card shadow-[var(--shadow-card-md)]',
          )}
        >
          {/* 최근 검색 / 저장된 직장 */}
          {showRecents && (
            <div>
              <div className="px-3 py-2 text-xs font-medium text-muted-foreground">
                {isLoggedIn ? '저장된 직장' : '최근 검색'}
              </div>
              <ul>
                {recents.map((place, idx) => (
                  <li key={place.name}>
                    <button
                      type="button"
                      onClick={() => handleSelect(place)}
                      className={cn(
                        'flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-estate-50',
                        activeIndex === idx && 'bg-estate-50',
                      )}
                    >
                      <Clock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="truncate">{place.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 검색 결과 */}
          {showResults && (
            <div>
              {isLoading ? (
                <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                  검색 중...
                </div>
              ) : (
                <ul>
                  {results.map((result, idx) => (
                    <li key={`${result.name}-${result.lat}-${result.lng}`}>
                      <button
                        type="button"
                        onClick={() =>
                          handleSelect({
                            name: result.name,
                            lat: result.lat,
                            lng: result.lng,
                          })
                        }
                        className={cn(
                          'flex w-full items-start gap-2 px-3 py-2 text-left transition-colors hover:bg-estate-50',
                          activeIndex === idx && 'bg-estate-50',
                        )}
                      >
                        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-estate-500" />
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-foreground">
                            {result.name}
                          </div>
                          <div className="truncate text-xs text-muted-foreground">
                            {result.address}
                          </div>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
