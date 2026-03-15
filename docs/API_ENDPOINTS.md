# API 엔드포인트 명세 — 부동산 매수 도우미

> **기준 버전:** v2.4 (2026-03-15)
> 모든 엔드포인트는 `/src/app/api/` 하위 Next.js Route Handler로 구현
> 공통 응답 형식: `{ success: boolean, data: T | null, error?: string }`

---

## 인증 (Auth)

### `GET/POST /api/auth/[...nextauth]`
- **설명**: NextAuth v5 카카오 OAuth 처리
- **인증**: 없음 (인증 흐름 자체)
- **환경변수**: `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `KAKAO_CLIENT_ID`, `KAKAO_CLIENT_SECRET`

---

## 실거래가 (Trade)

### `GET /api/trade/search`
- **설명**: 확장 필터 기반 실거래가 검색 (trades JOIN complexes)
- **인증**: 없음

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| `lawdCd` | string | **필수** | 법정동코드 5자리, 콤마 구분 최대 3개 |
| `grouped` | boolean | 선택 | `true`이면 단지별 그룹핑 결과 반환 |
| `fromYm` / `toYm` | string | 선택 | 조회 기간 (YYYYMM) |
| `priceMin` / `priceMax` | integer | 선택 | 거래금액 범위 (만원) |
| `areaMin` / `areaMax` | float | 선택 | 전용면적 범위 (m²) |
| `floorMin` / `floorMax` | integer | 선택 | 층수 범위 |
| `buildYearMin` / `buildYearMax` | integer | 선택 | 건축년도 범위 |
| `householdsMin` / `householdsMax` | integer | 선택 | 세대수 범위 |
| `aptName` | string | 선택 | 단지명 (부분 일치) |
| `umdNm` | string | 선택 | 읍면동명 |
| `heatType` | string | 선택 | 난방방식 |
| `hallType` | string | 선택 | 복도유형 |
| `builder` | string | 선택 | 시공사명 |
| `hasElevator` | boolean | 선택 | 승강기 유무 |
| `roomEstimate` | integer | 선택 | 추정 방수 |
| `vlRatMax` | integer | 선택 | 최대 용적률 (%) |
| `includeDirectDeal` | boolean | 선택 | 직거래 포함 (기본 false) |
| `excludeCanceled` | boolean | 선택 | 해제건 제외 (기본 true) |

- **응답**: `grouped=false` → `ApartmentTrade[]`, `grouped=true` → `ComplexTradeGroup[]`

---

### `GET /api/trade/apartment`
- **설명**: 법정동 + 연월 기준 실거래가 목록
- **인증**: 없음

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| `lawdCd` | string | **필수** | 법정동코드 5자리 |
| `dealYmd` | string | **필수** | 거래연월 (YYYYMM) |

---

### `GET /api/trade/complex`
- **설명**: 단지명 기준 전체 거래 내역
- **인증**: 없음

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| `lawdCd` | string | **필수** | 법정동코드 5자리 |
| `aptName` | string | **필수** | 단지명 |
| `dong` | string | 선택 | 법정동명 |

---

### `GET /api/trade/favorites`
- **설명**: 즐겨찾기 단지 거래 집계 (검색 필터 독립)
- **인증**: 없음

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| `favorites` | string (JSON) | **필수** | `[{ aptName, dong, lawdCd }]` 배열 (최대 20개) |

---

## 단지 정보 (Complex)

### `GET /api/complex/[id]`
- **설명**: 단지 상세정보. kaptCode → 이름+lawdCd 순으로 조회
- **인증**: 없음

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| `id` (경로) | string | **필수** | kaptCode 또는 단지명 |
| `lawdCd` | string | 조건부 | id가 단지명일 때 필수 |

---

### `GET /api/complex/list`
- **설명**: 법정동 기준 단지 목록 + 선택적 필터링
- **인증**: 없음

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| `lawdCd` | string | **필수** | 법정동코드 5자리 |
| `aptName` | string | 선택 | 단지명 (부분 일치) |
| `totalUnitMin` / `totalUnitMax` | integer | 선택 | 세대수 범위 |
| `buildYearMin` / `buildYearMax` | integer | 선택 | 건축년도 범위 |
| `heatType`, `hallType`, `hasElevator`, `builder` | string/boolean | 선택 | 필터 |

---

## AI 인사이트

### `POST /api/ai/insight`
- **설명**: Azure OpenAI 기반 2~4개 단지 비교 분석
- **인증**: 없음
- **환경변수**: `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_DEPLOYMENT`
- **요청 본문**:
```json
{ "complexes": [{ "name": "단지명", "dong": "동명", "lawdCd": "11680", "info": {}, "trades": [] }] }
```
- **응답**: `{ structured: { complexes, categories, summary, recommendation } }` 또는 텍스트 폴백
- **오류**: `400` (2개 미만), `502` (Azure 오류)

---

## 교통 (Transit)

### `GET /api/transit`
- **설명**: ODsay 대중교통 경로 서버 프록시 (레거시, 현재 클라이언트 직접 호출로 전환됨)
- **환경변수**: `ODSAY_API_KEY`

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| `sx` / `sy` | float | **필수** | 출발지 경도/위도 |
| `ex` / `ey` | float | **필수** | 도착지 경도/위도 |

- **응답**: `{ totalTime, transferCount, fare, summary }`

> **참고**: v2.4부터 프론트엔드는 `NEXT_PUBLIC_ODSAY_API_KEY`로 ODsay를 브라우저에서 직접 호출합니다.

---

## 위치 검색 (Location)

### `GET /api/location/search`
- **설명**: 카카오 로컬 키워드 검색 프록시
- **환경변수**: `KAKAO_REST_API_KEY`

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| `query` | string | **필수** | 검색 키워드 |

---

### `GET /api/location/geocode`
- **설명**: 카카오 주소→좌표 변환 (주소 검색 실패 시 키워드 검색 폴백)

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| `query` | string | **필수** | 주소 또는 장소명 |

---

### `POST /api/location/geocode-batch`
- **설명**: 여러 주소 일괄 지오코딩 (DB 캐싱, 5개씩 병렬, 최대 200개)
- **요청 본문**: `{ "addresses": [{ "key": "식별키", "address": "주소" }] }`
- **응답**: `{ "식별키": { lat, lng } | null }`

---

## 주변 정보 (Nearby)

> **비활성화**: 현재 단지 상세 페이지에서 제거됨 (mock 데이터). API 자체는 접근 가능.

### `GET /api/nearby/redevelopment`
- **설명**: 반경 내 재개발/재건축 정비사업 (mock 데이터 반환)

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| `lat` / `lng` | float | **필수** | 중심 좌표 |
| `radius` | integer | 선택 | 반경 미터 (기본 2000) |

### `GET /api/nearby/school`
- **설명**: 법정동 기준 인근 학교 (mock 데이터 반환)

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| `lawdCd` | string | **필수** | 법정동코드 |

---

## 데이터 수집기 (Collector)

### `POST /api/collector`
- **설명**: 데이터 수집 수동 트리거 (비동기 백그라운드 실행)
- **인증**: **필수** (`x-collector-secret` 헤더)
- **요청 본문**: `{ "lawdCodes": ["11680"], "months": 12 }` (선택)

### `GET /api/collector/status`
- **설명**: 수집기 실행 상태 + 진행률

### `GET /api/collector/stats`
- **설명**: DB 통계 (총 거래건수, 단지수, 지역수, 수집 기간)

---

## 사용자 데이터 (User)

> 모든 `/api/user/` 엔드포인트는 **카카오 로그인 세션 필수**. 미인증 시 `401`.

### `GET /api/user/favorites`
- **설명**: 관심단지 목록 조회

### `POST /api/user/favorites`
- **설명**: 관심단지 추가 (최대 20개)
- **요청 본문**: `{ aptName, dong, lawdCd, latestPrice, buildYear }`

### `DELETE /api/user/favorites`
- **설명**: 관심단지 삭제
- **요청 본문**: `{ aptName, dong }`

### `POST /api/user/favorites/sync`
- **설명**: localStorage → DB 일괄 동기화 (로그인 직후)
- **요청 본문**: `{ favorites: [{ aptName, dong, lawdCd, ... }] }`

### `GET /api/user/comparisons`
- **설명**: 비교분석 이력/즐겨찾기 목록
- **쿼리**: `type=history|bookmark` (선택)

### `POST /api/user/comparisons`
- **설명**: 비교분석 저장 (history 최대 10개, bookmark 최대 10개)
- **요청 본문**: `{ name, items: [{ name, dong, lawdCd }], type: "history"|"bookmark" }`

### `PATCH /api/user/comparisons`
- **설명**: 이름 변경 또는 history→bookmark 전환
- **요청 본문**: `{ id, name?, type? }`

### `DELETE /api/user/comparisons`
- **설명**: 비교분석 삭제
- **요청 본문**: `{ id }`
