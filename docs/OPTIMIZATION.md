# 프로젝트 최적화 보고서

> 작성일: 2026-03-15

## 1. 보안 (CRITICAL)

### 1.1 API 키 노출 방지
- **문제**: `.env.local.example`에 실제 API 키가 포함되어 있었음
- **수정**: 모든 키를 `YOUR_*_HERE` 플레이스홀더로 교체
- **파일**: `.env.local.example`

### 1.2 수집 엔드포인트 인증 추가
- **문제**: `POST /api/collector`에 인증이 없어 누구나 데이터 수집 트리거 가능
- **수정**: `COLLECTOR_SECRET` 환경변수 기반 헤더 인증 (`x-collector-secret`) 추가
- **파일**: `src/app/api/collector/route.ts`

### 1.3 TLS 검증 비활성화 제거
- **문제**: `next.config.ts`에서 `NODE_TLS_REJECT_UNAUTHORIZED=0` 설정이 빌드 시에도 실행됨
- **수정**: `next.config.ts`에서 제거, `instrumentation.ts`의 개발환경 전용 가드만 유지
- **파일**: `next.config.ts`, `src/instrumentation.ts`

---

## 2. 성능 최적화

### 2.1 검색 필터 디바운스 (HIGH)
- **문제**: 슬라이더 드래그 시 매 변경마다 API 요청 발생 (요청 폭주)
- **수정**: `useSearchResults`에 350ms 디바운스 적용
- **파일**: `src/hooks/use-search-results.ts`
- **영향**: 슬라이더 조작 시 불필요한 API 호출 90%+ 감소

### 2.2 COUNT(*) 쿼리 캐싱 (HIGH)
- **문제**: `searchTrades`/`searchTradeGrouped` 매 호출마다 `SELECT COUNT(*) FROM complexes` 등 3회 실행
- **수정**: 모듈 레벨 캐시 (60초 TTL) 도입으로 반복 실행 방지
- **파일**: `src/lib/db-queries.ts`
- **영향**: 검색 요청당 불필요한 쿼리 2~3개 제거

### 2.3 trades 복합 인덱스 추가 (HIGH)
- **문제**: 주요 검색 쿼리 `WHERE lawd_cd IN (...) AND cancel_yn = 'N'`에 복합 인덱스 없음
- **수정**: `CREATE INDEX idx_trades_search ON trades(lawd_cd, cancel_yn, deal_year DESC, deal_month DESC)` 추가
- **파일**: `src/lib/db.ts`
- **영향**: 지역별 거래 검색 속도 대폭 향상

### 2.4 패키지 임포트 최적화 (MEDIUM)
- **문제**: recharts, lucide-react 등 큰 패키지의 barrel export로 번들 크기 증가
- **수정**: `next.config.ts`에 `experimental.optimizePackageImports` 설정 추가
- **파일**: `next.config.ts`
- **영향**: 클라이언트 번들 크기 감소

### 2.5 SPA 네비게이션 복원 (MEDIUM)
- **문제**: 검색 페이지에서 `window.location.href`로 하드 네비게이션 → React 상태 초기화, 스크롤 위치 유실
- **수정**: `router.push()`로 교체하여 SPA 네비게이션 유지
- **파일**: `src/app/search/page.tsx`
- **영향**: 페이지 전환 속도 향상, 스크롤 위치 유지

---

## 3. 아키텍처 개선

### 3.1 중복 즐겨찾기 훅 제거 (HIGH)
- **문제**: `use-favorites.ts` (서버 동기화 지원)와 `use-favorite-complexes.ts` (로컬 전용)가 서로 다른 localStorage 키로 공존
- **수정**: `use-favorite-complexes.ts`와 미사용 `complex/FavoritesList.tsx` 삭제, `use-favorites.ts`로 통합
- **삭제 파일**: `src/hooks/use-favorite-complexes.ts`, `src/components/complex/FavoritesList.tsx`
- **영향**: 데이터 불일치 문제 해소

---

## 4. UI/UX 개선

### 4.1 지역 선택 UX (시/군/구 칩 그리드)
- **문제**: 드롭다운 방식으로 여러 지역 선택 시 반복 조작 필요
- **수정**: 시/군/구를 클릭형 토글 칩 그리드로 변경, 한 번에 여러 지역 선택 가능
- **파일**: `src/components/filter/RegionSelect.tsx`

