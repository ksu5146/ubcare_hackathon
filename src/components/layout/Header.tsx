'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Heart, History, MapPin, HelpCircle } from 'lucide-react';
import FavoritesList from '@/components/favorites/FavoritesList';
import { SearchOverlayGuide } from '@/components/guide/SearchOverlayGuide';
import { UserMenu } from '@/components/auth/UserMenu';
import { ThemeToggle } from '@/components/layout/ThemeToggle';

export function Header() {
  const [favOpen, setFavOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-50 h-14 border-b border-border bg-estate-900 text-white">
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            <svg viewBox="0 0 28 28" fill="none" className="h-7 w-7" xmlns="http://www.w3.org/2000/svg">
              {/* 집 아이콘 + 돋보기 결합 */}
              <rect x="3" y="12" width="14" height="12" rx="2" fill="#FBBF24" fillOpacity="0.2" stroke="#FBBF24" strokeWidth="1.5" />
              <path d="M2 13l8-8 8 8" stroke="#FBBF24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              <rect x="7" y="17" width="4" height="5" rx="0.5" fill="#FBBF24" fillOpacity="0.5" />
              <circle cx="20" cy="10" r="5.5" stroke="white" strokeWidth="1.8" />
              <line x1="24" y1="14" x2="27" y2="17" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            <span className="bg-gradient-to-r from-amber-300 to-amber-100 bg-clip-text text-transparent">방구석 임장</span>
          </Link>

          <nav className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setGuideOpen(true)}
              className="flex items-center gap-1 text-sm text-white/80 hover:text-white"
              title="비교분석 사용 가이드"
            >
              <HelpCircle className="h-4 w-4" />
              <span className="hidden md:inline">가이드</span>
            </button>
            <Link
              href="/compare?tab=history"
              className="flex items-center gap-1 text-sm text-white/80 hover:text-white"
            >
              <History className="h-4 w-4" />
              <span className="hidden md:inline">비교분석 이력</span>
            </Link>
            <Link
              href="/search?favoritesOnly=true"
              className="flex items-center gap-1 text-sm text-white/80 hover:text-white"
            >
              <MapPin className="h-4 w-4" />
              <span className="hidden md:inline">관심단지 지도</span>
            </Link>
            <button
              onClick={() => setFavOpen(true)}
              className="flex items-center gap-1 rounded-md px-3 py-1.5 text-sm text-white/80 hover:bg-white/10 hover:text-white"
              aria-label="나의관심단지"
            >
              <Heart className="h-4 w-4" />
              <span className="hidden md:inline">나의관심단지</span>
            </button>
            <ThemeToggle />
            <UserMenu />
          </nav>
        </div>
      </header>

      <FavoritesList open={favOpen} onOpenChange={setFavOpen} />
      {guideOpen && <SearchOverlayGuide forceShow onClose={() => setGuideOpen(false)} />}
    </>
  );
}
