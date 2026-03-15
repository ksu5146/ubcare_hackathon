# DB 스키마 & 검색 Flow — 부동산 매수 도우미

> 최종 업데이트: 2026-03-14 / SQLite (better-sqlite3) / v2.2 사용자 테이블 추가

---

## 1. 테이블 구조

### 1-1. trades (실거래가)

아파트 매매 실거래가 원본 데이터. data.go.kr API `15126469`에서 수집.

| 컬럼 | 타입 | 제약 | 설명 | API 필드 |
|------|------|------|------|----------|
| `id` | INTEGER | PK, AUTOINCREMENT | 내부 식별자 | — |
| `apt_seq` | TEXT | NOT NULL | 단지 일련번호 | `aptSeq` |
| `apt_nm` | TEXT | NOT NULL | 단지명 | `aptNm` |
| `lawd_cd` | TEXT | NOT NULL | 법정동코드 5자리 (구 단위) | 요청 파라미터 |
| `umd_nm` | TEXT | | 읍면동명 | `umdNm` |
| `jibun` | TEXT | | 지번 | `jibun` |
| `bonbun` | TEXT | | 본번 | `bonbun` |
| `road_nm` | TEXT | | 도로명 | `roadNm` |
| `deal_amount` | INTEGER | NOT NULL | 거래금액 (만원) | `dealAmount` |
| `exclu_use_ar` | REAL | NOT NULL | 전용면적 (m²) | `excluUseAr` |
| `floor` | INTEGER | | 층 | `floor` |
| `build_year` | INTEGER | | 건축년도 | `buildYear` |
| `deal_year` | INTEGER | NOT NULL | 계약년도 | `dealYear` |
| `deal_month` | INTEGER | NOT NULL | 계약월 | `dealMonth` |
| `deal_day` | INTEGER | | 계약일 | `dealDay` |
| `deal_type` | TEXT | | 거래유형 (중개/직거래) | `dealingGbn` |
| `buyer_gbn` | TEXT | | 매수자 구분 (개인/법인) | `buyerGbn` |
| `seller_gbn` | TEXT | | 매도자 구분 | `slerGbn` |
| `cancel_yn` | TEXT | DEFAULT 'N' | 해제 여부 (Y/N) | `cdealDay` 존재 시 |
| `reg_date` | TEXT | | 등기일자 | `rgstDate` |
| `collected_at` | TEXT | NOT NULL, DEFAULT now | 수집 일시 | — |

**UNIQUE 제약**: `(apt_seq, deal_year, deal_month, deal_day, floor, exclu_use_ar)`
→ 동일 단지의 같은 날짜·층·면적 거래 중복 방지 (INSERT OR IGNORE)

### 1-2. complexes (단지 메타데이터)

공동주택 단지 기본정보 + 상세정보. data.go.kr V3 목록 + V4 기본/상세에서 수집.

