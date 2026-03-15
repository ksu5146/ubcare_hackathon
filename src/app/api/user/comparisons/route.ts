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

interface CompareItem {
  name: string;
  dong: string;
  lawdCd: string;
}

/** GET: 비교분석 목록 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.kakaoId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = await getUserId(session.kakaoId);
  if (!userId) {
    return NextResponse.json({ comparisons: [] });
  }

  const type = req.nextUrl.searchParams.get('type');

  const client = getClient();
  let rows;
  if (type) {
    rows = (
      await client.execute({
        sql: 'SELECT id, name, apt_names, lawd_cd, dong, type, created_at FROM user_comparisons WHERE user_id = ? AND type = ? ORDER BY created_at DESC',
        args: [userId, type],
      })
    ).rows;
  } else {
    rows = (
      await client.execute({
        sql: 'SELECT id, name, apt_names, lawd_cd, dong, type, created_at FROM user_comparisons WHERE user_id = ? ORDER BY created_at DESC',
        args: [userId],
      })
    ).rows;
  }

  const comparisons = (rows as any[]).map((r) => {
    // apt_names 는 JSON — items 배열 또는 이름 배열일 수 있음 (하위 호환)
    let items: CompareItem[];
    try {
      const parsed = JSON.parse(r.apt_names);
      if (Array.isArray(parsed) && parsed.length > 0) {
        if (typeof parsed[0] === 'string') {
          // 구버전: 이름 배열 → CompareItem으로 변환
          items = parsed.map((name: string) => ({ name, dong: r.dong || '', lawdCd: r.lawd_cd || '' }));
        } else {
          // 신버전: CompareItem 배열
          items = parsed;
        }
      } else {
        items = [];
      }
    } catch {
      items = [];
    }

    return {
      id: Number(r.id),
      name: r.name,
      items,
      type: r.type as 'history' | 'bookmark',
      createdAt: r.created_at,
    };
  });

  return NextResponse.json({ comparisons });
}

/** POST: 비교분석 저장 */
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
  const { name, items, type = 'history' } = body as {
    name?: string;
    items: CompareItem[];
    type?: 'history' | 'bookmark';
  };

  if (!items || !Array.isArray(items) || items.length < 2) {
    return NextResponse.json({ error: 'items must have at least 2 entries' }, { status: 400 });
  }

  const client = getClient();
  // 정렬된 이름 키 (중복 비교용)
  const sortedKey = [...items].map((i) => i.name).sort().join('||');

  if (type === 'history') {
    // 동일 조합이면 시간만 갱신 + items 업데이트
    const allHistory = (
      await client.execute({
        sql: "SELECT id, apt_names FROM user_comparisons WHERE user_id = ? AND type = 'history'",
        args: [userId],
      })
    ).rows as unknown as Array<{ id: number; apt_names: string }>;

    const existing = allHistory.find((row) => {
      try {
        const parsed = JSON.parse(row.apt_names);
        const names = Array.isArray(parsed)
          ? parsed.map((p: any) => (typeof p === 'string' ? p : p.name)).sort().join('||')
          : '';
        return names === sortedKey;
      } catch {
        return false;
      }
    });

    if (existing) {
      await client.execute({
        sql: "UPDATE user_comparisons SET apt_names = ?, created_at = datetime('now') WHERE id = ?",
        args: [JSON.stringify(items), Number(existing.id)],
      });
      return NextResponse.json({ success: true, id: Number(existing.id) });
    }

    // 히스토리 최대 10개 유지
    if (allHistory.length >= 10) {
      const oldest = (
        await client.execute({
          sql: "SELECT id FROM user_comparisons WHERE user_id = ? AND type = 'history' ORDER BY created_at ASC LIMIT ?",
          args: [userId, allHistory.length - 9],
        })
      ).rows as unknown as Array<{ id: number }>;
      for (const old of oldest) {
        await client.execute({
          sql: 'DELETE FROM user_comparisons WHERE id = ?',
          args: [Number(old.id)],
        });
      }
    }
  }

  if (type === 'bookmark') {
    const bmCount = (
      await client.execute({
        sql: "SELECT COUNT(*) as cnt FROM user_comparisons WHERE user_id = ? AND type = 'bookmark'",
        args: [userId],
      })
    ).rows[0] as unknown as { cnt: number };
    if (bmCount.cnt >= 10) {
      return NextResponse.json(
        { error: '비교분석 즐겨찾기는 최대 10개까지 저장할 수 있습니다.' },
        { status: 400 },
      );
    }
  }

  const displayName =
    name ||
    items.slice(0, 3).map((i) => i.name).join(' vs ') +
      (items.length > 3 ? ` 외 ${items.length - 3}` : '');

  const insertResult = await client.execute({
    sql: 'INSERT INTO user_comparisons (user_id, name, apt_names, lawd_cd, dong, type) VALUES (?, ?, ?, ?, ?, ?)',
    args: [userId, displayName, JSON.stringify(items), '', '', type],
  });

  return NextResponse.json({ success: true, id: Number(insertResult.lastInsertRowid) });
}

/** PATCH: 히스토리 → 즐겨찾기 전환 또는 이름 변경 */
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.kakaoId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = await getUserId(session.kakaoId);
  if (!userId) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const { id, name, type } = await req.json();
  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  const client = getClient();

  if (type === 'bookmark') {
    const bmCount = (
      await client.execute({
        sql: "SELECT COUNT(*) as cnt FROM user_comparisons WHERE user_id = ? AND type = 'bookmark'",
        args: [userId],
      })
    ).rows[0] as unknown as { cnt: number };
    if (bmCount.cnt >= 10) {
      return NextResponse.json(
        { error: '비교분석 즐겨찾기는 최대 10개까지 저장할 수 있습니다.' },
        { status: 400 },
      );
    }
  }

  const updates: string[] = [];
  const params: any[] = [];
  if (name !== undefined) {
    updates.push('name = ?');
    params.push(name);
  }
  if (type !== undefined) {
    updates.push('type = ?');
    params.push(type);
  }
  if (updates.length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  }

  params.push(id, userId);
  await client.execute({
    sql: `UPDATE user_comparisons SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`,
    args: params,
  });

  return NextResponse.json({ success: true });
}

/** DELETE: 비교분석 삭제 */
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.kakaoId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = await getUserId(session.kakaoId);
  if (!userId) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const { id } = await req.json();
  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  const client = getClient();
  await client.execute({
    sql: 'DELETE FROM user_comparisons WHERE id = ? AND user_id = ?',
    args: [id, userId],
  });

  return NextResponse.json({ success: true });
}
