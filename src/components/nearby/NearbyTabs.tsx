'use client';

import { useState, useEffect } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import { cn } from '@/lib/utils';
import type { RedevelopmentItem, SchoolItem } from '@/types/nearby';
import { RedevelopmentCard } from './RedevelopmentCard';
import { SchoolCard } from './SchoolCard';
import { NearbyMap } from './NearbyMap';

interface NearbyTabsProps {
  lat: number;
  lng: number;
  lawdCd: string;
}

export function NearbyTabs({ lat, lng, lawdCd }: NearbyTabsProps) {
  const [activeTab, setActiveTab] = useState('redevelopment');

  const [redevelopments, setRedevelopments] = useState<RedevelopmentItem[]>([]);
  const [schools, setSchools] = useState<SchoolItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 정비사업 데이터 fetch
  useEffect(() => {
    let cancelled = false;

    async function fetchRedevelopment() {
      setIsLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          lat: String(lat),
          lng: String(lng),
          radius: '2000',
        });
        const res = await fetch(`/api/nearby/redevelopment?${params.toString()}`);
        const json = await res.json();
        if (cancelled) return;

        if (json.success) {
          setRedevelopments(json.data as RedevelopmentItem[]);
        } else {
          setError(json.error ?? '정비사업 조회 실패');
        }
      } catch {
        if (!cancelled) setError('네트워크 오류가 발생했습니다');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    if (activeTab === 'redevelopment') {
      fetchRedevelopment();
    }

    return () => {
      cancelled = true;
    };
  }, [lat, lng, activeTab]);

  // 학교 데이터 fetch
  useEffect(() => {
    let cancelled = false;

    async function fetchSchools() {
      setIsLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ lawdCd });
        const res = await fetch(`/api/nearby/school?${params.toString()}`);
        const json = await res.json();
        if (cancelled) return;

        if (json.success) {
          setSchools(json.data as SchoolItem[]);
        } else {
          setError(json.error ?? '학교 정보 조회 실패');
        }
      } catch {
        if (!cancelled) setError('네트워크 오류가 발생했습니다');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    if (activeTab === 'school') {
      fetchSchools();
    }

    return () => {
      cancelled = true;
    };
  }, [lawdCd, activeTab]);

  // 현재 탭에 따른 지도 아이템
  const mapItems =
    activeTab === 'redevelopment'
      ? redevelopments.map((r) => ({
          name: r.name,
          lat: r.lat,
          lng: r.lng,
          type: r.type,
        }))
      : schools.map((s) => ({
          name: s.name,
          lat: s.lat,
          lng: s.lng,
          type: s.level,
        }));

  return (
    <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
      <Tabs.List className="flex gap-1 rounded-lg bg-muted p-1">
        <Tabs.Trigger
          value="redevelopment"
          className={cn(
            'flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors',
            'text-muted-foreground hover:text-foreground',
            'data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm',
          )}
        >
          호재
        </Tabs.Trigger>
        <Tabs.Trigger
          value="school"
          className={cn(
            'flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors',
            'text-muted-foreground hover:text-foreground',
            'data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm',
          )}
        >
          학군
        </Tabs.Trigger>
      </Tabs.List>

      {/* 공통 지도 */}
      <div className="mt-4">
        <NearbyMap items={mapItems} center={{ lat, lng }} />
      </div>

      {/* 정비사업 탭 */}
      <Tabs.Content value="redevelopment" className="mt-4 space-y-3">
        {isLoading && activeTab === 'redevelopment' && (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-20 animate-skeleton rounded-lg bg-muted"
              />
            ))}
          </div>
        )}

        {error && activeTab === 'redevelopment' && (
          <div className="rounded-lg border border-error-100 bg-error-100/50 p-4 text-center">
            <p className="text-sm text-error-600">{error}</p>
          </div>
        )}

        {!isLoading && !error && redevelopments.length === 0 && (
          <div className="rounded-lg border border-dashed border-border bg-card p-6 text-center">
            <p className="text-sm text-muted-foreground">
              반경 2km 내 정비사업이 없습니다
            </p>
          </div>
        )}

        {!isLoading &&
          !error &&
          redevelopments.map((item) => (
            <RedevelopmentCard key={item.name} {...item} />
          ))}
      </Tabs.Content>

      {/* 학군 탭 */}
      <Tabs.Content value="school" className="mt-4 space-y-3">
        {isLoading && activeTab === 'school' && (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-20 animate-skeleton rounded-lg bg-muted"
              />
            ))}
          </div>
        )}

        {error && activeTab === 'school' && (
          <div className="rounded-lg border border-error-100 bg-error-100/50 p-4 text-center">
            <p className="text-sm text-error-600">{error}</p>
          </div>
        )}

        {!isLoading && !error && schools.length === 0 && (
          <div className="rounded-lg border border-dashed border-border bg-card p-6 text-center">
            <p className="text-sm text-muted-foreground">
              해당 지역의 학교 정보가 없습니다
            </p>
          </div>
        )}

        {!isLoading &&
          !error &&
          schools.map((item) => (
            <SchoolCard key={item.name} {...item} />
          ))}
      </Tabs.Content>
    </Tabs.Root>
  );
}
