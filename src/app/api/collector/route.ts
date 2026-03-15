import { NextRequest, NextResponse } from 'next/server';
import { runCollector, runCollectorForRegion } from '@/lib/collector';
import { isCollecting } from '@/lib/collector/scheduler';

/**
 * POST /api/collector — 수집 수동 트리거
 *
 * Body (optional):
 *   { lawdCodes?: string[], months?: number }
 *
 * lawdCodes 미지정 시 전체 수도권 대상
 */
export async function POST(request: NextRequest) {
  const secret = process.env.COLLECTOR_SECRET;
  if (!secret || request.headers.get('x-collector-secret') !== secret) {
    return NextResponse.json({ error: '인증 실패' }, { status: 401 });
  }

  if (isCollecting()) {
    return NextResponse.json(
      { error: '수집이 이미 진행 중입니다.' },
      { status: 409 },
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { lawdCodes, months } = body as {
      lawdCodes?: string[];
      months?: number;
    };

    // 비동기로 수집 시작 (응답은 즉시 반환)
    const promise = lawdCodes?.length
      ? runCollectorForRegion(lawdCodes, months)
      : runCollector({ months });

    // fire-and-forget: 백그라운드 실행
    promise.then((result) => {
      const tradeCount = result.trades.reduce((s, r) => s + r.recordCount, 0);
      const complexCount = result.complexes.reduce((s, r) => s + r.recordCount, 0);
      const seoulCount = result.seoulApt?.recordCount ?? 0;
      const bldgCount = result.buildingLedger.reduce((s, r) => s + r.recordCount, 0);
      const landCount = result.landUse.reduce((s, r) => s + r.recordCount, 0);
      console.log(
        `[collector] Manual run completed in ${result.elapsed}ms — ` +
        `trades: ${tradeCount}, complexes: ${complexCount}, seoulApt: ${seoulCount}, ` +
        `buildingLedger: ${bldgCount}, landUse: ${landCount}`,
      );
    }).catch((err) => {
      console.error('[collector] Manual run failed:', err);
    });

    return NextResponse.json({
      message: '수집이 시작되었습니다.',
      target: lawdCodes?.length
        ? `${lawdCodes.length}개 지역`
        : '전체 수도권',
      months: months ?? 36,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
