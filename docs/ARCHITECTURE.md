# Architecture — 부동산 매수 도우미

> v2.3 기준 (2026-03-15) / AI 인사이트, 확장 필터, 데이터 수집기 UI, 즐겨찾기 독립 데이터 패스 반영

## 기술 스택

| 영역 | 기술 | 버전 |
|------|------|------|
| Framework | Next.js (App Router) | 16.1.6 |
| Language | TypeScript (strict) | 5.x |
| Styling | Tailwind CSS v4 (`@theme inline`) | 4.x |
| Charts | Recharts (ComposedChart) | 3.8.0 |
| UI Primitives | Radix UI (Slider, Dialog, Select, Tabs, Tooltip) | latest |
| Icons | lucide-react | 0.577 |
| Font | Pretendard Variable (local) | 1.3.9 |
| Maps | Kakao Maps JS SDK (dynamic load) | v3 |
| **Local DB** | **SQLite (better-sqlite3)** | **latest** |
| **Auth** | **NextAuth v5 (beta) + Kakao Provider** | **5.x** |

## 디렉토리 구조

```
src/
├── app/                          # Next.js App Router 페이지
│   ├── layout.tsx                # 루트 레이아웃 (Pretendard, Header, metadata)
│   ├── page.tsx                  # 홈 — 필터 폼 (local state → /search 네비게이션)
│   ├── globals.css               # Tailwind v4 @theme inline + 커스텀 애니메이션
│   ├── search/page.tsx           # 검색 — 지도(60%) + 리스트(40%), URL 필터 상태
│   ├── complex/[id]/page.tsx     # 단지 상세 — 차트, 테이블, 출퇴근(3대 업무지구 포함), 섹션 네비게이션
│   ├── compare/page.tsx          # 단지 비교 (2~4개) — 오버레이 차트, 정보 테이블, AI 인사이트
│   ├── dev/                      # 개발 전용 페이지 (수집기 UI, 디버그)
│   ├── error.tsx                 # 글로벌 에러 바운더리
│   ├── not-found.tsx             # 404 페이지
│   └── api/                      # Route Handlers (API 프록시)
│       ├── auth/[...nextauth]/   # NextAuth 라우트 핸들러 (카카오 OAuth)
│       ├── trade/search/         # DB 기반 실거래가 필터 검색
│       ├── trade/apartment/      # 단지별 실거래가 이력 조회 (DB)
│       ├── trade/complex/        # 단지명 기반 거래 조회 (DB)
│       ├── trade/favorites/      # 즐겨찾기 단지 거래 조회 (독립 데이터 패스)
│       ├── complex/list/         # 단지 목록 → complexes DB 테이블
│       ├── complex/[id]/         # 단지 상세 → complexes DB 테이블
│       ├── location/search/      # 장소 검색 → Kakao REST API
│       ├── location/geocode/     # 단건 지오코딩 → Kakao REST API
│       ├── location/geocode-batch/ # 배치 지오코딩
│       ├── transit/              # 대중교통 경로 → ODsay API
│       ├── nearby/redevelopment/ # 재개발/재건축 → 서울열린데이터
│       ├── nearby/school/        # 학군 정보 → NEIS API
│       ├── ai/insight/           # AI 단지 비교 분석 → Azure OpenAI (v2.3 신규)
│       ├── collector/            # 데이터 수집기 API (v2.3 신규)
│       │   ├── route.ts          # 수집 실행 트리거
│       │   ├── status/           # 수집 진행 상태 조회
│       │   └── stats/            # 수집 통계 조회
│       └── user/                 # 사용자 데이터 API (v2.2 신규)
│           ├── favorites/        # 관심단지 CRUD (GET/POST/DELETE)
│           ├── favorites/sync/   # 로그인 시 로컬→DB 동기화
│           └── comparisons/      # 비교분석 CRUD (GET/POST/PATCH/DELETE)
├── components/
│   ├── layout/Header.tsx         # 고정 헤더 (estate-900, UserMenu 포함)
│   ├── auth/                     # 인증 컴포넌트 (v2.2 신규)
│   │   ├── SessionProvider.tsx   # NextAuth 클라이언트 세션 래퍼
│   │   ├── UserMenu.tsx          # 로그인 버튼 / 프로필 드롭다운
│   │   └── LoginPrompt.tsx       # 로그인 유도 모달 + 인라인 배너
│   ├── filter/                   # 필터 컴포넌트
│   │   ├── PriceRange.tsx        # 매매가 범위 슬라이더
│   │   ├── AreaRange.tsx         # 전용면적 범위 (m²/평)
│   │   ├── RegionSelect.tsx      # 지역 선택 (3단계 캐스케이드)
│   │   ├── BuildYearRange.tsx    # 건축년도 범위 (v2.3 신규)
│   │   ├── HouseholdsRange.tsx   # 최소 세대수 (v2.3 신규)
│   │   ├── FloorPreset.tsx       # 층수 프리셋 (v2.3 신규)
│   │   ├── DealTypeFilter.tsx    # 거래유형 필터 (v2.3 신규)
│   │   ├── SortSelect.tsx        # 정렬 선택 (v2.3 신규)
│   │   ├── AdvancedFilters.tsx   # 고급 필터 패널 (난방/복도/주차/시공사/방수/승강기 등, v2.3 신규)
│   │   └── FilterBookmarks.tsx  # 필터 북마크 저장/불러오기 (v2.3 신규)
│   ├── complex/                  # 단지 관련 (ComplexCard, ComplexList, ComplexInfoCard, AreaFilter, TradeTable, FavoriteButton)
│   ├── chart/                    # 차트 (PriceChart — 시계열, CompareChart — N단지 오버레이)
│   ├── map/KakaoMap.tsx          # 카카오맵 (마커, 가격 오버레이, 뷰포트 기반 성능 최적화, 즐겨찾기 마커)
│   ├── nearby/                   # 주변 분석 컴포넌트 (NearbyTabs, NearbyMap, RedevelopmentCard, SchoolCard) — 현재 비활성화
│   ├── compare/                  # 비교 관련 (CommuteCompare, AiInsight — v2.3 신규)
│   ├── favorites/FavoritesList   # 나의관심단지 모달 (Radix Dialog)
│   ├── transit/                  # 출퇴근 (WorkplaceSearch, CommuteResult, BusinessDistrictCommute — v2.3 신규)
│   └── ui/                       # 공통 UI (LoadingCard, ErrorState, EmptyState, DataBadge)
├── hooks/
│   ├── use-filter.ts             # URL searchParams ↔ FilterState 양방향 바인딩
│   ├── use-search-results.ts     # DB API 호출 + 필터 적용
│   ├── use-favorites.ts          # 관심단지 관리 (로그인: DB, 비로그인: localStorage, 최대 20개)
│   ├── use-favorites-results.ts  # 즐겨찾기 단지 거래 데이터 조회 훅 (독립 데이터 패스, v2.3 신규)
│   ├── use-filter-bookmarks.ts   # 필터 북마크 관리 (localStorage, v2.3 신규)
│   └── use-comparisons.ts        # 비교분석 히스토리/즐겨찾기 관리 (v2.2 신규)
├── lib/
│   ├── api-client.ts             # fetchWithCache<T>(), buildDataGoKrUrl() — 타임아웃/재시도/캐시
│   ├── auth.ts                   # NextAuth 설정, 사용자 DB 스키마, upsertUser (v2.2 신규)
│   ├── cache.ts                  # InMemoryCache (Map + TTL, hit/miss 로깅)
│   ├── db.ts                     # SQLite 연결 (better-sqlite3), 쿼리 헬퍼
│   ├── db-queries.ts             # 자주 사용하는 DB 쿼리 헬퍼 함수 모음 (v2.3 신규)
│   ├── constants.ts              # API URL, 경로, TTL, 필터 기본값
│   ├── format.ts                 # formatPrice(), formatPriceShort(), formatArea(), sqm↔pyeong
│   ├── kakao-geocode.ts          # 카카오 지오코딩 유틸리티 (v2.3 신규)
│   ├── region.ts                 # 법정동코드 유틸리티 (v2.3 신규)
│   ├── search.ts                 # buildTradeQuery(), filterTrades(), groupByComplex()
│   ├── trade-aggregator.ts       # fetchTradeHistory(DB 기반), aggregateMonthly()
│   ├── utils.ts                  # cn() = clsx + twMerge
│   └── collector/                # 데이터 수집기 라이브러리 (v2.3 신규)
│       ├── index.ts              # 수집기 진입점
│       ├── types.ts              # 수집기 타입 정의
│       ├── trade-collector.ts    # 실거래가 배치 수집
│       ├── complex-collector.ts  # 단지 메타데이터 수집
│       ├── scoring.ts            # 단지 스코어링 계산 (재건축가능성/주거쾌적성/미래가치)
│       ├── scheduler.ts          # 수집 스케줄러
│       ├── state.ts              # 수집 상태 관리
│       ├── api-client.ts         # 수집 전용 API 클라이언트
│       ├── seoul-apt-collector.ts # 서울 아파트 특화 수집
│       ├── land-use-collector.ts  # 토지이용 정보 수집
│       └── building-ledger-collector.ts # 건축물 대장 수집
├── types/
│   ├── api.ts                    # ApiResponse<T>, DataGoKrResponse<T>
│   ├── trade.ts                  # ApartmentTradeRaw, ApartmentTrade, ComplexTradeGroup
│   ├── complex.ts                # ComplexDetailRaw, ComplexInfo, ComplexListItem
│   ├── filter.ts                 # FilterState, PropertyType, AreaUnit (확장 필터 포함)
│   ├── location.ts               # LocationSearchResult, TransitResult, Kakao/ODsay 타입
│   ├── nearby.ts                 # RedevelopmentItem, SchoolItem
│   └── next-auth.d.ts            # NextAuth Session/JWT 타입 확장 (v2.2 신규)
├── data/
│   └── region-codes.json         # 법정동코드 트리 (서울 25구 + 16개 시/도)
scripts/
├── collect.ts                    # 메인 배치 수집 스크립트 (법정동코드 × 월 순회)
├── collect-complex.ts            # 단지 메타데이터 수집 (aptSeq 목록 기반)
└── db-init.ts                    # SQLite 스키마 초기화
real-estate.db                    # SQLite DB 파일 (gitignore 권장)
```

