import { NextRequest, NextResponse } from 'next/server';
import { searchTrades, searchTradeGrouped, type TradeSearchParams } from '@/lib/db-queries';
import type { ApiResponse } from '@/types/api';

/**
 * GET /api/trade/search — 확장 필터 기반 실거래가 검색 (v2)
 *
 * 기본 필터:
 *   lawdCd        법정동코드 5자리, 콤마 구분 최대 3개 (필수)
 *   fromYm        검색 시작 년월 (YYYYMM)
 *   toYm          검색 종료 년월 (YYYYMM)
 *   priceMin      최소 거래금액 (만원)
 *   priceMax      최대 거래금액 (만원)
 *   areaMin       최소 전용면적 (m²)
 *   areaMax       최대 전용면적 (m²)
 *   floorMin      최소 층수
 *   floorMax      최대 층수
 *   buildYearMin  최소 건축년도
 *   buildYearMax  최대 건축년도
 *   aptName       단지명 부분 검색 (LIKE)
 *   umdNm         읍면동명 부분 검색 (LIKE)
 *   includeDirectDeal  직거래 포함 여부 (기본 false)
 *   excludeCanceled    해제건 제외 여부 (기본 true)
 *   householdsMin 최소 세대수
 *   householdsMax 최대 세대수
 *
 * 고급 필터 (complexes 테이블 JOIN):
 *   parkingRatioMin      세대당 최소 주차 비율
 *   hasUndergroundParking 지하 주차장 여부 (true/false)
 *   subwayTimeMax        지하철 도보 최대 시간 (분)
 *   heatType             난방방식 (예: 지역난방)
 *   hallType             복도유형 (예: 계단식)
 *   builder              시공사 부분 검색 (LIKE)
 *   saleType             분양형태
 *   hasElevator          승강기 여부 (true/false)
 *   roomEstimate         추정 방 수
 *   vlRatMax             최대 용적률 (%)
 *
 * 정렬/페이징:
 *   sortBy    정렬 기준 (dealAmount | area | buildYear | dealDate | floor)
 *   sortOrder 정렬 방향 (asc | desc, 기본 desc)
 *   page      페이지 번호 (1부터, 기본 1)
 *   pageSize  페이지 크기 (기본 20, 최대 100)
 *
 * 그룹핑 모드:
 *   grouped=true  단지별 그룹핑 결과 반환 (ComplexTradeGroup[])
 *                 — 검색 페이지 지도/리스트 뷰에서 사용
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
