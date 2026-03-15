import { NextRequest, NextResponse } from 'next/server';
import { auth, ensureUserSchema } from '@/lib/auth';
import { getClient } from '@/lib/db';

async function getUserId(kakaoId: string): Promise<number | null> {
  await ensureUserSchema();
  const client = getClient();
  const row = (
    await client.execute({
      sql: 'SELECT id FROM users WHERE kakao_id = ?',
      args: [kakaoId],
    })
  ).rows[0] as unknown as { id: number } | undefined;
  return row?.id != null ? Number(row.id) : null;
}

/** GET: 즐겨찾기 목록 조회 */
export async function GET() {
  const session = await auth();
  if (!session?.kakaoId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = await getUserId(session.kakaoId);
  if (!userId) {
    return NextResponse.json({ favorites: [] });
  }

  const client = getClient();
  const rows = (
    await client.execute({
      sql: 'SELECT apt_name, dong, lawd_cd, latest_price, build_year, added_at FROM user_favorites WHERE user_id = ? ORDER BY added_at DESC',
      args: [userId],
    })
  ).rows as unknown as Array<{
    apt_name: string;
    dong: string;
    lawd_cd: string;
    latest_price: number;
    build_year: number;
    added_at: string;
  }>;

  const favorites = rows.map((r) => ({
    aptName: r.apt_name,
    dong: r.dong,
    lawdCd: r.lawd_cd,
    latestPrice: r.latest_price,
    buildYear: r.build_year,
    addedAt: r.added_at,
  }));

  return NextResponse.json({ favorites });
}

/** POST: 즐겨찾기 추가 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.kakaoId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = await getUserId(session.kakaoId);
  if (!userId) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const body = await req.json();
  const { aptName, dong, lawdCd, latestPrice, buildYear } = body;

  if (!aptName || !dong || !lawdCd) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const client = getClient();

  // 개수 제한 (20개)
  const count = (
    await client.execute({
      sql: 'SELECT COUNT(*) as cnt FROM user_favorites WHERE user_id = ?',
      args: [userId],
    })
  ).rows[0] as unknown as { cnt: number };
  if (count.cnt >= 20) {
    return NextResponse.json(
      { error: '즐겨찾기는 최대 20개까지 등록할 수 있습니다.' },
      { status: 400 },
    );
  }

  try {
    await client.execute({
      sql: 'INSERT OR IGNORE INTO user_favorites (user_id, apt_name, dong, lawd_cd, latest_price, build_year) VALUES (?, ?, ?, ?, ?, ?)',
      args: [userId, aptName, dong, lawdCd, latestPrice ?? 0, buildYear ?? 0],
    });
  } catch {
    // duplicate — ignore
  }

  return NextResponse.json({ success: true });
}

/** DELETE: 즐겨찾기 삭제 */
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.kakaoId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = await getUserId(session.kakaoId);
  if (!userId) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const { aptName, dong } = await req.json();
  if (!aptName || !dong) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const client = getClient();
  await client.execute({
    sql: 'DELETE FROM user_favorites WHERE user_id = ? AND apt_name = ? AND dong = ?',
    args: [userId, aptName, dong],
  });

  return NextResponse.json({ success: true });
}
