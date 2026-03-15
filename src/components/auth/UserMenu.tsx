'use client';

import { useState, useRef, useEffect } from 'react';
import { signIn, signOut, useSession } from 'next-auth/react';
import { LogIn, LogOut, User, ChevronDown } from 'lucide-react';

export function UserMenu() {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // 바깥 클릭 시 닫기
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  if (status === 'loading') {
    return <div className="h-8 w-8 animate-pulse rounded-full bg-white/20" />;
  }

  if (!session) {
    return (
      <button
        onClick={() => signIn('kakao')}
        className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-white/80 hover:bg-white/10 hover:text-white"
      >
        <LogIn className="h-4 w-4" />
        <span className="hidden md:inline">로그인</span>
      </button>
    );
  }

  const nickname = (session as any).nickname || session.user?.name || '사용자';
  const profileImage = (session as any).profileImage || session.user?.image;

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-white/90 hover:bg-white/10"
      >
        {profileImage ? (
          <img
            src={profileImage}
            alt=""
            className="h-6 w-6 rounded-full object-cover"
          />
        ) : (
          <User className="h-4 w-4" />
        )}
        <span className="hidden max-w-[80px] truncate md:inline">{nickname}</span>
        <ChevronDown className="h-3 w-3" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
          <div className="border-b border-gray-100 px-4 py-2">
            <p className="text-sm font-medium text-gray-900">{nickname}</p>
            <p className="text-xs text-gray-500">카카오 로그인</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              signOut();
            }}
            className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            <LogOut className="h-4 w-4" />
            로그아웃
          </button>
        </div>
      )}
    </div>
  );
}
