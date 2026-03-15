'use client';

import { useState, useEffect, useCallback } from 'react';
import type { ComplexTradeGroup } from '@/types/trade';
import type { FavoriteItem } from '@/hooks/use-favorites';

interface UseFavoritesResultsReturn {
  results: ComplexTradeGroup[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

interface FavoritesApiResponse {
  success: boolean;
  data?: ComplexTradeGroup[];
  error?: string;
  total?: number;
}

export function useFavoritesResults(
  favorites: FavoriteItem[],
  enabled: boolean,
): UseFavoritesResultsReturn {
  const [results, setResults] = useState<ComplexTradeGroup[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 안정적인 캐시 키: aptName+dong+lawdCd 조합
  const cacheKey =
    enabled && favorites.length > 0
      ? favorites
          .map((f) => `${f.aptName}|${f.dong}|${f.lawdCd}`)
          .join(',')
      : '';

  const fetchData = useCallback(async () => {
    if (!cacheKey) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const items = favorites.map(({ aptName, dong, lawdCd }) => ({
        aptName,
        dong,
        lawdCd,
      }));
      const params = new URLSearchParams({
        favorites: JSON.stringify(items),
      });
      const res = await fetch(`/api/trade/favorites?${params.toString()}`);
      const data: FavoritesApiResponse = await res.json();

      if (data.success && data.data) {
        setResults(data.data);
      } else {
        setResults([]);
        if (!data.success) {
          setError(data.error ?? '관심단지 데이터를 불러올 수 없습니다');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '데이터를 불러올 수 없습니다');
    } finally {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { results, isLoading, error, refetch: fetchData };
}
