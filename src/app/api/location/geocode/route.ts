import { NextRequest, NextResponse } from 'next/server';
import { KAKAO_LOCAL_API_URL } from '@/lib/constants';
import type { ApiResponse } from '@/types/api';

interface GeocodeResult {
  lat: number;
  lng: number;
}

interface KakaoAddressDocument {
  x: string;
  y: string;
  address_name: string;
}

interface KakaoAddressResponse {
  documents: KakaoAddressDocument[];
}

/**
 * GET /api/location/geocode?query=서울시 강남구 역삼동 아파트명
 *
 * Kakao 주소 검색 → 좌표 반환 프록시.
 */
export async function GET(request: NextRequest) {
  try {
    const apiKey = process.env.KAKAO_REST_API_KEY;
    if (!apiKey) {
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

    const url = `${KAKAO_LOCAL_API_URL}/search/address.json?query=${encodeURIComponent(query)}&size=1`;

    const response = await fetch(url, {
      headers: { Authorization: `KakaoAK ${apiKey}` },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      throw new Error(`Kakao API 응답 오류: ${response.status}`);
    }

    const data: KakaoAddressResponse = await response.json();

    if (data.documents.length === 0) {
      // 주소 검색 실패 시 키워드 검색으로 fallback
      const kwUrl = `${KAKAO_LOCAL_API_URL}/search/keyword.json?query=${encodeURIComponent(query)}&size=1`;
      const kwRes = await fetch(kwUrl, {
        headers: { Authorization: `KakaoAK ${apiKey}` },
        signal: AbortSignal.timeout(5000),
      });

      if (!kwRes.ok) {
        throw new Error(`Kakao API 응답 오류: ${kwRes.status}`);
      }

      const kwData = await kwRes.json();
      if (kwData.documents?.length > 0) {
        const doc = kwData.documents[0];
        const result: GeocodeResult = {
          lat: parseFloat(doc.y),
          lng: parseFloat(doc.x),
        };
        return NextResponse.json<ApiResponse<GeocodeResult>>({
          success: true,
          data: result,
        });
      }

      return NextResponse.json<ApiResponse<null>>(
        { success: false, data: null, error: '좌표를 찾을 수 없습니다' },
        { status: 404 },
      );
    }

    const doc = data.documents[0];
    const result: GeocodeResult = {
      lat: parseFloat(doc.y),
      lng: parseFloat(doc.x),
    };

    return NextResponse.json<ApiResponse<GeocodeResult>>({
      success: true,
      data: result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '지오코딩 실패';
    console.error('[/api/location/geocode]', message);
    return NextResponse.json<ApiResponse<null>>(
      { success: false, data: null, error: message },
      { status: 500 },
    );
  }
}
