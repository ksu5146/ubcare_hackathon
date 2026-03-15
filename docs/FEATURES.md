# 기능 명세 — 부동산 매수 도우미

> **문서 버전:** v2.4
> **갱신일:** 2026-03-15
> **기준 문서:** [PRD.md](./PRD.md)

---

## 상태 범례

| 상태 | 의미 |
|------|------|
| ✅ 완료 | 구현 + 빌드 검증 완료 |
| 🔲 미구현 | Phase 2 이후 예정 |
| ⚠️ 부분 | 기본 구현 완료, 고도화 필요 또는 비활성화 |

---

## F0: 데이터 수집 파이프라인 (v2.0 신규)

> 아키텍처 피벗으로 추가된 기능. 실시간 API 호출 대신 사전 수집된 Turso DB를 사용한다.
> v2.4에서 better-sqlite3 → Turso(@libsql/client) 마이그레이션 완료 및 Vercel Cron 증분 수집 구현 완료.

| ID | 기능 | 우선순위 | 상태 | 구현 파일 | 비고 |
|----|------|----------|------|-----------|------|
| F0-1 | Turso DB 스키마 초기화 | P0 | ✅ | `lib/db.ts` | trades + complexes + trade_complex_map 테이블, WAL 모드. better-sqlite3 → Turso 마이그레이션 완료 |
| F0-2 | 실거래가 배치 수집 | P0 | ✅ | `lib/collector/trade-collector.ts` | 수도권 66개 지역 × 36개월, 538,538건 수집 완료 |
| F0-3 | 단지 메타데이터 수집 | P0 | ✅ | `lib/collector/complex-collector.ts` | 기본정보 V4 + 상세정보 V4, 8,813단지 수집 완료 |
| F0-4 | DB 기반 검색 API | P0 | ✅ | `app/api/trade/search/route.ts` | trades JOIN complexes, 그룹핑, trade_complex_map 매칭 |
| F0-5 | DB 기반 단지별 이력 API | P0 | ✅ | `app/api/trade/complex/route.ts` | 단지명+법정동코드 기반 직접 DB 조회 |
| F0-6 | 단지 스코어링 계산 | P1 | ✅ | `lib/collector/scoring.ts` | 재건축가능성/주거쾌적성/미래가치 점수 계산, complexes 테이블 저장 |
| F0-7 | 수집기 웹 UI API | P1 | ✅ | `app/api/collector/` | 수집 실행·상태·통계 조회 Route Handler |
| F0-8 | 단지-거래 매칭 | P0 | ✅ | `lib/collector/` (match-complexes 로직 포함) | 5단계 전략 매칭, 10,260/14,146 (73%) 매칭 완료 |
| F0-9 | Vercel Cron 증분 업데이트 | P1 | ✅ | `app/api/cron/collect/route.ts` | 매 1시간 라운드 로빈 6개 지역씩 증분 수집. v2.4 구현 완료 |

---

## F1: 조건 설정 모듈

### F1-A: 기본 필터

| ID | 기능 | 우선순위 | 상태 | 구현 파일 | 비고 |
|----|------|----------|------|-----------|------|
| F1-1 | 매매가 범위 슬라이더 | P0 | ✅ | `components/filter/PriceRange.tsx` | 0~30억, 1,000만 단위, 프리셋 버튼 |
| F1-2 | 지역 선택 (3단계 캐스케이드) | P0 | ✅ | `components/filter/RegionSelect.tsx` | 시/도 → 시/군/구 → 읍/면/동, `data/region-codes.json` 기반, 최대 3개 지역 동시 선택 |
| F1-3 | 전용면적 범위 슬라이더 | P0 | ✅ | `components/filter/AreaRange.tsx` | m²↔평 전환, 프리셋 (59m², 84m²) |
| F1-4 | 건축년도 범위 | P1 | ✅ | `components/filter/BuildYearRange.tsx` | 연식 범위 슬라이더, 프리셋 (5/10/15/20년이내) |
| F1-5 | 최소 세대수 | P1 | ✅ | `components/filter/HouseholdsRange.tsx` | 100/300/500/1,000세대+ 프리셋 |
| F1-6 | 층수 범위 | P1 | ✅ | `components/filter/FloorPreset.tsx` | 저/중/고층 프리셋 |
| F1-7 | 부동산 유형 선택 | P0 | ⚠️ | `components/filter/RegionSelect.tsx` | 아파트만 동작, 나머지 "준비중" |
| F1-8 | 필터 북마크 저장/불러오기 | P2 | ✅ | `components/filter/FilterBookmarks.tsx`, `hooks/use-filter-bookmarks.ts` | localStorage 기반, 저장·불러오기·삭제 |

