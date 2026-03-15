'use client';

import { useCallback, useMemo, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FILTER_DEFAULTS } from '@/lib/constants';
import type { FilterState, HeatType, HallType, SaleType } from '@/types/filter';

export const DEFAULT_FILTERS: FilterState = {
  lawdCd: [],
  priceMin: FILTER_DEFAULTS.PRICE_MIN,
  priceMax: FILTER_DEFAULTS.PRICE_MAX,
  areaMin: FILTER_DEFAULTS.AREA_MIN,
  areaMax: FILTER_DEFAULTS.AREA_MAX,
  floorMin: null,
  floorMax: null,
  includeDirectDeal: false,
  householdsMin: null,
  householdsMax: null,
  buildYearMin: null,
  buildYearMax: null,
  parkingRatioMin: null,
  hasUndergroundParking: null,
  subwayTimeMax: null,
  heatType: null,
  hallType: null,
  builder: null,
  saleType: null,
  hasElevator: null,
  roomEstimate: null,
  vlRatMax: null,
};

function parseFiltersFromParams(params: URLSearchParams): FilterState {
  const lawdCdRaw = params.get('lawdCd');
  const lawdCd = lawdCdRaw
    ? lawdCdRaw.split(',').filter(Boolean).slice(0, FILTER_DEFAULTS.MAX_REGION_SELECT)
    : [];

  return {
    lawdCd,
    priceMin: numOrDefault(params, 'priceMin', DEFAULT_FILTERS.priceMin),
    priceMax: numOrDefault(params, 'priceMax', DEFAULT_FILTERS.priceMax),
    areaMin: numOrDefault(params, 'areaMin', DEFAULT_FILTERS.areaMin),
    areaMax: numOrDefault(params, 'areaMax', DEFAULT_FILTERS.areaMax),
    floorMin: intOrNull(params, 'floorMin'),
    floorMax: intOrNull(params, 'floorMax'),
    includeDirectDeal: params.get('includeDirectDeal') === 'true',
    householdsMin: intOrNull(params, 'householdsMin'),
    householdsMax: intOrNull(params, 'householdsMax'),
    buildYearMin: intOrNull(params, 'buildYearMin'),
    buildYearMax: intOrNull(params, 'buildYearMax'),
    parkingRatioMin: floatOrNull(params, 'parkingRatioMin'),
    hasUndergroundParking: params.has('hasUndergroundParking')
      ? params.get('hasUndergroundParking') === 'true'
      : null,
    subwayTimeMax: intOrNull(params, 'subwayTimeMax'),
    heatType: (params.get('heatType') as HeatType) || null,
    hallType: (params.get('hallType') as HallType) || null,
    builder: params.get('builder') || null,
    saleType: (params.get('saleType') as SaleType) || null,
    hasElevator: params.has('hasElevator') ? params.get('hasElevator') === 'true' : null,
    roomEstimate: intOrNull(params, 'roomEstimate'),
    vlRatMax: intOrNull(params, 'vlRatMax'),
  };
}

function buildSearchUrl(filters: FilterState): string {
  const params = new URLSearchParams();

  if (filters.lawdCd.length > 0) params.set('lawdCd', filters.lawdCd.join(','));
  if (filters.priceMin !== DEFAULT_FILTERS.priceMin) params.set('priceMin', String(filters.priceMin));
  if (filters.priceMax !== DEFAULT_FILTERS.priceMax) params.set('priceMax', String(filters.priceMax));
  if (filters.areaMin !== DEFAULT_FILTERS.areaMin) params.set('areaMin', String(filters.areaMin));
  if (filters.areaMax !== DEFAULT_FILTERS.areaMax) params.set('areaMax', String(filters.areaMax));
  if (filters.floorMin != null) params.set('floorMin', String(filters.floorMin));
  if (filters.floorMax != null) params.set('floorMax', String(filters.floorMax));
  if (filters.includeDirectDeal) params.set('includeDirectDeal', 'true');
  if (filters.householdsMin != null) params.set('householdsMin', String(filters.householdsMin));
  if (filters.householdsMax != null) params.set('householdsMax', String(filters.householdsMax));
  if (filters.buildYearMin != null) params.set('buildYearMin', String(filters.buildYearMin));
  if (filters.buildYearMax != null) params.set('buildYearMax', String(filters.buildYearMax));
  if (filters.parkingRatioMin != null) params.set('parkingRatioMin', String(filters.parkingRatioMin));
  if (filters.hasUndergroundParking != null) params.set('hasUndergroundParking', String(filters.hasUndergroundParking));
  if (filters.subwayTimeMax != null) params.set('subwayTimeMax', String(filters.subwayTimeMax));
  if (filters.heatType) params.set('heatType', filters.heatType);
  if (filters.hallType) params.set('hallType', filters.hallType);
  if (filters.builder) params.set('builder', filters.builder);
  if (filters.saleType) params.set('saleType', filters.saleType);
  if (filters.hasElevator != null) params.set('hasElevator', String(filters.hasElevator));
  if (filters.roomEstimate != null) params.set('roomEstimate', String(filters.roomEstimate));
  if (filters.vlRatMax != null) params.set('vlRatMax', String(filters.vlRatMax));

  const qs = params.toString();
  return qs ? `/search?${qs}` : '/search';
}

