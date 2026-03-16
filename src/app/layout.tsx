import type { Metadata } from 'next';
import localFont from 'next/font/local';
import Script from 'next/script';
import './globals.css';
import { Header } from '@/components/layout/Header';
import { SessionProvider } from '@/components/auth/SessionProvider';

const KAKAO_APP_KEY = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY ?? '';

const pretendard = localFont({
  src: '../../node_modules/pretendard/dist/web/variable/woff2/PretendardVariable.woff2',
  variable: '--font-sans',
  display: 'swap',
  weight: '100 900',
  preload: true,
});

export const metadata: Metadata = {
  title: {
    default: '방구석 임장 — 실거래가 분석 포털',
    template: '%s | 방구석 임장',
  },
  description:
    '예산, 지역, 면적 조건으로 아파트를 검색하고 실거래가 추이와 주변 호재를 한눈에 확인하세요.',
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    siteName: '방구석 임장',
    title: '방구석 임장 — 실거래가 분석 포털',
    description:
      '공공데이터 기반 아파트 실거래가 분석, 주변 호재, 출퇴근 시간까지 한눈에 확인하세요.',
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={pretendard.variable}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;if(d)document.documentElement.classList.add('dark');}catch(e){}})();`,
          }}
        />
      </head>
      <body className="font-sans antialiased">
        <SessionProvider>
          <Header />
          <main className="min-h-[calc(100dvh-56px)]">{children}</main>
        </SessionProvider>
        {KAKAO_APP_KEY && (
            <Script
              src={`https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_APP_KEY}&autoload=false&libraries=services`}
              strategy="afterInteractive"
            />
          )}
      </body>
    </html>
  );
}