| 컬럼 | 타입 | 제약 | 설명 | API 필드 |
|------|------|------|------|----------|
| `kapt_code` | TEXT | **PK** | 단지코드 | `kaptCode` |
| `apt_nm` | TEXT | NOT NULL | 단지명 | `kaptName` |
| `bjd_code` | TEXT | NOT NULL | 법정동코드 10자리 | `bjdCode` |
| `addr` | TEXT | | 법정동 주소 | `kaptAddr` |
| `road_addr` | TEXT | | 도로명 주소 | `doroJuso` |
| `as1` | TEXT | | 시/도 | 목록 API `as1` |
| `as2` | TEXT | | 시/군/구 | 목록 API `as2` |
| `as3` | TEXT | | 읍/면/동 | 목록 API `as3` |
| `lat` | REAL | | 위도 | 카카오 지오코딩 |
| `lng` | REAL | | 경도 | 카카오 지오코딩 |
| `total_unit` | INTEGER | | 총 세대수 | `kaptdaCnt` |
| `ho_cnt` | INTEGER | | 호 수 | `hoCnt` |
| `dong_cnt` | INTEGER | | 동 수 | `kaptDongCnt` |
| `top_floor` | INTEGER | | 최고층 | `kaptTopFloor` |
| `base_floor` | INTEGER | | 최저층 | `kaptBaseFloor` |
| `heat_type` | TEXT | | 난방방식 (개별/중앙/지역) | `codeHeatNm` |
| `hall_type` | TEXT | | 복도유형 (계단식/복도식/혼합) | `codeHallNm` |
| `sale_type` | TEXT | | 분양형태 (분양/임대) | `codeSaleNm` |
| `apt_type` | TEXT | | 주택유형 | `codeAptNm` |
| `mgr_type` | TEXT | | 관리방식 | `codeMgrNm` |
| `builder` | TEXT | | 시공사 | `kaptBcompany` |
| `developer` | TEXT | | 시행사 | `kaptAcompany` |
| `use_date` | TEXT | | 사용승인일 (YYYYMMDD) | `kaptUsedate` |
| `total_area` | REAL | | 총 건축면적 (m²) | `kaptTarea` |
| `area_under60` | INTEGER | | 60m² 이하 세대수 | `kaptMparea60` |
| `area_60_85` | INTEGER | | 60~85m² 세대수 | `kaptMparea85` |
| `area_85_135` | INTEGER | | 85~135m² 세대수 | `kaptMparea135` |
| `area_over135` | INTEGER | | 135m² 초과 세대수 | `kaptMparea136` |
| `parking_ground` | INTEGER | | 지상 주차대수 | `kaptdPcnt` |
| `parking_underground` | INTEGER | | 지하 주차대수 | `kaptdPcntu` |
| `elevator_cnt` | INTEGER | | 승강기 수 | `kaptdEcnt` |
| `cctv_cnt` | INTEGER | | CCTV 수 | `kaptdCccnt` |
| `structure` | TEXT | | 건물구조 | `codeStr` |
| `subway_line` | TEXT | | 인근 지하철 노선 | `subwayLine` |
| `subway_time` | TEXT | | 지하철 도보시간 | `kaptdWtimesub` |
| `welfare_facility` | TEXT | | 복리시설 | `welfareFacility` |
| `education_facility` | TEXT | | 교육시설 | `educationFacility` |
| `convenient_facility` | TEXT | | 편의시설 | `convenientFacility` |
| `updated_at` | TEXT | NOT NULL, DEFAULT now | 갱신 일시 | — |

**갱신 전략**: `INSERT ... ON CONFLICT(kapt_code) DO UPDATE` — 수집 시 최신 정보로 덮어쓰기

### 1-3. collection_state (수집 상태)

배치 수집 진행 상태 추적. 증분 수집 및 재시도에 활용.

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| `id` | INTEGER | PK, AUTOINCREMENT | 내부 식별자 |
| `collector_type` | TEXT | NOT NULL | 수집기 유형 (`trade` / `complex`) |
| `lawd_cd` | TEXT | NOT NULL | 법정동코드 5자리 |
| `deal_ym` | TEXT | | 대상 년월 (YYYYMM, trade만 해당) |
| `status` | TEXT | NOT NULL, DEFAULT 'pending' | 상태 (`pending` → `in_progress` → `completed` / `failed`) |
| `record_count` | INTEGER | DEFAULT 0 | 수집된 레코드 수 |
| `error_message` | TEXT | | 실패 시 에러 메시지 |
| `started_at` | TEXT | | 수집 시작 시간 |
| `completed_at` | TEXT | | 수집 완료 시간 |

**UNIQUE 제약**: `(collector_type, lawd_cd, deal_ym)` — 동일 작업 중복 방지

**상태 전이:**
```
pending → in_progress → completed
                      → failed (재시도 시 pending으로 복귀)
```

---

## 2. 인덱스

