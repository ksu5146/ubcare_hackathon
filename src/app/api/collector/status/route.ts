import { NextResponse } from 'next/server';
import { getCollectorProgress } from '@/lib/collector';
import { isCollecting, isSchedulerRunning } from '@/lib/collector/scheduler';

/**
 * GET /api/collector/status — 수집 상태 조회
 */
export async function GET() {
  try {
    const progress = await getCollectorProgress();

    return NextResponse.json({
      scheduler: {
        running: isSchedulerRunning(),
        collecting: isCollecting(),
      },
      trades: progress.trades,
      complexes: progress.complexes,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
