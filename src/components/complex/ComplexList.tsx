'use client';

import { ComplexCard } from './ComplexCard';
import type { ComplexTradeGroup } from '@/types/trade';

interface ComplexListProps {
  results: ComplexTradeGroup[];
  lawdCd?: string;
  highlightedApt: string | null;
  selectedApts?: Set<string>;
  onHover: (aptName: string | null) => void;
  onSelect: (aptName: string) => void;
  onCtrlSelect?: (aptName: string) => void;
  isFavorite?: (aptName: string, dong: string) => boolean;
  onToggleFavorite?: (complex: ComplexTradeGroup) => void;
}

export function ComplexList({
  results,
  lawdCd,
  highlightedApt,
  selectedApts,
  onHover,
  onSelect,
  onCtrlSelect,
  isFavorite,
  onToggleFavorite,
}: ComplexListProps) {
  return (
    <div className="space-y-3">
      {results.map((complex, i) => (
        <ComplexCard
          key={`${complex.aptName}-${complex.dong}`}
          complex={complex}
          lawdCd={lawdCd}
          isHighlighted={highlightedApt === complex.aptName}
          isFavorite={isFavorite?.(complex.aptName, complex.dong)}
          isSelected={selectedApts?.has(complex.aptName)}
          onHover={onHover}
          onClick={onSelect}
          onCtrlClick={onCtrlSelect}
          onToggleFavorite={onToggleFavorite}
          index={i}
        />
      ))}
    </div>
  );
}
