import { NextRequest, NextResponse } from 'next/server';
import { getComplexList, searchComplexes } from '@/lib/db-queries';
import type { ApiResponse } from '@/types/api';

/**
 * GET /api/complex/list?lawdCd=11680
 *
 * DB 기반 단지 목록 조회 (v2 — SQLite)
 * 확장 필터: aptName, totalUnitMin, totalUnitMax, buildYearMin, buildYearMax,
 *            heatType, hallType, hasElevator, saleType, builder, page, pageSize
 */
export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const lawdCd = sp.get('lawdCd');

    if (!lawdCd) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, data: null, error: 'lawdCd 파라미터가 필요합니다' },
        { status: 400 },
      );
    }

    // 확장 필터가 있으면 searchComplexes, 없으면 간단 목록
    const hasFilter = sp.get('aptName') || sp.get('totalUnitMin') || sp.get('buildYearMin')
      || sp.get('heatType') || sp.get('hallType') || sp.get('saleType')
      || sp.get('builder') || sp.get('hasElevator');

    if (hasFilter) {
      const result = await searchComplexes({
        lawdCd,
        aptName: sp.get('aptName') ?? undefined,
        totalUnitMin: intParam(sp, 'totalUnitMin'),
        totalUnitMax: intParam(sp, 'totalUnitMax'),
        buildYearMin: intParam(sp, 'buildYearMin'),
        buildYearMax: intParam(sp, 'buildYearMax'),
        heatType: sp.get('heatType') ?? undefined,
        hallType: sp.get('hallType') ?? undefined,
        hasElevator: sp.get('hasElevator') === 'true',
        saleType: sp.get('saleType') ?? undefined,
        builder: sp.get('builder') ?? undefined,
        page: intParam(sp, 'page'),
        pageSize: intParam(sp, 'pageSize'),
      });

      return NextResponse.json({
        success: true,
        data: result.complexes,
        pagination: {
          total: result.total,
          page: result.page,
          pageSize: result.pageSize,
          totalPages: result.totalPages,
        },
      });
    }

    const complexes = await getComplexList(lawdCd);

    return NextResponse.json({
      success: true,
      data: complexes,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '단지 목록 조회 실패';
    console.error('[/api/complex/list]', message);
    return NextResponse.json<ApiResponse<null>>(
      { success: false, data: null, error: message },
      { status: 500 },
    );
  }
}

function intParam(sp: URLSearchParams, key: string): number | undefined {
  const v = sp.get(key);
  if (v == null) return undefined;
  const n = parseInt(v, 10);
  return isNaN(n) ? undefined : n;
}
