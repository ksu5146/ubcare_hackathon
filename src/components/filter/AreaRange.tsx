'use client';

import { useState } from 'react';
import * as Slider from '@radix-ui/react-slider';
import { cn } from '@/lib/utils';
import { formatArea } from '@/lib/format';
import { FILTER_DEFAULTS } from '@/lib/constants';
import { AREA_PRESETS } from '@/types/filter';
import type { AreaUnit } from '@/types/filter';

interface AreaRangeProps {
  value: [number, number];
  onChange: (value: [number, number]) => void;
}

export function AreaRange({ value, onChange }: AreaRangeProps) {
  const [unit, setUnit] = useState<AreaUnit>('sqm');
  const [min, max] = value;

  const displayMin = formatArea(min, unit);
  const displayMax = formatArea(max, unit);

  const isPresetActive = (preset: [number, number]) =>
    preset[0] === min && preset[1] === max;

  const displayLabel =
    min === FILTER_DEFAULTS.AREA_MIN && max === FILTER_DEFAULTS.AREA_MAX
      ? '전체'
      : min === FILTER_DEFAULTS.AREA_MIN
        ? `${displayMax} 이하`
        : max === FILTER_DEFAULTS.AREA_MAX
          ? `${displayMin} 이상`
          : `${displayMin} ~ ${displayMax}`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">전용면적</span>
        <div className="flex items-center gap-2">
          <span className="tabular-nums text-sm font-semibold text-estate-700">
            {displayLabel}
          </span>
          <button
            type="button"
            onClick={() => setUnit((u) => (u === 'sqm' ? 'pyeong' : 'sqm'))}
            className="rounded-full border border-gray-200 px-2 py-0.5 text-xs text-gray-500 hover:border-estate-300 hover:text-estate-700 transition-colors"
          >
            {unit === 'sqm' ? 'm² → 평' : '평 → m²'}
          </button>
        </div>
      </div>

      <Slider.Root
        className="relative flex h-5 w-full touch-none select-none items-center"
        min={FILTER_DEFAULTS.AREA_MIN}
        max={FILTER_DEFAULTS.AREA_MAX}
        step={1}
        value={[min, max]}
        onValueChange={(v) => onChange([v[0], v[1]] as [number, number])}
      >
        <Slider.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-gray-200">
          <Slider.Range className="absolute h-full bg-estate-700" />
        </Slider.Track>
        <Slider.Thumb
          className={cn(
            'block h-4 w-4 rounded-full border-2 border-estate-500 bg-white shadow',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-estate-500 focus-visible:ring-offset-2',
          )}
          aria-label="최소 면적"
        />
        <Slider.Thumb
          className={cn(
            'block h-4 w-4 rounded-full border-2 border-estate-500 bg-white shadow',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-estate-500 focus-visible:ring-offset-2',
          )}
          aria-label="최대 면적"
        />
      </Slider.Root>

      <div className="flex flex-wrap gap-1.5">
        {AREA_PRESETS.map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => onChange(preset.value)}
            className={cn(
              'rounded-full px-3 py-1 text-xs font-medium transition-colors',
              isPresetActive(preset.value)
                ? 'bg-estate-700 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-estate-100 hover:text-estate-700',
            )}
          >
            {preset.label}
          </button>
        ))}
      </div>
    </div>
  );
}