### F1-B: 확장 필터 (v2.0 신규 — DB 기반, v2.3 이후 전면 구현)

| ID | 기능 | 우선순위 | 상태 | 구현 파일 | 비고 |
|----|------|----------|------|-----------|------|
| F1-9 | 난방방식 필터 | P1 | ✅ | `components/filter/AdvancedFilters.tsx` | 개별/중앙/지역난방, complexes.heat_type |
| F1-10 | 복도유형 필터 | P1 | ✅ | `components/filter/AdvancedFilters.tsx` | 계단식/복도식/혼합식, complexes.hall_type |
| F1-11 | 세대당 주차대수 | P1 | ✅ | `components/filter/AdvancedFilters.tsx` | 슬라이더, parking_total/total_unit |
| F1-12 | 시공사 필터 | P1 | ✅ | `components/filter/AdvancedFilters.tsx` | 대형 건설사 체크박스 포함 |
| F1-13 | 거래유형 필터 | P1 | ✅ | `components/filter/DealTypeFilter.tsx` | 중개거래/직거래, trades.deal_type |
| F1-14 | 분양형태 필터 | P2 | ✅ | `components/filter/AdvancedFilters.tsx` | 분양/임대, complexes.sale_type. v2.4 구현 완료 |
| F1-15 | 추정 방수 필터 | P1 | ✅ | `components/filter/AdvancedFilters.tsx` | 면적 기반 계산 (1룸/2룸/3룸/4룸+) |
| F1-16 | 승강기 유무 필터 | P2 | ✅ | `components/filter/AdvancedFilters.tsx` | complexes.elevator_cnt > 0 |
| F1-17 | 용적률 상한 필터 | P2 | ✅ | `components/filter/AdvancedFilters.tsx` | vlRatMax 슬라이더. v2.4 추가 구현 |

---

## F2: 매물 탐색 모듈

| ID | 기능 | 우선순위 | 상태 | 구현 파일 | 비고 |
|----|------|----------|------|-----------|------|
| F2-1 | 지도 뷰 (카카오맵) | P0 | ✅ | `components/map/KakaoMap.tsx` | 마커, 가격 오버레이, DB 좌표(lat/lng) 직접 사용, 뷰포트 기반 성능 최적화(setMap null), 즐겨찾기 하트 마커, Ctrl+클릭 비교 선택 |
| F2-2 | 리스트 뷰 | P0 | ✅ | `components/complex/ComplexCard.tsx`, `ComplexList.tsx` | 단지별 그룹핑, 단지명/가격/면적/년도, 가격변동률 표시 |
| F2-3 | 지도-리스트 연동 | P0 | ✅ | `app/search/page.tsx` | 양방향 하이라이트 동기화 |
| F2-4 | 검색 결과 정렬 | P1 | ✅ | `components/filter/SortSelect.tsx` | 최신순/가격높은순/가격낮은순/면적넓은순/세대수순 |
| F2-5 | 페이지네이션 | P1 | 🔲 | - | 미구현 |
| F2-6 | 검색 결과 요약 | P1 | 🔲 | - | "총 XX개 단지, 평균 거래가 X억" 표시. 미구현 |

---

## F3: 실거래가 추이 분석 모듈

