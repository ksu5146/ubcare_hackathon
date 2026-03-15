'use client';

import { useState, useEffect, useCallback } from 'react';
import { Building2, Clock, ArrowLeftRight, RotateCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { geocodeComplex, BUSINESS_DISTRICTS } from '@/lib/kakao-geocode';
import type { TransitResult } from '@/types/location';

interface DistrictResult {
  name: string;
  station: string;
  result: TransitResult | null;
  isLoading: boolean;
  error: string | null;
}

interface BusinessDistrictCommuteProps {
  aptName: string;
  dong: string;
  lawdCd: string;
  /** DB에 좌표가 있으면 직접 전달 — 지오코딩 단계를 건너뜁니다 */
  lat?: number;
  lng?: number;
}

export function BusinessDistrictCommute({ aptName, dong, lawdCd, lat, lng }: BusinessDistrictCommuteProps) {
  const hasDbCoords = lat != null && lng != null;
  const [origin, setOrigin] = useState<{ lat: number; lng: number } | null>(
    hasDbCoords ? { lat, lng } : null,
  );
  const [districts, setDistricts] = useState<DistrictResult[]>(
    BUSINESS_DISTRICTS.map((d) => ({
      name: d.name,
      station: d.station,
      result: null,
      isLoading: false,
      error: null,
    })),
  );
  const [geocodeError, setGeocodeError] = useState<string | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(!hasDbCoords);

  const geocode = useCallback(async () => {
    setIsGeocoding(true);
    setGeocodeError(null);

    const result = await geocodeComplex(aptName, dong, lawdCd);
    if (result) {
      setOrigin(result);
    } else {
      setGeocodeError('단지 위치를 확인할 수 없습니다');
    }
    setIsGeocoding(false);
  }, [aptName, dong, lawdCd]);

  // DB 좌표가 없을 때만 지오코딩 실행
  useEffect(() => {
    if (!hasDbCoords) {
      geocode();
    }
  }, [geocode, hasDbCoords]);

  // 2단계: 업무지구 경로 조회
  useEffect(() => {
    if (!origin) return;

    let cancelled = false;

    async function fetchAll() {
      // 순차 요청으로 ODsay 429 rate limit 방지
      for (let idx = 0; idx < BUSINESS_DISTRICTS.length; idx++) {
        if (cancelled) return;
        const district = BUSINESS_DISTRICTS[idx];

        setDistricts((prev) => {
          const next = [...prev];
          next[idx] = { ...next[idx], isLoading: true, error: null, result: null };
          return next;
        });

        try {
          const params = new URLSearchParams({
            sx: String(origin!.lng),
            sy: String(origin!.lat),
            ex: String(district.lng),
            ey: String(district.lat),
          });

          const res = await fetch(`/api/transit?${params.toString()}`, {
            signal: AbortSignal.timeout(30000),
          });
          const json = await res.json();

          if (cancelled) return;

          if (json.success) {
            setDistricts((prev) => {
              const next = [...prev];
              next[idx] = { ...next[idx], result: json.data, isLoading: false };
              return next;
            });
          } else {
            setDistricts((prev) => {
              const next = [...prev];
              next[idx] = { ...next[idx], error: json.error ?? '조회 실패', isLoading: false };
              return next;
            });
          }
        } catch {
          if (!cancelled) {
            setDistricts((prev) => {
              const next = [...prev];
              next[idx] = { ...next[idx], error: '네트워크 오류', isLoading: false };
              return next;
            });
          }
        }
      }
    }

    fetchAll();
    return () => { cancelled = true; };
  }, [origin]);

  if (isGeocoding) {
    return (
      <div>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-700">
          <Building2 className="h-4 w-4 text-estate-500" />
          3대 업무지구 접근성
        </h3>
        <div className="grid gap-3 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 animate-skeleton rounded-lg bg-gray-50" />
          ))}
        </div>
      </div>
    );
  }

  if (geocodeError) {
    return (
      <div>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-700">
          <Building2 className="h-4 w-4 text-estate-500" />
          3대 업무지구 접근성
        </h3>
        <div className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-gray-200 py-4 text-sm text-gray-400">
          <span>{geocodeError}</span>
          <button
            type="button"
            onClick={geocode}
            className="rounded p-1 hover:bg-gray-100"
          >
            <RotateCw className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-700">
        <Building2 className="h-4 w-4 text-estate-500" />
        3대 업무지구 접근성
      </h3>
      <div className="grid gap-3 sm:grid-cols-3">
        {districts.map((d) => (
          <DistrictCard key={d.name} district={d} />
        ))}
      </div>
    </div>
  );
}

function DistrictCard({ district }: { district: DistrictResult }) {
  if (district.isLoading) {
    return (
      <div className="rounded-lg border border-border bg-gray-50 p-4">
        <div className="mb-2 h-4 w-16 animate-skeleton rounded bg-gray-200" />
        <div className="h-8 w-20 animate-skeleton rounded bg-gray-200" />
      </div>
    );
  }

  if (district.error) {
    return (
      <div className="rounded-lg border border-border bg-gray-50 p-4 text-center">
        <p className="text-sm font-medium text-gray-700">{district.name}</p>
        <p className="mt-1 text-xs text-gray-400">{district.error}</p>
      </div>
    );
  }

  if (!district.result) return null;

  const { totalTime, transferCount, summary } = district.result;

  const timeColor =
    totalTime <= 30
      ? 'text-green-600'
      : totalTime <= 60
        ? 'text-estate-700'
        : 'text-orange-600';

  const timeBg =
    totalTime <= 30
      ? 'bg-green-50'
      : totalTime <= 60
        ? 'bg-estate-50'
        : 'bg-orange-50';

  return (
    <div className={cn('rounded-lg border border-border p-4', timeBg)}>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-800">{district.name}</span>
        <span className="text-[10px] text-gray-400">{district.station}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <Clock className={cn('h-4 w-4', timeColor)} />
        <span className={cn('text-2xl font-bold tabular-nums', timeColor)}>
          {totalTime}
        </span>
        <span className="text-xs text-gray-500">분</span>
      </div>
      <div className="mt-2 flex items-center gap-1 text-[11px] text-gray-500">
        <ArrowLeftRight className="h-3 w-3" />
        <span>환승 {Math.max(0, transferCount)}회</span>
      </div>
      {summary && (
        <p className="mt-1 truncate text-[10px] text-gray-400" title={summary}>
          {summary}
        </p>
      )}
    </div>
  );
}
