'use client';

import { useState, useEffect, useCallback } from 'react';
import type { ComplexTradeGroup } from '@/types/trade';
import type { HeatType, HallType, SaleType } from '@/types/filter';

interface UseSearchResultsOptions {
  lawdCd: string[];
  priceMin: number;
  priceMax: number;
  areaMin: number;
  areaMax: number;
  floorMin: number | null;
  floorMax: number | null;
  includeDirectDeal: boolean;
  householdsMin: number | null;
  householdsMax: number | null;
  buildYearMin: number | null;
  buildYearMax: number | null;
  parkingRatioMin: number | null;
  hasUndergroundParking: boolean | null;
  subwayTimeMax: number | null;
  heatType: HeatType | null;
  hallType: HallType | null;
  builder: string | null;
  saleType: SaleType | null;
  hasElevator: boolean | null;
  roomEstimate: number | null;
  vlRatMax: number | null;
  enabled?: boolean;
}

interface UseSearchResultsReturn {
  results: ComplexTradeGroup[];
  isLoading: boolean;
  error: string | null;
  totalCount: number;
  refetch: () => void;
}

function buildQueryString(options: UseSearchResultsOptions): string {
  const params = new URLSearchParams();
  params.set('lawdCd', options.lawdCd.join(','));
  params.set('priceMin', String(options.priceMin));
  params.set('priceMax', String(options.priceMax));
  params.set('areaMin', String(options.areaMin));
  params.set('areaMax', String(options.areaMax));
  if (options.floorMin != null) params.set('floorMin', String(options.floorMin));
  if (options.floorMax != null) params.set('floorMax', String(options.floorMax));
  if (options.includeDirectDeal) params.set('includeDirectDeal', 'true');
  if (options.householdsMin != null) params.set('householdsMin', String(options.householdsMin));
  if (options.householdsMax != null) params.set('householdsMax', String(options.householdsMax));
  if (options.buildYearMin != null) params.set('buildYearMin', String(options.buildYearMin));
  if (options.buildYearMax != null) params.set('buildYearMax', String(options.buildYearMax));
  if (options.parkingRatioMin != null) params.set('parkingRatioMin', String(options.parkingRatioMin));
  if (options.hasUndergroundParking != null) params.set('hasUndergroundParking', String(options.hasUndergroundParking));
  if (options.subwayTimeMax != null) params.set('subwayTimeMax', String(options.subwayTimeMax));
  if (options.heatType) params.set('heatType', options.heatType);
  if (options.hallType) params.set('hallType', options.hallType);
  if (options.builder) params.set('builder', options.builder);
  if (options.saleType) params.set('saleType', options.saleType);
  if (options.hasElevator != null) params.set('hasElevator', String(options.hasElevator));
  if (options.roomEstimate != null) params.set('roomEstimate', String(options.roomEstimate));
  if (options.vlRatMax != null) params.set('vlRatMax', String(options.vlRatMax));
  params.set('grouped', 'true');
  return params.toString();
}

interface SearchApiResponse {
  success: boolean;
  data?: ComplexTradeGroup[];
  error?: string;
  total?: number;
}

export function useSearchResults(options: UseSearchResultsOptions): UseSearchResultsReturn {
  const { enabled = true } = options;
  const [results, setResults] = useState<ComplexTradeGroup[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const queryString = enabled && options.lawdCd.length > 0 ? buildQueryString(options) : '';

  const fetchData = useCallback(async () => {
    if (!queryString) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/trade/search?${queryString}`);
      const data: SearchApiResponse = await res.json();

      if (data.success && data.data) {
        setResults(data.data);
      } else {
        setResults([]);
        if (!data.success) {
          setError(data.error ?? '검색 결과를 불러올 수 없습니다');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '데이터를 불러올 수 없습니다');
    } finally {
      setIsLoading(false);
    }
  }, [queryString]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData();
    }, 350);
    return () => clearTimeout(timer);
  }, [fetchData]);

  return {
    results,
    isLoading,
    error,
    totalCount: results.length,
    refetch: fetchData,
  };
}