/** 활성화된 필터 개수 (기본값 제외) */
export function countActiveFilters(filters: FilterState): number {
  let count = 0;
  if (filters.lawdCd.length > 0) count++;
  if (filters.priceMin !== DEFAULT_FILTERS.priceMin || filters.priceMax !== DEFAULT_FILTERS.priceMax) count++;
  if (filters.areaMin !== DEFAULT_FILTERS.areaMin || filters.areaMax !== DEFAULT_FILTERS.areaMax) count++;
  if (filters.floorMin != null || filters.floorMax != null) count++;
  if (filters.includeDirectDeal) count++;
  if (filters.householdsMin != null || filters.householdsMax != null) count++;
  if (filters.buildYearMin != null || filters.buildYearMax != null) count++;
  if (filters.parkingRatioMin != null) count++;
  if (filters.hasUndergroundParking != null) count++;
  if (filters.subwayTimeMax != null) count++;
  if (filters.heatType) count++;
  if (filters.hallType) count++;
  if (filters.builder) count++;
  if (filters.saleType) count++;
  if (filters.hasElevator != null) count++;
  if (filters.roomEstimate != null) count++;
  if (filters.vlRatMax != null) count++;
  return count;
}

/** 고급 필터 활성 여부 */
export function hasAdvancedFilters(filters: FilterState): boolean {
  return (
    filters.parkingRatioMin != null ||
    filters.hasUndergroundParking != null ||
    filters.subwayTimeMax != null ||
    filters.heatType != null ||
    filters.hallType != null ||
    filters.builder != null ||
    filters.saleType != null ||
    filters.hasElevator != null ||
    filters.roomEstimate != null ||
    filters.vlRatMax != null
  );
}

export interface UseFilterReturn {
  filters: FilterState;
  setFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  setFilters: (updates: Partial<FilterState>) => void;
  resetFilters: () => void;
  resetAdvancedFilters: () => void;
  searchUrl: string;
  activeCount: number;
}

export function useFilter(): UseFilterReturn {
  const router = useRouter();
  const searchParams = useSearchParams();

  const filters = useMemo(
    () => parseFiltersFromParams(searchParams),
    [searchParams],
  );

  const searchUrl = useMemo(() => buildSearchUrl(filters), [filters]);
  const activeCount = useMemo(() => countActiveFilters(filters), [filters]);

  // ref로 최신 filters를 추적하여 callback 안정성 확보
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const setFilter = useCallback(
    <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
      const next = { ...filtersRef.current, [key]: value };
      router.push(buildSearchUrl(next), { scroll: false });
    },
    [router],
  );

  const setFilters = useCallback(
    (updates: Partial<FilterState>) => {
      const next = { ...filtersRef.current, ...updates };
      router.push(buildSearchUrl(next), { scroll: false });
    },
    [router],
  );

  const resetFilters = useCallback(() => {
    router.push('/search', { scroll: false });
  }, [router]);

  const resetAdvancedFilters = useCallback(() => {
    const next = {
      ...filtersRef.current,
      parkingRatioMin: null,
      hasUndergroundParking: null,
      subwayTimeMax: null,
      heatType: null,
      hallType: null,
      builder: null,
      saleType: null,
      hasElevator: null,
      roomEstimate: null,
      vlRatMax: null,
    };
    router.push(buildSearchUrl(next), { scroll: false });
  }, [router]);

  return { filters, setFilter, setFilters, resetFilters, resetAdvancedFilters, searchUrl, activeCount };
}

// ─── 유틸 ───

function numOrDefault(params: URLSearchParams, key: string, def: number): number {
  const v = params.get(key);
  if (v == null) return def;
  const n = Number(v);
  return isNaN(n) ? def : n;
}

function intOrNull(params: URLSearchParams, key: string): number | null {
  const v = params.get(key);
  if (v == null) return null;
  const n = parseInt(v, 10);
  return isNaN(n) ? null : n;
}

function floatOrNull(params: URLSearchParams, key: string): number | null {
  const v = params.get(key);
  if (v == null) return null;
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
}