| 인덱스 | 테이블 | 컬럼 | 용도 |
|--------|--------|------|------|
| `idx_trades_lawd_cd` | trades | `lawd_cd` | 지역 검색 |
| `idx_trades_apt_seq` | trades | `apt_seq` | 단지별 이력 조회 |
| `idx_trades_deal_ym` | trades | `deal_year, deal_month` | 기간 필터 |
| `idx_trades_amount` | trades | `deal_amount` | 가격 범위 필터 |
| `idx_trades_area` | trades | `exclu_use_ar` | 면적 범위 필터 |
| `idx_trades_build_year` | trades | `build_year` | 건축년도 필터 |
| `idx_trades_apt_nm` | trades | `apt_nm` | 단지명 검색 |
| `idx_complexes_bjd` | complexes | `bjd_code` | 법정동코드 조회 |
| `idx_complexes_apt_nm` | complexes | `apt_nm` | 단지명 검색 |
| `idx_complexes_lawd` | complexes | `substr(bjd_code,1,5)` | 5자리 구 단위 조회 |
| `idx_collection_state` | collection_state | `collector_type, lawd_cd, status` | 미완료 작업 조회 |

---

## 3. 검색 Flow

### 3-1. 실거래가 검색 (`GET /api/trade/search`)

```
┌─────────────────────────────────────────────────────────┐
│ 클라이언트 요청                                           │
│ GET /api/trade/search?lawdCd=11680&fromYm=202301        │
│   &toYm=202603&priceMin=50000&priceMax=200000           │
│   &areaMin=59&areaMax=85&buildYearMin=2015              │
│   &aptName=래미안&page=1&pageSize=50                     │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────┐
│ Route Handler (src/app/api/trade/search/route.ts)        │
│                                                          │
│ 1. URL 파라미터 파싱 → TradeSearchParams 객체 생성         │
│ 2. searchTrades(params) 호출                              │
└──────────────────────┬───────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────┐
│ DB Query Layer (src/lib/db-queries.ts)                    │
│                                                          │
│ 1. 동적 WHERE 절 생성:                                    │
│    WHERE t.lawd_cd = '11680'                             │
│      AND (t.deal_year > 2023 OR (...deal_month >= 1))    │
│      AND (t.deal_year < 2026 OR (...deal_month <= 3))    │
│      AND t.deal_amount >= 50000                          │
│      AND t.deal_amount <= 200000                         │
│      AND t.exclu_use_ar >= 59                            │
│      AND t.exclu_use_ar <= 85                            │
│      AND t.build_year >= 2015                            │
│      AND t.apt_nm LIKE '%래미안%'                         │
│      AND t.cancel_yn = 'N'                               │
│                                                          │
│ 2. COUNT(*) 쿼리 → total                                 │
│ 3. SELECT ... ORDER BY deal_year DESC, ...               │
│    LIMIT 50 OFFSET 0                                     │
│                                                          │
│ 4. Row → ApartmentTrade 객체 매핑                         │
└──────────────────────┬───────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────┐
│ 응답                                                      │
│ {                                                        │
│   "success": true,                                       │
│   "data": [ { aptName, dealAmount, area, ... }, ... ],   │
│   "pagination": {                                        │
│     "total": 342,                                        │
│     "page": 1,                                           │
│     "pageSize": 50,                                      │
│     "totalPages": 7                                      │
│   }                                                      │
│ }                                                        │
└──────────────────────────────────────────────────────────┘
```

**지원 필터 파라미터:**

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|:----:|------|
| `lawdCd` | string | ✅ | 법정동코드 5자리 (구 단위) |
| `fromYm` | string | | 시작 년월 (YYYYMM) |
| `toYm` | string | | 종료 년월 (YYYYMM) |
| `priceMin` | number | | 최소 거래금액 (만원) |
| `priceMax` | number | | 최대 거래금액 (만원) |
| `areaMin` | number | | 최소 전용면적 (m²) |
| `areaMax` | number | | 최대 전용면적 (m²) |
| `floorMin` | number | | 최소 층수 |
| `floorMax` | number | | 최대 층수 |
| `buildYearMin` | number | | 최소 건축년도 |
| `buildYearMax` | number | | 최대 건축년도 |
| `aptName` | string | | 단지명 (LIKE 검색) |
| `umdNm` | string | | 읍면동명 (LIKE 검색) |
| `dealType` | string | | 거래유형 (중개거래/직거래) |
| `excludeCanceled` | boolean | | 취소 거래 제외 (기본 true) |
| `sortBy` | string | | 정렬: `deal_date`, `deal_amount`, `exclu_use_ar`, `apt_nm` |
| `sortOrder` | string | | 정렬 방향: `asc`, `desc` |
| `page` | number | | 페이지 (1-based, 기본 1) |
| `pageSize` | number | | 페이지당 건수 (기본 50, 최대 200) |

