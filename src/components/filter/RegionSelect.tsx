'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { FILTER_DEFAULTS } from '@/lib/constants';

interface RegionNode {
  code: string;
  name: string;
  children?: RegionNode[];
}

interface RegionSelectProps {
  value: string[];
  onChange: (codes: string[]) => void;
}

/** 지역구 이름 매핑 (선택된 코드 → 표시명) */
function findRegionName(regions: RegionNode[], code5: string): string {
  for (const sido of regions) {
    for (const sigungu of sido.children ?? []) {
      if (sigungu.code.startsWith(code5)) {
        return `${sido.name} ${sigungu.name}`;
      }
    }
  }
  return code5;
}

export function RegionSelect({ value, onChange }: RegionSelectProps) {
  const [regions, setRegions] = useState<RegionNode[]>([]);
  const [loadError, setLoadError] = useState(false);
  const [sidoCode, setSidoCode] = useState('');

  useEffect(() => {
    import('@/data/region-codes.json')
      .then((mod) => {
        const data = mod.default as RegionNode[];
        setRegions(data);
        if (value.length > 0 && !sidoCode) {
          const firstCode5 = value[0];
          for (const sido of data) {
            for (const sigungu of sido.children ?? []) {
              if (sigungu.code.startsWith(firstCode5)) {
                setSidoCode(sido.code);
                return;
              }
            }
          }
        }
      })
      .catch(() => setLoadError(true));
  }, []);

  const sidoList = regions;
  const sigunguList = sidoList.find((s) => s.code === sidoCode)?.children ?? [];
  const maxReached = value.length >= FILTER_DEFAULTS.MAX_REGION_SELECT;

  const handleToggle = (sgCode: string) => {
    const code5 = sgCode.slice(0, 5);
    if (value.includes(code5)) {
      onChange(value.filter((c) => c !== code5));
    } else {
      if (maxReached) return;
      onChange([...value, code5]);
    }
  };

  const handleRemove = (code5: string) => {
    onChange(value.filter((c) => c !== code5));
  };

  const selectClass = cn(
    'w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700',
    'focus:border-estate-500 focus:outline-none focus:ring-1 focus:ring-estate-500',
    'disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400',
  );

  if (loadError) {
    return (
      <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-3 text-sm text-gray-500">
        지역 데이터를 불러올 수 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">지역 선택</span>
        <span className="text-xs text-gray-400">
          최대 {FILTER_DEFAULTS.MAX_REGION_SELECT}개 선택
        </span>
      </div>

      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((code5) => (
            <span
              key={code5}
              className="inline-flex items-center gap-1 rounded-full bg-estate-100 px-3 py-1 text-xs font-medium text-estate-700"
            >
              {findRegionName(regions, code5)}
              <button
                type="button"
                onClick={() => handleRemove(code5)}
                className="ml-0.5 rounded-full p-0.5 hover:bg-estate-200 transition-colors"
                aria-label={`${findRegionName(regions, code5)} 제거`}
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}

      <select
        value={sidoCode}
        onChange={(e) => setSidoCode(e.target.value)}
        className={selectClass}
        aria-label="시/도 선택"
      >
        <option value="">시/도 선택</option>
        {sidoList.map((sido) => (
          <option key={sido.code} value={sido.code}>
            {sido.name}
          </option>
        ))}
      </select>

      {sidoCode && sigunguList.length > 0 && (
        <div className="max-h-[200px] overflow-y-auto rounded-md border border-gray-200 p-2">
          <div className="flex flex-wrap gap-1.5">
            {sigunguList.map((sg) => {
              const code5 = sg.code.slice(0, 5);
              const selected = value.includes(code5);
              const disabled = !selected && maxReached;
              return (
                <button
                  key={sg.code}
                  type="button"
                  onClick={() => handleToggle(sg.code)}
                  disabled={disabled}
                  aria-pressed={selected}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                    selected
                      ? 'bg-estate-700 text-white'
                      : 'border border-gray-300 bg-white text-gray-700 hover:border-estate-400 hover:bg-estate-50',
                    disabled && 'cursor-not-allowed opacity-40',
                  )}
                >
                  {selected && (
                    <svg className="h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  {sg.name}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
