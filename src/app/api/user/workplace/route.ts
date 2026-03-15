import { NextRequest, NextResponse } from 'next/server';
import { auth, ensureUserSchema } from '@/lib/auth';
import { getClient } from '@/lib/db';

interface WorkplaceRecord {
  id: number;
  name: string;
  lat: number;
  lng: number;
  updated_at: string;
}

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

/** GET: 저장된 직장 위치 조회 */
export async function GET() {
  const session = await auth();
  if (!(session as any)?.kakaoId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = await getUserId((session as any).kakaoId);
  if (!userId) {
    return NextResponse.json({ workplace: null });
  }

  const client = getClient();
  const row = (
    await client.execute({
      sql: 'SELECT id, name, lat, lng, updated_at FROM user_workplace WHERE user_id = ?',
      args: [userId],
    })
  ).rows[0] as unknown as WorkplaceRecord | undefined;

  if (!row) {
    return NextResponse.json({ workplace: null });
  }

  return NextResponse.json({
    workplace: {
      id: Number(row.id),
      name: row.name,
      lat: row.lat,
      lng: row.lng,
      updatedAt: row.updated_at,
    },
  });
}

/** POST: 직장 위치 저장/업데이트 (UPSERT) */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!(session as any)?.kakaoId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = await getUserId((session as any).kakaoId);
  if (!userId) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const body = await req.json();
  const { name, lat, lng } = body as { name: string; lat: number; lng: number };

  if (!name || lat == null || lng == null) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const client = getClient();
  await client.execute({
    sql: `INSERT INTO user_workplace (user_id, name, lat, lng)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(user_id) DO UPDATE SET
            name = excluded.name,
            lat = excluded.lat,
            lng = excluded.lng,
            updated_at = datetime('now')`,
    args: [userId, name, lat, lng],
  });

  return NextResponse.json({ success: true });
}

/** DELETE: 직장 위치 삭제 */
export async function DELETE() {
  const session = await auth();
  if (!(session as any)?.kakaoId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = await getUserId((session as any).kakaoId);
  if (!userId) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const client = getClient();
  await client.execute({
    sql: 'DELETE FROM user_workplace WHERE user_id = ?',
    args: [userId],
  });

  return NextResponse.json({ success: true });
}
