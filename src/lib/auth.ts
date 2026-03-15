import NextAuth from 'next-auth';
import Kakao from 'next-auth/providers/kakao';
import { getClient, initSchema } from '@/lib/db';

const hasKakaoCredentials =
  !!process.env.KAKAO_CLIENT_ID && !!process.env.KAKAO_CLIENT_SECRET;

/** 사용자 테이블 초기화 */
async function initUserSchema(): Promise<void> {
  const client = getClient();

  await client.executeMultiple(`
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      kakao_id      TEXT NOT NULL UNIQUE,
      nickname      TEXT,
      profile_image TEXT,
      created_at    TEXT NOT NULL DEFAULT (datetime('now')),
      last_login_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS user_favorites (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      apt_name  TEXT NOT NULL,
      dong      TEXT NOT NULL,
      lawd_cd   TEXT NOT NULL,
      latest_price INTEGER,
      build_year   INTEGER,
      added_at  TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_id, apt_name, dong)
    );

    CREATE TABLE IF NOT EXISTS user_comparisons (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name       TEXT DEFAULT '',
      apt_names  TEXT NOT NULL,
      lawd_cd    TEXT NOT NULL DEFAULT '',
      dong       TEXT NOT NULL DEFAULT '',
      type       TEXT NOT NULL DEFAULT 'history',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS user_filters (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name       TEXT NOT NULL,
      filters    TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_users_kakao ON users(kakao_id);
    CREATE INDEX IF NOT EXISTS idx_user_favorites_user ON user_favorites(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_comparisons_user ON user_comparisons(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_filters_user ON user_filters(user_id);
  `);
}

/** 기존 테이블에 누락된 컬럼 추가 (마이그레이션) */
async function migrateUserSchema(): Promise<void> {
  const client = getClient();

  try {
    const result = await client.execute({ sql: 'PRAGMA table_info(user_comparisons)', args: [] });
    const columns = result.rows as unknown as Array<{ name: string }>;
    if (columns.length > 0) {
      const hasType = columns.some((c) => c.name === 'type');
      if (!hasType) {
        // type 컬럼 없으면 테이블 재생성 (데이터가 적으므로 안전)
        await client.executeMultiple(`
          ALTER TABLE user_comparisons RENAME TO _user_comparisons_old;
          CREATE TABLE user_comparisons (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            name       TEXT DEFAULT '',
            apt_names  TEXT NOT NULL,
            lawd_cd    TEXT NOT NULL DEFAULT '',
            dong       TEXT NOT NULL DEFAULT '',
            type       TEXT NOT NULL DEFAULT 'history',
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
          );
          INSERT INTO user_comparisons (id, user_id, name, apt_names, lawd_cd, dong, created_at)
            SELECT id, user_id, name, apt_names, lawd_cd, dong, created_at FROM _user_comparisons_old;
          DROP TABLE _user_comparisons_old;
        `);
      }
    }
  } catch {
    // 테이블이 아직 없으면 무시 (initUserSchema에서 생성됨)
  }
}

let _userSchemaReady = false;
async function ensureUserSchema(): Promise<void> {
  if (!_userSchemaReady) {
    await initSchema();
    await initUserSchema();
    await migrateUserSchema();
    _userSchemaReady = true;
  }
}

/** DB에서 사용자 조회/생성 */
async function upsertUser(kakaoId: string, nickname?: string, profileImage?: string) {
  await ensureUserSchema();
  const client = getClient();

  const selectResult = await client.execute({
    sql: 'SELECT id, kakao_id, nickname, profile_image FROM users WHERE kakao_id = ?',
    args: [kakaoId],
  });
  const existing = selectResult.rows[0] as unknown as
    | { id: number; kakao_id: string; nickname: string; profile_image: string }
    | undefined;

  if (existing) {
    await client.execute({
      sql: "UPDATE users SET nickname = ?, profile_image = ?, last_login_at = datetime('now') WHERE kakao_id = ?",
      args: [nickname ?? existing.nickname, profileImage ?? existing.profile_image, kakaoId],
    });
    return { ...existing, nickname: nickname ?? existing.nickname };
  }

  const insertResult = await client.execute({
    sql: 'INSERT INTO users (kakao_id, nickname, profile_image) VALUES (?, ?, ?)',
    args: [kakaoId, nickname ?? '', profileImage ?? ''],
  });

  return { id: Number(insertResult.lastInsertRowid), kakao_id: kakaoId, nickname: nickname ?? '' };
}

const providers = hasKakaoCredentials
  ? [
      Kakao({
        clientId: process.env.KAKAO_CLIENT_ID!,
        clientSecret: process.env.KAKAO_CLIENT_SECRET!,
        authorization: {
          url: 'https://kauth.kakao.com/oauth/authorize',
          params: { scope: 'profile_nickname profile_image' },
        },
      }),
    ]
  : [];

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  providers,
  callbacks: {
    async signIn({ account, profile, user }) {
      if (account?.provider === 'kakao' && profile) {
        const kakaoId = String(profile.id ?? account.providerAccountId);
        const p = profile as any;
        const nickname =
          p.kakao_account?.profile?.nickname ??
          p.properties?.nickname ??
          p.kakao_account?.name ??
          p.name ??
          user?.name ??
          '';
        const profileImage =
          p.kakao_account?.profile?.profile_image_url ??
          p.properties?.profile_image ??
          user?.image ??
          '';
        await upsertUser(kakaoId, nickname, profileImage);
      }
      return true;
    },
    async jwt({ token, account, profile, user }) {
      if (account?.provider === 'kakao' && profile) {
        const p = profile as any;
        token.kakaoId = String(p.id ?? account.providerAccountId);

        // 카카오 프로필 데이터 경로가 다양하므로 여러 경로 시도
        token.nickname =
          p.kakao_account?.profile?.nickname ??
          p.properties?.nickname ??
          p.kakao_account?.name ??
          p.name ??
          user?.name ??
          '';
        token.profileImage =
          p.kakao_account?.profile?.profile_image_url ??
          p.kakao_account?.profile?.thumbnail_image_url ??
          p.properties?.profile_image ??
          p.properties?.thumbnail_image ??
          p.picture ??
          user?.image ??
          '';

        if (process.env.NODE_ENV === 'development') {
          console.log('[Auth] Kakao full profile:', JSON.stringify(p, null, 2));
          console.log('[Auth] user object:', JSON.stringify(user, null, 2));
          console.log('[Auth] nickname resolved:', token.nickname);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token.kakaoId) {
        (session as any).kakaoId = token.kakaoId;
        (session as any).nickname = token.nickname;
        (session as any).profileImage = token.profileImage;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
});

export { ensureUserSchema };
