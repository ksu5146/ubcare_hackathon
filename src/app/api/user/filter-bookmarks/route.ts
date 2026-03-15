import { NextRequest, NextResponse } from 'next/server';
import { auth, ensureUserSchema } from '@/lib/auth';
import { getClient } from '@/lib/db';
import type { FilterState } from '@/types/filter';

const MAX_BOOKMARKS = 10;

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

/** GET: 필터 북마크 목록 조회 */
export async function GET() {
  const session = await auth();
  if (!(session as any)?.kakaoId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = await getUserId((session as any).kakaoId);
  if (!userId) {
    return NextResponse.json({ bookmarks: [] });
  }

  const client = getClient();
  const rows = (
    await client.execute({
      sql: 'SELECT id, name, filters, created_at FROM user_filter_bookmarks WHERE user_id = ? ORDER BY created_at DESC',
      args: [userId],
    })
  ).rows as unknown as Array<{ id: number; name: string; filters: string; created_at: string }>;

  const bookmarks = rows.map((r) => {
    let filters: FilterState;
    try {
      filters = JSON.parse(r.filters) as FilterState;
    } catch {
      filters = {} as FilterState;
    }
    return {
      id: Number(r.id),
      name: r.name,
      filters,
      createdAt: r.created_at,
    };
  });

  return NextResponse.json({ bookmarks });
}

/** POST: 필터 북마크 추가 */
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
  const { name, filters } = body as { name: string; filters: FilterState };

  if (!name || !filters) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const client = getClient();

  const count = (
    await client.execute({
      sql: 'SELECT COUNT(*) as cnt FROM user_filter_bookmarks WHERE user_id = ?',
      args: [userId],
    })
  ).rows[0] as unknown as { cnt: number };

  if (Number(count.cnt) >= MAX_BOOKMARKS) {
    return NextResponse.json(
      { error: `필터 북마크는 최대 ${MAX_BOOKMARKS}개까지 저장할 수 있습니다.` },
      { status: 400 },
    );
  }

  const insertResult = await client.execute({
    sql: 'INSERT INTO user_filter_bookmarks (user_id, name, filters) VALUES (?, ?, ?)',
    args: [userId, name, JSON.stringify(filters)],
  });

  return NextResponse.json({ success: true, id: Number(insertResult.lastInsertRowid) });
}

/** DELETE: 필터 북마크 삭제 */
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!(session as any)?.kakaoId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = await getUserId((session as any).kakaoId);
  if (!userId) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const { id } = await req.json();
  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  const client = getClient();
  await client.execute({
    sql: 'DELETE FROM user_filter_bookmarks WHERE id = ? AND user_id = ?',
    args: [id, userId],
  });

  return NextResponse.json({ success: true });
}