## 데이터 흐름

### 배치 수집 파이프라인 (사전 수집)

```
[data.go.kr 실거래가 API 15126469]
[공동주택 기본정보 V4 getAphusBassInfoV4]
[공동주택 상세정보 V4 getAphusDtlInfoV4]
           │
           ▼
[scripts/collect.ts]
  - 수도권 법정동코드 × 36개월 순회
  - aptSeq 기준 실거래가 ↔ 단지 메타데이터 조인
  - 중복/해제건 제거
           │
           ▼
[real-estate.db (SQLite)]
  ├── trades    — 실거래가 레코드
  └── complexes — 단지 메타데이터 (기본정보 + 상세정보)
```

### 서비스 런타임 데이터 흐름

```
[사용자] → 홈페이지 필터 (local state)
         → "매물 검색" 클릭
         → /search?lawdCd=11680&priceMin=30000&...

[검색 페이지]
  useFilter() ← URL searchParams (양방향)
  useSearchResults() → /api/trade/search (DB 쿼리)
                     → trades JOIN complexes WHERE 조건
                     → ComplexList (카드) + KakaoMap (마커)
                     ↕ 양방향 하이라이트 동기화

[단지 상세]
  /api/trade/history/[aptSeq] → DB에서 60개월 이력 조회
                              → PriceChart (시계열) + TradeTable (테이블)
  /api/complex/[kaptCode]     → DB complexes 테이블
  WorkplaceSearch → /api/location/search (Kakao REST)
  CommuteResult   → /api/transit (ODsay)
```

