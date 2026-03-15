import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '매물 검색',
  description:
    '지역, 가격, 면적 조건으로 아파트 실거래가를 검색하고 지도에서 확인하세요.',
};

export default function SearchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
