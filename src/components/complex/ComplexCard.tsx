'use client';

import { memo, useMemo } from 'react';
import Link from 'next/link';
import { Heart, TrendingUp, TrendingDown, Calendar, CheckCircle2, TrainFront } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatPrice, formatPriceShort, formatArea } from '@/lib/format';
import type { ComplexTradeGroup } from '@/types/trade';

interface ComplexCardProps {
  complex: ComplexTradeGroup;
  lawdCd?: string;
  isHighlighted?: boolean;
  isFavorite?: boolean;
  isSelected?: boolean;
  onHover?: (aptName: string | null) => void;
  onClick?: (aptName: string) => void;
  onCtrlClick?: (aptName: string) => void;
  onToggleFavorite?: (complex: ComplexTradeGroup) => void;
  index?: number;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  // YYYY-MM-DD or YYYYMMDD
  const clean = dateStr.replace(/-/g, '');
  if (clean.length >= 8) {
    return `${clean.slice(2, 4)}.${clean.slice(4, 6)}.${clean.slice(6, 8)}`;
  }
  if (clean.length >= 6) {
    return `${clean.slice(2, 4)}.${clean.slice(4, 6)}`;
  }
  return dateStr;
}

const CURRENT_YEAR = new Date().getFullYear();

export const ComplexCard = memo(function ComplexCard({
  complex,
  lawdCd,
  isHighlighted,
  isFavorite,
  isSelected,
  onHover,
  onClick,
  onCtrlClick,
  onToggleFavorite,
  index = 0,
}: ComplexCardProps) {
  const queryString = useMemo(() => {
    const q = new URLSearchParams();
    q.set('dong', complex.dong);
    const effectiveLawdCd = complex.lawdCd || lawdCd;
    if (effectiveLawdCd) q.set('lawdCd', effectiveLawdCd);
    return q.toString();
  }, [complex.dong, complex.lawdCd, lawdCd]);

  const buildAge = CURRENT_YEAR - complex.buildYear;

  return (
    <Link
      href={`/complex/${encodeURIComponent(complex.aptName)}?${queryString}`}
      className={cn(
        'block rounded-lg border p-4 transition-all animate-card-in',
        isSelected
          ? 'border-2 border-green-500 bg-green-50 shadow-card-md'
          : isHighlighted
            ? 'border-2 border-estate-500 bg-estate-50 shadow-card-md'
            : 'border-border bg-white hover:border-estate-300 hover:shadow-card-md',
      )}
      style={{ animationDelay: `${Math.min(index * 40, 300)}ms` }}
      onMouseEnter={() => onHover?.(complex.aptName)}
      onMouseLeave={() => onHover?.(null)}
      onClick={(e) => {
        if ((e.ctrlKey || e.metaKey) && onCtrlClick) {
          e.preventDefault();
          onCtrlClick(complex.aptName);
        } else if (onClick) {
          e.preventDefault();
          onClick(complex.aptName);
        }
      }}
    >
      {/* 헤더: 단지명 + 즐겨찾기 + 거래건수 */}
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold text-gray-900">
            {complex.aptName}
          </h3>
          <p className="mt-0.5 text-xs text-gray-500">
            {complex.dong} · {complex.buildYear}년 ({buildAge}년차)
            {complex.totalUnit != null && ` · ${complex.totalUnit.toLocaleString('ko-KR')}세대`}
          </p>
        </div>
        <div className="ml-2 flex items-center gap-1.5 shrink-0">
          {isSelected && (
            <CheckCircle2 className="h-4 w-4 text-green-600 fill-green-100" />
          )}
          {onToggleFavorite && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onToggleFavorite(complex);
              }}
              className={cn(
                'rounded-full p-1.5 transition-all',
                isFavorite
                  ? 'text-red-500 hover:bg-red-50'
                  : 'text-gray-300 hover:text-red-400 hover:bg-red-50',
              )}
              title={isFavorite ? '관심단지 해제' : '관심단지 추가'}
            >
              <Heart
                className={cn('h-4 w-4', isFavorite && 'fill-red-500')}
              />
            </button>
          )}
          <span className="rounded-full bg-estate-50 px-2 py-0.5 text-xs font-medium text-estate-700">
            {complex.tradeCount}건
          </span>
        </div>
      </div>

      {/* 가격 + 변동률 */}
      <div className="mt-3 flex items-baseline gap-2">
        <span className="tabular-nums text-lg font-bold text-gray-900">
          {formatPrice(complex.latestPrice)}
        </span>
        {complex.priceChangeRate != null && (
          <span
            className={cn(
              'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums',
              complex.priceChangeRate > 0
                ? 'bg-red-50 text-red-600'
                : complex.priceChangeRate < 0
                  ? 'bg-blue-50 text-blue-600'
                  : 'bg-gray-100 text-gray-500',
            )}
          >
            {complex.priceChangeRate > 0 ? (
              <TrendingUp className="h-3 w-3" />
            ) : complex.priceChangeRate < 0 ? (
              <TrendingDown className="h-3 w-3" />
            ) : null}
            {complex.priceChangeRate > 0 ? '+' : ''}
            {complex.priceChangeRate.toFixed(1)}%
          </span>
        )}
      </div>

      {/* 부가 정보: 최근거래일, 평균가 비교 */}
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-500">
        <span className="inline-flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          {formatDate(complex.latestDate)}
        </span>
        {complex.recentAvg != null && (
          <span className="inline-flex items-center gap-1">
            최근3개월 {formatPriceShort(Math.round(complex.recentAvg))}
          </span>
        )}
        {complex.recentAvg != null && complex.yearAgoAvg != null && (
          <span className="text-gray-300">|</span>
        )}
        {complex.yearAgoAvg != null && (
          <span className="inline-flex items-center gap-1">
            1년전 {formatPriceShort(Math.round(complex.yearAgoAvg))}
          </span>
        )}
      </div>

      {/* 단지특성 태그 + 지하철 */}
      <div className="mt-2 flex flex-wrap gap-1.5">
        {complex.heatType && (
          <span className="rounded bg-orange-50 px-1.5 py-0.5 text-[10px] font-medium text-orange-600">
            {complex.heatType}
          </span>
        )}
        {complex.hallType && (
          <span className="rounded bg-purple-50 px-1.5 py-0.5 text-[10px] font-medium text-purple-600">
            {complex.hallType}
          </span>
        )}
        {complex.subwayLine && (
          <span className="inline-flex items-center gap-0.5 rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-600">
            <TrainFront className="h-2.5 w-2.5" />
            {complex.subwayLine}
            {complex.subwayTime != null && ` ${complex.subwayTime}분`}
          </span>
        )}
        {complex.areas.slice(0, 3).map((area) => (
          <span
            key={area}
            className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600"
          >
            {formatArea(area)}
          </span>
        ))}
        {complex.areas.length > 3 && (
          <span className="text-[10px] text-gray-400">+{complex.areas.length - 3}</span>
        )}
      </div>
    </Link>
  );
});
