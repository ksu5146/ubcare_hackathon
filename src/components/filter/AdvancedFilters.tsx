'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { HeatType, HallType, SaleType } from '@/types/filter';

interface AdvancedFiltersProps {
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
  onChange: (updates: {
    parkingRatioMin?: number | null;
    hasUndergroundParking?: boolean | null;
    subwayTimeMax?: number | null;
    heatType?: HeatType | null;
    hallType?: HallType | null;
    builder?: string | null;
    saleType?: SaleType | null;
    hasElevator?: boolean | null;
    roomEstimate?: number | null;
    vlRatMax?: number | null;
  }) => void;
}

const HEAT_TYPES: HeatType[] = ['개별난방', '중앙난방', '지역난방'];
const HALL_TYPES: HallType[] = ['계단식', '복도식', '혼합식'];
const SALE_TYPES: SaleType[] = ['분양', '임대'];
const VL_RAT_PRESETS = [
  { label: '150% 이하', value: 150 },
  { label: '200% 이하', value: 200 },
  { label: '250% 이하', value: 250 },
  { label: '300% 이하', value: 300 },
];

const ROOM_PRESETS = [
  { label: '1룸', value: 1 },
  { label: '2룸', value: 2 },
  { label: '3룸', value: 3 },
  { label: '4룸+', value: 4 },
];

const PARKING_PRESETS = [
  { label: '0.5대+', value: 0.5 },
  { label: '0.8대+', value: 0.8 },
  { label: '1.0대+', value: 1.0 },
  { label: '1.2대+', value: 1.2 },
  { label: '1.5대+', value: 1.5 },
];

const SUBWAY_PRESETS = [
  { label: '5분 이내', value: 5 },
  { label: '10분 이내', value: 10 },
  { label: '15분 이내', value: 15 },
];

