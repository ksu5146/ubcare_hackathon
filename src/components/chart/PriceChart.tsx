'use client';

import { useMemo, useState, useCallback, useEffect } from 'react';
import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  ComposedChart,
  ReferenceLine,
} from 'recharts';
import { X, List } from 'lucide-react';
import type { ApartmentTrade } from '@/types/trade';
import { aggregateMonthly } from '@/lib/trade-aggregator';
import type { MonthlyAggregate } from '@/lib/trade-aggregator';
import { formatPriceShort, formatPrice } from '@/lib/format';
import { cn } from '@/lib/utils';
import TradeTable from '@/components/complex/TradeTable';

interface PriceChartProps {
  trades: ApartmentTrade[];
  selectedArea?: number;
}

type Period = '1Y' | '3Y' | 'ALL';
type TradeView = { type: 'month'; yearMonth: string } | { type: 'all' } | null;

const PERIOD_LABELS: Record<Period, string> = {
  '1Y': '1Y',
  '3Y': '3Y',
  ALL: '전체',
};

const PERIOD_MONTHS: Record<Period, number | null> = {
  '1Y': 12,
  '3Y': 36,
  ALL: null,
};

function formatXAxis(yearMonth: string): string {
  const parts = yearMonth.split('-');
  if (parts.length !== 2) return yearMonth;
  return `${parts[0].slice(2)}.${parts[1]}`;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: MonthlyAggregate }>;
  label?: string;
}

function ChartTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0].payload;
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-md">
      <p className="mb-1 text-sm font-semibold text-gray-800">{label}</p>
      <p className="text-sm text-estate-700">
        평균: {formatPrice(data.avgPrice)}
      </p>
      <p className="text-sm text-gray-500">
        최고: {formatPrice(data.maxPrice)}
      </p>
      <p className="text-sm text-gray-500">
        최저: {formatPrice(data.minPrice)}
      </p>
      <p className="text-sm text-gray-400">{data.count}건</p>
      <p className="mt-1 text-[10px] text-estate-500">클릭하여 거래내역 보기</p>
    </div>
  );
}

