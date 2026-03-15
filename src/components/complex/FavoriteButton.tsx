'use client';

import { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { useFavorites } from '@/hooks/use-favorites';
import { cn } from '@/lib/utils';

interface FavoriteButtonProps {
  aptName: string;
  dong: string;
  lawdCd: string;
  latestPrice: number;
  buildYear: number;
  className?: string;
}

export default function FavoriteButton({
  aptName,
  dong,
  lawdCd,
  latestPrice,
  buildYear,
  className,
}: FavoriteButtonProps) {
  const { addFavorite, removeFavorite, isFavorite } = useFavorites();
  const favorited = isFavorite(aptName, dong);
  const [warning, setWarning] = useState<string | null>(null);

  useEffect(() => {
    if (warning) {
      const timer = setTimeout(() => setWarning(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [warning]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (favorited) {
      removeFavorite(aptName, dong);
    } else {
      const result = addFavorite({ aptName, dong, lawdCd, latestPrice, buildYear });
      if (!result.success && result.message) {
        setWarning(result.message);
      }
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleClick}
        aria-label={favorited ? '관심단지 해제' : '관심단지 추가'}
        className={cn(
          'rounded-full p-1.5 transition-colors hover:bg-gray-100',
          className,
        )}
      >
        <Heart
          className={cn(
            'h-5 w-5 transition-colors',
            favorited
              ? 'fill-red-500 text-red-500'
              : 'fill-none text-gray-400',
          )}
        />
      </button>

      {warning && (
        <div className="absolute bottom-full left-1/2 z-50 mb-2 w-56 -translate-x-1/2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 shadow-md">
          {warning}
        </div>
      )}
    </div>
  );
}
