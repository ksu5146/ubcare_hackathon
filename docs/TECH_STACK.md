# 기술 스택 선정 근거 — 부동산 매수 도우미

> **갱신일:** 2026-03-15 (v2.3 — Azure OpenAI, 수집기 라이브러리, .npmrc SSL 패치 추가)

---

## 1. Framework: Next.js 16 (App Router)

| 항목 | 내용 |
|------|------|
| **선정 이유** | SSR/ISR로 초기 로딩 최적화, App Router로 레이아웃 중첩/메타데이터 관리 용이, React 생태계 활용 |
| **대안** | Vite + React Router — SSR 미지원으로 SEO/초기 로딩 불리 |
| **생태계** | npm 주간 2,000만+ 다운로드, Vercel 공식 지원, 풍부한 레퍼런스 |
| **버전** | 16.1.6 (2026-03 기준 최신 안정) |

## 2. Language: TypeScript (strict)

| 항목 | 내용 |
|------|------|
| **선정 이유** | 공공 API 응답 타입 안전성, 컴파일 타임 오류 감지, IDE 자동완성 |
| **대안** | JavaScript — 런타임 타입 오류 위험, API 응답 파싱 시 버그 발생 가능 |
| **설정** | `strict: true`, `noUncheckedIndexedAccess: true` |

## 3. Styling: Tailwind CSS v4

| 항목 | 내용 |
|------|------|
| **선정 이유** | 유틸리티 퍼스트로 빠른 UI 구현, 디자인 토큰을 CSS `@theme inline`으로 관리, 번들 자동 트리셰이킹 |
| **대안** | styled-components — 런타임 CSS-in-JS 오버헤드, SSR hydration 이슈 |
| **특이사항** | v4는 `tailwind.config.ts` 대신 `globals.css` 내 `@theme inline` 블록으로 토큰 정의 |

## 4. UI Primitives: Radix UI

| 항목 | 내용 |
|------|------|
| **선정 이유** | 접근성(WCAG AA) 내장, headless 패턴으로 스타일 자유도 높음, Slider/Dialog/Select/Tabs/Tooltip 사용 |
| **대안** | Headless UI — 컴포넌트 종류 적음, Radix가 더 풍부 |
| **참고** | shadcn/ui 패턴 차용 (Radix + Tailwind + cn() 유틸리티) |

## 5. Charts: Recharts

| 항목 | 내용 |
|------|------|
| **선정 이유** | React 네이티브 차트, ComposedChart로 라인+바 혼합, 커스텀 툴팁 용이 |
| **대안** | Chart.js (react-chartjs-2) — canvas 기반이라 React 상태 연동 불편 |
| **버전** | 3.8.0 |

## 6. Maps: 카카오맵 JS SDK v3

| 항목 | 내용 |
|------|------|
| **선정 이유** | 국내 주소 체계 최적화, 지오코더 내장, 무료 일 300,000건, 한국어 POI 데이터 |
| **대안** | Google Maps — 해외 서비스라 국내 주소 정확도 낮음, 유료 |
| **로딩** | `next/script` 동적 로드, API 키 미설정 시 graceful fallback |

## 7. Font: Pretendard Variable

| 항목 | 내용 |
|------|------|
| **선정 이유** | 한글 최적화 가변 폰트, weight 100~900, `next/font/local`로 셀프 호스팅 (CLS 방지) |
| **대안** | Noto Sans KR — 가변 폰트 미지원 (정적 weight별 파일), 번들 크기 큼 |

## 8. Backend: Next.js Route Handlers

| 항목 | 내용 |
|------|------|
| **선정 이유** | API 프록시 패턴으로 서비스 키 은닉, 별도 백엔드 서버 불필요, 풀스택 단일 배포 |
| **대안** | Express.js 별도 서버 — 배포/관리 복잡도 증가, MVP에 과도 |

## 9. Cache: In-Memory Map

| 항목 | 내용 |
|------|------|
| **선정 이유** | 외부 의존 없이 즉시 구현, TTL 기반 자동 만료, MVP 복잡도 최소화 |
| **대안** | Redis (Upstash) — 서버리스 환경 영속 캐시, 외부 서비스 비용 발생 |
| **한계** | 서버 재시작 시 캐시 소멸, Vercel Serverless cold start 시 초기화 |
| **전환 기준** | 일일 외부 API 호출 5,000건 초과 시 Redis 도입 (RoadMap ADR-001) |
| **참고** | v2.0부터 실거래가/단지 데이터는 SQLite에서 조회하므로 캐시 부담 대폭 감소 |

## 10. DB: Turso (@libsql/client) ★ v2.0 도입 → v2.4 전환

