import { NextRequest, NextResponse } from 'next/server';
import { searchTrades, searchTradeGrouped, type TradeSearchParams } from '@/lib/db-queries';
import type { ApiResponse } from '@/types/api';

/**
 * GET /api/trade/search — 확장 필터 기반 실거래가 검색 (v2)
 *
 * 기본 필터:
 *   lawdCd (콤마 구분, 최대 3개), fromYm, toYm,
 *   priceMin, priceMax, areaMin, areaMax,
 *   floorMin, floorMax, buildYearMin, buildYearMax,
 *   aptName, umdNm, includeDirectDeal,
 *   householdsMin, householdsMax
 *
 * 고급 필터 (complexes JOIN):
 *   parkingRatioMin, hasUndergroundParking,
 *   subwayTimeMax, heatType
 *
 * 정렬/페이징:
 *   sortBy, sortOrder, page, pageSize
 */
export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;

    // lawdCd: 콤마 구분 → 배열 (최대 3개)
    const lawdCdRaw = sp.get('lawdCd');
    const lawdCds = lawdCdRaw
      ? lawdCdRaw.split(',').filter(Boolean).slice(0, 3)
      : undefined;

    const params: TradeSearchParams = {
      // 기본 필터
      lawdCds,
      fromYm: sp.get('fromYm') ?? undefined,
      toYm: sp.get('toYm') ?? undefined,
      priceMin: intParam(sp, 'priceMin'),
      priceMax: intParam(sp, 'priceMax'),
      areaMin: floatParam(sp, 'areaMin'),
      areaMax: floatParam(sp, 'areaMax'),
      floorMin: intParam(sp, 'floorMin'),
      floorMax: intParam(sp, 'floorMax'),
      buildYearMin: intParam(sp, 'buildYearMin'),
      buildYearMax: intParam(sp, 'buildYearMax'),
      aptName: sp.get('aptName') ?? undefined,
      umdNm: sp.get('umdNm') ?? undefined,
      includeDirectDeal: sp.get('includeDirectDeal') === 'true',
      excludeCanceled: sp.get('excludeCanceled') !== 'false',
      householdsMin: intParam(sp, 'householdsMin'),
      householdsMax: intParam(sp, 'householdsMax'),

      // 고급 필터
      parkingRatioMin: floatParam(sp, 'parkingRatioMin'),
      hasUndergroundParking: sp.has('hasUndergroundParking')
        ? sp.get('hasUndergroundParking') === 'true'
        : undefined,
      subwayTimeMax: intParam(sp, 'subwayTimeMax'),
      heatType: sp.get('heatType') ?? undefined,
      hallType: sp.get('hallType') ?? undefined,
      builder: sp.get('builder') ?? undefined,
      saleType: sp.get('saleType') ?? undefined,
      hasElevator: sp.has('hasElevator') ? sp.get('hasElevator') === 'true' : undefined,
      roomEstimate: intParam(sp, 'roomEstimate'),
      vlRatMax: intParam(sp, 'vlRatMax'),

      // 정렬/페이징
      sortBy: (sp.get('sortBy') as TradeSearchParams['sortBy']) ?? undefined,
      sortOrder: (sp.get('sortOrder') as TradeSearchParams['sortOrder']) ?? undefined,
      page: intParam(sp, 'page'),
      pageSize: intParam(sp, 'pageSize'),
    };

    if (!lawdCds || lawdCds.length === 0) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, data: null, error: 'lawdCd 파라미터가 필요합니다 (최대 3개, 콤마 구분)' },
        { status: 400 },
      );
    }

    // grouped=true → 단지별 그룹핑 결과 반환
    if (sp.get('grouped') === 'true') {
      const result = await searchTradeGrouped(params);
      return NextResponse.json({
        success: true,
        data: result.groups,
        total: result.total,
      });
    }

    const result = await searchTrades(params);

    return NextResponse.json({
      success: true,
      data: result.trades,
      pagination: {
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
        totalPages: result.totalPages,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '실거래가 검색 실패';
    console.error('[/api/trade/search]', message);
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

function floatParam(sp: URLSearchParams, key: string): number | undefined {
  const v = sp.get(key);
  if (v == null) return undefined;
  const n = parseFloat(v);
  return isNaN(n) ? undefined : n;
}
