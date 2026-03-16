# 방구석 임장 — 부동산 매수 도우미

> 대한민국 공공데이터 기반 아파트 실거래가 분석 + AI 비교분석 포털

**배포 URL**: [ubcare-hackathon-smg7.vercel.app](https://ubcare-hackathon-smg7.vercel.app)

---

## 주요 기능

- **검색/필터**: 16개 조건 필터 (가격, 면적, 연식, 세대수, 용적률, 난방, 복도유형, 시공사 등)
- **지도 + 리스트**: 카카오맵 마커와 카드 리스트 양방향 연동, 뷰포트 기반 성능 최적화
- **단지 상세**: 기본정보, 건물지표(용적률/건폐율/에너지등급), 단지평가(재건축/쾌적성/미래가치) + InfoTooltip
- **실거래가 차트**: 면적별 필터, 가격 추이 ComposedChart
- **3대 업무지구 접근성**: 강남역/여의도역/광화문역 대중교통 소요시간 (ODsay API)
- **단지 비교분석**: 2~4개 단지 종합 비교 테이블 + 실거래가 오버레이 차트
- **AI 인사이트**: Azure OpenAI 기반 수익률/실거주/미래가치 종합 분석
- **관심단지**: 최대 20개 즐겨찾기 (로그인 시 DB 동기화)
- **비교분석 이력**: 히스토리 자동저장(10개) + 북마크(10개)
- **카카오 OAuth**: 계정별 데이터 격리
- **필터 즐겨찾기**: 자주 쓰는 검색 조건 저장/불러오기
- **비교분석 가이드**: 오버레이 튜토리얼 (Ctrl+클릭 / 모바일 long-press)
- **다크모드**: 시스템 설정 연동 + 수동 토글
- **자동 수집**: Vercel Cron으로 66개 지역 증분 수집 (매 1시간)

## 기술 스택

| 영역 | 기술 |
|------|------|
| Framework | Next.js 16 (App Router, TypeScript strict) |
| Styling | Tailwind CSS v4 + 다크모드 |
| UI | Radix UI + lucide-react |
| Charts | Recharts |
| Maps | 카카오맵 JS SDK v3 |
| DB | Turso (@libsql/client, libSQL) |
| Auth | NextAuth v5 + 카카오 OAuth |
| AI | Azure OpenAI (gpt-4.1-mini) |
| Transit | ODsay API (브라우저 직접 호출) |
| Test | Vitest + @vitest/coverage-v8 (158케이스) |
| CI/CD | GitHub Actions + Vercel 자동배포 |
| Hosting | Vercel (Serverless) |

## 시작하기

### 사전 준비

- Node.js 22+
- npm 10+

### 설치

```bash
npm install
```

### 환경변수 설정

`.env.local.example`을 `.env.local`로 복사하고 API 키를 입력합니다:

```bash
cp .env.local.example .env.local
```

| 변수 | 용도 | 발급처 |
|------|------|--------|
| `TURSO_DATABASE_URL` | Turso DB URL | [turso.tech](https://turso.tech) |
| `TURSO_AUTH_TOKEN` | Turso 인증 토큰 | 동일 |
| `DATA_GO_KR_API_KEY` | 공공데이터포털 | [data.go.kr](https://www.data.go.kr/) |
| `KAKAO_REST_API_KEY` | 카카오 REST API | [developers.kakao.com](https://developers.kakao.com/) |
| `NEXT_PUBLIC_KAKAO_MAP_KEY` | 카카오맵 JS SDK | 동일 |
| `NEXT_PUBLIC_ODSAY_API_KEY` | ODsay 대중교통 (웹) | [lab.odsay.com](https://lab.odsay.com/) |
| `NEXTAUTH_SECRET` | NextAuth JWT 시크릿 | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | 콜백 URL | `http://localhost:3000` |
| `KAKAO_CLIENT_ID` / `KAKAO_CLIENT_SECRET` | 카카오 OAuth | Kakao Developers |
| `AZURE_OPENAI_ENDPOINT` / `API_KEY` / `DEPLOYMENT` | AI 인사이트 | Azure Portal |

> 로컬 개발 시 Turso 변수를 주석처리하면 `file:real-estate.db` 로컬 파일 DB를 사용합니다.

### 명령어

```bash
npm run dev          # 개발 서버 (localhost:3000)
npm run build        # 프로덕션 빌드
npm run lint         # ESLint
npm test             # Vitest 전체 테스트 (158케이스)
npm run test:coverage # 커버리지 포함 테스트
```

## 프로젝트 구조

```
src/
├── app/              # Next.js App Router 페이지 + API Route Handlers (26개 엔드포인트)
├── components/       # UI 컴포넌트 (filter, complex, chart, map, compare, transit, guide, auth, layout, ui)
├── hooks/            # 커스텀 훅 (use-filter, use-search-results, use-favorites, use-comparisons, use-filter-bookmarks)
├── lib/              # 유틸리티 (db, db-queries, auth, format, cache, odsay-client, collector/)
├── types/            # TypeScript 타입 정의 (api, trade, complex, filter, location, nearby)
└── data/             # 법정동코드 JSON

scripts/              # 데이터 수집/마이그레이션 스크립트
tests/                # E2E 시나리오 문서
.github/workflows/    # GitHub Actions CI (lint → test:coverage → typecheck → build)
```

## 문서

| 문서 | 설명 |
|------|------|
| [docs/PRD.md](docs/PRD.md) | 프로젝트 정의서 (v2.4) |
| [docs/FEATURES.md](docs/FEATURES.md) | 기능 명세 + 구현 상태 (71개 중 60개 완료, 85%) |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | 아키텍처 (상태 관리 흐름, 동시성 제어, 에러 처리) |
| [docs/TECH_STACK.md](docs/TECH_STACK.md) | 기술 스택 선정 근거 + 의존성 정당성 |
| [docs/API_ENDPOINTS.md](docs/API_ENDPOINTS.md) | API 엔드포인트 명세 (26개) |
| [docs/DB_SCHEMA.md](docs/DB_SCHEMA.md) | 데이터베이스 스키마 |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | 배포 가이드 (Vercel + Turso) |
| [docs/TESTING_CI.md](docs/TESTING_CI.md) | 테스트 전략 + CI/CD 파이프라인 + 롤백 전략 |
| [docs/ERROR_STRATEGY.md](docs/ERROR_STRATEGY.md) | 에러 처리 / 캐싱 / 성능 전략 |
| [docs/PERFORMANCE.md](docs/PERFORMANCE.md) | 번들 크기 + 성능 최적화 현황 |
| [docs/OPTIMIZATION.md](docs/OPTIMIZATION.md) | 최적화 이력 + 미해결 사항 |
| [docs/DIFFERENTIATION.md](docs/DIFFERENTIATION.md) | 기존 포털 대비 차별점 분석 |
| [docs/CHANGELOG.md](docs/CHANGELOG.md) | 변경 이력 (v2.0~v2.4 + 의사결정 근거) |
| [docs/SPRINT_RETROSPECTIVE.md](docs/SPRINT_RETROSPECTIVE.md) | 스프린트 회고 (Sprint 1~8) |
| [RoadMap.md](RoadMap.md) | 스프린트 계획 + 진행 현황 |
| [CLAUDE.md](CLAUDE.md) | AI 협업 가이드 (Claude Code 설정) |
| [tests/E2E_SCENARIOS.md](tests/E2E_SCENARIOS.md) | E2E 테스트 시나리오 (5개) |

## 라이선스

MIT
