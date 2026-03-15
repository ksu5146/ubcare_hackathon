'use client';

import { cn } from '@/lib/utils';

interface LoadingCardProps {
  className?: string;
}

export function LoadingCard({ className }: LoadingCardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-white p-4',
        className,
      )}
    >
      {/* Header row: name + badge */}
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="h-4 w-3/5 rounded bg-gray-200 animate-skeleton" />
          <div className="h-3 w-2/5 rounded bg-gray-200 animate-skeleton" />
        </div>
        <div className="ml-2 h-5 w-8 shrink-0 rounded-full bg-gray-200 animate-skeleton" />
      </div>

      {/* Price row */}
      <div className="mt-3 flex items-baseline gap-2">
        <div className="h-6 w-24 rounded bg-gray-200 animate-skeleton" />
        <div className="h-3 w-12 rounded bg-gray-200 animate-skeleton" />
      </div>

      {/* Area tags */}
      <div className="mt-2 flex gap-1.5">
        <div className="h-5 w-14 rounded bg-gray-200 animate-skeleton" />
        <div className="h-5 w-14 rounded bg-gray-200 animate-skeleton" />
        <div className="h-5 w-14 rounded bg-gray-200 animate-skeleton" />
      </div>
    </div>
  );
}