| ID | 기능 | 우선순위 | 상태 | 구현 파일 | 비고 |
|----|------|----------|------|-----------|------|
| F3-1 | 시계열 차트 (1Y/3Y/5Y/전체) | P0 | ✅ | `components/chart/PriceChart.tsx` | Recharts ComposedChart, 기간 탭 |
| F3-2 | 평형별 필터 | P0 | ✅ | `components/complex/AreaFilter.tsx` | 단지 내 면적별 필터링 |
| F3-3 | 거래 유형 구분 (매매/전세/월세) | P1 | 🔲 | - | 미구현 |
| F3-4 | 거래 상세 테이블 | P0 | ✅ | `components/complex/TradeTable.tsx` | 정렬, 페이지네이션 (20건/페이지) |
| F3-5 | 전세가율 | P1 | 🔲 | - | 미구현 |
| F3-6 | 공시가격 대비 비율 | P2 | 🔲 | - | 미구현 |

---

## F4: 주변 정보 분석 모듈

> **참고**: 호재/학군 탭은 실데이터 연동 전 mock 데이터 기반이었으나, 품질 문제로 단지 상세 페이지에서 **비활성화** 처리됨. 서울열린데이터(재개발/재건축) + NEIS(학교) 실데이터 연동 완료 시 재활성화 예정.

| ID | 기능 | 우선순위 | 상태 | 구현 파일 | 비고 |
|----|------|----------|------|-----------|------|
| F4-1 | 주변 호재 (재개발/재건축) | P0 | ⚠️ | `components/nearby/NearbyTabs.tsx`, `RedevelopmentCard.tsx` | 컴포넌트 구현 완료, 단지 상세에서 **비활성화** (mock 데이터). 실데이터 연동 시 재활성화 예정 |
| F4-2 | 교통 호재 (신설 지하철) | P1 | 🔲 | - | 미구현 |
| F4-3 | 학군 정보 | P1 | ⚠️ | `components/nearby/SchoolCard.tsx` | 컴포넌트 구현 완료, 단지 상세에서 **비활성화** (mock 데이터). NEIS 실데이터 연동 시 재활성화 예정 |
| F4-4 | 편의시설 | P2 | 🔲 | - | 미구현 |
| F4-5 | 인구 현황 | P2 | 🔲 | - | 미구현 |

---

## F5: 출퇴근 분석 모듈

| ID | 기능 | 우선순위 | 상태 | 구현 파일 | 비고 |
|----|------|----------|------|-----------|------|
| F5-1 | 직장 주소 검색 | P0 | ✅ | `components/transit/WorkplaceSearch.tsx` | 카카오 로컬 API, 자동완성, 최근 5개 저장 |
| F5-2 | 대중교통 출퇴근 소요시간 | P0 | ✅ | `components/transit/CommuteResult.tsx` | ODsay API (브라우저 직접 호출), 환승횟수/요금 |
| F5-3 | 자차 출퇴근 | P1 | 🔲 | - | 미구현 |
| F5-4 | 출퇴근 등시선 지도 | P2 | 🔲 | - | 미구현 |
| F5-5 | 3대 업무지구 접근성 | P1 | ✅ | `components/transit/BusinessDistrictCommute.tsx` | 강남역/여의도역/광화문역 소요시간, ODsay API 브라우저 직접 호출, DB 좌표(lat/lng) 직접 전달 (카카오 지오코딩 의존성 제거) |

---

## F6: 단지 비교 기능

> **기획 의도**: 검색 결과에서 관심 단지를 하나씩 추가하여 실거래가 시계열 및 메타데이터를 비교하는 화면.
>
> **현재 구현**: 나의관심단지에서 2~4개 단지 선택 → JSON URL 파라미터로 비교 페이지 이동 → DB 직접 조회로 실거래가 오버레이 차트 + 전체 비교 테이블 표시. AI 인사이트(Azure OpenAI) 연동. `useSyncExternalStore` 기반 실시간 동기화.
>
> **목표 UX 흐름**:
> 1. 검색 결과 리스트에서 "비교 담기" 버튼으로 단지를 비교함에 추가 (최대 4개) — **미구현**
> 2. 하단 플로팅 바에 담긴 단지 칩 표시 + "비교하기" CTA — **미구현**
> 3. 비교 페이지에서 시계열 오버레이 차트 + 메타데이터 테이블 + AI 인사이트 — **구현 완료**
> 4. 비교 항목 동적 추가/제거 가능

