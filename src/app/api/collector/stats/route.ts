import { NextResponse } from 'next/server';
import { getDbStats } from '@/lib/db-queries';

/**
 * GET /api/collector/stats — DB 통계 조회
 */
export async function GET() {
  try {
    const stats = await getDbStats();
    return NextResponse.json({ success: true, data: stats });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
