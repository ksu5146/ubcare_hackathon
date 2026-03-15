import { NextRequest, NextResponse } from 'next/server';
import { auth, ensureUserSchema } from '@/lib/auth';
import { getClient } from '@/lib/db';

/** POST: localStorage 즐겨찾기를 서버로 일괄 동기화 (로그인 직후 호출) */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.kakaoId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await ensureUserSchema();
  const client = getClient();
  const userRow = (
    await client.execute({
      sql: 'SELECT id FROM users WHERE kakao_id = ?',
      args: [session.kakaoId],
    })
  ).rows[0] as unknown as { id: number } | undefined;
  if (!userRow) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const { favorites } = (await req.json()) as {
    favorites: Array<{
      aptName: string;
      dong: string;
      lawdCd: string;
      latestPrice: number;
      buildYear: number;
      addedAt: string;
    }>;
  };

  if (!Array.isArray(favorites)) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  await client.batch(
    favorites.map((f) => ({
      sql: 'INSERT OR IGNORE INTO user_favorites (user_id, apt_name, dong, lawd_cd, latest_price, build_year, added_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      args: [
        userRow.id,
        f.aptName,
        f.dong,
        f.lawdCd,
        f.latestPrice ?? 0,
        f.buildYear ?? 0,
        f.addedAt ?? new Date().toISOString(),
      ],
    })),
    'write',
  );

  // 동기화 후 전체 목록 반환
  const rows = (
    await client.execute({
      sql: 'SELECT apt_name, dong, lawd_cd, latest_price, build_year, added_at FROM user_favorites WHERE user_id = ? ORDER BY added_at DESC',
      args: [userRow.id],
    })
  ).rows as unknown as Array<{
    apt_name: string;
    dong: string;
    lawd_cd: string;
    latest_price: number;
    build_year: number;
    added_at: string;
  }>;

  const merged = rows.map((r) => ({
    aptName: r.apt_name,
    dong: r.dong,
    lawdCd: r.lawd_cd,
    latestPrice: r.latest_price,
    buildYear: r.build_year,
    addedAt: r.added_at,
  }));

  return NextResponse.json({ favorites: merged });
}
