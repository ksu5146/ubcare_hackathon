import { NextRequest, NextResponse } from 'next/server';
import { ODSAY_API_URL } from '@/lib/constants';
import type { ApiResponse } from '@/types/api';
import type { OdsayResponse, TransitResult } from '@/types/location';

/**
 * GET /api/transit?sx=127.0&sy=37.5&ex=127.1&ey=37.5
 *
 * ODsay 대중교통 경로 탐색 프록시.
 * 서버 사이드에서 API 키를 주입하여 클라이언트 노출을 방지한다.
 */
export async function GET(request: NextRequest) {
  try {
    const apiKey = process.env.ODSAY_API_KEY;
    if (!apiKey) {
      console.error('[/api/transit] ODSAY_API_KEY 환경변수 미설정');
      return NextResponse.json<ApiResponse<null>>(
        { success: false, data: null, error: '서버 설정 오류' },
        { status: 500 },
      );
    }

    const { searchParams } = request.nextUrl;
    const sx = searchParams.get('sx');
    const sy = searchParams.get('sy');
    const ex = searchParams.get('ex');
    const ey = searchParams.get('ey');

    if (!sx || !sy || !ex || !ey) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, data: null, error: 'sx, sy, ex, ey 파라미터가 모두 필요합니다' },
        { status: 400 },
      );
    }

    // ODsay API 호출 (타임아웃 10초, 최대 4회 재시도 — 429 rate limit 대응)
    const MAX_ATTEMPTS = 4;
    const RETRY_DELAYS = [0, 1500, 3000, 5000]; // 첫 시도 즉시, 이후 대기
    let data: OdsayResponse | null = null;
    let lastError = '';

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      // 재시도 시 대기 (429, -99, 네트워크 오류)
      if (attempt > 0 && RETRY_DELAYS[attempt]) {
        console.log(`[/api/transit] waiting ${RETRY_DELAYS[attempt]}ms before retry...`);
        await new Promise((r) => setTimeout(r, RETRY_DELAYS[attempt]));
      }

      try {
        // ODsay API 키는 특수문자(/, +)를 포함하므로 encodeURIComponent로 직접 인코딩
        const url = `${ODSAY_API_URL}/searchPubTransPathT?SX=${sx}&SY=${sy}&EX=${ex}&EY=${ey}&apiKey=${encodeURIComponent(apiKey)}`;

        console.log(`[/api/transit] attempt=${attempt} sx=${sx} sy=${sy} ex=${ex} ey=${ey}`);

        const response = await fetch(url, {
          signal: AbortSignal.timeout(10000),
        });

        // HTTP 429: Too Many Requests → 대기 후 재시도
        if (response.status === 429) {
          lastError = 'ODsay API 요청 한도 초과 (429)';
          console.warn(`[/api/transit] 429 Too Many Requests, retry ${attempt + 1}/${MAX_ATTEMPTS}`);
          continue;
        }

        if (!response.ok) {
          lastError = `ODsay API 응답 오류: ${response.status} ${response.statusText}`;
          console.error(`[/api/transit] HTTP ${response.status}: ${response.statusText}`);
          continue;
        }

        const body = await response.json();
        console.log(`[/api/transit] response:`, body.error ? `error=${JSON.stringify(body.error)}` : `paths=${body.result?.path?.length ?? 0}`);

        // ODsay 에러 응답 처리 (HTTP 200이지만 body에 error 포함)
        if (body.error) {
          const code = Number(body.error.code);
          const msg = body.error.msg ?? body.error.message ?? '알 수 없는 오류';

          // -98: 출발지/도착지 간 거리 너무 가까움, 500: 경로 없음
          if (code === -98 || code === 500) {
            return NextResponse.json<ApiResponse<null>>(
              { success: false, data: null, error: '경로를 찾을 수 없습니다 (거리가 너무 가깝거나 경로가 없습니다)' },
              { status: 404 },
            );
          }

          // 429: ODsay body 내 rate limit 에러
          if (code === 429) {
            lastError = 'ODsay API 요청 한도 초과';
            console.warn(`[/api/transit] ODsay 429 in body, retry ${attempt + 1}/${MAX_ATTEMPTS}`);
            continue;
          }

          // -99: 서버 내부 오류 → 재시도 가능
          if (code === -99) {
            lastError = `ODsay 서버 오류 (${code}): ${msg}`;
            console.warn(`[/api/transit] ODsay -99, retry ${attempt + 1}/${MAX_ATTEMPTS}`);
            continue;
          }

          lastError = `ODsay 오류 (${code}): ${msg}`;
          continue;
        }

        data = body as OdsayResponse;
        break;
      } catch (err) {
        const cause = err instanceof Error && err.cause instanceof Error ? err.cause.message : '';
        lastError = err instanceof Error ? err.message : 'fetch 실패';
        console.error(`[/api/transit] fetch error: ${lastError}${cause ? ` (cause: ${cause})` : ''}`);
        // 타임아웃 등 네트워크 오류 → 재시도
      }
    }

    if (!data?.result?.path?.length) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, data: null, error: lastError || '경로를 찾을 수 없습니다' },
        { status: 404 },
      );
    }

    // 최적 경로 선택: 총 소요시간이 가장 짧은 경로
    const best = data.result.path.reduce((a, b) =>
      a.info.totalTime <= b.info.totalTime ? a : b,
    );
    const { info } = best;

    const pathTypeLabel =
      best.pathType === 1 ? '지하철' : best.pathType === 2 ? '버스' : '지하철+버스';

    const transferCount = Math.max(0, info.busTransitCount + info.subwayTransitCount - 1);

    const summary = `${pathTypeLabel} | ${info.firstStartStation} → ${info.lastEndStation} (${info.totalStationCount}개 정류장)`;

    const result: TransitResult = {
      totalTime: info.totalTime,
      transferCount,
      fare: info.payment,
      summary,
    };

    return NextResponse.json<ApiResponse<TransitResult>>({
      success: true,
      data: result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '대중교통 경로 조회 실패';
    console.error('[/api/transit]', message);
    return NextResponse.json<ApiResponse<null>>(
      { success: false, data: null, error: message },
      { status: 500 },
    );
  }
}
