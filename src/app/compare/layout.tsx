import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '단지 비교',
  description: '관심 단지 2곳의 실거래가, 기본정보, 출퇴근 시간을 나란히 비교하세요.',
};

export default function CompareLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
