'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { ArrowLeft, GitCompareArrows } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { ComplexInfoCard } from '@/components/complex/ComplexInfoCard';
import FavoriteButton from '@/components/complex/FavoriteButton';

import PriceChart from '@/components/chart/PriceChart';
import AreaFilter from '@/components/complex/AreaFilter';
import { DataBadge } from '@/components/ui/DataBadge';
import { ErrorState } from '@/components/ui/ErrorState';

import type { ApartmentTrade } from '@/types/trade';

type Section = 'info' | 'chart';

const SECTIONS: { id: Section; label: string }[] = [
  { id: 'info', label: '기본정보' },
  { id: 'chart', label: '실거래가' },
];

export default function ComplexDetailPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();

  const aptName = decodeURIComponent(params.id ?? '');
  const dong = searchParams.get('dong') ?? '';
  const lawdCd = searchParams.get('lawdCd') ?? '';
  const kaptCode = searchParams.get('kaptCode') ?? '';

  const [trades, setTrades] = useState<ApartmentTrade[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedArea, setSelectedArea] = useState<number | null>(null);
  const [activeSection, setActiveSection] = useState<Section>('info');

  // 거래 데이터 조회 (DB 직접 조회)
  const fetchData = useCallback(async () => {
    if (!aptName || !lawdCd) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ lawdCd, aptName });
      if (dong) params.set('dong', dong);
      const res = await fetch(`/api/trade/complex?${params.toString()}`);
      const json = await res.json();
      if (json.success && json.data) {
        setTrades(json.data);
      } else {
        setError(json.error ?? '거래 데이터를 불러올 수 없습니다');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '거래 데이터를 불러올 수 없습니다');
    } finally {
      setIsLoading(false);
    }
  }, [aptName, dong, lawdCd]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 면적 목록 추출
  const areas = useMemo(
    () => [...new Set(trades.map((t) => t.area))].sort((a, b) => a - b),
    [trades],
  );

  // 최신 거래월
  const latestYearMonth = useMemo(() => {
    if (trades.length === 0) return null;
    return trades[trades.length - 1].dealYearMonth;
  }, [trades]);

  const scrollToSection = (id: Section) => {
    setActiveSection(id);
    document.getElementById(`section-${id}`)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      {/* 헤더 */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/search"
            className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            aria-label="뒤로가기"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{aptName}</h1>
            {dong && <p className="text-sm text-gray-500">{dong}</p>}
          </div>
        </div>
        <div className="flex gap-2">
          <FavoriteButton
            aptName={aptName}
            dong={dong}
            lawdCd={lawdCd}
            latestPrice={trades[trades.length - 1]?.dealAmount ?? 0}
            buildYear={trades[0]?.buildYear ?? 0}
          />
          <Link
            href="/compare"
            className="rounded-md border border-gray-200 p-2 text-gray-400 hover:border-estate-300 hover:text-estate-600 transition-colors"
            aria-label="비교하기"
          >
            <GitCompareArrows className="h-5 w-5" />
          </Link>
        </div>
      </div>

      {/* 섹션 네비게이션 */}
      <nav className="sticky top-14 z-20 -mx-4 mb-6 border-b border-border bg-white/95 px-4 backdrop-blur">
        <div className="flex gap-1">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => scrollToSection(s.id)}
              className={cn(
                'border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
                activeSection === s.id
                  ? 'border-estate-700 text-estate-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700',
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </nav>

      {!lawdCd && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
          검색 페이지에서 단지를 선택해 주세요. 법정동 코드가 없으면 거래 데이터를 조회할 수 없습니다.
        </div>
      )}

      <div className="space-y-8">
        {/* 기본정보 — 전체 가로 */}
        <section id="section-info">
          <ComplexInfoCard
            kaptCode={kaptCode}
            aptName={aptName}
            dong={dong}
            lawdCd={lawdCd}

          />
        </section>

        {/* 실거래가 추이 — 전체 가로 */}
        <section id="section-chart" className="rounded-xl border border-border bg-white p-6 shadow-card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">실거래가 추이</h2>
            {latestYearMonth && <DataBadge yearMonth={latestYearMonth} />}
          </div>

          {areas.length > 1 && (
            <div className="mb-4">
              <AreaFilter
                areas={areas}
                selected={selectedArea}
                onChange={setSelectedArea}
              />
            </div>
          )}

          {isLoading ? (
            <div className="h-72 rounded-lg bg-gray-50 animate-skeleton" />
          ) : error ? (
            <ErrorState message={error} onRetry={fetchData} />
          ) : (
            <PriceChart trades={trades} selectedArea={selectedArea ?? undefined} />
          )}
        </section>


      </div>
    </div>
  );
}
