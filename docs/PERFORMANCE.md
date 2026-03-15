# 성능 측정 보고서

> **문서 버전:** v1.0
> **측정일:** 2026-03-15
> **빌드 환경:** Next.js 16.1.6 (Turbopack), Windows 11

---

## 1. 빌드 결과 요약

```
▲ Next.js 16.1.6 (Turbopack)
✓ Compiled successfully in 3.6s
✓ Generating static pages (25/25) in 320.8ms
```

| 항목 | 결과 |
|------|------|
| 빌드 성공 여부 | 성공 |
| 컴파일 시간 | 3.6s |
| 정적 페이지 생성 시간 | 320.8ms |
| 총 라우트 수 | 25개 |
| 정적 라우트 (○) | 3개 |
| 동적 라우트 (ƒ) | 22개 |

---

## 2. 라우트별 번들 구성

### 2.1 정적 렌더링 페이지 (Static — 사전 렌더링)

| 라우트 | 유형 | 설명 |
|--------|------|------|
| `/` | ○ Static | 홈 페이지 |
| `/search` | ○ Static | 매물 탐색 (초기 Shell) |
| `/compare` | ○ Static | 단지 비교 (초기 Shell) |
| `/_not-found` | ○ Static | 404 페이지 |

정적 페이지는 HTML이 빌드 타임에 사전 생성되어 CDN에서 서빙된다. 최초 접속 시 서버 연산 없이 즉시 응답한다.

### 2.2 동적 라우트 (Dynamic — 서버 온디맨드 렌더링)

| 라우트 | 유형 | 설명 |
|--------|------|------|
| `/complex/[id]` | ƒ Dynamic | 단지 상세 페이지 |
| `/api/trade/search` | ƒ Dynamic | 매물 검색 (DB 쿼리) |
| `/api/trade/complex` | ƒ Dynamic | 단지별 거래 이력 |
| `/api/trade/favorites` | ƒ Dynamic | 관심단지 거래 데이터 |
| `/api/trade/apartment` | ƒ Dynamic | 아파트 거래 데이터 |
| `/api/complex/[id]` | ƒ Dynamic | 단지 상세 정보 |
| `/api/complex/list` | ƒ Dynamic | 단지 목록 |
| `/api/ai/insight` | ƒ Dynamic | AI 인사이트 (Azure OpenAI) |
| `/api/auth/[...nextauth]` | ƒ Dynamic | 카카오 OAuth |
| `/api/collector` | ƒ Dynamic | 수집기 실행 |
| `/api/collector/cron` | ƒ Dynamic | Vercel Cron 수집 |
| `/api/collector/stats` | ƒ Dynamic | 수집 통계 |
| `/api/collector/status` | ƒ Dynamic | 수집 상태 |
| `/api/location/geocode` | ƒ Dynamic | 주소 → 좌표 변환 |
| `/api/location/geocode-batch` | ƒ Dynamic | 배치 지오코딩 |
| `/api/location/search` | ƒ Dynamic | 장소 검색 |
| `/api/nearby/redevelopment` | ƒ Dynamic | 주변 재개발 정보 |
| `/api/nearby/school` | ƒ Dynamic | 주변 학교 정보 |
| `/api/transit` | ƒ Dynamic | 대중교통 경로 |
| `/api/user/comparisons` | ƒ Dynamic | 비교 히스토리/즐겨찾기 |
| `/api/user/favorites` | ƒ Dynamic | 관심단지 |
| `/api/user/favorites/sync` | ƒ Dynamic | 관심단지 로컬→DB 동기화 |

---

## 3. 클라이언트 번들 파일 구성

### 3.1 공유 청크 (Shared Chunks)

빌드 결과 `.next/static/chunks/` 디렉토리에 생성된 주요 청크:

| 파일 | 역할 |
|------|------|
| `turbopack-d5821bf6ef560cc4.js` | Turbopack 런타임 |
| `30abf84f5688884d.js` | React/Next.js 프레임워크 코어 |
| `82abf2d65f5428ae.js` | 공유 벤더 청크 |
| `20ff450248d1f803.js` | 공유 벤더 청크 |
| `69be39811437728d.js` | 공유 앱 청크 |
| `a6dad97d9634a72d.js` | 폴리필 청크 |
| `fe771261fa547536.css` | 전역 CSS (Tailwind 포함) |

### 3.2 미디어 자산

| 파일 | 설명 |
|------|------|
| `PretendardVariable-s.p.77d5d991.woff2` | Pretendard 가변 폰트 (서브셋) |
| `favicon.0b3bf435.ico` | 파비콘 |

