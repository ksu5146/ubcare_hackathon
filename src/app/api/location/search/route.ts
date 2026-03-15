import { NextRequest, NextResponse } from 'next/server';
import { KAKAO_LOCAL_API_URL } from '@/lib/constants';
import type { ApiResponse } from '@/types/api';
import type {
  KakaoKeywordResponse,
  LocationSearchResult,
} from '@/types/location';

/**
 * GET /api/location/search?query=삼성역
 *
 * Kakao Local 키워드 검색 프록시.
 * 서버 사이드에서 API 키를 주입하여 클라이언트 노출을 방지한다.
 */
export async function GET(request: NextRequest) {
  try {
    const apiKey = process.env.KAKAO_REST_API_KEY;
    if (!apiKey) {
      console.error('[/api/location/search] KAKAO_REST_API_KEY 환경변수 미설정');
      return NextResponse.json<ApiResponse<null>>(
        { success: false, data: null, error: '서버 설정 오류' },
        { status: 500 },
      );
    }

    const query = request.nextUrl.searchParams.get('query')?.trim();
    if (!query) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, data: null, error: 'query 파라미터가 필요합니다' },
        { status: 400 },
      );
    }

    const url = `${KAKAO_LOCAL_API_URL}/search/keyword.json?query=${encodeURIComponent(query)}&size=10`;

    const response = await fetch(url, {
      headers: { Authorization: `KakaoAK ${apiKey}` },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      throw new Error(`Kakao API 응답 오류: ${response.status} ${response.statusText}`);
    }

    const data: KakaoKeywordResponse = await response.json();

    const results: LocationSearchResult[] = data.documents.map((doc) => ({
      name: doc.place_name,
      address: doc.road_address_name || doc.address_name,
      lat: parseFloat(doc.y),
      lng: parseFloat(doc.x),
    }));

    return NextResponse.json<ApiResponse<LocationSearchResult[]>>({
      success: true,
      data: results,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '장소 검색 실패';
    console.error('[/api/location/search]', message);
    return NextResponse.json<ApiResponse<null>>(
      { success: false, data: null, error: message },
      { status: 500 },
    );
  }
}
