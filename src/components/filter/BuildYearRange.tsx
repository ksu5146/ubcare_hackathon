'use client';

import * as Slider from '@radix-ui/react-slider';
import { cn } from '@/lib/utils';
import { FILTER_DEFAULTS } from '@/lib/constants';

interface BuildYearRangeProps {
  value: [number | null, number | null];
  onChange: (value: [number | null, number | null]) => void;
}

const YEAR_PRESETS = [
  { label: '5년 이내', yearFrom: new Date().getFullYear() - 5 },
  { label: '10년 이내', yearFrom: new Date().getFullYear() - 10 },
  { label: '15년 이내', yearFrom: new Date().getFullYear() - 15 },
  { label: '20년 이내', yearFrom: new Date().getFullYear() - 20 },
];

export function BuildYearRange({ value, onChange }: BuildYearRangeProps) {
  const [minYear, maxYear] = value;
  const sliderMin = minYear ?? FILTER_DEFAULTS.BUILD_YEAR_MIN;
  const sliderMax = maxYear ?? FILTER_DEFAULTS.BUILD_YEAR_MAX;

  const isDefault = minYear == null && maxYear == null;
  const displayLabel = isDefault
    ? '전체'
    : minYear != null && maxYear != null
      ? `${minYear}년 ~ ${maxYear}년`
      : minYear != null
        ? `${minYear}년 이후`
        : `${maxYear}년 이전`;

  const isPresetActive = (yearFrom: number) =>
    minYear === yearFrom && maxYear == null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">건축년도</span>
        <span className="tabular-nums text-sm font-semibold text-estate-700">
          {displayLabel}
        </span>
      </div>

      <Slider.Root
        className="relative flex h-5 w-full touch-none select-none items-center"
        min={FILTER_DEFAULTS.BUILD_YEAR_MIN}
        max={FILTER_DEFAULTS.BUILD_YEAR_MAX}
        step={1}
        value={[sliderMin, sliderMax]}
        onValueChange={(v) => {
          const newMin = v[0] === FILTER_DEFAULTS.BUILD_YEAR_MIN ? null : v[0];
          const newMax = v[1] === FILTER_DEFAULTS.BUILD_YEAR_MAX ? null : v[1];
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
          aria-label="최소 건축년도"
        />
        <Slider.Thumb
          className={cn(
            'block h-4 w-4 rounded-full border-2 border-estate-500 bg-white shadow',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-estate-500 focus-visible:ring-offset-2',
          )}
          aria-label="최대 건축년도"
        />
      </Slider.Root>

      <div className="flex flex-wrap gap-1.5">
        {YEAR_PRESETS.map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() =>
              isPresetActive(preset.yearFrom)
                ? onChange([null, null])
                : onChange([preset.yearFrom, null])
            }
            className={cn(
              'rounded-full px-3 py-1 text-xs font-medium transition-colors',
              isPresetActive(preset.yearFrom)
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
