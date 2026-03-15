# 변경 이력 — 부동산 매수 도우미

---

## [v2.3] 기능 고도화 — 2026-03-15

### 추가
- **확장 필터 전면 구현** (F1-A/B):
  - `components/filter/BuildYearRange.tsx` — 건축년도 범위 슬라이더 (연식 프리셋 포함)
  - `components/filter/HouseholdsRange.tsx` — 최소 세대수 필터 (100/300/500/1,000세대+ 프리셋)
  - `components/filter/FloorPreset.tsx` — 층수 프리셋 (저/중/고층)
  - `components/filter/DealTypeFilter.tsx` — 거래유형 필터 (중개거래/직거래)
  - `components/filter/AdvancedFilters.tsx` — 고급 필터 패널 (난방방식/복도유형/주차대수/시공사/방수/승강기 유무)
  - `components/filter/SortSelect.tsx` — 검색 결과 정렬 (가격/면적/건축년도/세대수)
  - `components/filter/FilterBookmarks.tsx` + `hooks/use-filter-bookmarks.ts` — 필터 북마크 저장/불러오기 (localStorage)
- **3대 업무지구 접근성** (F5-5):
  - `components/transit/BusinessDistrictCommute.tsx` — 강남/여의도/광화문 ODsay 대중교통 소요시간
  - DB 좌표(lat/lng)를 `ComplexInfo`에 추가하여 카카오 SDK 지오코딩 의존성 제거
- **AI 인사이트** (F9):
  - `components/compare/AiInsight.tsx` + `app/api/ai/insight/route.ts` — Azure OpenAI 기반 단지 비교 분석
  - 스코어링 데이터(재건축가능성/주거쾌적성/미래가치) 포함하여 종합 분석 생성
  - `components/compare/CommuteCompare.tsx` — 비교 단지 간 출퇴근 소요시간 비교 패널
- **단지 상세 — 건물지표 및 단지 평가** (F8):
  - `components/complex/ComplexInfoCard.tsx` — 용적률/건폐율/에너지등급 건물지표 표시
  - 재건축가능성/주거쾌적성/미래가치 단지 평가 스코어 + InfoTooltip
- **데이터 수집기 라이브러리** (F0):
  - `lib/collector/` — trade-collector, complex-collector, scoring, scheduler, state, api-client 등
  - `lib/collector/scoring.ts` — 단지 스코어링 계산 (재건축가능성/주거쾌적성/미래가치)
  - `lib/collector/land-use-collector.ts`, `building-ledger-collector.ts` — 토지이용·건축물대장 수집
  - `app/api/collector/` — 수집 실행·상태·통계 조회 Route Handler (웹 UI에서 접근 가능)
- **즐겨찾기 독립 데이터 패스**:
  - `app/api/trade/favorites/route.ts` + `hooks/use-favorites-results.ts` — 즐겨찾기 단지의 거래 데이터를 검색 필터와 독립적으로 조회
- **지도 성능 최적화**:
  - `components/map/KakaoMap.tsx` — 뷰포트 기반 마커 렌더링, 즐겨찾기 마커 별도 표시
- **추가 유틸리티**:
  - `lib/kakao-geocode.ts` — 카카오 지오코딩 유틸리티 분리
  - `lib/region.ts` — 법정동코드 유틸리티 분리
  - `lib/db-queries.ts` — 자주 사용하는 DB 쿼리 헬퍼 함수 모음
  - `app/dev/` — 개발 전용 페이지 (수집기 UI, 디버그)

### 변경
- **주변분석 탭 비활성화**: 호재/학군 탭을 단지 상세 페이지에서 제거. 컴포넌트(`NearbyTabs`, `RedevelopmentCard`, `SchoolCard`)는 유지되며 실데이터 연동 시 재활성화 예정
- **DB 좌표 직접 전달**: `ComplexInfo`에 `lat`/`lng` 필드 추가. `BusinessDistrictCommute`가 카카오 SDK 지오코딩 없이 DB 좌표를 직접 ODsay에 전달
- **환경 설정**: `.npmrc`에 `node-options=--use-system-ca` 추가 (Windows 기업 환경 SSL 인증서 문제 해결)

