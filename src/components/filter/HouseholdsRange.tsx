'use client';

import * as Slider from '@radix-ui/react-slider';
import { cn } from '@/lib/utils';
import { FILTER_DEFAULTS } from '@/lib/constants';
import { HOUSEHOLD_PRESETS } from '@/types/filter';

interface HouseholdsRangeProps {
  value: [number | null, number | null];
  onChange: (value: [number | null, number | null]) => void;
}

export function HouseholdsRange({ value, onChange }: HouseholdsRangeProps) {
  const [min, max] = value;
  const sliderMin = min ?? FILTER_DEFAULTS.HOUSEHOLDS_MIN;
  const sliderMax = max ?? FILTER_DEFAULTS.HOUSEHOLDS_MAX;

  const isDefault = min == null && max == null;
  const displayLabel = isDefault
    ? '전체'
    : min != null && max != null
      ? `${min}~${max}세대`
      : min != null
        ? `${min}세대 이상`
        : `${max}세대 이하`;

  const isPresetActive = (pMin: number, pMax: number | null) =>
    min === (pMin || null) && max === pMax;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">세대수</span>
        <span className="tabular-nums text-sm font-semibold text-estate-700">
          {displayLabel}
        </span>
      </div>

      <Slider.Root
        className="relative flex h-5 w-full touch-none select-none items-center"
        min={FILTER_DEFAULTS.HOUSEHOLDS_MIN}
        max={FILTER_DEFAULTS.HOUSEHOLDS_MAX}
        step={50}
        value={[sliderMin, sliderMax]}
        onValueChange={(v) => {
          const newMin = v[0] === FILTER_DEFAULTS.HOUSEHOLDS_MIN ? null : v[0];
          const newMax = v[1] === FILTER_DEFAULTS.HOUSEHOLDS_MAX ? null : v[1];
          onChange([newMin, newMax]);
        }}
      >
        <Slider.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-gray-200">
          <Slider.Range className="absolute h-full bg-estate-700" />
        </Slider.Track>
        <Slider.Thumb
          className={cn(
            'block h-4 w-4 rounded-full border-2 border-estate-500 bg-white shadow',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-estate-500 focus-visible:ring-offset-2',
          )}
          aria-label="최소 세대수"
        />
        <Slider.Thumb
          className={cn(
            'block h-4 w-4 rounded-full border-2 border-estate-500 bg-white shadow',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-estate-500 focus-visible:ring-offset-2',
          )}
          aria-label="최대 세대수"
        />
      </Slider.Root>

      <div className="flex flex-wrap gap-1.5">
        {HOUSEHOLD_PRESETS.map((preset) => {
          const active = isPresetActive(preset.min, preset.max);
          return (
            <button
              key={preset.label}
              type="button"
              onClick={() =>
                active
                  ? onChange([null, null])
                  : onChange([preset.min || null, preset.max])
              }
              className={cn(
                'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                active
                  ? 'bg-estate-700 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-estate-100 hover:text-estate-700',
              )}
            >
              {preset.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