| 항목 | 내용 |
|------|------|
| **선정 이유** | 수도권 3년치 실거래가를 사전 수집하여 저장, 런타임 API 호출 없이 즉시 조회 가능 |
| **v2.0 초기** | `better-sqlite3` 사용 — 동기 API, 로컬 파일 기반, 개발 환경 간편 |
| **v2.4 전환** | `@libsql/client` (Turso/libSQL)로 전환 — Vercel Serverless 환경에서 원격 DB 사용 가능 |
| **전환 이유** | Vercel Serverless는 읽기 전용 파일시스템 → SQLite 파일 사용 불가. Turso는 libSQL 기반 원격 DB로 드롭인 전환 가능 |
| **라이브러리** | `@libsql/client` — async API, HTTP/WebSocket 기반 원격 연결, SQLite 호환 쿼리 문법 |
| **대안 1** | PostgreSQL (Supabase/Neon) — SQL 문법 전면 변환 필요, 마이그레이션 비용 높음 |
| **대안 2** | Cloudflare D1 — Vercel 배포 시 Workers 환경 필요, 플랫폼 종속 |
| **대안 3** | PlanetScale — MySQL 기반, libSQL 문법과 다름 |
| **환경변수** | `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` |
| **개발 환경** | `file:real-estate.db` (로컬 파일), 프로덕션: Turso 원격 DB |

```
Turso(@libsql/client) 전환 근거 요약:
  - Vercel 호환: 서버리스 환경에서 원격 DB URL로 연결, 파일시스템 제약 없음
  - libSQL 호환: SQLite 문법 그대로 사용 가능 (스키마 변경 불필요)
  - 로컬 개발: file: URL로 로컬 파일 DB 그대로 사용 가능
  - async API: Next.js Route Handler의 async/await 패턴과 자연스럽게 통합
```

### 아키텍처 피벗 트레이드오프 (v2.0)

Sprint 5에서 실시간 API 호출 방식(v1.x)에서 DB 사전 수집 방식(v2.0+)으로 전환한 결정의 트레이드오프:

| 관점 | 실시간 API (v1.x) | DB 사전 수집 (v2.0+) |
|------|-------------------|---------------------|
| 데이터 최신성 | 실시간 | 최대 1시간 지연 (Cron 주기) |
| 응답 속도 | p95 5초+ | p95 50ms 이내 |
| API 호출 한도 | 일 1,000건 소진 | 수집 시에만 사용 |
| 오프라인 내성 | 불가 | DB에서 조회 가능 |
| 인프라 비용 | 없음 | DB 호스팅 (Turso 무료 500MB) |
| 복잡도 | 단순 | 수집기 + 스케줄러 추가 |

**전환 결정 배경**: 실거래가 5년치(60개월) 조회 시 API 60회 호출 필요 → 단지 1개 상세 조회만으로 일일 한도의 6% 소진. MAU 1,000명 기준 현실적 운영 불가 판단.

### 미채택 기술 검토

#### Redis (캐시)
- **검토 이유**: 서버리스 cold start 시 인메모리 캐시 소멸 문제 해결 후보
- **미채택 이유**:
  - 관계형 쿼리 미지원 — 실거래가 필터(가격 범위 + 면적 범위 + 지역 + 건축년도 복합 조건)는 JOIN/범위 조건이 필수이며 Redis key-value 구조로 표현 불가
  - v2.0 이후 핵심 데이터(실거래가/단지)가 SQLite로 이동하여 외부 API 호출 빈도 대폭 감소 → 캐시 필요성 약화
  - Upstash 등 외부 서비스 추가 비용 및 의존성 증가
- **재검토 기준**: 학교/재개발 등 외부 API 호출이 일 5,000건 초과 시

#### PostgreSQL (관계형 DB)
- **검토 이유**: Supabase/Neon 등 서버리스 PostgreSQL이 Vercel과 호환
- **미채택 이유**:
  - `better-sqlite3` → `@libsql/client` 전환은 SQL 문법 변경 없이 드롭인 교체 가능 — PostgreSQL 전환은 일부 SQLite 전용 문법(예: `INSERT OR IGNORE`, `PRAGMA`) 재작성 필요
  - 현재 데이터 규모(수도권 3년치 약 50만 건)에서 SQLite 성능으로 충분 (p95 < 50ms)
  - libSQL/Turso의 SQLite 호환 유지가 마이그레이션 비용보다 우선
- **재검토 기준**: 동시 쓰기 요구(다중 수집기 병렬 실행) 또는 데이터 규모 500만 건 초과 시

#### Prisma ORM
- **검토 이유**: TypeScript 타입 안전 DB 쿼리, 마이그레이션 자동화
- **미채택 이유**:
  - `@libsql/client`의 직접 SQL 쿼리가 현재 쿼리 패턴(단순 SELECT/INSERT, 집계)에 충분히 유연
  - Prisma의 libSQL 지원은 실험적 단계(Prisma + Turso 공식 지원 미성숙, 2026-03 기준)
  - ORM 추상화 레이어 추가 시 `db-queries.ts`에서 이미 확립한 헬퍼 함수 패턴과 중복
  - 번들 크기 증가 (Prisma Client ~500KB) — Edge Runtime 제약 환경에서 불리
- **재검토 기준**: 스키마 마이그레이션 자동화 필요성 증가 또는 팀 규모 확장 시

## 11. Auth: NextAuth v5 (beta) ★ v2.2 신규