### 3-2. 단지 목록 검색 (`GET /api/complex/list`)

```
┌──────────────────────────────────────────────────────────┐
│ 클라이언트 요청                                           │
│ GET /api/complex/list?lawdCd=11680                       │
│   &totalUnitMin=500&buildYearMin=2010                    │
│   &heatType=개별난방&hasElevator=true                     │
└──────────────────────┬───────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────┐
│ Route Handler (src/app/api/complex/list/route.ts)        │
│                                                          │
│ 확장 필터 있음 → searchComplexes(params)                   │
│ 확장 필터 없음 → getComplexList(lawdCd) (단순 목록)        │
└──────────────────────┬───────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────┐
│ DB Query Layer                                           │
│                                                          │
│ SELECT ... FROM complexes                                │
│ WHERE substr(bjd_code, 1, 5) = '11680'                   │
│   AND total_unit >= 500                                  │
│   AND CAST(substr(use_date,1,4) AS INTEGER) >= 2010      │
│   AND heat_type = '개별난방'                               │
│   AND elevator_cnt > 0                                   │
│ ORDER BY apt_nm                                          │
│ LIMIT 50 OFFSET 0                                        │
└──────────────────────────────────────────────────────────┘
```

**확장 필터 파라미터:**

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `aptName` | string | 단지명 (LIKE 검색) |
| `totalUnitMin` / `Max` | number | 세대수 범위 |
| `buildYearMin` / `Max` | number | 건축년도 범위 |
| `heatType` | string | 난방방식 (개별난방/중앙난방/지역난방) |
| `hallType` | string | 복도유형 (계단식/복도식/혼합식) |
| `hasElevator` | boolean | 승강기 유무 |
| `saleType` | string | 분양형태 (분양/임대) |
| `builder` | string | 시공사 (LIKE 검색) |

### 3-3. 단지 상세 (`GET /api/complex/[id]`)

```
GET /api/complex/A10027875
        │
        ▼
SELECT * FROM complexes WHERE kapt_code = 'A10027875'
        │
        ▼
ComplexInfo 객체 (id, name, address, households, ...)
```

### 3-4. 기존 API 호환 (`GET /api/trade/apartment`)

```
GET /api/trade/apartment?lawdCd=11680&dealYmd=202601
        │
        ▼
SELECT ... FROM trades
WHERE lawd_cd = '11680'
  AND deal_year = 2026 AND deal_month = 1
  AND cancel_yn = 'N'
```

---

## 4. 데이터 수집 파이프라인

### 수집 흐름

```
┌─────────────────────────────────────────────────────────┐
│ 수집 트리거                                               │
│                                                          │
│ • 수동: POST /api/collector { lawdCodes, months }        │
│ • 스크립트: npx tsx scripts/collect-all.ts               │
│ • 스케줄러: scheduler.ts (24시간 주기, 1개월 증분)         │
└──────────────────────┬───────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────┐
│ 오케스트레이터 (src/lib/collector/index.ts)                │
│                                                          │
│ 1. initSchema() — 테이블/인덱스 생성                      │
│ 2. 실거래가 수집: lawdCd × dealYm 조합 순회               │
│ 3. 단지 메타 수집: lawdCd별 목록→기본→상세 순차            │
└──────────┬──────────────────────┬────────────────────────┘
           │                      │
           ▼                      ▼
┌─────────────────────┐  ┌────────────────────────────────┐
│ trade-collector.ts   │  │ complex-collector.ts            │
│                      │  │                                │
│ fetchTrades(lawdCd,  │  │ 1. fetchComplexList(bjdCode)   │
│   dealYm)            │  │    → 단지 목록 (V3)             │
│     │                │  │ 2. 단지별 병렬:                  │
│     ▼                │  │    fetchComplexBasic(kaptCode)  │
│ INSERT OR IGNORE     │  │    fetchComplexDetail(kaptCode) │
│ INTO trades          │  │ 3. INSERT ... ON CONFLICT       │
│                      │  │    DO UPDATE INTO complexes     │
└─────────────────────┘  └────────────────────────────────┘
           │                      │
           ▼                      ▼
┌──────────────────────────────────────────────────────────┐
│ collection_state 테이블 상태 갱신                          │
│                                                          │
│ upsertPending() → markInProgress() → markCompleted()     │
│                                    → markFailed()        │
└──────────────────────────────────────────────────────────┘
```

