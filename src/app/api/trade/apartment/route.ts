import { NextRequest, NextResponse } from 'next/server';
import { getTradesByLawdYm } from '@/lib/db-queries';
import type { ApiResponse } from '@/types/api';
import type { ApartmentTrade } from '@/types/trade';

/**
 * GET /api/trade/apartment?lawdCd=11680&dealYmd=202512
 *
 * DB 기반 실거래가 조회 (v2 — SQLite)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const lawdCd = searchParams.get('lawdCd');
    const dealYmd = searchParams.get('dealYmd');

    if (!lawdCd || !dealYmd) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, data: null, error: 'lawdCd와 dealYmd 파라미터가 필요합니다' },
        { status: 400 },
      );
    }

    const trades = await getTradesByLawdYm(lawdCd, dealYmd);

    return NextResponse.json<ApiResponse<ApartmentTrade[]>>({
      success: true,
      data: trades,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '실거래가 조회 실패';
    console.error('[/api/trade/apartment]', message);
    return NextResponse.json<ApiResponse<null>>(
      { success: false, data: null, error: message },
      { status: 500 },
    );
  }
}
