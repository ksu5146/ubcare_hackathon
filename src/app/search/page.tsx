'use client';

import { Suspense, useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useRouter as useNextRouter, useSearchParams } from 'next/navigation';
import { ChevronDown, ChevronUp, GitCompareArrows, X, Heart, Bookmark, Map, List } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFilter } from '@/hooks/use-filter';
import { useSearchResults } from '@/hooks/use-search-results';
import { useFavoritesResults } from '@/hooks/use-favorites-results';
import { PriceRange } from '@/components/filter/PriceRange';
import { AreaRange } from '@/components/filter/AreaRange';
import { RegionSelect } from '@/components/filter/RegionSelect';
import { FloorRange } from '@/components/filter/FloorPreset';
import { DealTypeFilter } from '@/components/filter/DealTypeFilter';
import { HouseholdsRange } from '@/components/filter/HouseholdsRange';
import { BuildYearRange } from '@/components/filter/BuildYearRange';
import { AdvancedFilters } from '@/components/filter/AdvancedFilters';
import { ComplexList } from '@/components/complex/ComplexList';
import { SortSelect, sortComplexes } from '@/components/filter/SortSelect';
import type { SortOption } from '@/components/filter/SortSelect';
import { LoadingCard } from '@/components/ui/LoadingCard';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { KakaoMap } from '@/components/map/KakaoMap';
import { FilterBookmarks } from '@/components/filter/FilterBookmarks';
import { useFavorites } from '@/hooks/use-favorites';
import { SearchOverlayGuide } from '@/components/guide/SearchOverlayGuide';
import type { ComplexTradeGroup } from '@/types/trade';

const EMPTY_RESULTS: ComplexTradeGroup[] = [];

