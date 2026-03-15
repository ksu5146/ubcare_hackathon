import type { Metadata } from 'next';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const aptName = decodeURIComponent(id);

  return {
    title: `${aptName} 실거래가`,
    description: `${aptName} 아파트의 실거래가 추이, 거래 내역, 주변 호재, 출퇴근 분석을 확인하세요.`,
  };
}

export default function ComplexDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
