'use client';

import { useState, useEffect, useCallback } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { X } from 'lucide-react';

interface LoginPromptProps {
  /** 팝업 표시 트리거 — 변경될 때마다 팝업이 열림 */
  trigger?: number;
  /** 안내 메시지 */
  message?: string;
}

const DISMISS_KEY = 'login-prompt-dismissed';
const DISMISS_DURATION = 24 * 60 * 60 * 1000; // 24시간

export function LoginPrompt({
  trigger,
  message = '로그인하면 관심단지와 비교분석 결과를 저장할 수 있어요!',
}: LoginPromptProps) {
  const { data: session } = useSession();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (session) return; // 로그인된 상태면 표시 안 함
    if (trigger == null) return;

    // 최근에 닫았으면 표시 안 함
    try {
      const dismissed = localStorage.getItem(DISMISS_KEY);
      if (dismissed && Date.now() - Number(dismissed) < DISMISS_DURATION) return;
    } catch {}

    setVisible(true);
  }, [trigger, session]);

  const handleDismiss = useCallback(() => {
    setVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {}
  }, []);

  const handleLogin = useCallback(() => {
    signIn('kakao');
  }, []);

  if (!visible || session) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center">
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/30" onClick={handleDismiss} />

      {/* modal */}
      <div className="relative mx-4 mb-4 w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl sm:mb-0">
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute right-3 top-3 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          aria-label="닫기"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-yellow-50">
            <span className="text-2xl">🔑</span>
          </div>
          <h3 className="text-base font-semibold text-gray-900">카카오 로그인</h3>
          <p className="mt-2 text-sm text-gray-500">{message}</p>
        </div>

        <button
          type="button"
          onClick={handleLogin}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-[#FEE500] px-4 py-3 text-sm font-semibold text-[#191919] transition-colors hover:bg-[#FDD835]"
        >
          <KakaoIcon />
          카카오로 시작하기
        </button>

        <button
          type="button"
          onClick={handleDismiss}
          className="mt-2 w-full rounded-lg px-4 py-2 text-xs text-gray-400 hover:text-gray-600"
        >
          나중에 할게요
        </button>
      </div>
    </div>
  );
}

function KakaoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M9 0.6C4.02 0.6 0 3.72 0 7.56C0 9.94 1.56 12.04 3.94 13.28L2.94 16.74C2.86 17.04 3.22 17.28 3.48 17.1L7.56 14.44C8.02 14.5 8.5 14.52 9 14.52C13.98 14.52 18 11.4 18 7.56C18 3.72 13.98 0.6 9 0.6Z"
        fill="#191919"
      />
    </svg>
  );
}

/** 간단한 인라인 로그인 안내 (토스트 스타일) */
export function LoginBanner({ message }: { message?: string }) {
  const { data: session } = useSession();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      const d = localStorage.getItem('login-banner-dismissed');
      if (d && Date.now() - Number(d) < DISMISS_DURATION) setDismissed(true);
    } catch {}
  }, []);

  if (session || dismissed) return null;

  return (
    <div className="flex items-center justify-between rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-2.5">
      <p className="text-xs text-yellow-800">
        {message ?? '카카오 로그인으로 관심단지와 비교분석을 저장하세요'}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => signIn('kakao')}
          className="rounded-md bg-[#FEE500] px-3 py-1 text-xs font-semibold text-[#191919] hover:bg-[#FDD835]"
        >
          로그인
        </button>
        <button
          type="button"
          onClick={() => {
            setDismissed(true);
            try {
              localStorage.setItem('login-banner-dismissed', String(Date.now()));
            } catch {}
          }}
          className="text-yellow-600 hover:text-yellow-800"
          aria-label="닫기"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