## API 프록시 패턴

```
Client → Next.js Route Handler → SQLite DB 또는 외부 API
            ↓
      서버에서 API 키 주입 (외부 API 호출 시)
      InMemoryCache (TTL) — 학교/호재 등 외부 API 응답
      응답 정규화 (Raw → Normalized)
```

| Route | 데이터 소스 | 캐시 TTL |
|-------|------------|---------|
| `/api/auth/[...nextauth]` | NextAuth (Kakao OAuth) | JWT 세션 |
| `/api/trade/search` | SQLite `trades JOIN complexes` | DB 갱신 주기 |
| `/api/trade/apartment` | SQLite `trades` WHERE apt_seq | DB 갱신 주기 |
| `/api/trade/complex` | SQLite `trades` WHERE apt_nm + lawd_cd | DB 갱신 주기 |
| `/api/trade/favorites` | SQLite `trades` (즐겨찾기 독립 패스) | DB 갱신 주기 |
| `/api/complex/list` | SQLite `complexes` | DB 갱신 주기 |
| `/api/complex/[id]` | SQLite `complexes` | DB 갱신 주기 |
| `/api/location/search` | Kakao REST API | 미캐시 |
| `/api/location/geocode` | Kakao REST API | 미캐시 |
| `/api/location/geocode-batch` | Kakao REST API | 미캐시 |
| `/api/transit` | ODsay API | 미캐시 |
| `/api/nearby/redevelopment` | 서울열린데이터 OA-2253 | 7일 |
| `/api/nearby/school` | NEIS 학교정보 `15122275` | 30일 |
| `/api/ai/insight` | Azure OpenAI | 미캐시 |
| `/api/collector` | 내부 수집기 트리거 | 미캐시 |
| `/api/collector/status` | 내부 수집기 상태 | 미캐시 |
| `/api/collector/stats` | SQLite 집계 쿼리 | 미캐시 |
| `/api/user/favorites` | SQLite `user_favorites` | 미캐시 |
| `/api/user/favorites/sync` | SQLite `user_favorites` | 미캐시 |
| `/api/user/comparisons` | SQLite `user_comparisons` | 미캐시 |