| 항목 | 내용 |
|------|------|
| **선정 이유** | Next.js App Router 네이티브 지원, 카카오 OAuth Provider 내장, JWT 세션으로 DB 세션 테이블 불필요 |
| **라이브러리** | `next-auth@5.0.0-beta.25` — App Router용 최신 버전, `auth()` 서버 함수로 세션 접근 |
| **대안 1** | Clerk — 풍부한 UI 제공이나 유료, 한국 소셜 로그인(카카오) 미지원 |
| **대안 2** | Lucia Auth — 가볍지만 카카오 Provider 직접 구현 필요, 커뮤니티 작음 |
| **대안 3** | 직접 구현 — OAuth 2.0 플로우 직접 처리 시 보안 취약점 위험 |
| **세션 전략** | JWT (서버 DB 세션 불필요, 무상태) |
| **Provider** | 카카오 (Kakao) — 국내 사용자 점유율 최고, 간편 로그인 |

```
NextAuth v5 선정 근거 요약:
  - App Router 네이티브: auth() 서버 함수, middleware 연동
  - 카카오 Provider 내장: OAuth 2.0 플로우 자동 처리
  - JWT 세션: DB 세션 테이블 불필요, SQLite 부담 최소
  - 확장성: 추후 구글/네이버 Provider 추가 용이
```

## 12. AI: Azure OpenAI ★ v2.3 신규

| 항목 | 내용 |
|------|------|
| **선정 이유** | 단지 비교 분석 AI 인사이트 기능. Azure를 통해 엔터프라이즈 수준의 보안과 안정성 확보 |
| **용도** | 비교 페이지에서 2~4개 단지의 스코어링 데이터(재건축가능성/주거쾌적성/미래가치)를 포함하여 종합 분석 생성 |
| **대안 1** | OpenAI API 직접 호출 — Azure 없이 사용 가능하나 엔터프라이즈 SLA/컴플라이언스 미충족 |
| **대안 2** | 자체 LLM 서버 — 운영 비용/복잡도 과다 |
| **환경변수** | `AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_DEPLOYMENT` |

## 13. 데이터 수집기: lib/collector ★ v2.3 신규

| 항목 | 내용 |
|------|------|
| **구조** | `lib/collector/` 디렉토리 내 모듈 분리 (trade-collector, complex-collector, scoring, scheduler 등) |
| **스코어링** | 수집된 단지 데이터 기반 재건축가능성/주거쾌적성/미래가치 점수 계산, SQLite complexes 테이블에 저장 |
| **웹 UI** | `/app/api/collector/` Route Handler를 통해 브라우저에서 수집 실행/상태 모니터링 가능 |
| **설계 원칙** | 수집 로직과 서비스 런타임 로직 완전 분리 — 수집기는 배치 전용, 런타임은 DB 조회만 수행 |

## 14. 환경 설정: .npmrc SSL 패치 ★ v2.3 신규

| 항목 | 내용 |
|------|------|
| **문제** | Windows 기업 환경에서 npm 패키지 설치 시 SSL 인증서 오류 발생 |
| **해결** | `.npmrc`에 `node-options=--use-system-ca` 추가 — 시스템 CA 인증서 체인 사용 |
| **영향 범위** | 개발 환경 한정. 배포 환경(Vercel)에서는 불필요 |

## 15. Icons: lucide-react

| 항목 | 내용 |
|------|------|
| **선정 이유** | 트리셰이킹 지원, 일관된 스트로크 아이콘, React 네이티브 컴포넌트 |
| **대안** | react-icons — 번들에 불필요한 아이콘 포함 가능 |

## 13. 배포: Vercel

| 항목 | 내용 |
|------|------|
| **선정 이유** | Next.js 공식 배포 플랫폼, 무료 티어, 자동 Preview 배포, Edge Functions |
| **대안** | AWS Amplify — 설정 복잡, Next.js 최적화 수준 낮음 |
| **SQLite 주의** | Vercel Serverless 환경은 읽기 전용 파일시스템 → 배포 시 Turso 전환 필요 |

---

## 기술 스택 요약 다이어그램

```
┌─────────────────────────────────────────┐
│           사용자 브라우저                  │
│  Pretendard · Tailwind v4 · Radix UI    │
│  Recharts · 카카오맵 JS SDK · lucide    │
├─────────────────────────────────────────┤
│         Next.js 16 (App Router)         │
│  TypeScript strict · Route Handlers     │
│  NextAuth v5 (Kakao OAuth) ★신규       │
│  In-Memory Cache (Map + TTL)            │
├─────────────────────────────────────────┤
│     SQLite DB (better-sqlite3) ★신규    │
│  trades 테이블 + complexes 테이블        │
│  수도권 3년치 실거래가 + 단지 메타데이터    │
├─────────────────────────────────────────┤
│           외부 API (배치 수집 + 런타임)    │
│  data.go.kr (수집) · Kakao · ODsay      │
│  서울열린데이터 · NEIS (런타임)            │
├─────────────────────────────────────────┤
│           Vercel (배포)                  │
└─────────────────────────────────────────┘
```
