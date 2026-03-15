import { NextRequest, NextResponse } from 'next/server';
import { getTradesByComplex } from '@/lib/db-queries';
import type { ApiResponse } from '@/types/api';
import type { ApartmentTrade } from '@/types/trade';

/**
 * GET /api/trade/complex?lawdCd=11680&aptName=래미안&dong=도곡동
 *
 * DB에서 특정 단지의 전체 거래 내역 조회
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const lawdCd = searchParams.get('lawdCd');
    const aptName = searchParams.get('aptName');
    const dong = searchParams.get('dong') ?? undefined;

    if (!lawdCd || !aptName) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, data: null, error: 'lawdCd와 aptName 파라미터가 필요합니다' },
        { status: 400 },
      );
    }

    const trades = await getTradesByComplex(lawdCd, aptName, dong);

    return NextResponse.json<ApiResponse<ApartmentTrade[]>>({
      success: true,
      data: trades,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '거래 내역 조회 실패';
    console.error('[/api/trade/complex]', message);
    return NextResponse.json<ApiResponse<null>>(
      { success: false, data: null, error: message },
      { status: 500 },
    );
  }
}
