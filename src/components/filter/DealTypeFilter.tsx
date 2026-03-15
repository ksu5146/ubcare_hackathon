'use client';

import { cn } from '@/lib/utils';

interface DealTypeFilterProps {
  includeDirectDeal: boolean;
  onChange: (include: boolean) => void;
}

export function DealTypeFilter({ includeDirectDeal, onChange }: DealTypeFilterProps) {
  return (
    <div className="space-y-2">
      <span className="text-sm font-medium text-gray-700">거래유형</span>
      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={() => onChange(false)}
          className={cn(
            'rounded-full px-3 py-1 text-xs font-medium transition-colors',
            !includeDirectDeal
              ? 'bg-estate-700 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-estate-100 hover:text-estate-700',
          )}
        >
          직거래 제외
        </button>
        <button
          type="button"
          onClick={() => onChange(true)}
          className={cn(
            'rounded-full px-3 py-1 text-xs font-medium transition-colors',
            includeDirectDeal
              ? 'bg-estate-700 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-estate-100 hover:text-estate-700',
          )}
        >
          직거래 포함
        </button>
      </div>
    </div>
  );
}
