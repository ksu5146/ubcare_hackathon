'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import * as Dialog from '@radix-ui/react-dialog';
import { Trash2, X, Heart } from 'lucide-react';
import { useFavorites } from '@/hooks/use-favorites';
import type { FavoriteItem } from '@/hooks/use-favorites';
import { formatPrice } from '@/lib/format';
import { cn } from '@/lib/utils';

interface FavoritesListProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function FavoritesList({ open, onOpenChange }: FavoritesListProps) {
  const { favorites, removeFavorite } = useFavorites();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const router = useRouter();

  const MAX_COMPARE = 4;

  const toggleSelect = (item: FavoriteItem) => {
    const key = `${item.aptName}::${item.dong}`;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        if (next.size >= MAX_COMPARE) return prev;
        next.add(key);
      }
      return next;
    });
  };

  const selectedItems = useMemo(() => {
    return favorites.filter(
      (f) => selected.has(`${f.aptName}::${f.dong}`),
    );
  }, [favorites, selected]);

  const handleCompare = () => {
    if (selectedItems.length < 2) return;
    const items = selectedItems.map((s) => ({
      name: s.aptName,
      dong: s.dong,
      lawdCd: s.lawdCd,
    }));
    const params = new URLSearchParams({ items: JSON.stringify(items) });
    onOpenChange(false);
    router.push(`/compare?${params.toString()}`);
  };

  const handleDelete = (aptName: string, dong: string) => {
    removeFavorite(aptName, dong);
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(`${aptName}::${dong}`);
      return next;
    });
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-gray-200 bg-white p-6 shadow-xl">
          <div className="mb-4 flex items-center justify-between">
            <Dialog.Title className="text-lg font-bold text-estate-900">
              나의관심단지
              <span className="ml-2 text-sm font-normal text-gray-400">
                {favorites.length}/20
              </span>
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                aria-label="닫기"
              >
                <X className="h-5 w-5" />
              </button>
            </Dialog.Close>
          </div>

          {favorites.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12">
              <Heart className="h-10 w-10 text-gray-300" />
              <p className="text-sm text-gray-400">
                관심단지가 없습니다
              </p>
              <p className="text-xs text-gray-300">
                단지 검색 후 하트를 눌러 추가해 보세요
              </p>
            </div>
          ) : (
            <>
              <p className="mb-3 text-xs text-gray-400">
                비교할 단지를 2~{MAX_COMPARE}개 선택하세요 ({selected.size}/{MAX_COMPARE})
              </p>
              <div className="max-h-80 space-y-2 overflow-y-auto">
                {favorites.map((item) => {
                  const key = `${item.aptName}::${item.dong}`;
                  const isSelected = selected.has(key);
                  return (
                    <div
                      key={key}
                      className={cn(
                        'flex items-center gap-3 rounded-lg border p-3 transition-colors',
                        isSelected
                          ? 'border-estate-300 bg-estate-50'
                          : 'border-gray-100 bg-white hover:border-gray-200',
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(item)}
                        disabled={!isSelected && selected.size >= MAX_COMPARE}
                        className="h-4 w-4 shrink-0 accent-estate-700"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-gray-900">
                          {item.aptName}
                        </p>
                        <p className="text-xs text-gray-500">
                          {item.dong} &middot; {formatPrice(item.latestPrice)} &middot; {item.buildYear}년
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDelete(item.aptName, item.dong)}
                        className="shrink-0 rounded-full p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
                        aria-label={`${item.aptName} 삭제`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>

              {selected.size >= 2 && (
                <button
                  type="button"
                  onClick={handleCompare}
                  className="mt-4 w-full rounded-lg bg-estate-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-estate-800"
                >
                  {selected.size}개 단지 비교하기
                </button>
              )}
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
