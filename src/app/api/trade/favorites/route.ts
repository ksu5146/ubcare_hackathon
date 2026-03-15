import { NextRequest, NextResponse } from 'next/server';
import { getFavoritesGrouped, type FavoriteQueryItem } from '@/lib/db-queries';
import type { ApiResponse } from '@/types/api';

/**
 * GET /api/trade/favorites — 즐겨찾기 단지 거래 집계 (검색 필터 독립)
 *
 * Query params:
 *   favorites: JSON 배열 (FavoriteQueryItem[]) — [{aptName, dong, lawdCd}, ...]
 */
export async function GET(request: NextRequest) {
  try {
    const favoritesRaw = request.nextUrl.searchParams.get('favorites');

    if (!favoritesRaw) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, data: null, error: 'favorites 파라미터가 필요합니다' },
        { status: 400 },
      );
    }

    let items: FavoriteQueryItem[];
    try {
      items = JSON.parse(favoritesRaw) as FavoriteQueryItem[];
    } catch {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, data: null, error: 'favorites 파라미터 파싱 실패 (JSON 배열 필요)' },
        { status: 400 },
      );
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: true, data: [], total: 0 });
    }

    // 최대 20개 제한 (useFavorites MAX_FAVORITES와 동일)
    const safeItems = items.slice(0, 20).filter(
      (item) =>
        typeof item.aptName === 'string' &&
        item.aptName.length > 0 &&
        typeof item.lawdCd === 'string' &&
        item.lawdCd.length > 0,
    );

    const groups = await getFavoritesGrouped(safeItems);

    return NextResponse.json({
      success: true,
      data: groups,
      total: groups.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '즐겨찾기 단지 조회 실패';
    console.error('[/api/trade/favorites]', message);
    return NextResponse.json<ApiResponse<null>>(
      { success: false, data: null, error: message },
      { status: 500 },
    );
  }
}
