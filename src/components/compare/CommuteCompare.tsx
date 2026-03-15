'use client';

import { useState, useEffect, useMemo } from 'react';
import { Building2, Clock, ArrowLeftRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { geocodeComplex, BUSINESS_DISTRICTS } from '@/lib/kakao-geocode';
import type { TransitResult } from '@/types/location';

interface CommuteCompareProps {
  complexes: { name: string; dong: string; lawdCd: string }[];
  colors: string[];
}

interface DistrictCommute {
  totalTime: number | null;
  transferCount: number | null;
  summary: string | null;
  error: string | null;
  isLoading: boolean;
}

type CommuteData = Record<string, DistrictCommute[]>;

export default function CommuteCompare({ complexes, colors }: CommuteCompareProps) {
  const [data, setData] = useState<CommuteData>({});

  // complexes는 부모에서 .map()으로 매 렌더 새 배열이 생성되므로 안정적 키로 메모이제이션
  const stableKey = complexes.map((c) => `${c.name}:${c.dong}:${c.lawdCd}`).join('|');
  const stableComplexes = useMemo(() => complexes, [stableKey]);

  useEffect(() => {
    let cancelled = false;

    // 초기 로딩 상태
    const initial: CommuteData = {};
    for (const c of stableComplexes) {
      initial[c.name] = BUSINESS_DISTRICTS.map(() => ({
        totalTime: null,
        transferCount: null,
        summary: null,
        error: null,
        isLoading: true,
      }));
    }
    setData(initial);

    async function fetchAll() {
      for (const complex of stableComplexes) {
        if (cancelled) return;

        const origin = await geocodeComplex(complex.name, complex.dong, complex.lawdCd);
        if (cancelled) return;

        if (!origin) {
          setData((prev) => ({
            ...prev,
            [complex.name]: BUSINESS_DISTRICTS.map(() => ({
              totalTime: null,
              transferCount: null,
              summary: null,
              error: '위치 조회 실패',
              isLoading: false,
            })),
          }));
          continue;
        }

        // 순차 요청으로 ODsay 429 rate limit 방지
        for (let idx = 0; idx < BUSINESS_DISTRICTS.length; idx++) {
          if (cancelled) return;
          const district = BUSINESS_DISTRICTS[idx];

          try {
            const params = new URLSearchParams({
              sx: String(origin.lng),
              sy: String(origin.lat),
              ex: String(district.lng),
              ey: String(district.lat),
            });
            const res = await fetch(`/api/transit?${params.toString()}`, {
              signal: AbortSignal.timeout(30000),
            });
            const json = await res.json();

            if (cancelled) return;

            if (json.success && json.data) {
              const result: TransitResult = json.data;
              setData((prev) => {
                const arr = [...(prev[complex.name] ?? [])];
                arr[idx] = {
                  totalTime: result.totalTime,
                  transferCount: result.transferCount,
                  summary: result.summary,
                  error: null,
                  isLoading: false,
                };
                return { ...prev, [complex.name]: arr };
              });
            } else {
              setData((prev) => {
                const arr = [...(prev[complex.name] ?? [])];
                arr[idx] = {
                  totalTime: null,
                  transferCount: null,
                  summary: null,
                  error: json.error ?? '조회 실패',
                  isLoading: false,
                };
                return { ...prev, [complex.name]: arr };
              });
            }
          } catch {
            if (!cancelled) {
              setData((prev) => {
                const arr = [...(prev[complex.name] ?? [])];
                arr[idx] = {
                  totalTime: null,
                  transferCount: null,
                  summary: null,
                  error: '네트워크 오류',
                  isLoading: false,
                };
                return { ...prev, [complex.name]: arr };
              });
            }
          }
        }
      }
    }

    fetchAll();
    return () => { cancelled = true; };
  }, [stableComplexes]);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-700">
        <Building2 className="h-4 w-4 text-estate-500" />
        3대 업무지구 접근성 비교
      </h2>
      <div className="grid gap-4 sm:grid-cols-3">
        {BUSINESS_DISTRICTS.map((district, dIdx) => (
          <div key={district.name} className="rounded-lg border border-gray-100 p-3">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-800">{district.name}</span>
              <span className="text-[10px] text-gray-400">{district.station}</span>
            </div>
            <div className="space-y-2">
              {complexes.map((complex, cIdx) => {
                const commute = data[complex.name]?.[dIdx];
                return (
                  <div
                    key={complex.name}
                    className="flex items-center justify-between rounded-md bg-gray-50 px-2.5 py-1.5"
                  >
                    <span
                      className="text-xs font-medium truncate max-w-[120px]"
                      style={{ color: colors[cIdx % colors.length] }}
                      title={complex.name}
                    >
                      {complex.name}
                    </span>
                    {commute?.isLoading ? (
                      <span className="h-4 w-12 animate-skeleton rounded bg-gray-200" />
                    ) : commute?.error ? (
                      <span className="text-[10px] text-gray-400">{commute.error}</span>
                    ) : commute?.totalTime != null ? (
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-0.5">
                          <Clock className={cn(
                            'h-3 w-3',
                            commute.totalTime <= 30 ? 'text-green-600'
                              : commute.totalTime <= 60 ? 'text-estate-700'
                              : 'text-orange-600',
                          )} />
                          <span className={cn(
                            'text-sm font-bold tabular-nums',
                            commute.totalTime <= 30 ? 'text-green-600'
                              : commute.totalTime <= 60 ? 'text-estate-700'
                              : 'text-orange-600',
                          )}>
                            {commute.totalTime}
                          </span>
                          <span className="text-[10px] text-gray-500">분</span>
                        </span>
                        <span className="flex items-center gap-0.5 text-[10px] text-gray-400">
                          <ArrowLeftRight className="h-2.5 w-2.5" />
                          {Math.max(0, commute.transferCount ?? 0)}회
                        </span>
                      </div>
                    ) : (
                      <span className="text-[10px] text-gray-400">-</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
