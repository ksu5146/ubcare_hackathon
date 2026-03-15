import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-[calc(100dvh-56px)] flex-col items-center justify-center px-4 text-center">
      <h1 className="mb-2 text-6xl font-bold text-estate-200">404</h1>
      <h2 className="mb-1 text-xl font-semibold text-gray-900">
        페이지를 찾을 수 없습니다
      </h2>
      <p className="mb-6 text-sm text-gray-500">
        요청하신 페이지가 존재하지 않거나 이동되었을 수 있습니다.
      </p>
      <Link
        href="/"
        className="rounded-lg bg-estate-700 px-6 py-2.5 text-sm font-semibold text-white hover:bg-estate-800 transition-colors"
      >
        홈으로 돌아가기
      </Link>
    </div>
  );
}
