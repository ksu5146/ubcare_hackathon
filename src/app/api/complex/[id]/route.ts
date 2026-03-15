import { NextRequest, NextResponse } from 'next/server';
import { getComplexDetail, getComplexByName } from '@/lib/db-queries';
import type { ApiResponse } from '@/types/api';
import type { ComplexInfo } from '@/types/complex';

/**
 * GET /api/complex/[id]
 *
 * DB 기반 단지 상세정보 조회
 * - kaptCode로 조회 (기본)
 * - aptName으로 조회 시 lawdCd 쿼리파라미터 필요
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, data: null, error: '단지코드가 필요합니다' },
        { status: 400 },
      );
    }

    const decoded = decodeURIComponent(id);

    // kaptCode로 먼저 조회
    let detail = await getComplexDetail(decoded);

    // 못 찾으면 aptName + lawdCd로 조회
    if (!detail) {
      const lawdCd = request.nextUrl.searchParams.get('lawdCd');
      if (lawdCd) {
        detail = await getComplexByName(decoded, lawdCd);
      }
    }

    if (!detail) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, data: null, error: '단지 정보를 찾을 수 없습니다' },
        { status: 404 },
      );
    }

    return NextResponse.json<ApiResponse<ComplexInfo>>({
      success: true,
      data: detail,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '단지 정보 조회 실패';
    console.error('[/api/complex/[id]]', message);
    return NextResponse.json<ApiResponse<null>>(
      { success: false, data: null, error: message },
      { status: 500 },
    );
  }
}
