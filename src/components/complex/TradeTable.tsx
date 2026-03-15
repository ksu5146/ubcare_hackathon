'use client';

import { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import type { ApartmentTrade } from '@/types/trade';
import { formatPrice, formatArea } from '@/lib/format';
import { cn } from '@/lib/utils';

interface TradeTableProps {
  trades: ApartmentTrade[];
}

type SortKey = 'dealDate' | 'floor' | 'area' | 'dealAmount' | 'buildYear';
type SortDir = 'asc' | 'desc';

const PAGE_SIZE = 30;
const MAX_HEIGHT = 400;

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: 'dealDate', label: '계약일' },
  { key: 'floor', label: '층' },
  { key: 'area', label: '면적' },
  { key: 'dealAmount', label: '거래가' },
  { key: 'buildYear', label: '건축년도' },
];

export default function TradeTable({ trades }: TradeTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('dealDate');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const sorted = useMemo(() => {
    const arr = [...trades];
    arr.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === 'string' && typeof bv === 'string') {
        return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      return sortDir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
    return arr;
  }, [trades, sortKey, sortDir]);

  const visible = useMemo(() => sorted.slice(0, visibleCount), [sorted, visibleCount]);
  const hasMore = visibleCount < sorted.length;

  // Reset visible count when sort changes
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [sortKey, sortDir, trades]);

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore) {
          setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, sorted.length));
        }
      },
      { root: scrollRef.current, threshold: 0.1 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, sorted.length]);

  const handleSort = useCallback((key: SortKey) => {
    setSortKey((prev) => {
      if (prev === key) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        return prev;
      }
      setSortDir(key === 'dealDate' ? 'desc' : 'asc');
      return key;
    });
  }, []);

  function renderSortArrow(key: SortKey) {
    if (sortKey !== key) return null;
    return (
      <span className="ml-0.5 inline-block text-[10px]">
        {sortDir === 'asc' ? '\u25B2' : '\u25BC'}
      </span>
    );
  }

  function formatCell(key: SortKey, trade: ApartmentTrade): string {
    switch (key) {
      case 'dealDate': return trade.dealDate;
      case 'floor': return `${trade.floor}층`;
      case 'area': return formatArea(trade.area);
      case 'dealAmount': return formatPrice(trade.dealAmount);
      case 'buildYear': return `${trade.buildYear}년`;
    }
  }

  if (trades.length === 0) {
    return (
      <div className="flex h-24 items-center justify-center rounded-lg border border-gray-200 bg-gray-50">
        <p className="text-sm text-gray-400">거래 내역이 없습니다</p>
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className="overflow-auto rounded-lg border border-gray-200"
      style={{ maxHeight: MAX_HEIGHT }}
    >
      <table className="w-full min-w-[480px] text-sm">
        <thead className="sticky top-0 z-10 bg-gray-50">
          <tr>
            {COLUMNS.map((col) => (
              <th
                key={col.key}
                onClick={() => handleSort(col.key)}
                className="cursor-pointer select-none whitespace-nowrap px-3 py-2 text-left text-xs font-semibold text-gray-600 hover:text-gray-900"
              >
                {col.label}
                {renderSortArrow(col.key)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visible.map((trade, idx) => (
            <tr
              key={`${trade.dealDate}-${trade.floor}-${trade.area}-${idx}`}
              className={cn(
                'border-t border-gray-100 transition-colors hover:bg-gray-100',
                idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50',
              )}
            >
              {COLUMNS.map((col) => (
                <td
                  key={col.key}
                  className={cn(
                    'whitespace-nowrap px-3 py-1.5 text-xs text-gray-700',
                    col.key === 'dealAmount' && 'font-medium text-estate-700',
                  )}
                >
                  {formatCell(col.key, trade)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Infinite scroll sentinel */}
      <div ref={sentinelRef} className="h-1" />

      {hasMore && (
        <div className="py-2 text-center text-xs text-gray-400">
          {visible.length} / {sorted.length}건
        </div>
      )}
    </div>
  );
}