export function AdvancedFilters({
  parkingRatioMin,
  hasUndergroundParking,
  subwayTimeMax,
  heatType,
  hallType,
  builder,
  saleType,
  hasElevator,
  roomEstimate,
  vlRatMax,
  onChange,
}: AdvancedFiltersProps) {
  const [open, setOpen] = useState(
    parkingRatioMin != null || hasUndergroundParking != null ||
    subwayTimeMax != null || heatType != null ||
    hallType != null || builder != null || saleType != null ||
    hasElevator != null || roomEstimate != null || vlRatMax != null,
  );

  const activeCount = [
    parkingRatioMin != null,
    hasUndergroundParking != null,
    subwayTimeMax != null,
    heatType != null,
    hallType != null,
    builder != null,
    saleType != null,
    hasElevator != null,
    roomEstimate != null,
    vlRatMax != null,
  ].filter(Boolean).length;

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between text-sm font-medium text-gray-700"
      >
        <span className="flex items-center gap-2">
          고급 필터
          {activeCount > 0 && (
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-estate-700 text-[10px] font-bold text-white">
              {activeCount}
            </span>
          )}
        </span>
        <svg
          className={cn('h-4 w-4 text-gray-400 transition-transform', open && 'rotate-180')}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="space-y-5 rounded-lg border border-gray-100 bg-gray-50/50 p-4">
          {/* 세대당 주차대수 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">세대당 주차대수</span>
              <span className="tabular-nums text-xs font-semibold text-estate-700">
                {parkingRatioMin != null ? `${parkingRatioMin}대 이상` : '전체'}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {PARKING_PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() =>
                    onChange({ parkingRatioMin: parkingRatioMin === p.value ? null : p.value })
                  }
                  className={cn(
                    'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                    parkingRatioMin === p.value
                      ? 'bg-estate-700 text-white'
                      : 'bg-white text-gray-600 border border-gray-200 hover:border-estate-300',
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* 지하주차장 여부 */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">지하주차장</span>
            <button
              type="button"
              onClick={() =>
                onChange({
                  hasUndergroundParking: hasUndergroundParking === true ? null : true,
                })
              }
              className={cn(
                'relative h-6 w-11 rounded-full transition-colors',
                hasUndergroundParking ? 'bg-estate-700' : 'bg-gray-300',
              )}
            >
              <span
                className={cn(
                  'absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
                  hasUndergroundParking && 'translate-x-5',
                )}
              />
            </button>
          </div>

          {/* 지하철 도보시간 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">지하철 도보시간</span>
              <span className="tabular-nums text-xs font-semibold text-estate-700">
                {subwayTimeMax != null ? `${subwayTimeMax}분 이내` : '전체'}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {SUBWAY_PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() =>
                    onChange({ subwayTimeMax: subwayTimeMax === p.value ? null : p.value })
                  }
                  className={cn(
                    'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                    subwayTimeMax === p.value
                      ? 'bg-estate-700 text-white'
                      : 'bg-white text-gray-600 border border-gray-200 hover:border-estate-300',
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* 난방방식 */}
          <div className="space-y-2">
            <span className="text-sm text-gray-600">난방방식</span>
            <div className="flex flex-wrap gap-1.5">
              {HEAT_TYPES.map((ht) => (
                <button
                  key={ht}
                  type="button"
                  onClick={() => onChange({ heatType: heatType === ht ? null : ht })}
                  className={cn(
                    'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                    heatType === ht
                      ? 'bg-estate-700 text-white'
                      : 'bg-white text-gray-600 border border-gray-200 hover:border-estate-300',
                  )}
                >
                  {ht}
                </button>
              ))}
            </div>
          </div>

          {/* 복도유형 */}
          <div className="space-y-2">
            <span className="text-sm text-gray-600">복도유형</span>
            <div className="flex flex-wrap gap-1.5">
              {HALL_TYPES.map((ht) => (
                <button
                  key={ht}
                  type="button"
                  onClick={() => onChange({ hallType: hallType === ht ? null : ht })}
                  className={cn(
                    'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                    hallType === ht
                      ? 'bg-estate-700 text-white'
                      : 'bg-white text-gray-600 border border-gray-200 hover:border-estate-300',
                  )}
                >
                  {ht}
                </button>
              ))}
            </div>
          </div>

          {/* 분양형태 */}
          <div className="space-y-2">
            <span className="text-sm text-gray-600">분양형태</span>
            <div className="flex flex-wrap gap-1.5">
              {SALE_TYPES.map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => onChange({ saleType: saleType === st ? null : st })}
                  className={cn(
                    'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                    saleType === st
                      ? 'bg-estate-700 text-white'
                      : 'bg-white text-gray-600 border border-gray-200 hover:border-estate-300',
                  )}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* 승강기 유무 */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">승강기</span>
            <button
              type="button"
              onClick={() => onChange({ hasElevator: hasElevator === true ? null : true })}
              className={cn(
                'relative h-6 w-11 rounded-full transition-colors',
                hasElevator ? 'bg-estate-700' : 'bg-gray-300',
              )}
            >
              <span
                className={cn(
                  'absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
                  hasElevator && 'translate-x-5',
                )}
              />
            </button>
          </div>

          {/* 시공사 */}
          <div className="space-y-2">
            <span className="text-sm text-gray-600">시공사</span>
            <input
              type="text"
              value={builder ?? ''}
              onChange={(e) => onChange({ builder: e.target.value || null })}
              placeholder="예: 삼성물산, 현대건설"
              className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-700 placeholder:text-gray-400 focus:border-estate-400 focus:outline-none focus:ring-1 focus:ring-estate-400"
            />
          </div>

          {/* 추정 방수 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">추정 방수</span>
              <span className="text-[10px] text-gray-400">면적 기반 추정</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {ROOM_PRESETS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => onChange({ roomEstimate: roomEstimate === p.value ? null : p.value })}
                  className={cn(
                    'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                    roomEstimate === p.value
                      ? 'bg-estate-700 text-white'
                      : 'bg-white text-gray-600 border border-gray-200 hover:border-estate-300',
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          {/* 용적률 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">용적률</span>
              <span className="tabular-nums text-xs font-semibold text-estate-700">
                {vlRatMax != null ? `${vlRatMax}% 이하` : '전체'}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {VL_RAT_PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() =>
                    onChange({ vlRatMax: vlRatMax === p.value ? null : p.value })
                  }
                  className={cn(
                    'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                    vlRatMax === p.value
                      ? 'bg-estate-700 text-white'
                      : 'bg-white text-gray-600 border border-gray-200 hover:border-estate-300',
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-gray-400">낮을수록 재건축 사업성이 높습니다</p>
          </div>
        </div>
      )}
    </div>
  );
}
