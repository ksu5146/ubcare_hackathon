'use client';

import { GraduationCap, BookOpen, Award, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SchoolItem } from '@/types/nearby';

interface SchoolCardProps extends SchoolItem {}

const LEVEL_CONFIG = {
  '초': { icon: GraduationCap, color: 'text-sky-600' },
  '중': { icon: BookOpen, color: 'text-violet-600' },
  '고': { icon: Award, color: 'text-rose-600' },
} as const;

const TYPE_STYLES = {
  '국립': 'bg-red-100 text-red-700',
  '공립': 'bg-blue-100 text-blue-700',
  '사립': 'bg-purple-100 text-purple-700',
} as const;

export function SchoolCard({
  name,
  level,
  address,
  type,
  distance,
}: SchoolCardProps) {
  const { icon: LevelIcon, color } = LEVEL_CONFIG[level];

  return (
    <div className="rounded-lg border border-border bg-card p-3 shadow-[var(--shadow-card)]">
      {/* 상단: 학교명 + 설립유형 배지 */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <LevelIcon className={cn('h-4 w-4 shrink-0', color)} />
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

      {/* 하단: 주소, 거리 */}
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span className="truncate">{address}</span>
        {distance != null && (
          <span className="inline-flex items-center gap-1 shrink-0">
            <MapPin className="h-3 w-3" />
            {distance >= 1000
              ? `${(distance / 1000).toFixed(1)}km`
              : `${distance}m`}
          </span>
        )}
      </div>
    </div>
  );
}