function SearchContent() {
  const navRouter = useNextRouter();
  const { filters, setFilter, setFilters, resetFilters, activeCount } = useFilter();
  const [filterOpen, setFilterOpen] = useState(false);
  const [mobileView, setMobileView] = useState<'list' | 'map'>('list');
  const [highlightedApt, setHighlightedApt] = useState<string | null>(null);
  const [sortOption, setSortOption] = useState<SortOption>('latest');
  const [selectedApts, setSelectedApts] = useState<Set<string>>(new Set());
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [showSavePrompt, setShowSavePrompt] = useState(false);
  const [savePromptDismissed, setSavePromptDismissed] = useState(false);
  const { isFavorite, addFavorite, removeFavorite, favorites } = useFavorites();
  const searchParams = useSearchParams();
  const urlFavoritesOnly = searchParams.get('favoritesOnly') === 'true';

  // URL 파라미터 변경 시 favoritesOnly 상태 동기화 (SPA 네비게이션 대응)
  useEffect(() => {
    setFavoritesOnly(urlFavoritesOnly);
  }, [urlFavoritesOnly]);

  // 일반 검색 결과 (favoritesOnly가 아닐 때만 활성)
  const { results, isLoading, error, totalCount, refetch } = useSearchResults({
    lawdCd: filters.lawdCd,
    priceMin: filters.priceMin,
    priceMax: filters.priceMax,
    areaMin: filters.areaMin,
    areaMax: filters.areaMax,
    floorMin: filters.floorMin,
    floorMax: filters.floorMax,
    includeDirectDeal: filters.includeDirectDeal,
    householdsMin: filters.householdsMin,
    householdsMax: filters.householdsMax,
    buildYearMin: filters.buildYearMin,
    buildYearMax: filters.buildYearMax,
    parkingRatioMin: filters.parkingRatioMin,
    hasUndergroundParking: filters.hasUndergroundParking,
    subwayTimeMax: filters.subwayTimeMax,
    heatType: filters.heatType,
    hallType: filters.hallType,
    builder: filters.builder,
    saleType: filters.saleType,
    hasElevator: filters.hasElevator,
    roomEstimate: filters.roomEstimate,
    vlRatMax: filters.vlRatMax,
    enabled: !favoritesOnly && filters.lawdCd.length > 0,
  });

  // 관심단지 전용 결과 (favoritesOnly일 때만 활성)
  const {
    results: favResults,
    isLoading: favIsLoading,
    error: favError,
    refetch: favRefetch,
  } = useFavoritesResults(favorites, favoritesOnly);

  // ref로 최신 값을 추적 — useCallback 의존성에서 제외하여 리렌더 전파 방지
  const activeResults = favoritesOnly ? favResults : results;
  const resultsRef = useRef(activeResults);
  resultsRef.current = activeResults;
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const handleSelectComplex = useCallback((aptName: string) => {
    const complex = resultsRef.current.find((r) => r.aptName === aptName);
    const q = new URLSearchParams();
    const lawdCd = complex?.lawdCd || filtersRef.current.lawdCd[0];
    if (lawdCd) q.set('lawdCd', lawdCd);
    if (complex?.dong) q.set('dong', complex.dong);
    navRouter.push(`/complex/${encodeURIComponent(aptName)}?${q.toString()}`);
  }, []);

  const handleCtrlSelect = useCallback((aptName: string) => {
    setSelectedApts((prev) => {
      const next = new Set(prev);
      if (next.has(aptName)) {
        next.delete(aptName);
      } else {
        next.add(aptName);
      }
      return next;
    });
  }, []);

  const handleCompareSelected = useCallback(() => {
    const items = Array.from(selectedApts).map((aptName) => {
      const complex = resultsRef.current.find((r) => r.aptName === aptName);
      return {
        name: aptName,
        dong: complex?.dong ?? '',
        lawdCd: complex?.lawdCd || filtersRef.current.lawdCd[0] || '',
      };
    });
    if (items.length < 2) return;
    const params = new URLSearchParams({ items: JSON.stringify(items) });
    navRouter.push(`/compare?${params.toString()}`);
  }, [selectedApts]);

  const handleClearSelection = useCallback(() => {
    setSelectedApts(new Set());
  }, []);

  const isFavoriteRef = useRef(isFavorite);
  isFavoriteRef.current = isFavorite;

  const handleToggleFavorite = useCallback((complex: ComplexTradeGroup) => {
    if (isFavoriteRef.current(complex.aptName, complex.dong)) {
      removeFavorite(complex.aptName, complex.dong);
    } else {
      addFavorite({
        aptName: complex.aptName,
        dong: complex.dong,
        lawdCd: complex.lawdCd || filtersRef.current.lawdCd[0] || '',
        latestPrice: complex.latestPrice,
        buildYear: complex.buildYear,
      });
    }
  }, [addFavorite, removeFavorite]);

  // 즐겨찾기 저장 프롬프트 (일반 검색 모드에서만)
  const prevLawdCdRef = useRef<string>('');
  useEffect(() => {
    if (favoritesOnly) return;
    const currentKey = filters.lawdCd.join(',');
    if (currentKey && currentKey !== prevLawdCdRef.current && !savePromptDismissed) {
      prevLawdCdRef.current = currentKey;
      setShowSavePrompt(true);
    }
  }, [filters.lawdCd, savePromptDismissed, favoritesOnly]);

  const sortedResults = useMemo(() => sortComplexes(results, sortOption), [results, sortOption]);
  const sortedFavResults = useMemo(() => sortComplexes(favResults, sortOption), [favResults, sortOption]);

  const displayResults = favoritesOnly ? sortedFavResults : sortedResults;

  const hasRegion = filters.lawdCd.length > 0;

  // 현재 모드에 따른 로딩/에러/결과 상태
  const activeIsLoading = favoritesOnly ? favIsLoading : isLoading;
  const activeError = favoritesOnly ? favError : error;
  const activeRefetch = favoritesOnly ? favRefetch : refetch;

  const showGuide = !activeIsLoading && !activeError && displayResults.length > 0 && !favoritesOnly;

  return (
    <div className="flex h-[calc(100dvh-56px)]">
      {showGuide && <SearchOverlayGuide />}
      {/* 지도 영역 */}
      <div className={cn('flex-1', mobileView === 'map' ? 'block' : 'hidden', 'md:block')}>
        <KakaoMap
          results={!activeIsLoading && !activeError && displayResults.length > 0 ? displayResults : EMPTY_RESULTS}
          highlightedApt={highlightedApt}
          onHover={setHighlightedApt}
          onSelect={handleSelectComplex}
          isFavorite={isFavorite}
          onToggleFavorite={handleToggleFavorite}
          selectedApts={selectedApts}
          onCtrlSelect={handleCtrlSelect}
          className="h-full"
        />
      </div>

      {/* 리스트 영역 */}
      <div className={cn('flex flex-col border-l border-border bg-white md:w-[420px]', mobileView === 'map' ? 'hidden md:flex' : 'w-full')}>
        {/* 필터 토글 헤더 — 관심단지 모드에서는 숨김 */}
        {!favoritesOnly && (
          <>
            <button
              type="button"
              onClick={() => setFilterOpen((v) => !v)}
              className="flex items-center justify-between border-b border-border px-4 py-3 text-left hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-gray-900">검색 조건</h2>
                {activeCount > 0 && (
                  <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-estate-700 px-1.5 text-[10px] font-bold text-white">
                    {activeCount}
                  </span>
                )}
                {hasRegion && !filterOpen && (
                  <p className="text-xs text-gray-500">
                    {totalCount}개 단지
                  </p>
                )}
              </div>
              {filterOpen ? (
                <ChevronUp className="h-5 w-5 text-gray-400" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-400" />
              )}
            </button>

            {/* 필터 패널 */}
            <div
              className={cn(
                'overflow-y-auto border-b border-border transition-all duration-200',
                filterOpen ? 'max-h-[70vh] opacity-100' : 'max-h-0 opacity-0 overflow-hidden',
              )}
            >
              <div className="space-y-5 p-4">
                <FilterBookmarks
                  currentFilters={filters}
                  onApply={(saved) => setFilters(saved)}
                />
                <RegionSelect
                  value={filters.lawdCd}
                  onChange={(codes) => setFilter('lawdCd', codes)}
                />
                <PriceRange
                  value={[filters.priceMin, filters.priceMax]}
                  onChange={([min, max]) => setFilters({ priceMin: min, priceMax: max })}
                />
                <AreaRange
                  value={[filters.areaMin, filters.areaMax]}
                  onChange={([min, max]) => setFilters({ areaMin: min, areaMax: max })}
                />
                <FloorRange
                  value={[filters.floorMin, filters.floorMax]}
                  onChange={([min, max]) => setFilters({ floorMin: min, floorMax: max })}
                />
                <DealTypeFilter
                  includeDirectDeal={filters.includeDirectDeal}
                  onChange={(v) => setFilter('includeDirectDeal', v)}
                />
                <HouseholdsRange
                  value={[filters.householdsMin, filters.householdsMax]}
                  onChange={([min, max]) => setFilters({ householdsMin: min, householdsMax: max })}
                />
                <BuildYearRange
                  value={[filters.buildYearMin, filters.buildYearMax]}
                  onChange={([min, max]) => setFilters({ buildYearMin: min, buildYearMax: max })}
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
                  onChange={(updates) => setFilters(updates)}
                />
                <button
                  type="button"
                  onClick={resetFilters}
                  className="w-full rounded-md border border-gray-200 py-2 text-sm text-gray-500 hover:bg-gray-50 transition-colors"
                >
                  필터 초기화
                </button>
              </div>
            </div>
          </>
        )}

        {/* 관심단지 모드 헤더 */}
        {favoritesOnly && (
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <Heart className="h-4 w-4 fill-rose-500 text-rose-500" />
              <h2 className="text-lg font-semibold text-gray-900">관심단지</h2>
              {!activeIsLoading && !activeError && (
                <p className="text-xs text-gray-500">{displayResults.length}개 단지</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setFavoritesOnly(false)}
              className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              aria-label="관심단지 모드 종료"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* 결과 목록 */}
        <div className="flex-1 overflow-y-auto p-4 pb-16 md:pb-4">
          {/* 일반 검색 모드 빈 상태 */}
          {!favoritesOnly && !hasRegion && (
            <EmptyState
              message="지역을 선택해 주세요"
              suggestion="시/도 → 시/군/구를 선택하면 해당 지역의 아파트 실거래 내역을 검색합니다."
            />
          )}

          {/* 관심단지 모드 빈 상태 */}
          {favoritesOnly && favorites.length === 0 && (
            <EmptyState
              message="관심단지가 없습니다"
              suggestion="검색에서 단지를 찾아 하트를 눌러 관심단지로 등록해 보세요."
            />
          )}

          {/* 로딩 */}
          {activeIsLoading && (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <LoadingCard key={i} />
              ))}
            </div>
          )}

          {/* 에러 */}
          {!activeIsLoading && activeError && (
            <ErrorState message={activeError} onRetry={activeRefetch} />
          )}

          {/* 일반 검색: 결과 없음 */}
          {!favoritesOnly && hasRegion && !isLoading && !error && results.length === 0 && (
            <EmptyState />
          )}

          {/* 관심단지: 결과 없음 (즐겨찾기는 있지만 DB에 데이터 없음) */}
          {favoritesOnly && !favIsLoading && !favError && favorites.length > 0 && displayResults.length === 0 && (
            <EmptyState
              message="관심단지 거래 데이터가 없습니다"
              suggestion="등록된 관심단지의 거래 내역을 찾을 수 없습니다."
            />
          )}

          {/* 즐겨찾기 저장 프롬프트 (일반 검색 모드에서만) */}
          {showSavePrompt && !favoritesOnly && hasRegion && !isLoading && !error && results.length > 0 && (
            <div className="mb-3 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
              <Bookmark className="h-4 w-4 shrink-0 text-amber-600" />
              <p className="flex-1 text-xs text-amber-800">
                현재 검색조건을 즐겨찾기로 저장하시겠습니까?
              </p>
              <button
                type="button"
                onClick={() => {
                  setShowSavePrompt(false);
                  setFilterOpen(true);
                }}
                className="rounded-md bg-amber-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-amber-700 transition-colors"
              >
                저장
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowSavePrompt(false);
                  setSavePromptDismissed(true);
                }}
                className="rounded-md px-2 py-1 text-xs text-amber-600 hover:bg-amber-100 transition-colors"
              >
                다음에
              </button>
            </div>
          )}

          {/* 결과 목록 */}
          {!activeIsLoading && !activeError && displayResults.length > 0 && (
            <>
              {!favoritesOnly && (
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-gray-500">
                      <span className="font-semibold text-estate-700">{totalCount}</span>개 단지
                    </p>
                    <button
                      type="button"
                      onClick={() => setFavoritesOnly(true)}
                      className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-200"
                    >
                      <Heart className="h-3 w-3" />
                      관심단지만
                    </button>
                  </div>
                  <SortSelect value={sortOption} onChange={setSortOption} />
                </div>
              )}

              {favoritesOnly && (
                <div className="mb-3 flex items-center justify-end">
                  <SortSelect value={sortOption} onChange={setSortOption} />
                </div>
              )}

              <ComplexList
                results={displayResults}
                lawdCd={favoritesOnly ? (displayResults[0]?.lawdCd ?? '') : filters.lawdCd[0]}
                highlightedApt={highlightedApt}
                selectedApts={selectedApts}
                onHover={setHighlightedApt}
                onSelect={handleSelectComplex}
                onCtrlSelect={handleCtrlSelect}
                isFavorite={isFavorite}
                onToggleFavorite={handleToggleFavorite}
              />
            </>
          )}
        </div>
      </div>
      {/* 모바일 탭 바 (md 미만에서만 표시) */}
      <div className={cn(
        'fixed bottom-0 left-0 right-0 z-40 flex md:hidden border-t border-border bg-white',
        selectedApts.size > 0 ? 'bottom-[72px]' : 'bottom-0',
      )}>
        <button
          type="button"
          onClick={() => setMobileView('list')}
          className={cn(
            'flex flex-1 items-center justify-center gap-2 py-3 text-sm font-medium transition-colors',
            mobileView === 'list'
              ? 'bg-estate-700 text-white'
              : 'bg-gray-100 text-gray-500',
          )}
        >
          <List className="h-4 w-4" />
          목록
        </button>
        <button
          type="button"
          onClick={() => setMobileView('map')}
          className={cn(
            'flex flex-1 items-center justify-center gap-2 py-3 text-sm font-medium transition-colors',
            mobileView === 'map'
              ? 'bg-estate-700 text-white'
              : 'bg-gray-100 text-gray-500',
          )}
        >
          <Map className="h-4 w-4" />
          지도
        </button>
      </div>

      {/* 다중선택 비교 플로팅 바 */}
      {selectedApts.size > 0 && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-card-in">
          <div className="flex items-center gap-3 rounded-full border border-gray-200 bg-white px-5 py-3 shadow-lg">
            <span className="text-sm font-medium text-gray-700">
              <span className="font-bold text-estate-700">{selectedApts.size}</span>개 단지 선택됨
            </span>
            <button
              type="button"
              onClick={handleCompareSelected}
              disabled={selectedApts.size < 2}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-colors',
                selectedApts.size >= 2
                  ? 'bg-estate-700 text-white hover:bg-estate-800'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed',
              )}
            >
              <GitCompareArrows className="h-4 w-4" />
              비교하기
            </button>
            <button
              type="button"
              onClick={handleClearSelection}
              className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              aria-label="선택 해제"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-1 text-center text-[10px] text-gray-400">
            Ctrl+클릭 (모바일: 길게 누르기)으로 단지를 추가/해제할 수 있습니다
          </p>
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-[calc(100dvh-56px)]">
          <div className="hidden flex-1 items-center justify-center bg-gray-100 md:flex">
            <div className="h-8 w-48 rounded bg-gray-200 animate-skeleton" />
          </div>
          <div className="w-full border-l border-border bg-white p-4 md:w-[420px]">
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <LoadingCard key={i} />
              ))}
            </div>
          </div>
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}
