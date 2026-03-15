'use client';

import { useState, useEffect } from 'react';
import { Clock, ArrowLeftRight, Wallet, Route } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TransitResult } from '@/types/location';

interface CommuteResultProps {
  origin: { lat: number; lng: number } | null;
  destination: { name: string; lat: number; lng: number } | null;
}

export function CommuteResult({ origin, destination }: CommuteResultProps) {
  const [result, setResult] = useState<TransitResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!origin || !destination) {
      setResult(null);
      setError(null);
      return;
    }

    let cancelled = false;

    async function fetchTransit() {
      setIsLoading(true);
      setError(null);
      setResult(null);

      try {
        const params = new URLSearchParams({
          sx: String(origin!.lng),
          sy: String(origin!.lat),
          ex: String(destination!.lng),
          ey: String(destination!.lat),
        });

        const res = await fetch(`/api/transit?${params.toString()}`);
        const json = await res.json();

        if (cancelled) return;

        if (json.success) {
          setResult(json.data as TransitResult);
        } else {
          setError(json.error ?? '경로 조회에 실패했습니다');
        }
      } catch {
        if (!cancelled) {
          setError('네트워크 오류가 발생했습니다');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    fetchTransit();
    return () => {
      cancelled = true;
    };
  }, [origin, destination]);

  // 직장 미선택
  if (!destination) {
    return (
      <div
        className={cn(
          'rounded-lg border border-dashed border-border bg-card p-6 text-center',
        )}
      >
        <Route className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">직장을 검색해 주세요</p>
      </div>
    );
  }

  // 출발지 미설정
  if (!origin) {
    return (
      <div
        className={cn(
          'rounded-lg border border-dashed border-border bg-card p-6 text-center',
        )}
      >
        <Route className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">출발지를 선택해 주세요</p>
      </div>
    );
  }

  // 로딩
  if (isLoading) {
    return (
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 animate-skeleton rounded-lg bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-2/3 animate-skeleton rounded bg-muted" />
            <div className="h-3 w-1/2 animate-skeleton rounded bg-muted" />
          </div>
        </div>
      </div>
    );
  }

  // 에러
  if (error) {
    return (
      <div
        className={cn(
          'rounded-lg border border-error-100 bg-error-100/50 p-4 text-center',
        )}
      >
        <p className="text-sm text-error-600">{error}</p>
      </div>
    );
  }

  // 결과 없음
  if (!result) return null;

  return (
    <div className="rounded-lg border border-border bg-card shadow-[var(--shadow-card)]">
      {/* 헤더 */}
      <div className="border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold text-foreground">
          {destination.name}까지 통근
        </h3>
      </div>

      {/* 통계 그리드 */}
      <div className="grid grid-cols-3 divide-x divide-border">
        {/* 소요 시간 */}
        <div className="flex flex-col items-center gap-1 px-3 py-4">
          <Clock className="h-5 w-5 text-estate-500" />
          <span className="text-lg font-bold tabular-nums text-foreground">
            {result.totalTime}
          </span>
          <span className="text-xs text-muted-foreground">분</span>
        </div>

        {/* 환승 횟수 */}
        <div className="flex flex-col items-center gap-1 px-3 py-4">
          <ArrowLeftRight className="h-5 w-5 text-estate-500" />
          <span className="text-lg font-bold tabular-nums text-foreground">
            {Math.max(0, result.transferCount)}
          </span>
          <span className="text-xs text-muted-foreground">환승</span>
        </div>

        {/* 요금 */}
        <div className="flex flex-col items-center gap-1 px-3 py-4">
          <Wallet className="h-5 w-5 text-estate-500" />
          <span className="text-lg font-bold tabular-nums text-foreground">
            {result.fare.toLocaleString()}
          </span>
          <span className="text-xs text-muted-foreground">원</span>
        </div>
      </div>

      {/* 경로 요약 */}
      <div className="border-t border-border px-4 py-3">
        <div className="flex items-start gap-2">
          <Route className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <p className="text-xs leading-relaxed text-muted-foreground">
            {result.summary}
          </p>
        </div>
      </div>
    </div>
  );
}
