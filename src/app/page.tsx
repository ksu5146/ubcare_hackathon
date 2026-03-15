'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FILTER_DEFAULTS } from '@/lib/constants';
import { PriceRange } from '@/components/filter/PriceRange';
import { AreaRange } from '@/components/filter/AreaRange';
import { RegionSelect } from '@/components/filter/RegionSelect';
import { FloorRange } from '@/components/filter/FloorPreset';
import { DealTypeFilter } from '@/components/filter/DealTypeFilter';
import { HouseholdsRange } from '@/components/filter/HouseholdsRange';
import { BuildYearRange } from '@/components/filter/BuildYearRange';
import { AdvancedFilters } from '@/components/filter/AdvancedFilters';
import { DEFAULT_FILTERS, countActiveFilters } from '@/hooks/use-filter';
import type { FilterState } from '@/types/filter';
import { FilterBookmarks } from '@/components/filter/FilterBookmarks';

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

export default function HomePage() {
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);

  const update = <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const activeCount = countActiveFilters(filters);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="mb-8 text-center">
        <h1 className="mb-2 text-3xl font-bold tracking-tight text-estate-900">
          나에게 맞는 부동산 찾기
        </h1>
        <p className="text-base text-gray-500">
          예산과 조건을 설정하면 실거래가 기반으로 매물을 분석해드립니다
        </p>
      </div>

      <div className="space-y-6 rounded-xl border border-border bg-white p-6 shadow-card">
        <FilterBookmarks
          currentFilters={filters}
          onApply={(saved) => setFilters(saved)}
        />

        <RegionSelect
          value={filters.lawdCd}
          onChange={(codes) => update('lawdCd', codes)}
        />

        <PriceRange
          value={[filters.priceMin, filters.priceMax]}
          onChange={([min, max]) => {
            update('priceMin', min);
            update('priceMax', max);
          }}
        />

        <AreaRange
          value={[filters.areaMin, filters.areaMax]}
          onChange={([min, max]) => {
            update('areaMin', min);
            update('areaMax', max);
          }}
        />

        <FloorRange
          value={[filters.floorMin, filters.floorMax]}
          onChange={([min, max]) => {
            setFilters((prev) => ({ ...prev, floorMin: min, floorMax: max }));
          }}
        />

        <DealTypeFilter
          includeDirectDeal={filters.includeDirectDeal}
          onChange={(v) => update('includeDirectDeal', v)}
        />

        <HouseholdsRange
          value={[filters.householdsMin, filters.householdsMax]}
          onChange={([min, max]) => {
            setFilters((prev) => ({ ...prev, householdsMin: min, householdsMax: max }));
          }}
        />

        <BuildYearRange
          value={[filters.buildYearMin, filters.buildYearMax]}
          onChange={([min, max]) => {
            setFilters((prev) => ({ ...prev, buildYearMin: min, buildYearMax: max }));
          }}
        />

        <AdvancedFilters
          parkingRatioMin={filters.parkingRatioMin}
          hasUndergroundParking={filters.hasUndergroundParking}
          subwayTimeMax={filters.subwayTimeMax}
          heatType={filters.heatType}
          hallType={filters.hallType}
          builder={filters.builder}
          saleType={filters.saleType}
          hasElevator={filters.hasElevator}
          roomEstimate={filters.roomEstimate}
          vlRatMax={filters.vlRatMax}
          onChange={(updates) => setFilters((prev) => ({ ...prev, ...updates }))}
        />

        <Link
          href={buildSearchUrl(filters)}
          className="block w-full rounded-lg bg-estate-700 py-3 text-center font-semibold text-white hover:bg-estate-800 transition-colors"
        >
          매물 검색
          {activeCount > 0 && (
            <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-white/20 px-1.5 text-xs">
              {activeCount}
            </span>
          )}
        </Link>
      </div>
    </div>
  );
}