---

## [v2.2] 카카오 로그인 + 사용자 데이터 영속화 — 2026-03-14

### 추가
- **카카오 OAuth 로그인**: NextAuth v5 (beta) + Kakao Provider, JWT 기반 세션 관리
  - `src/lib/auth.ts` — NextAuth 설정, 사용자 DB 스키마 초기화/마이그레이션
  - `src/app/api/auth/[...nextauth]/route.ts` — NextAuth 라우트 핸들러
  - `src/types/next-auth.d.ts` — Session/JWT 타입 확장 (kakaoId, nickname, profileImage)
  - `src/components/auth/SessionProvider.tsx` — 클라이언트 세션 프로바이더
  - `src/components/auth/UserMenu.tsx` — 로그인 버튼 / 프로필 드롭다운 (닉네임 + 프로필 이미지)
  - `src/components/auth/LoginPrompt.tsx` — 로그인 유도 모달 팝업 (24시간 dismiss) + LoginBanner 인라인 안내
- **사용자 데이터 DB 영속화**: 로그인 사용자의 관심단지/비교분석을 SQLite에 저장
  - `users` 테이블: 카카오 ID, 닉네임, 프로필 이미지, 마지막 로그인
  - `user_favorites` 테이블: 관심단지 (최대 20개)
  - `user_comparisons` 테이블: 비교분석 히스토리/즐겨찾기
  - `user_filters` 테이블: 필터 프리셋 (향후 사용)
- **관심단지 서버 동기화**: 로그인 시 localStorage → DB 병합 (`/api/user/favorites/sync`)
  - `src/app/api/user/favorites/route.ts` — GET/POST/DELETE (관심단지 CRUD)
  - `src/app/api/user/favorites/sync/route.ts` — POST (로그인 시 로컬→DB 병합)
- **비교분석 히스토리/즐겨찾기**: 비교 실행 시 자동 히스토리 저장, 즐겨찾기로 전환 가능
  - `src/hooks/use-comparisons.ts` — 비교분석 상태 관리 훅 (로그인: DB, 비로그인: localStorage)
  - `src/app/api/user/comparisons/route.ts` — GET/POST/PATCH/DELETE (비교분석 CRUD)
  - 히스토리: 최대 10개, 동일 조합 중복 시 시간만 갱신
  - 즐겨찾기: 최대 10개, 히스토리→즐겨찾기 전환 또는 직접 저장

### 변경
- **"관심목록" → "나의관심단지"**: Header, FavoritesList, FavoriteButton, 비교 페이지 등 전체 UI 용어 통일
- **관심단지 DB 저장**: 로그인 사용자는 `user_favorites` 테이블에 저장, 세션 간 유지
  - `src/hooks/use-favorites.ts` — `useSession` 연동, 로그인 시 서버 API 호출
- **비교 페이지 히스토리 패널**: 저장된 비교분석 목록 표시, 클릭 시 복원
  - `src/app/compare/page.tsx` — 히스토리 자동저장 + 복원 + 즐겨찾기 저장 UI
- **CompareItem 구조 변경**: `aptNames: string[]` → `items: CompareItem[]` (name + dong + lawdCd per complex)
  - 비교 복원 시 각 단지별 정확한 지역코드로 데이터 조회 가능

### 수정
- 비교분석 복원 시 모든 단지가 동일 dong/lawdCd로 조회되던 문제 (per-complex lawdCd 적용)
- DB 마이그레이션: `user_comparisons` 테이블에 `type` 컬럼 누락 시 자동 재생성
- 카카오 프로필 닉네임 미표시 문제 (다중 경로 fallback + 개발자 콘솔 동의항목 설정 안내)

---

## [v2.1] 데이터 파이프라인 완료 + 마커/비교/즐겨찾기 개선 — 2026-03-13

### 추가
- **데이터 수집 완료**: 수도권 66개 지역, 538,538건 거래, 8,813단지 메타데이터
- **단지-거래 매칭** (`scripts/match-complexes.ts`): 5단계 전략 (정확매칭→이름포함→정규화→주소→도로명), 10,260/14,146건 매칭 (73%)
- **trade_complex_map 테이블**: 거래 단지명↔단지코드 매핑, DB JOIN 활용
- **단지별 거래 조회 API** (`/api/trade/complex`): DB 직접 조회, 비교/상세 페이지에서 활용
- **`getComplexByName()`**: 다중 전략 단지 검색 (trade_complex_map → 정확 → LIKE)

