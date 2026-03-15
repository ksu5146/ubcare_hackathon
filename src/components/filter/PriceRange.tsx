'use client';

import * as Slider from '@radix-ui/react-slider';
import { cn } from '@/lib/utils';
import { formatPrice } from '@/lib/format';
import { FILTER_DEFAULTS } from '@/lib/constants';
import { PRICE_PRESETS } from '@/types/filter';

interface PriceRangeProps {
  value: [number, number];
  onChange: (value: [number, number]) => void;
}

export function PriceRange({ value, onChange }: PriceRangeProps) {
  const [min, max] = value;

  const isPresetActive = (preset: [number, number]) =>
    preset[0] === min && preset[1] === max;

  const displayLabel =
    min === 0 && max === FILTER_DEFAULTS.PRICE_MAX
      ? '전체'
      : min === 0
        ? `${formatPrice(max)} 이하`
        : max === FILTER_DEFAULTS.PRICE_MAX
          ? `${formatPrice(min)} 이상`
          : `${formatPrice(min)} ~ ${formatPrice(max)}`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">매매가</span>
        <span className="tabular-nums text-sm font-semibold text-estate-700">
          {displayLabel}
        </span>
      </div>

      <Slider.Root
        className="relative flex h-5 w-full touch-none select-none items-center"
        min={FILTER_DEFAULTS.PRICE_MIN}
        max={FILTER_DEFAULTS.PRICE_MAX}
        step={FILTER_DEFAULTS.PRICE_STEP}
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
          aria-label="최소 가격"
        />
        <Slider.Thumb
          className={cn(
            'block h-4 w-4 rounded-full border-2 border-estate-500 bg-white shadow',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-estate-500 focus-visible:ring-offset-2',
          )}
          aria-label="최대 가격"
        />
      </Slider.Root>

      <div className="flex flex-wrap gap-1.5">
        {PRICE_PRESETS.map((preset) => (
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