### 수집 대상 지역 (69개)

| 지역 | 구/시 수 |
|------|---------|
| 서울 | 25개 구 |
| 경기 | 35개 시/구 |
| 인천 | 9개 구 |

### 중복 방지 전략

| 테이블 | 전략 | 키 |
|--------|------|-----|
| trades | `INSERT OR IGNORE` | apt_seq + deal_year + deal_month + deal_day + floor + exclu_use_ar |
| complexes | `ON CONFLICT DO UPDATE` | kapt_code |
| collection_state | `ON CONFLICT DO NOTHING` | collector_type + lawd_cd + deal_ym |

---

## 5. ER 다이어그램

```
┌─────────────────────┐          ┌───────────────────────┐
│       trades         │          │      complexes         │
├─────────────────────┤          ├───────────────────────┤
│ id (PK)             │          │ kapt_code (PK)        │
│ apt_seq             │──────┐   │ apt_nm                │
│ apt_nm              │      │   │ bjd_code              │
│ lawd_cd ────────────┼──┐   │   │ addr, road_addr       │
│ deal_amount         │  │   │   │ total_unit, dong_cnt  │
│ exclu_use_ar        │  │   │   │ heat_type, hall_type  │
│ floor, build_year   │  │   │   │ builder, use_date     │
│ deal_year/month/day │  │   │   │ parking_*, elevator   │
│ ...                 │  │   │   │ ...                   │
└─────────────────────┘  │   │   └───────────────────────┘
                         │   │
                         │   └── 매칭: lawd_cd(5자리)
                         │       + apt_nm(단지명)
                         │
┌─────────────────────┐  │
│  collection_state    │  │
├─────────────────────┤  │
│ id (PK)             │  │
│ collector_type      │  │
│ lawd_cd ────────────┼──┘
│ deal_ym             │
│ status              │
│ record_count        │
│ error_message       │
└─────────────────────┘
```

**trades ↔ complexes 관계:**
- 직접 FK 없음 (API 식별자 체계가 다름: `apt_seq` vs `kapt_code`)
- 매칭: `trades.lawd_cd`(5자리) = `substr(complexes.bjd_code, 1, 5)` + `trades.apt_nm` = `complexes.apt_nm`

---

## 6. 사용자 데이터 테이블 (v2.2 신규)

> 카카오 OAuth 로그인 사용자의 관심단지, 비교분석, 필터 프리셋을 저장.
> `lib/auth.ts`의 `initUserSchema()`에서 자동 생성.

### 6-1. users (사용자)

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| `id` | INTEGER | PK, AUTOINCREMENT | 내부 식별자 |
| `kakao_id` | TEXT | NOT NULL, UNIQUE | 카카오 사용자 고유 ID |
| `nickname` | TEXT | | 카카오 닉네임 |
| `profile_image` | TEXT | | 카카오 프로필 이미지 URL |
| `created_at` | TEXT | NOT NULL, DEFAULT now | 가입일시 |
| `last_login_at` | TEXT | NOT NULL, DEFAULT now | 마지막 로그인 일시 |

### 6-2. user_favorites (관심단지)

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| `id` | INTEGER | PK, AUTOINCREMENT | 내부 식별자 |
| `user_id` | INTEGER | NOT NULL, FK → users(id) ON DELETE CASCADE | 사용자 |
| `apt_name` | TEXT | NOT NULL | 단지명 |
| `dong` | TEXT | NOT NULL | 법정동명 |
| `lawd_cd` | TEXT | NOT NULL | 법정동코드 5자리 |
| `latest_price` | INTEGER | | 최근 거래가 (만원) |
| `build_year` | INTEGER | | 건축년도 |
| `added_at` | TEXT | NOT NULL, DEFAULT now | 추가일시 |

