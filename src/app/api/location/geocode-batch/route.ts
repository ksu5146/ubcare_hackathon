import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/db';
import { KAKAO_LOCAL_API_URL } from '@/lib/constants';
import type { ApiResponse } from '@/types/api';

interface GeocodeBatchRequest {
  addresses: { key: string; address: string }[];
}

interface GeocodeBatchResult {
  [key: string]: { lat: number; lng: number } | null;
}

/**
 * POST /api/location/geocode-batch
 *
 * 여러 주소를 한 번에 지오코딩하고 DB에 캐싱합니다.
 * Body: { addresses: [{ key, address }] }
 */
export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.KAKAO_REST_API_KEY;
    if (!apiKey) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, data: null, error: '서버 설정 오류' },
        { status: 500 },
      );
    }

    const body: GeocodeBatchRequest = await request.json();
    const items = body.addresses?.slice(0, 200) ?? [];
    if (items.length === 0) {
      return NextResponse.json<ApiResponse<GeocodeBatchResult>>({
        success: true,
        data: {},
      });
    }

    const client = getClient();

    // geocode_cache 테이블 보장
    await client.execute({
      sql: `
      CREATE TABLE IF NOT EXISTS geocode_cache (
        address TEXT PRIMARY KEY,
        lat     REAL NOT NULL,
        lng     REAL NOT NULL,
        cached_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `,
      args: [],
    });

    const result: GeocodeBatchResult = {};

    // 1단계: DB 캐시에서 조회
    const uncached: { key: string; address: string }[] = [];

    for (const item of items) {
      const row = (
        await client.execute({
          sql: 'SELECT lat, lng FROM geocode_cache WHERE address = ?',
          args: [item.address],
        })
      ).rows[0] as unknown as { lat: number; lng: number } | undefined;
      if (row) {
        result[item.key] = { lat: row.lat, lng: row.lng };
      } else {
        uncached.push(item);
      }
    }

    // 2단계: 캐시에 없는 주소만 Kakao API로 지오코딩
    // 동시 요청 제한: 5개씩 병렬
    const BATCH = 5;
    for (let i = 0; i < uncached.length; i += BATCH) {
      const batch = uncached.slice(i, i + BATCH);

      const promises = batch.map(async (item) => {
        try {
          const coords = await kakaoGeocode(apiKey, item.address);
          if (coords) {
            await client.execute({
              sql: 'INSERT OR REPLACE INTO geocode_cache (address, lat, lng) VALUES (?, ?, ?)',
              args: [item.address, coords.lat, coords.lng],
            });
            result[item.key] = coords;
          } else {
            result[item.key] = null;
          }
        } catch {
          result[item.key] = null;
        }
      });

      await Promise.all(promises);
    }

    return NextResponse.json<ApiResponse<GeocodeBatchResult>>({
      success: true,
      data: result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '배치 지오코딩 실패';
    console.error('[/api/location/geocode-batch]', message);
    return NextResponse.json<ApiResponse<null>>(
      { success: false, data: null, error: message },
      { status: 500 },
    );
  }
}

async function kakaoGeocode(
  apiKey: string,
  query: string,
): Promise<{ lat: number; lng: number } | null> {
  // 주소 검색
  const url = `${KAKAO_LOCAL_API_URL}/search/address.json?query=${encodeURIComponent(query)}&size=1`;
  const res = await fetch(url, {
    headers: { Authorization: `KakaoAK ${apiKey}` },
    signal: AbortSignal.timeout(5000),
  });

  if (res.ok) {
    const data = await res.json();
    if (data.documents?.length > 0) {
      return { lat: parseFloat(data.documents[0].y), lng: parseFloat(data.documents[0].x) };
    }
  }

  // 키워드 검색 fallback
  const kwUrl = `${KAKAO_LOCAL_API_URL}/search/keyword.json?query=${encodeURIComponent(query)}&size=1`;
  const kwRes = await fetch(kwUrl, {
    headers: { Authorization: `KakaoAK ${apiKey}` },
    signal: AbortSignal.timeout(5000),
  });

  if (kwRes.ok) {
    const kwData = await kwRes.json();
    if (kwData.documents?.length > 0) {
      return { lat: parseFloat(kwData.documents[0].y), lng: parseFloat(kwData.documents[0].x) };
    }
  }

  return null;
}