## 공공 API 엔드포인트 (확인 완료)

| API | 서비스명 | 엔드포인트 | 고유키 | 상태 |
|-----|---------|-----------|--------|------|
| 아파트 매매 실거래가 | 국토교통부 `15126469` | `RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev` | `aptSeq` | ✅ |
| 공동주택 단지 목록 V3 (전체) | 국토교통부 `15057332` | `AptListService3/getTotalAptList3` | `kaptCode` | ✅ |
| 공동주택 단지 목록 V3 (법정동) | 국토교통부 `15057332` | `AptListService3/getLegaldongAptList3` | `kaptCode` | ✅ |
| 공동주택 기본정보 V4 | 국토교통부 `15058453` | `AptBasisInfoServiceV4/getAphusBassInfoV4` | `kaptCode` | ✅ |
| 공동주택 상세정보 V4 | 국토교통부 `15058453` | `AptBasisInfoServiceV4/getAphusDtlInfoV4` | `kaptCode` | ✅ |
| 단지 식별정보 | 한국부동산원 (odcloud) | `api.odcloud.kr/api/AptIdInfoSvc/v1/getAptInfo` | `COMPLEX_PK` | ✅ |
| 학교기본정보 | NEIS `15122275` | - | - | 미테스트 |
| 재개발/재건축 | 서울열린데이터 `OA-2253` | - | - | mock |
| 장소 검색 | Kakao REST API | `/v2/local/search/keyword` | - | ✅ |
| 대중교통 경로 | ODsay | - | - | ✅ |

### API 키 매핑 관계

```
단지목록 V3 ──(kaptCode)──→ 기본정보 V4 / 상세정보 V4
    │
    ├── bjdCode(10자리) → 법정동코드 5자리(앞5) 추출
    │
실거래가 ←── 법정동코드(5자리) + 단지명 매칭 ──→ 단지목록 V3
    │
    └── aptSeq: 시군구코드-일련번호 (예: 11680-4800)

단지식별정보 (odcloud) ── COMPLEX_PK (14자리), PNU 기반 매핑 가능
```

## SQLite DB 스키마

