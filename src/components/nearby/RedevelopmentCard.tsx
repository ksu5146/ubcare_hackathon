'use client';

import { Building2, MapPin, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RedevelopmentItem } from '@/types/nearby';

interface RedevelopmentCardProps extends RedevelopmentItem {}

const TYPE_STYLES = {
  '재개발': 'bg-blue-100 text-blue-700',
  '재건축': 'bg-emerald-100 text-emerald-700',
} as const;

export function RedevelopmentCard({
  name,
  type,
  stage,
  distance,
  households,
}: RedevelopmentCardProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-3 shadow-[var(--shadow-card)]">
      {/* 상단: 구역명 + 배지 */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Building2 className="h-4 w-4 shrink-0 text-estate-500" />
          <span className="truncate text-sm font-semibold text-foreground">
            {name}
          </span>
        </div>
        <span
          className={cn(
            'shrink-0 rounded-full px-2 py-0.5 text-xs font-medium',
            TYPE_STYLES[type],
          )}
        >
          {type}
        </span>
      </div>

      {/* 하단: 추진단계, 거리, 세대수 */}
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-amber-700 font-medium">
          {stage}
        </span>
        <span className="inline-flex items-center gap-1">
          <MapPin className="h-3 w-3" />
          {distance >= 1000
            ? `${(distance / 1000).toFixed(1)}km`
            : `${distance}m`}
        </span>
        {households != null && (
          <span className="inline-flex items-center gap-1">
            <Users className="h-3 w-3" />
            {households.toLocaleString()}세대
          </span>
        )}
      </div>
    </div>
  );
}
