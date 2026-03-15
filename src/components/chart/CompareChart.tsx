'use client';

import { useMemo, useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { ApartmentTrade } from '@/types/trade';
import { aggregateMonthly } from '@/lib/trade-aggregator';
import { formatPriceShort, formatPrice } from '@/lib/format';
import { cn } from '@/lib/utils';

interface ComplexSeries {
  name: string;
  trades: ApartmentTrade[];
  color: string;
}

interface CompareChartProps {
  complexes: ComplexSeries[];
}

type Period = '1Y' | '3Y' | 'ALL';

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

interface CompareTooltipProps {
  active?: boolean;
  payload?: Array<{ dataKey: string; value?: number; color: string }>;
  label?: string;
  nameMap: Map<string, string>;
}

function CompareTooltip({ active, payload, label, nameMap }: CompareTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-md">
      <p className="mb-1 text-sm font-semibold text-gray-800">{label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} className="text-sm" style={{ color: entry.color }}>
          {nameMap.get(entry.dataKey) ?? entry.dataKey}: {entry.value != null ? formatPrice(entry.value) : '-'}
        </p>
      ))}
    </div>
  );
}

export default function CompareChart({ complexes }: CompareChartProps) {
  const [period, setPeriod] = useState<Period>('3Y');
  // 교집합 모드: 단일 면적 선택
  const [commonArea, setCommonArea] = useState<number | null>(null);
  // 개별 모드: 단지별 면적 선택 { complexIndex: flooredArea }
  const [perComplexArea, setPerComplexArea] = useState<Record<number, number | null>>({});

  // 단지별 면적 그룹 (Math.floor)
  const perComplexGroups = useMemo(() =>
    complexes.map((c) => {
      const groups = new Set<number>();
      c.trades.forEach((t) => groups.add(Math.floor(t.area)));
      return [...groups].sort((a, b) => a - b);
    }),
    [complexes],
  );

  // 교집합
  const commonGroups = useMemo(() => {
    if (complexes.length === 0 || perComplexGroups.some((g) => g.length === 0)) return [];
    const first = new Set(perComplexGroups[0]);
    return perComplexGroups[0].filter((g) =>
      perComplexGroups.every((groups) => groups.includes(g)),
    ).sort((a, b) => a - b);
  }, [perComplexGroups, complexes.length]);

  const hasCommon = commonGroups.length > 0;

  // 교집합 있으면 첫 번째 공통 면적 자동 선택
  useEffect(() => {
    if (hasCommon && commonArea === null) {
      setCommonArea(commonGroups[0]);
    }
  }, [hasCommon, commonGroups, commonArea]);

  // 개별 모드: 모든 단지가 면적을 선택했는지
  const allSelected = !hasCommon && complexes.every((_, i) => perComplexArea[i] != null);

  // 차트 데이터 계산
  const { chartData, nameMap } = useMemo(() => {
    const months = PERIOD_MONTHS[period];
    const cutoff = months != null
      ? (() => {
          const d = new Date();
          d.setMonth(d.getMonth() - months);
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        })()
      : null;

    const filterTrades = (trades: ApartmentTrade[], areaGroup: number | null) => {
      let filtered = trades;
      if (cutoff) filtered = filtered.filter((t) => t.dealYearMonth >= cutoff);
      if (areaGroup != null) filtered = filtered.filter((t) => Math.floor(t.area) === areaGroup);
      return filtered;
    };

    const seriesMap = new Map<string, Map<string, number>>();
    const nMap = new Map<string, string>();

    complexes.forEach((c, i) => {
      const key = `price_${i}`;
      const area = hasCommon ? commonArea : perComplexArea[i] ?? null;
      nMap.set(key, area != null ? `${c.name} (${area}㎡)` : c.name);
      const agg = aggregateMonthly(filterTrades(c.trades, area));
      seriesMap.set(key, new Map(agg.map((a) => [a.yearMonth, a.avgPrice])));
    });

    const allMonths = new Set<string>();
    seriesMap.forEach((m) => m.forEach((_, ym) => allMonths.add(ym)));
    const sorted = Array.from(allMonths).sort();

    const data = sorted.map((ym) => {
      const point: Record<string, string | number | undefined> = { yearMonth: ym };
      seriesMap.forEach((m, key) => {
        point[key] = m.get(ym);
      });
      return point;
    });

    return { chartData: data, nameMap: nMap };
  }, [complexes, period, hasCommon, commonArea, perComplexArea]);

  if (complexes.every((c) => c.trades.length === 0)) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-gray-200 bg-gray-50">
        <p className="text-sm text-gray-400">거래 데이터가 없습니다</p>
      </div>
    );
  }

  return (
    <div>
      {/* 기간 + 면적 필터 */}
      <div className="mb-3 space-y-2">
        <PeriodTabs period={period} onChange={setPeriod} />

        {hasCommon ? (
          /* 교집합 모드: 공통 면적 버튼 */
          <div className="flex flex-wrap items-center gap-1">
            <span className="mr-1 text-xs text-gray-400">공통 평형</span>
            {commonGroups.map((group) => (
              <button
                key={group}
                type="button"
                onClick={() => setCommonArea(group)}
                className={cn(
                  'rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors',
                  commonArea === group
                    ? 'bg-estate-700 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                )}
              >
                {group}㎡
              </button>
            ))}
          </div>
        ) : (
          /* 개별 모드: 단지별 면적 선택 */
          <div className="space-y-2 rounded-lg border border-gray-100 bg-gray-50/50 p-3">
            <p className="text-xs text-gray-500">
              공통 전용면적이 없습니다. 각 단지별로 비교할 면적을 선택해 주세요.
            </p>
            {complexes.map((c, i) => (
              <div key={c.name} className="flex flex-wrap items-center gap-1.5">
                <span
                  className="w-20 truncate text-xs font-medium"
                  style={{ color: c.color }}
                  title={c.name}
                >
                  {c.name}
                </span>
                {perComplexGroups[i].map((group) => (
                  <button
                    key={group}
                    type="button"
                    onClick={() => setPerComplexArea((prev) => ({ ...prev, [i]: group }))}
                    className={cn(
                      'rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors',
                      perComplexArea[i] === group
                        ? 'text-white'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200',
                    )}
                    style={perComplexArea[i] === group ? { backgroundColor: c.color } : undefined}
                  >
                    {group}㎡
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 차트 */}
      {(!hasCommon && !allSelected) ? (
        <div className="flex h-80 items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50">
          <p className="text-sm text-gray-400">
            모든 단지의 전용면적을 선택하면 차트가 표시됩니다
          </p>
        </div>
      ) : (
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
            >
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
              <Tooltip
                content={<CompareTooltip nameMap={nameMap} />}
              />
              <Legend
                formatter={(value: string) => nameMap.get(value) ?? value}
              />
              {complexes.map((c, i) => (
                <Line
                  key={c.name}
                  type="monotone"
                  dataKey={`price_${i}`}
                  name={`price_${i}`}
                  stroke={c.color}
                  dot={false}
                  strokeWidth={2}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
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
    <div className="flex gap-1">
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
