'use client';

import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  message = '데이터를 불러오는 중 오류가 발생했습니다.',
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-lg border border-error-100 bg-error-100 px-6 py-10 text-center',
        className,
      )}
    >
      <AlertCircle className="h-8 w-8 text-error-600" aria-hidden="true" />
      <p className="text-sm font-medium text-error-600">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className={cn(
            'mt-1 rounded-md bg-white px-4 py-2 text-sm font-medium text-error-600',
            'border border-error-600 hover:bg-error-100 transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error-600 focus-visible:ring-offset-2',
          )}
        >
          다시 시도
        </button>
      )}
    </div>
  );
}
