'use client';

import { cn } from '@/lib/utils';

interface DataBadgeProps {
  yearMonth: string; // "YYYY-MM" or "YYYY.MM"
  className?: string;
}

export function DataBadge({ yearMonth, className }: DataBadgeProps) {
  const display = yearMonth.replace('-', '.');

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500',
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
      데이터 기준: {display}
    </span>
  );
}