| ID | 기능 | 우선순위 | 상태 | 구현 파일 | 비고 |
|----|------|----------|------|-----------|------|
| F6-1 | 나의관심단지 담기 | P0 | ✅ | `hooks/use-favorites.ts`, `components/complex/FavoriteButton.tsx` | useSyncExternalStore 실시간 동기화, 최대 20개, 로그인 시 DB 저장 |
| F6-2 | 단지 비교 뷰 (2~4개) | P0 | ✅ | `app/compare/page.tsx`, `components/chart/CompareChart.tsx` | JSON URL 파라미터, DB 직접 조회, N개 단지 오버레이 차트 + 전체 비교 테이블 (기본정보/건물지표/단지평가/거래정보/주차/시설/교통/교육/편의시설/복리시설) |
| F6-2a | 비교함 (Compare Cart) | P0 | 🔲 | `hooks/use-compare-cart.ts` | 검색 리스트에서 단지 담기, 최대 4개, localStorage. 미구현 |
| F6-2b | 비교 플로팅 바 | P0 | 🔲 | `components/compare/CompareBar.tsx` | 하단 플로팅, 담긴 단지 칩 + 비교하기 버튼. 미구현 |
| F6-3 | 비교분석 히스토리 | P0 | ✅ | `hooks/use-comparisons.ts`, `app/api/user/comparisons/route.ts` | 자동 저장 (최대 10개), 동일 조합 중복 방지, 클릭 시 복원, 개수 표시(N/10) |
| F6-4 | 비교분석 즐겨찾기 | P0 | ✅ | `hooks/use-comparisons.ts`, `app/compare/page.tsx` | 히스토리→즐겨찾기 전환, 직접 저장 (최대 10개), 개수 표시(N/10) |
| F6-5 | 비교 테이블 전체 항목 | P1 | ✅ | `app/compare/page.tsx` | 기본정보 + 건물지표 + 단지평가 + 거래정보 + 주차 + 시설 + 교통 + 교육 + 편의시설 + 복리시설 전 항목 구현 완료 |
| F6-6 | 비교 결과 공유/내보내기 | P2 | 🔲 | - | 미구현 |

---

## F7: 사용자 인증 및 데이터 영속화 (v2.2 신규)

> 카카오 OAuth 로그인을 통해 사용자별 데이터(관심단지, 비교분석, 필터 프리셋)를 DB에 저장하여 세션 간 유지.
> 비로그인 사용자는 기존과 동일하게 localStorage 사용.

| ID | 기능 | 우선순위 | 상태 | 구현 파일 | 비고 |
|----|------|----------|------|-----------|------|
| F7-1 | 카카오 OAuth 로그인 | P0 | ✅ | `lib/auth.ts`, `app/api/auth/[...nextauth]/route.ts` | NextAuth v5, JWT 세션, 닉네임/프로필 이미지 |
| F7-2 | 사용자 프로필 표시 | P0 | ✅ | `components/auth/UserMenu.tsx` | 카카오 닉네임 + 프로필 이미지, 로그아웃 |
| F7-3 | 로그인 유도 팝업 | P1 | ✅ | `components/auth/LoginPrompt.tsx` | 모달 + 인라인 배너, 24시간 dismiss |
| F7-4 | 관심단지 DB 저장 | P0 | ✅ | `app/api/user/favorites/route.ts`, `hooks/use-favorites.ts` | 로그인 시 DB, 비로그인 시 localStorage, 계정별 데이터 격리 |
| F7-5 | 관심단지 로그인 동기화 | P0 | ✅ | `app/api/user/favorites/sync/route.ts` | 로그인 시 로컬→DB 병합 |
| F7-6 | 비교분석 DB 저장 | P0 | ✅ | `app/api/user/comparisons/route.ts`, `hooks/use-comparisons.ts` | 히스토리/즐겨찾기 구분, 로그인 시 DB, 계정별 데이터 격리 |
| F7-7 | 필터 프리셋 서버 저장 | P2 | 🔲 | `app/api/user/filters/route.ts` | user_filters 테이블 준비 완료, UI 미구현 |
| F7-8 | 나의관심단지 지도 | P1 | ✅ | `app/favorites/page.tsx` (또는 Navbar 연결 페이지) | 관심단지만 독립 데이터 패스로 지도 표시. v2.4 구현 완료 |

