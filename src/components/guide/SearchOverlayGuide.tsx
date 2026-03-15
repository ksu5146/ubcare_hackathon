'use client';

import { useState, useEffect } from 'react';
import { MousePointerClick, GitCompareArrows, X } from 'lucide-react';

const STORAGE_KEY = 'search-guide-dismissed';

function isDismissedToday(): boolean {
  if (typeof window === 'undefined') return true;
  const dismissed = localStorage.getItem(STORAGE_KEY);
  if (!dismissed) return false;
  const today = new Date().toISOString().slice(0, 10);
  return dismissed === today;
}

function dismissToday(): void {
  const today = new Date().toISOString().slice(0, 10);
  localStorage.setItem(STORAGE_KEY, today);
}

interface Props {
  /** true이면 localStorage 체크 없이 즉시 표시 (Navbar에서 호출 시) */
  forceShow?: boolean;
  /** 외부에서 닫기 제어 */
  onClose?: () => void;
}

export function SearchOverlayGuide({ forceShow, onClose }: Props = {}) {
  const [visible, setVisible] = useState(!!forceShow);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (forceShow) {
      setVisible(true);
      setStep(0);
      return;
    }
    if (!isDismissedToday()) {
      const timer = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(timer);
    }
  }, [forceShow]);

  const handleClose = () => {
    setVisible(false);
    if (!forceShow) dismissToday();
    onClose?.();
  };

  const handleNext = () => {
    if (step < 1) {
      setStep(step + 1);
    } else {
      handleClose();
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* 어두운 배경 */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" onClick={handleClose} />

      {/* 가이드 카드 */}
      <div className="relative z-10 mx-4 w-full max-w-md animate-in fade-in zoom-in-95 duration-300">
        <div className="rounded-2xl border border-white/10 bg-white shadow-2xl">
          {/* 헤더 */}
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-estate-50">
                <GitCompareArrows className="h-4 w-4 text-estate-600" />
              </div>
              <span className="text-sm font-bold text-gray-900">비교분석 사용법</span>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              aria-label="닫기"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* 스텝 콘텐츠 */}
          <div className="px-6 py-6">
            {step === 0 ? (
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-estate-50">
                  <MousePointerClick className="h-8 w-8 text-estate-600" />
                </div>
                <div className="mb-1 text-xs font-bold text-estate-600">STEP 1</div>
                <h3 className="text-lg font-bold text-gray-900">비교할 단지 선택</h3>
                <p className="mt-3 text-sm leading-relaxed text-gray-600">
                  지도 마커 또는 목록 카드를<br />
                  <kbd className="mx-0.5 rounded border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs font-mono font-bold text-gray-700">Ctrl</kbd>
                  + 클릭하면 비교 대상에 추가됩니다.
                </p>
                <div className="mt-4 flex items-center justify-center gap-3 rounded-lg bg-gray-50 px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-estate-600 text-[9px] font-bold text-white">1</span>
                    <span className="text-xs text-gray-500">첫 번째 단지</span>
                  </div>
                  <span className="text-gray-300">+</span>
                  <div className="flex items-center gap-1.5">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-estate-600 text-[9px] font-bold text-white">2</span>
                    <span className="text-xs text-gray-500">두 번째 단지</span>
                  </div>
                  <span className="text-gray-300">=</span>
                  <span className="rounded-full bg-estate-100 px-2 py-0.5 text-[10px] font-semibold text-estate-700">비교 준비 완료</span>
                </div>
              </div>
            ) : (
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50">
                  <GitCompareArrows className="h-8 w-8 text-amber-600" />
                </div>
                <div className="mb-1 text-xs font-bold text-amber-600">STEP 2</div>
                <h3 className="text-lg font-bold text-gray-900">비교분석 실행</h3>
                <p className="mt-3 text-sm leading-relaxed text-gray-600">
                  2개 이상 선택하면 화면 하단에<br />
                  <strong className="text-estate-700">비교 바</strong>가 나타납니다.
                </p>
                <div className="mt-4 rounded-lg bg-gray-50 px-4 py-3">
                  <div className="flex items-center justify-center gap-4">
                    <div className="flex items-center gap-1.5">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[9px] font-bold text-white">1</span>
                      <span className="text-xs text-gray-500">하단 비교 바 확인</span>
                    </div>
                    <span className="text-gray-300">→</span>
                    <div className="flex items-center gap-1.5">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[9px] font-bold text-white">2</span>
                      <span className="text-xs text-gray-500"><strong className="text-estate-700">비교 시작</strong> 클릭</span>
                    </div>
                  </div>
                </div>
                <p className="mt-3 text-xs text-gray-400">
                  비교 페이지에서 AI 인사이트 버튼으로 종합 분석도 받을 수 있습니다
                </p>
              </div>
            )}
          </div>

          {/* 하단 */}
          <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4">
            <button
              type="button"
              onClick={handleClose}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              오늘 다시 보지 않기
            </button>
            <div className="flex items-center gap-3">
              {/* 스텝 인디케이터 */}
              <div className="flex gap-1.5">
                <span className={`h-1.5 w-1.5 rounded-full transition-colors ${step === 0 ? 'bg-estate-600' : 'bg-gray-200'}`} />
                <span className={`h-1.5 w-1.5 rounded-full transition-colors ${step === 1 ? 'bg-estate-600' : 'bg-gray-200'}`} />
              </div>
              <button
                type="button"
                onClick={handleNext}
                className="rounded-lg bg-estate-700 px-4 py-2 text-xs font-semibold text-white hover:bg-estate-800 transition-colors"
              >
                {step < 1 ? '다음' : '시작하기'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