export default function PriceChart({ trades, selectedArea }: PriceChartProps) {
  const [period, setPeriod] = useState<Period>('3Y');
  const [tradeView, setTradeView] = useState<TradeView>(null);

  // 면적/기간 변경 시 거래내역 뷰 초기화
  useEffect(() => {
    setTradeView(null);
  }, [selectedArea, period]);

  const chartData = useMemo(() => {
    let filtered = trades;
    if (selectedArea != null) {
      filtered = trades.filter((t) => t.area === selectedArea);
    }

    const months = PERIOD_MONTHS[period];
    if (months != null) {
      const cutoff = new Date();
      cutoff.setMonth(cutoff.getMonth() - months);
      const cutoffStr = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, '0')}`;
      filtered = filtered.filter((t) => t.dealYearMonth >= cutoffStr);
    }

    return aggregateMonthly(filtered);
  }, [trades, selectedArea, period]);

  // 표시할 거래 목록
  const visibleTrades = useMemo(() => {
    if (!tradeView) return [];

    let filtered = trades;
    if (selectedArea != null) {
      filtered = filtered.filter((t) => t.area === selectedArea);
    }

    if (tradeView.type === 'month') {
      return filtered.filter((t) => t.dealYearMonth === tradeView.yearMonth);
    }

    // 전체: 기간 필터 적용
    const months = PERIOD_MONTHS[period];
    if (months != null) {
      const cutoff = new Date();
      cutoff.setMonth(cutoff.getMonth() - months);
      const cutoffStr = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, '0')}`;
      filtered = filtered.filter((t) => t.dealYearMonth >= cutoffStr);
    }
    return filtered;
  }, [trades, selectedArea, period, tradeView]);

  const handleChartClick = useCallback((data: any) => {
    if (data?.activePayload?.[0]?.payload) {
      const ym = data.activePayload[0].payload.yearMonth as string;
      setTradeView((prev) =>
        prev?.type === 'month' && prev.yearMonth === ym ? null : { type: 'month', yearMonth: ym },
      );
    }
  }, []);

  const selectedMonth = tradeView?.type === 'month' ? tradeView.yearMonth : null;

  // 전체 거래 건수 (현재 필터 기준)
  const totalTradeCount = useMemo(() => {
    let filtered = trades;
    if (selectedArea != null) {
      filtered = filtered.filter((t) => t.area === selectedArea);
    }
    const months = PERIOD_MONTHS[period];
    if (months != null) {
      const cutoff = new Date();
      cutoff.setMonth(cutoff.getMonth() - months);
      const cutoffStr = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, '0')}`;
      filtered = filtered.filter((t) => t.dealYearMonth >= cutoffStr);
    }
    return filtered.length;
  }, [trades, selectedArea, period]);

  if (trades.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-gray-200 bg-gray-50">
        <p className="text-sm text-gray-400">거래 데이터가 없습니다</p>
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div>
        <PeriodTabs period={period} onChange={setPeriod} />
        <div className="flex h-64 items-center justify-center rounded-lg border border-gray-200 bg-gray-50">
          <p className="text-sm text-gray-400">
            선택한 조건에 해당하는 거래가 없습니다
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PeriodTabs period={period} onChange={setPeriod} />
      <div className="h-72 w-full cursor-pointer">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
            onClick={handleChartClick}
          >
            <defs>
              <linearGradient id="avgFill" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-estate-100)"
                  stopOpacity={0.6}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-estate-100)"
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-gray-200)" />
            <XAxis
              dataKey="yearMonth"
              tickFormatter={formatXAxis}
              tick={{ fontSize: 11, fill: 'var(--color-gray-500)' }}
              interval="preserveStartEnd"
            />
            <YAxis
              tickFormatter={(v: number) => formatPriceShort(v)}
              tick={{ fontSize: 11, fill: 'var(--color-gray-500)' }}
              width={56}
            />
            <Tooltip content={<ChartTooltip />} />
            {selectedMonth && (
              <ReferenceLine
                x={selectedMonth}
                stroke="var(--color-estate-700)"
                strokeWidth={2}
                strokeOpacity={0.4}
              />
            )}
            <Area
              type="monotone"
              dataKey="avgPrice"
              fill="url(#avgFill)"
              stroke="none"
            />
            <Line
              type="monotone"
              dataKey="maxPrice"
              stroke="var(--color-gray-300)"
              strokeDasharray="4 4"
              dot={false}
              strokeWidth={1}
            />
            <Line
              type="monotone"
              dataKey="minPrice"
              stroke="var(--color-gray-300)"
              strokeDasharray="4 4"
              dot={false}
              strokeWidth={1}
            />
            <Line
              type="monotone"
              dataKey="avgPrice"
              stroke="var(--color-estate-700)"
              dot={false}
              strokeWidth={2}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* 거래내역 영역 */}
      {tradeView ? (
        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700">
              {tradeView.type === 'month'
                ? `${tradeView.yearMonth} 거래내역`
                : '전체 거래내역'}
              <span className="ml-2 text-xs font-normal text-gray-400">
                {visibleTrades.length}건
              </span>
            </h3>
            <div className="flex items-center gap-1">
              {tradeView.type === 'month' && (
                <button
                  type="button"
                  onClick={() => setTradeView({ type: 'all' })}
                  className="rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100"
                >
                  전체 보기
                </button>
              )}
              <button
                type="button"
                onClick={() => setTradeView(null)}
                className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                aria-label="닫기"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          <TradeTable trades={visibleTrades} />
        </div>
      ) : (
        <div className="mt-3 flex items-center justify-center gap-3">
          <p className="text-[11px] text-gray-400">
            차트를 클릭하면 해당 월의 거래내역을 확인할 수 있습니다
          </p>
          <button
            type="button"
            onClick={() => setTradeView({ type: 'all' })}
            className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2.5 py-1 text-xs text-gray-500 hover:bg-gray-50"
          >
            <List className="h-3 w-3" />
            전체 {totalTradeCount}건
          </button>
        </div>
      )}
    </div>
  );
}

function PeriodTabs({
  period,
  onChange,
}: {
  period: Period;
  onChange: (p: Period) => void;
}) {
  return (
    <div className="mb-3 flex gap-1">
      {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onChange(p)}
          className={cn(
            'rounded-md px-3 py-1 text-xs font-medium transition-colors',
            period === p
              ? 'bg-estate-700 text-white'
              : 'bg-gray-100 text-gray-500 hover:bg-gray-200',
          )}
        >
          {PERIOD_LABELS[p]}
        </button>
      ))}
    </div>
  );
}
