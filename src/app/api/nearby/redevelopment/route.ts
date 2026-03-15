import { NextRequest, NextResponse } from 'next/server';
import type { ApiResponse } from '@/types/api';
import type { RedevelopmentItem } from '@/types/nearby';

/**
 * 서울 좌표 기준 거리 계산 (Haversine, km -> m)
 */
function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371000; // 지구 반지름 (m)
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** 목(mock) 정비사업 데이터 (서울 주요 정비사업 예시) */
const MOCK_REDEVELOPMENT: Omit<RedevelopmentItem, 'distance'>[] = [
  {
    name: '한남3구역',
    type: '재개발',
    stage: '관리처분인가',
    households: 5816,
    lat: 37.5345,
    lng: 127.0045,
  },
  {
    name: '이촌1구역',
    type: '재건축',
    stage: '사업시행인가',
    households: 4424,
    lat: 37.5168,
    lng: 126.9715,
  },
  {
    name: '둔촌주공',
    type: '재건축',
    stage: '착공',
    households: 12032,
    lat: 37.5195,
    lng: 127.1365,
  },
  {
    name: '개포주공1단지',
    type: '재건축',
    stage: '착공',
    households: 6700,
    lat: 37.4825,
    lng: 127.0605,
  },
  {
    name: '신길1구역',
    type: '재개발',
    stage: '조합설립인가',
    households: 2800,
    lat: 37.5085,
    lng: 126.9155,
  },
  {
    name: '흑석3구역',
    type: '재개발',
    stage: '관리처분인가',
    households: 3100,
    lat: 37.5085,
    lng: 126.9585,
  },
  {
    name: '대치쌍용1차',
    type: '재건축',
    stage: '추진위승인',
    households: 836,
    lat: 37.4955,
    lng: 127.0615,
  },
  {
    name: '잠실진주',
    type: '재건축',
    stage: '조합설립인가',
    households: 1507,
    lat: 37.5075,
    lng: 127.0835,
  },
];

/**
 * GET /api/nearby/redevelopment?lat=37.5&lng=127.0&radius=2000
 *
 * 서울시 정비사업 현황 조회 프록시.
 * SEOUL_OPEN_DATA_KEY가 설정되지 않은 경우 mock 데이터를 반환한다.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    const radius = Number(searchParams.get('radius') ?? 2000);

    if (!lat || !lng) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, data: null, error: 'lat, lng 파라미터가 필요합니다' },
        { status: 400 },
      );
    }

    const centerLat = Number(lat);
    const centerLng = Number(lng);

    if (Number.isNaN(centerLat) || Number.isNaN(centerLng)) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, data: null, error: '유효한 좌표값이 아닙니다' },
        { status: 400 },
      );
    }

    const apiKey = process.env.SEOUL_OPEN_DATA_KEY;

    if (apiKey) {
      // 실제 API 호출
      const url = `http://openapi.seoul.go.kr:8088/${apiKey}/json/TbGmcityPrcnPlanDetl/1/100/`;

      const response = await fetch(url, {
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        throw new Error(`서울 오픈데이터 API 응답 오류: ${response.status}`);
      }

      // API 응답 파싱은 실제 데이터 구조 확인 후 구현
      // 현재는 mock 데이터 폴백
    }

    // Mock 데이터: 반경 내 필터링 + 거리 계산
    const items: RedevelopmentItem[] = MOCK_REDEVELOPMENT
      .map((item) => ({
        ...item,
        distance: Math.round(
          haversineDistance(centerLat, centerLng, item.lat, item.lng),
        ),
      }))
      .filter((item) => item.distance <= radius)
      .sort((a, b) => a.distance - b.distance);

    return NextResponse.json<ApiResponse<RedevelopmentItem[]>>({
      success: true,
      data: items,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : '정비사업 현황 조회 실패';
    console.error('[/api/nearby/redevelopment]', message);
    return NextResponse.json<ApiResponse<null>>(
      { success: false, data: null, error: message },
      { status: 500 },
    );
  }
}
