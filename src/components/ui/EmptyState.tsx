'use client';

import { SearchX } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  message?: string;
  suggestion?: string;
  className?: string;
}

export function EmptyState({
  message = '검색 결과가 없습니다.',
  suggestion = '필터 조건을 변경하거나 다른 지역을 선택해 보세요.',
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-lg border border-border bg-white px-6 py-10 text-center',
        className,
      )}
    >
      <SearchX className="h-8 w-8 text-gray-300" aria-hidden="true" />
      <p className="text-sm font-medium text-gray-700">{message}</p>
      <p className="text-xs text-gray-400">{suggestion}</p>
    </div>
  );
}