### 변경
- **KakaoMap 지오코딩 개선**: 도로명주소 우선 → 동 단위 fallback, 다중 지역 지원 (per-complex `lawdCd`)
- **단지 비교 2~4개 지원**: JSON URL 파라미터, 동적 N개 시계열 오버레이 차트
- **CompareChart**: `tradesA/B` 고정 → `complexes: ComplexSeries[]` 동적 N개 시리즈
- **즐겨찾기 실시간 동기화**: `useSyncExternalStore` 기반, 같은 탭 CustomEvent + 크로스탭 StorageEvent
- **단지 상세 페이지**: DB 직접 조회로 실거래가 표시, 이름 기반 단지 정보 fallback
- **ComplexTradeGroup**: `lawdCd`, `roadAddr` 필드 추가 (다중 지역 + 정확 지오코딩)

### 수정
- 2개 지역 선택 시 한쪽 마커만 표시되던 문제 (단일 regionPrefix → per-complex lawdCd)
- `getServerSnapshot` 미캐싱으로 인한 무한루프 (모듈 레벨 상수로 수정)
- StorageEvent 리스너 메모리 누수 (named function으로 정리)
- 비교 페이지 URL 파라미터 불일치 (a/b → JSON items 호환)

---

## [v2.0] 아키텍처 피벗 — 2026-03-13

### 변경 배경
- 실시간 API 방식: 구 단위 검색 시 60건+ API 호출, p95 응답 5초 이상, 일일 호출 한도 소모
- 신규 방식: 수도권 3년치 실거래가 + 단지 메타데이터를 SQLite DB에 사전 수집, DB 쿼리로 즉시 반환

### 추가
- **데이터 수집 파이프라인** (F0):
  - `scripts/db-init.ts` — SQLite 스키마 초기화 (trades + complexes 테이블)
  - `scripts/collect.ts` — 메인 배치 수집 (법정동코드 × 월 순회, 수도권 36개월)
  - `scripts/collect-complex.ts` — 단지 메타데이터 수집 (기본정보 V4 + 상세정보 V4)
- **SQLite 연동** (`lib/db.ts`): better-sqlite3 연결, 쿼리 헬퍼
- **DB 기반 API 라우트**:
  - `/api/trade/search` — trades JOIN complexes 조건 필터
  - `/api/trade/history/[id]` — aptSeq별 실거래가 이력
- **확장 필터** (F1-B, 8개 신규):
  - 난방방식 (개별/중앙/지역), 복도유형 (계단식/복도식/혼합식)
  - 세대당 주차대수, 시공사, 거래유형, 분양형태, 추정 방수, 승강기 유무

### 변경
- `hooks/use-search-results.ts` — 법정동코드 × 12개월 병렬 API 호출 → DB API 단일 호출로 교체
- `lib/trade-aggregator.ts` — 실거래가 API 배치 → DB 쿼리 기반으로 교체
- `types/filter.ts` — 확장 필터 타입 추가 (HeatType, HallType, DealType 등)
- API 라우트 테이블: `AptBasisInfoService1` → `AptBasisInfoServiceV4` (V4 엔드포인트 수정)
- `docs/PRD.md`, `docs/architecture.md`, `docs/FEATURES.md`, `docs/TECH_STACK.md` 전면 업데이트

### 기술 부채
- Vercel 배포 시 SQLite 파일 접근 제한 → Turso (libsql) 전환 필요
- 지오코딩 결과 complexes 테이블 저장 (카카오 API 중복 호출 방지)

---

## [MVP] Sprint 4 완료 — 2026-03-13

