'use client';

import { ArrowDownUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ComplexTradeGroup } from '@/types/trade';

export type SortOption =
  | 'latest'
  | 'priceHigh'
  | 'priceLow'
  | 'priceUp'
  | 'priceDown'
  | 'tradeCount'
  | 'households'
  | 'newest';

interface SortSelectProps {
  value: SortOption;
  onChange: (value: SortOption) => void;
  className?: string;
}

const OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'latest', label: '최근거래순' },
  { value: 'priceHigh', label: '가격높은순' },
  { value: 'priceLow', label: '가격낮은순' },
  { value: 'priceUp', label: '상승률높은순' },
  { value: 'priceDown', label: '하락률높은순' },
  { value: 'tradeCount', label: '거래활발순' },
  { value: 'households', label: '세대수많은순' },
  { value: 'newest', label: '신축순' },
];

export function SortSelect({ value, onChange, className }: SortSelectProps) {
  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <ArrowDownUp className="h-3.5 w-3.5 text-gray-400" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as SortOption)}
        className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 focus:border-estate-500 focus:outline-none focus:ring-1 focus:ring-estate-500"
      >
        {OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}

export function sortComplexes(list: ComplexTradeGroup[], sort: SortOption): ComplexTradeGroup[] {
  const sorted = [...list];
  switch (sort) {
    case 'latest':
      return sorted.sort((a, b) => b.latestDate.localeCompare(a.latestDate));
    case 'priceHigh':
      return sorted.sort((a, b) => b.latestPrice - a.latestPrice);
    case 'priceLow':
      return sorted.sort((a, b) => a.latestPrice - b.latestPrice);
    case 'priceUp':
      return sorted.sort((a, b) => {
        const aRate = a.priceChangeRate ?? -Infinity;
        const bRate = b.priceChangeRate ?? -Infinity;
        return bRate - aRate;
      });
    case 'priceDown':
      return sorted.sort((a, b) => {
        const aRate = a.priceChangeRate ?? Infinity;
        const bRate = b.priceChangeRate ?? Infinity;
        return aRate - bRate;
      });
    case 'tradeCount':
      return sorted.sort((a, b) => b.tradeCount - a.tradeCount);
    case 'households':
      return sorted.sort((a, b) => (b.totalUnit ?? 0) - (a.totalUnit ?? 0));
    case 'newest':
      return sorted.sort((a, b) => b.buildYear - a.buildYear);
    default:
      return sorted;
  }
}
