# 부동산 매수 도우미

대한민국 공공데이터 기반 아파트 실거래가 분석 포털. 예산·지역·면적 조건으로 아파트를 검색하고, 실거래가 추이·주변 호재·출퇴근 시간을 한눈에 확인할 수 있습니다.

## 주요 기능

- **조건 검색**: 예산, 지역(3단계), 면적 필터로 아파트 탐색
- **지도 + 리스트**: 카카오맵 마커와 카드 리스트 양방향 연동
- **실거래가 차트**: 1년/3년/5년/전체 시계열, 평형별 필터
- **거래 내역**: 정렬·페이지네이션 테이블
- **주변 분석**: 재개발/재건축 호재, 학군 정보
- **출퇴근 분석**: 직장 검색 → 대중교통 소요시간
- **관심 단지**: 최대 20개 즐겨찾기 (localStorage)
- **단지 비교**: 2개 단지 가격 추이 오버레이 차트

## 기술 스택

| 영역 | 기술 |
|------|------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 |
| Charts | Recharts |
| Maps | 카카오맵 JS SDK v3 |
| UI | Radix UI + lucide-react |
| Font | Pretendard Variable |

## 시작하기

### 사전 준비

- Node.js 18+
- npm 9+

### 설치

```bash
cd real-estate-helper
npm install
```

### 환경변수 설정

`.env.local.example`을 `.env.local`로 복사하고 API 키를 입력합니다:

```bash
cp .env.local.example .env.local
```

| 변수 | 용도 | 발급처 |
|------|------|--------|
| `DATA_GO_KR_API_KEY` | 공공데이터포털 인증키 | [data.go.kr](https://www.data.go.kr/) |
| `KAKAO_REST_API_KEY` | 카카오 REST API (장소 검색) | [developers.kakao.com](https://developers.kakao.com/) |
| `NEXT_PUBLIC_KAKAO_MAP_KEY` | 카카오맵 JS SDK | 위와 동일 |
| `ODSAY_API_KEY` | ODsay 대중교통 API | [lab.odsay.com](https://lab.odsay.com/) |
| `SEOUL_OPEN_DATA_KEY` | 서울열린데이터 (선택) | [data.seoul.go.kr](https://data.seoul.go.kr/) |

> API 키 없이도 기본 UI는 확인 가능합니다 (지도 placeholder, mock 데이터 fallback).

### 개발 서버

```bash
npm run dev
```

http://localhost:3000 에서 확인합니다.

### 빌드

```bash
npm run build
```

### 린트

```bash
npm run lint
```

### 테스트

```bash
npm test
```

> 테스트 환경은 Phase 2에서 Jest + React Testing Library로 구축 예정입니다.

## 프로젝트 구조

```
src/
├── app/          # Next.js App Router 페이지 + API Route Handlers
├── components/   # UI 컴포넌트 (filter, complex, chart, map, nearby, transit, ui)
├── hooks/        # 커스텀 훅 (use-filter, use-search-results, use-favorites)
├── lib/          # 유틸리티 (api-client, cache, format, search, trade-aggregator)
├── types/        # TypeScript 타입 정의
└── data/         # 법정동코드 JSON
```

## 문서

| 문서 | 설명 |
|------|------|
| [docs/PRD.md](docs/PRD.md) | 프로젝트 정의서 |
| [docs/FEATURES.md](docs/FEATURES.md) | 기능 명세 (상태 추적) |
| [docs/architecture.md](docs/architecture.md) | 아키텍처 상세 |
| [docs/TECH_STACK.md](docs/TECH_STACK.md) | 기술 스택 선정 근거 |
| [docs/CHANGELOG.md](docs/CHANGELOG.md) | 변경 이력 |

## 라이선스

MIT