**UNIQUE 제약**: `(user_id, apt_name, dong)` — 동일 사용자의 같은 단지 중복 방지
**최대 제한**: 사용자당 20개 (API 레벨 검증)

### 6-3. user_comparisons (비교분석)

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| `id` | INTEGER | PK, AUTOINCREMENT | 내부 식별자 |
| `user_id` | INTEGER | NOT NULL, FK → users(id) ON DELETE CASCADE | 사용자 |
| `name` | TEXT | DEFAULT '' | 비교분석 이름 (표시용) |
| `apt_names` | TEXT | NOT NULL | 비교 항목 JSON (CompareItem[] 형식) |
| `lawd_cd` | TEXT | NOT NULL, DEFAULT '' | (하위 호환용, 미사용) |
| `dong` | TEXT | NOT NULL, DEFAULT '' | (하위 호환용, 미사용) |
| `type` | TEXT | NOT NULL, DEFAULT 'history' | `'history'` 또는 `'bookmark'` |
| `created_at` | TEXT | NOT NULL, DEFAULT now | 생성/갱신 일시 |

**apt_names JSON 형식** (CompareItem[]):
```json
[
  { "name": "래미안원베일리", "dong": "반포동", "lawdCd": "11650" },
  { "name": "아크로리버파크", "dong": "반포동", "lawdCd": "11650" }
]
```

**비즈니스 규칙**:
- `history`: 비교 실행 시 자동 저장, 최대 10개 (초과 시 가장 오래된 것 삭제), 동일 조합 중복 시 시간만 갱신
- `bookmark`: 사용자 명시 저장 또는 히스토리→즐겨찾기 전환, 최대 10개

### 6-4. user_filters (필터 프리셋)

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| `id` | INTEGER | PK, AUTOINCREMENT | 내부 식별자 |
| `user_id` | INTEGER | NOT NULL, FK → users(id) ON DELETE CASCADE | 사용자 |
| `name` | TEXT | NOT NULL | 프리셋 이름 |
| `filters` | TEXT | NOT NULL | 필터 설정 JSON (FilterState 형식) |
| `created_at` | TEXT | NOT NULL, DEFAULT now | 생성일시 |

> 현재 테이블만 생성됨, UI 미구현 (향후 Sprint 예정)

### 사용자 데이터 인덱스

| 인덱스 | 테이블 | 컬럼 | 용도 |
|--------|--------|------|------|
| `idx_users_kakao` | users | `kakao_id` | 카카오 ID로 사용자 조회 |
| `idx_user_favorites_user` | user_favorites | `user_id` | 사용자별 관심단지 조회 |
| `idx_user_comparisons_user` | user_comparisons | `user_id` | 사용자별 비교분석 조회 |
| `idx_user_filters_user` | user_filters | `user_id` | 사용자별 필터 프리셋 조회 |

### 사용자 ER 다이어그램

```
┌─────────────────────┐
│       users          │
├─────────────────────┤
│ id (PK)             │
│ kakao_id (UNIQUE)   │──┐
│ nickname            │  │
│ profile_image       │  │
│ created_at          │  │
│ last_login_at       │  │
└─────────────────────┘  │
                          │
         ┌────────────────┼────────────────┐
         │                │                │
         ▼                ▼                ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│ user_favorites    │ │ user_comparisons │ │ user_filters      │
├──────────────────┤ ├──────────────────┤ ├──────────────────┤
│ id (PK)          │ │ id (PK)          │ │ id (PK)          │
│ user_id (FK) ────┤ │ user_id (FK) ────┤ │ user_id (FK) ────┤
│ apt_name         │ │ name             │ │ name             │
│ dong             │ │ apt_names (JSON) │ │ filters (JSON)   │
│ lawd_cd          │ │ type (h/b)       │ │ created_at       │
│ latest_price     │ │ created_at       │ └──────────────────┘
│ build_year       │ └──────────────────┘
│ added_at         │
└──────────────────┘
```