### 추가
- **주변 분석**: 재개발/재건축 호재 표시 (서울열린데이터 OA-2253, mock fallback)
- **학군 정보**: NEIS 학교기본정보 연동, 학교 카드 + 미니맵
- **관심 단지**: localStorage 기반 즐겨찾기 (최대 20개), 하트 토글 버튼
- **관심 목록 모달**: Radix Dialog, 헤더 관심목록 버튼 연동
- **단지 비교**: 2개 단지 오버레이 차트 + 정보 테이블 (`/compare`)
- **에러 바운더리**: 글로벌 `error.tsx`, 404 `not-found.tsx`
- **SEO**: 페이지별 metadata, OpenGraph, robots

### 변경
- 헤더에 관심목록 버튼 + FavoritesList 모달 통합
- 단지 상세 페이지에 NearbyTabs 섹션 추가
- `architecture.md` 전면 업데이트

---

## Sprint 3 — 2026-03-13

### 추가
- **단지 상세 페이지** (`/complex/[id]`): 섹션 네비게이션, 기본정보/차트/거래/주변/출퇴근
- **ComplexInfoCard**: 단지 기본정보 (주소, 건축년도, 세대수, 동수, 난방, 주차)
- **실거래가 차트** (PriceChart): Recharts ComposedChart, 기간 탭 (1Y/3Y/5Y/ALL)
- **거래 테이블** (TradeTable): 정렬 가능 컬럼, 페이지네이션 (20건/페이지)
- **면적 필터** (AreaFilter): 단지 내 전용면적별 필터링 pill 버튼
- **출퇴근 분석**: WorkplaceSearch (카카오 로컬 자동완성) + CommuteResult (ODsay 대중교통)
- **데이터 기준일 배지** (DataBadge)
- **trade-aggregator**: 5년 × 12개월 배치 조회, 월별 집계
- **API 라우트**: `/api/location/search` (카카오), `/api/transit` (ODsay)
- **dynamic metadata**: `complex/[id]/layout.tsx` generateMetadata

---

## Sprint 2 — 2026-03-13

### 추가
- **홈페이지** (`/`): 필터 폼 (PriceRange, AreaRange, RegionSelect, PropertyTypeSelect)
- **검색 페이지** (`/search`): 지도(60%) + 리스트(40%) 분할, URL 필터 상태
- **필터 컴포넌트**: PriceRange (듀얼 슬라이더), AreaRange (m²/평), RegionSelect (3단계), PropertyTypeSelect
- **useFilter hook**: URL searchParams ↔ FilterState 양방향 바인딩
- **useSearchResults hook**: 법정동코드 × 12개월 병렬 조회, 필터링, 그룹핑
- **KakaoMap**: 동적 SDK 로드, 지오코더 마커, 가격 오버레이, API 키 미설정 시 fallback
- **ComplexCard / ComplexList**: 단지 카드, lawdCd prop 전달
- **지도-리스트 동기화**: 양방향 하이라이트
- **로딩/에러/빈 상태 UI**: LoadingCard, ErrorState, EmptyState

### 변경
- PropertyType → PropertyTypeSelect 이름 변경 (타입 충돌 해결)
- 홈페이지: useFilter 대신 로컬 useState 사용 (premature navigation 방지)

---

## Sprint 1 — 2026-03-13

### 추가
- Next.js 16 프로젝트 초기화 (App Router, TypeScript strict, Tailwind CSS v4)
- 디렉토리 구조 설계 (`src/app`, `components`, `hooks`, `lib`, `types`, `data`)
- 환경변수 설정 (`.env.local.example`)
- API 프록시 패턴: Route Handlers (`/api/trade/apartment`, `/api/complex/list`, `/api/complex/[id]`)
- InMemoryCache (`lib/cache.ts`): Map + TTL, hit/miss 로깅
- fetchWithCache 유틸리티 (`lib/api-client.ts`): 타임아웃, 재시도, 캐시
- 법정동코드 JSON (`data/region-codes.json`): 서울 25구 + 16개 시/도
- 글로벌 레이아웃: Header (estate-900), Pretendard Variable 폰트
- TypeScript 타입 정의: `types/api.ts`, `types/trade.ts`, `types/complex.ts`, `types/filter.ts`
- 디자인 시스템: `globals.css` @theme inline (estate-*, amber, price-up/down, 애니메이션)
- 유틸리티: `cn()`, `formatPrice()`, `formatArea()`, `sqmToPyeong()`
