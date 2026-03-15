'use client';

import { useEffect } from 'react';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[ErrorBoundary]', error);
  }, [error]);

  return (
    <div className="flex min-h-[calc(100dvh-56px)] flex-col items-center justify-center px-4 text-center">
      <h1 className="mb-2 text-5xl font-bold text-estate-200">오류</h1>
      <h2 className="mb-1 text-xl font-semibold text-gray-900">
        문제가 발생했습니다
      </h2>
      <p className="mb-6 text-sm text-gray-500">
        {error.message || '일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.'}
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded-lg bg-estate-700 px-6 py-2.5 text-sm font-semibold text-white hover:bg-estate-800 transition-colors"
      >
        다시 시도
      </button>
    </div>
  );
}
