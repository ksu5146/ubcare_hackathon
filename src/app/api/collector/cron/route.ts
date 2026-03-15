import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/db';
import { runCollectorForRegion } from '@/lib/collector';
import { ALL_TARGET_LAWD_CODES } from '@/lib/collector/types';

/**
 * GET /api/collector/cron — Vercel Cron Job용 증분 수집
 *
 * 단일 cron으로 66개 지역을 라운드 로빈 처리:
 * - 매 호출 시 "가장 오래전에 수집된" BATCH_SIZE개 지역만 수집
 * - 60초 타임아웃 내에 완료되도록 배치 크기 제한
 * - 66개 지역 전체를 약 11시간에 1바퀴 순회
 */

const BATCH_SIZE = 6; // 60초 내 처리 가능한 지역 수

export async function GET(request: NextRequest) {
  // Vercel Cron 인증 (CRON_SECRET 또는 Authorization 헤더)
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const client = getClient();

    // 각 지역의 마지막 수집 완료 시간 조회
    const result = await client.execute({
      sql: `
        SELECT lawd_cd, MAX(completed_at) as last_collected
        FROM collection_state
        WHERE collector_type = 'trade' AND status = 'completed'
        GROUP BY lawd_cd
      `,
      args: [],
    });

    const lastCollected = new Map<string, string>();
    for (const row of result.rows) {
      lastCollected.set(row.lawd_cd as string, row.last_collected as string);
    }

    // 가장 오래전에 수집된 순서로 정렬, 수집 이력 없는 지역 우선
    const sorted = [...ALL_TARGET_LAWD_CODES].sort((a, b) => {
      const aTime = lastCollected.get(a) ?? '1970-01-01';
      const bTime = lastCollected.get(b) ?? '1970-01-01';
      return aTime.localeCompare(bTime);
    });

    const batch = sorted.slice(0, BATCH_SIZE);

    console.log(`[cron] Processing ${batch.length} regions: ${batch.join(', ')}`);

    const result2 = await runCollectorForRegion(batch, 1); // 최근 1개월만

    const tradeCount = result2.trades.reduce((s, r) => s + r.recordCount, 0);
    const complexCount = result2.complexes.reduce((s, r) => s + r.recordCount, 0);

    return NextResponse.json({
      success: true,
      batch: batch.length,
      regions: batch,
      trades: tradeCount,
      complexes: complexCount,
      elapsed: result2.elapsed,
      nextRegions: sorted.slice(BATCH_SIZE, BATCH_SIZE * 2),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[cron] Collection failed:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