---

## F8: 단지 상세 — 건물지표 및 단지 평가 (v2.3 신규)

> 단지 상세 페이지에서 건물 지표(용적률/건폐율/에너지등급)와 단지 평가(재건축가능성/주거쾌적성/미래가치)를 InfoTooltip과 함께 표시한다.

| ID | 기능 | 우선순위 | 상태 | 구현 파일 | 비고 |
|----|------|----------|------|-----------|------|
| F8-1 | 건물지표 표시 | P1 | ✅ | `components/complex/ComplexInfoCard.tsx` | 용적률/건폐율/에너지등급 + InfoTooltip (항목별 설명 툴팁) |
| F8-2 | 단지 평가 스코어 표시 | P1 | ✅ | `components/complex/ComplexInfoCard.tsx` | 재건축가능성/주거쾌적성/미래가치 점수, `lib/collector/scoring.ts` 계산값, InfoTooltip |

---

## F9: AI 인사이트 (v2.3 신규)

> Azure OpenAI 기반 단지 비교 분석. 비교 페이지에서 선택된 단지들의 스코어링 데이터를 포함하여 AI 분석 결과를 생성한다.

| ID | 기능 | 우선순위 | 상태 | 구현 파일 | 비고 |
|----|------|----------|------|-----------|------|
| F9-1 | AI 단지 비교 분석 | P1 | ✅ | `components/compare/AiInsight.tsx`, `app/api/ai/insight/route.ts` | Azure OpenAI, 수익률/실거주/자녀교육/미래가치 4개 영역, 단지별 점수·장단점·키워드, 최종 추천, FAB 버튼 (bounce+glow 애니메이션) |
| F9-2 | 출퇴근 비교 패널 | P1 | ✅ | `components/compare/CommuteCompare.tsx` | 비교 단지 간 3대 업무지구 출퇴근 소요시간 비교 |

---

## F10: UX 가이드 오버레이 (v2.4 신규)

> 신규 사용자의 진입 장벽을 낮추기 위한 가이드 UI. 비교분석 사용법 오버레이와 첫 진입 튜토리얼로 구성된다.

| ID | 기능 | 우선순위 | 상태 | 구현 파일 | 비고 |
|----|------|----------|------|-----------|------|
| F10-1 | 비교분석 가이드 오버레이 | P1 | ✅ | `components/guide/CompareGuideOverlay.tsx` (또는 Navbar 내 구현) | Navbar 가이드 버튼 클릭 시 비교분석 사용법 오버레이 표시 |
| F10-2 | 첫 진입 튜토리얼 | P1 | ✅ | `components/guide/OnboardingOverlay.tsx` (또는 search page 내 구현) | 검색 페이지 첫 진입 시 오버레이 튜토리얼 표시, "오늘 다시 보지 않기" 옵션 (localStorage 기반) |

---

## 구현 현황 요약

| 우선순위 | 전체 | 완료 | 비율 |
|----------|------|------|------|
| P0 | 30 | 28 | 93% |
| P1 | 32 | 25 | 78% |
| P2 | 9 | 3 | 33% |
| **합계** | **71** | **56** | **79%** |

> **v2.4 기준 변경 사항**:
> - F0-9 Vercel Cron 증분 수집 구현 완료 (🔲 → ✅)
> - F1-14 분양형태 필터 구현 완료 (🔲 → ✅)
> - F1-17 용적률 상한 필터(vlRatMax) 신규 추가 (✅)
> - F2-4 정렬 옵션 확장: 최신/가격높은순/가격낮은순/면적넓은순/세대수순
> - F6-5 비교 테이블 전체 항목 구현 완료 (🔲 → ✅)
> - F7-8 나의관심단지 지도 구현 완료 (🔲 → ✅)
> - F10 UX 가이드 오버레이 모듈 신규 추가 (F10-1, F10-2 ✅)
> - 미구현 P0: F6-2a 비교함(Compare Cart), F6-2b 플로팅 바
> - F4 주변분석(호재/학군) 탭: 컴포넌트 유지, 실데이터 연동 전까지 비활성화 상태 유지