```sql
-- 실거래가 테이블
CREATE TABLE trades (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  apt_seq      TEXT NOT NULL,          -- 단지일련번호 (aptSeq)
  apt_nm       TEXT NOT NULL,          -- 단지명
  lawd_cd      TEXT NOT NULL,          -- 법정동코드 5자리
  dong         TEXT,                   -- 법정동명
  jibun        TEXT,                   -- 지번
  road_nm      TEXT,                   -- 도로명
  deal_amount  INTEGER NOT NULL,       -- 거래금액 (만원)
  exclu_use_ar REAL NOT NULL,          -- 전용면적 (m²)
  floor        INTEGER,                -- 층
  build_year   INTEGER,                -- 건축년도
  deal_year    INTEGER NOT NULL,       -- 계약년
  deal_month   INTEGER NOT NULL,       -- 계약월
  deal_day     INTEGER,                -- 계약일
  deal_type    TEXT,                   -- 거래유형 (중개거래/직거래)
  buyer_gbn    TEXT,                   -- 매수자 구분 (개인/법인)
  seller_gbn   TEXT,                   -- 매도자 구분 (개인/법인)
  cancel_yn    TEXT DEFAULT 'N',       -- 해제여부
  reg_date     TEXT,                   -- 등기일자
  collected_at TEXT NOT NULL           -- 수집일시
);

-- 단지 메타데이터 테이블
CREATE TABLE complexes (
  apt_seq        TEXT PRIMARY KEY,     -- 단지일련번호 (kaptCode)
  apt_nm         TEXT NOT NULL,        -- 단지명
  lawd_cd        TEXT NOT NULL,        -- 법정동코드 5자리
  addr           TEXT,                 -- 주소
  lat            REAL,                 -- 위도 (카카오 지오코딩)
  lng            REAL,                 -- 경도
  total_unit     INTEGER,              -- 세대수 (kaptdaCnt)
  dong_cnt       INTEGER,              -- 동수 (kaptDongCnt)
  top_floor      INTEGER,              -- 최고층 (kaptTopFloor)
  heat_type      TEXT,                 -- 난방방식 (codeHeatNm)
  hall_type      TEXT,                 -- 복도유형 (codeHallNm)
  sale_type      TEXT,                 -- 분양형태 (codeSaleNm)
  builder        TEXT,                 -- 시공사 (kaptBcompany)
  use_date       TEXT,                 -- 사용승인일 (kaptUsedate)
  parking_total  INTEGER,              -- 주차대수 (kaptdPcnt+kaptdPcntu)
  elevator_cnt   INTEGER,              -- 승강기수 (kaptdEcnt)
  cctv_cnt       INTEGER,              -- CCTV수 (kaptdCccnt)
  area_under60   INTEGER,              -- 60m²이하 세대수
  area_60_85     INTEGER,              -- 60~85m² 세대수
  area_85_135    INTEGER,              -- 85~135m² 세대수
  area_over135   INTEGER,              -- 135m²초과 세대수
  subway_line    TEXT,                 -- 지하철노선
  subway_min     INTEGER,              -- 지하철 도보시간(분)
  updated_at     TEXT NOT NULL         -- 갱신일시
);

CREATE INDEX idx_trades_lawd_cd   ON trades(lawd_cd);
CREATE INDEX idx_trades_apt_seq   ON trades(apt_seq);
CREATE INDEX idx_trades_deal_ym   ON trades(deal_year, deal_month);
CREATE INDEX idx_trades_amount    ON trades(deal_amount);
CREATE INDEX idx_complexes_lawd   ON complexes(lawd_cd);
```

## 상태 관리