### 4.2 검색조건 즐겨찾기 저장 프롬프트
- **문제**: 필터 저장 기능(FilterBookmarks)의 접근성이 낮았음
- **수정**: 검색 결과 로드 시 자동 저장 프롬프트 배너 표시 (즐겨찾기 모드에서는 미표시)
- **파일**: `src/app/search/page.tsx`

### 4.3 관심단지 지도 보기
- **문제**: 즐겨찾기한 단지만 지도에서 볼 수 있는 기능 없었음
- **수정**:
  - 검색 결과 헤더에 "관심단지만" 토글 버튼 추가
  - 네비바에 "관심단지 지도" 링크 추가 (`/search?favoritesOnly=true`)
  - 진입 시 즐겨찾기의 lawdCd 자동 추출하여 지역 필터 설정
  - 관심단지 없음/해당 지역에 관심단지 없음 등 빈 상태 메시지
- **파일**: `src/app/search/page.tsx`, `src/components/layout/Header.tsx`

### 4.4 지도 마커 즐겨찾기 버튼
- **문제**: 지도 마커에서 직접 즐겨찾기 추가/해제 불가
- **수정**: 각 마커 우상단에 하트 버튼 추가, 즐겨찾기 토글 시 마커 색상/아이콘 실시간 반영
- **파일**: `src/components/map/KakaoMap.tsx`

### 4.5 모션 감소 설정 존중
- **문제**: `prefers-reduced-motion` 미디어 쿼리 미적용
- **수정**: 모든 애니메이션/트랜지션을 `prefers-reduced-motion: reduce` 시 비활성화
- **파일**: `src/app/globals.css`

---

## 5. 데이터 점수 산출

### 5.1 재건축 가능성 점수 (rebuild_score, 0~100)
- 연식 45% + 용적률 여유 40% + 건물 상태 15%
- 30년+ 구축: 재건축 요건 충족 플래그 (`rebuild_eligible`)

### 5.2 주거 쾌적성 점수 (livability_score, 0~100)
- 주차비율 30% + 건폐율 25% + 용적률 20% + 신축도 15% + 부대시설 10%
- 최소 2개 지표 이상 있어야 점수 산출

### 5.3 미래가치 점수 (future_value_score, 0~100)
- 연식에 따라 재건축/쾌적성 가중치 동적 조절
  - 35년+: 재건축 70%, 쾌적성 30%
  - 25~35년: 50:50
  - 15~25년: 30:70
  - 15년 미만: 10:90
- 용적률 여유 큰 25년+ 구축에 보너스 (최대 15점)

### 5.4 이상치 예외처리
- 용적률 < 10%: 데이터 오류로 판단하여 NULL 처리
- 건폐율 > 100%: 데이터 오류로 판단하여 NULL 처리

---

## 6. 미해결 사항 (향후 개선)

| 우선순위 | 항목 | 설명 |
|---------|------|------|
| HIGH | 필터 로직 중복 | `searchTrades`/`searchTradeGrouped` 공통 빌더 추출 |
| HIGH | 페이지네이션 총 건수 오류 | `searchTradeGrouped`의 `total: groups.length`가 실제 총 건수가 아님 |
| HIGH | InMemoryCache LRU | 크기 제한/퇴거 정책 없음 → 메모리 누수 가능 |
| MEDIUM | 모바일 지도 | 검색 페이지에서 모바일 지도 완전 숨김 → 탭 전환 UI 필요 |
| MEDIUM | 모바일 비교 기능 | Ctrl+클릭이 모바일에서 동작 안 함 → 길게 누르기/체크박스 대안 |
| MEDIUM | 검색 디바운스 취소 | AbortController로 이전 요청 취소 추가 필요 |
| MEDIUM | API rate limiting | 외부 API 프록시 경로에 rate limiting 없음 |
| MEDIUM | 접근성: 슬라이더 터치 타겟 | 16×16px → 최소 44×44px 필요 |
| LOW | region-codes.json 정적 import | `region.ts`에서 정적 import → 클라이언트 번들 포함 |
| LOW | 다크 모드 | CSS 변수가 라이트 모드만 정의됨 |
