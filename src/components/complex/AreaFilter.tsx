'use client';

import { cn } from '@/lib/utils';
import { formatArea } from '@/lib/format';

interface AreaFilterProps {
  areas: number[];
  selected: number | null;
  onChange: (area: number | null) => void;
}

export default function AreaFilter({ areas, selected, onChange }: AreaFilterProps) {
  const sortedAreas = [...areas].sort((a, b) => a - b);

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => onChange(null)}
        className={cn(
          'rounded-full px-3 py-1 text-sm font-medium transition-colors',
          selected === null
            ? 'bg-estate-700 text-white'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
        )}
      >
        전체
      </button>
      {sortedAreas.map((area) => (
        <button
          key={area}
          type="button"
          onClick={() => onChange(area)}
          className={cn(
            'rounded-full px-3 py-1 text-sm font-medium transition-colors',
            selected === area
              ? 'bg-estate-700 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
          )}
        >
          {formatArea(area)}
        </button>
      ))}
    </div>
  );
}