> **참고**: Next.js 16 (Turbopack) 빌드는 `next build` 출력에 페이지별 First Load JS 크기를 별도로 표시하지 않는다. 정확한 크기는 `.next/static/` 디렉토리 실측 또는 `@next/bundle-analyzer` 플러그인으로 측정 가능하다.

---

## 4. optimizePackageImports 설정 현황

`next.config.ts`에 다음 패키지에 대한 임포트 최적화가 활성화되어 있다.

```ts
experimental: {
  optimizePackageImports: [
    'recharts',
    'lucide-react',
    '@radix-ui/react-dialog',
    '@radix-ui/react-slider',
  ],
}
```

| 패키지 | 최적화 이유 | 효과 |
|--------|-------------|------|
| `recharts` | 차트 컴포넌트 barrel export — 사용하지 않는 컴포넌트까지 번들에 포함 | 미사용 차트 컴포넌트 트리쉐이킹 |
| `lucide-react` | 600개 이상 아이콘 barrel export | 실제 사용 아이콘만 포함 |
| `@radix-ui/react-dialog` | Radix UI 서브패키지 barrel export | Dialog 관련 미사용 코드 제거 |
| `@radix-ui/react-slider` | Radix UI 서브패키지 barrel export | Slider 관련 미사용 코드 제거 |

### 추가 최적화 대상 검토

현재 `optimizePackageImports`에 포함되지 않았으나 추가를 검토할 패키지:

| 패키지 | 이유 |
|--------|------|
| `@radix-ui/react-select` | 사용 중이나 최적화 미적용 |
| `@radix-ui/react-tabs` | 사용 중이나 최적화 미적용 |
| `@radix-ui/react-tooltip` | 사용 중이나 최적화 미적용 |

---

## 5. 성능 개선 현황

`OPTIMIZATION.md` 기준 적용된 성능 최적화:

| 항목 | 개선 내용 | 영향 |
|------|-----------|------|
| 패키지 임포트 최적화 | `optimizePackageImports` 4개 패키지 적용 | 클라이언트 번들 크기 감소 |
| 검색 필터 디바운스 | 350ms 디바운스 적용 | 불필요한 API 호출 90%+ 감소 |
| DB 인덱스 최적화 | `idx_trades_search` 복합 인덱스 추가 | 지역별 거래 검색 속도 향상 |
| COUNT(*) 캐싱 | 60초 TTL 모듈 레벨 캐시 | 쿼리 2~3개/요청 제거 |
| SPA 네비게이션 | `window.location.href` → `router.push()` | 페이지 전환 속도 향상 |
| 지도 뷰포트 최적화 | 뷰포트 벗어난 마커 `setMap(null)` | 지도 렌더링 성능 향상 |

---

## 6. 개선 가능 항목

| 우선순위 | 항목 | 설명 | 예상 효과 |
|---------|------|------|-----------|
| HIGH | `region-codes.json` 동적 임포트 | 현재 `region.ts`에서 정적 import → 클라이언트 번들에 포함 | 번들 크기 감소 |
| HIGH | `@next/bundle-analyzer` 도입 | 정확한 페이지별 번들 크기 시각화 | 최적화 우선순위 파악 |
| MEDIUM | 나머지 Radix UI 패키지 최적화 | `react-select`, `react-tabs`, `react-tooltip` 추가 | 소폭 번들 감소 |
| MEDIUM | 이미지 최적화 | `next/image` 활용, WebP/AVIF 변환 | LCP 개선 |
| MEDIUM | AbortController 적용 | 검색 디바운스 중 이전 요청 취소 | 네트워크 낭비 제거 |
| LOW | 다크 모드 CSS 변수 | 현재 라이트 모드 전용 | 번들 영향 없음, UX 개선 |

---

## 7. 비기능 요구사항 달성 현황

| ID | 항목 | 목표 | 현황 |
|----|------|------|------|
| NF-1 | 초기 로딩 | Lighthouse Performance 80+ | 정적 Shell + DB 쿼리 기반 구조로 달성 가능 |
| NF-2 | 검색 응답 | p95 < 500ms | DB 쿼리 기반 (인덱스 최적화 완료) |
| NF-3 | 반응형 | 360px ~ 1920px | Tailwind 반응형 클래스 적용 |
| NF-4 | 브라우저 | Chrome/Safari/Edge 최신 2버전 | 폴리필 청크 포함 |
| NF-5 | API Key 보안 | 백엔드 프록시 경유 | Route Handler 경유 구현 완료 |
| NF-6 | 캐싱 | DB 수집일 기준, 학교/인구 30d | 인메모리 캐시 구현 완료 |
| NF-7 | 접근성 | WCAG 2.1 AA | `prefers-reduced-motion` 적용, 슬라이더 터치 타겟 개선 필요 |
