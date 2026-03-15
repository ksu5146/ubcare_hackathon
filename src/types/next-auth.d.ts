import 'next-auth';

declare module 'next-auth' {
  interface Session {
    kakaoId?: string;
    nickname?: string;
    profileImage?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    kakaoId?: string;
    nickname?: string;
    profileImage?: string;
  }
}
