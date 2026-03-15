'use client';

import { useState } from 'react';
import { Bookmark, X, Star, Plus } from 'lucide-react';
import { useFilterBookmarks } from '@/hooks/use-filter-bookmarks';
import { countActiveFilters } from '@/hooks/use-filter';
import type { FilterState } from '@/types/filter';

interface FilterBookmarksProps {
  currentFilters: FilterState;
  onApply: (filters: FilterState) => void;
}

export function FilterBookmarks({ currentFilters, onApply }: FilterBookmarksProps) {
  const { bookmarks, addBookmark, removeBookmark, maxBookmarks } = useFilterBookmarks();
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState('');

  const activeCount = countActiveFilters(currentFilters);

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    addBookmark(trimmed, currentFilters);
    setName('');
    setIsAdding(false);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
          <Bookmark className="h-4 w-4" />
          <span>즐겨찾기</span>
          {bookmarks.length > 0 && (
            <span className="text-xs text-gray-400">({bookmarks.length}/{maxBookmarks})</span>
          )}
        </div>
        {!isAdding && activeCount > 0 && bookmarks.length < maxBookmarks && (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-estate-700 hover:bg-estate-50 transition-colors"
          >
            <Plus className="h-3 w-3" />
            현재 필터 저장
          </button>
        )}
      </div>

      {/* 저장 폼 */}
      {isAdding && (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave();
              if (e.key === 'Escape') setIsAdding(false);
            }}
            placeholder="즐겨찾기 이름"
            maxLength={20}
            autoFocus
            className="flex-1 rounded-md border border-gray-200 px-2.5 py-1.5 text-sm outline-none focus:border-estate-500 focus:ring-1 focus:ring-estate-500"
          />
          <button
            type="button"
            onClick={handleSave}
            disabled={!name.trim()}
            className="rounded-md bg-estate-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-estate-800 disabled:opacity-40 transition-colors"
          >
            저장
          </button>
          <button
            type="button"
            onClick={() => { setIsAdding(false); setName(''); }}
            className="rounded-md px-2 py-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            취소
          </button>
        </div>
      )}

      {/* 즐겨찾기 목록 */}
      {bookmarks.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {bookmarks.map((bm) => (
            <div
              key={bm.id}
              className="group flex items-center gap-1 rounded-full border border-gray-200 bg-white pl-2.5 pr-1 py-1 text-xs hover:border-estate-300 hover:bg-estate-50 transition-colors"
            >
              <Star className="h-3 w-3 text-amber-400 fill-amber-400 shrink-0" />
              <button
                type="button"
                onClick={() => onApply(bm.filters)}
                className="text-gray-700 hover:text-estate-700 transition-colors max-w-[120px] truncate"
                title={bm.name}
              >
                {bm.name}
              </button>
              <button
                type="button"
                onClick={() => removeBookmark(bm.id)}
                className="ml-0.5 rounded-full p-0.5 text-gray-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                title="삭제"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {bookmarks.length === 0 && !isAdding && (
        <p className="text-xs text-gray-400">
          필터를 설정한 후 즐겨찾기로 저장할 수 있습니다
        </p>
      )}
    </div>
  );
}