| 범위 | 방식 | 용도 |
|------|------|------|
| 필터 상태 | URL searchParams | 검색 조건 (공유 가능한 URL) |
| 로컬 폼 | useState | 홈페이지 필터 (제출 전) |
| 서버 데이터 | fetch + useState | API/DB 응답 |
| 외부 API 캐시 | 서버 InMemoryCache | 학교/호재 등 외부 API 응답 |
| 인증 세션 | NextAuth JWT | 카카오 ID, 닉네임, 프로필 이미지 |
| 최근 검색 | localStorage | 직장 검색 기록 (최대 5개) |
| 나의관심단지 | 로그인: DB (`user_favorites`) / 비로그인: localStorage | 관심단지 (최대 20개, useFavorites hook) |
| 비교분석 이력 | 로그인: DB (`user_comparisons`) / 비로그인: localStorage | 히스토리 10개 + 즐겨찾기 10개 (useComparisons hook) |

## 디자인 시스템

- **Primary**: estate-* (deep navy #1e3a5f ~ #f0f4f8)
- **Accent**: amber (즐겨찾기, 알림)
- **가격 표기**: red = 상승 (price-up-*), blue = 하락 (price-down-*)
- **타이포**: Pretendard Variable (100~900), tabular-nums for 숫자
- **애니메이션**: fade-in, card-in (stagger), skeleton-pulse, marker-bounce
- **그림자**: shadow-card, shadow-card-md (디자인 토큰)

## 환경변수

| 변수 | 위치 | 용도 |
|------|------|------|
| `DATA_GO_KR_API_KEY` | 서버 | 공공데이터포털 인증키 (배치 수집 및 학교/인구 API) |
| `KAKAO_REST_API_KEY` | 서버 | 카카오 REST API (장소 검색, 단지 지오코딩) |
| `NEXT_PUBLIC_KAKAO_MAP_KEY` | 클라이언트 | 카카오맵 JS SDK |
| `ODSAY_API_KEY` | 서버 | ODsay 대중교통 API |
| `SEOUL_OPEN_DATA_KEY` | 서버 | 서울열린데이터 (정비사업, optional) |
| `SQLITE_DB_PATH` | 서버 | SQLite DB 파일 경로 (기본: `./real-estate.db`) |
| `NEXTAUTH_SECRET` | 서버 | NextAuth JWT 암호화 시크릿 (v2.2 신규) |
| `NEXTAUTH_URL` | 서버 | NextAuth 콜백 URL (기본: `http://localhost:3000`) |
| `KAKAO_CLIENT_ID` | 서버 | 카카오 OAuth 클라이언트 ID (v2.2 신규) |
| `KAKAO_CLIENT_SECRET` | 서버 | 카카오 OAuth 클라이언트 시크릿 (v2.2 신규) |

## 환경변수 (추가)

| 변수 | 위치 | 용도 |
|------|------|------|
| `AZURE_OPENAI_API_KEY` | 서버 | Azure OpenAI API 키 (AI 인사이트, v2.3 신규) |
| `AZURE_OPENAI_ENDPOINT` | 서버 | Azure OpenAI 엔드포인트 URL (v2.3 신규) |
| `AZURE_OPENAI_DEPLOYMENT` | 서버 | Azure OpenAI 배포 이름 (v2.3 신규) |

## Sprint 완료 현황

| Sprint | 목표 | 상태 |
|--------|------|------|
| Sprint 1 | 프로젝트 셋업, 디자인 시스템, API 프록시, 스켈레톤 페이지 | ✅ 완료 |
| Sprint 2 | 필터 UI, 검색 결과, 카카오맵 연동, 지도-리스트 동기화 | ✅ 완료 |
| Sprint 3 | 단지 상세, 실거래가 차트, 거래 테이블, 출퇴근 분석 | ✅ 완료 |
| Sprint 4 | 주변 호재, 관심 목록, 비교, SEO, 에러 처리, MVP 완성 | ✅ 완료 |
| Sprint 5 | **아키텍처 피벗**: SQLite DB 도입, 배치 수집 스크립트, 데이터 파이프라인 | ✅ 완료 |
| Sprint 6 | **사용자 인증**: 카카오 OAuth, 관심단지/비교분석 DB 영속화, 히스토리/즐겨찾기 | ✅ 완료 |
| Sprint 7 | **기능 고도화**: 확장 필터 전면 구현, AI 인사이트, 3대 업무지구 접근성, 데이터 수집기 UI, 지도 성능 최적화 | ✅ 완료 |
