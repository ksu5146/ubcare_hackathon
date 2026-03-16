# 테스트 전략 및 CI/CD — 부동산 매수 도우미

> 최종 업데이트: 2026-03-15 (v2.4)

---

## 테스트 프레임워크

| 항목 | 기술 |
|------|------|
| 프레임워크 | **Vitest 4.1** (Vite 기반 테스트 러너) |
| 커버리지 | **@vitest/coverage-v8** (V8 네이티브 커버리지) |
| 설정 파일 | `vitest.config.ts` |
| 커버리지 대상 | `src/lib/**`, `src/hooks/**` |

## 테스트 실행 명령어

```bash
npm test                # 전체 테스트 실행
npm run test:coverage   # 커버리지 포함 실행 (coverage/ 디렉토리에 HTML 리포트 생성)
```

---

## 커버리지 현황

```
Branches     : 41.95% ( 73/174 )
Lines        : 65.55% ( 118/180 )
```

> 커버리지 대상: 테스트 가능한 순수 로직 모듈 (format, utils, region, odsay-client, trade-aggregator, constants, use-filter).
> DB/외부 API 의존 코드(db-queries, collector, auth, kakao-geocode)는 mock 없이 테스트 불가하여 대상에서 제외.
> `npm run test:coverage`로 HTML 리포트 생성 → `coverage/index.html`

---

## 테스트 파일 목록 (18개 파일, 182 케이스)

### 단위 테스트 — `src/lib/__tests__/`

| 파일 | 케이스 | 대상 | 검증 내용 |
|------|--------|------|----------|
| `format.test.ts` | 14 | `lib/format.ts` | formatPrice (1억 미만/이상/10억+), formatPriceShort, formatArea, sqmToPyeong, pyeongToSqm |
| `utils.test.ts` | 7 | `lib/utils.ts` | cn() 클래스 합성, falsy 무시, Tailwind 충돌 병합, 배열 인수 |
| `region.test.ts` | 5 | `lib/region.ts` | getRegionName (유효코드, 미존재코드, 빈 문자열, 캐시) |
| `odsay-client.test.ts` | 7 | `lib/odsay-client.ts` | fetchTransit (API 키 없음, HTTP 에러, 빈 경로, 정상 응답, 최단 경로 선택, 네트워크 예외) |
| `trade-aggregator.test.ts` | 7 | `lib/trade-aggregator.ts` | aggregateMonthly (빈 배열, 단일, 동월 집계, 다월 분리, 정렬), fetchTradeHistory (필터링, fetch 실패) |
| `filter-bookmarks.test.ts` | 9 | `hooks/use-filter-bookmarks.ts` | localStorage CRUD, 10개 제한, 필터/직장 API 응답 형식 |

### Hook 테스트 — `src/hooks/__tests__/`

| 파일 | 케이스 | 대상 | 검증 내용 |
|------|--------|------|----------|
| `use-filter.test.ts` | 16 | `hooks/use-filter.ts` | DEFAULT_FILTERS 초기값, countActiveFilters (0/1/다수), intOrNull 파싱 |
| `use-favorites.test.ts` | 10 | `hooks/use-favorites.ts` | localStorage 읽기/쓰기 mock, addFavorite 20개 제한, removeFavorite, isFavorite |
| `use-comparisons.test.ts` | 13 | `hooks/use-comparisons.ts` | 비로그인 저장/조회, history 10개 제한, bookmark 10개 제한, itemsKey 정렬 |

### API 통합 테스트 — `src/app/api/__tests__/`

| 파일 | 케이스 | 대상 | 검증 내용 |
|------|--------|------|----------|
| `trade-search.test.ts` | 9 | `/api/trade/search` | lawdCd 필수, grouped 옵션, 응답 형식 { success, data } |
| `complex.test.ts` | 9 | `/api/complex/[id]` | ComplexInfo 필수/스코어링/좌표/건물지표 필드, 주차 합계, 에러 응답 |
| `ai-insight.test.ts` | 12 | `/api/ai/insight` | 요청 검증(2개 미만), structured 응답 구조, scores 범위, 폴백 content, 에러 응답 |

### 컴포넌트 테스트 — `src/components/__tests__/`

| 파일 | 케이스 | 대상 | 검증 내용 |
|------|--------|------|----------|
| `format-price.test.ts` | 18 | 금액 포맷팅 UI | formatPrice 렌더링 시나리오, formatPriceShort 축약 |

### E2E 시나리오 — `tests/E2E_SCENARIOS.md`

| 시나리오 | 플로우 |
|---------|--------|
| 1. 검색 → 필터 | 지역 선택 → 가격/면적 필터 → 결과 확인 → 필터 북마크 저장 |
| 2. 단지 상세 | 검색 결과 클릭 → 기본정보/차트/업무지구 접근성 확인 |
| 3. 비교분석 | Ctrl+클릭(모바일: long-press) → 비교 바 → 비교 테이블 → AI 인사이트 |
| 4. 카카오 로그인 | 로그인 → 즐겨찾기 DB 동기화 → 로그아웃 → localStorage 초기화 |
| 5. 필터 즐겨찾기 | 필터 설정 → 저장 → 불러오기 → 삭제 |

---

## CI/CD 파이프라인

### GitHub Actions 워크플로우

**파일**: `.github/workflows/ci.yml`

```
트리거: main 브랜치 push 또는 PR

┌─────────────────────────────────────────────┐
│  1. Checkout                                │
│  2. Setup Node.js 22 + npm cache            │
│  3. npm ci (의존성 설치)                      │
│  4. Lint (ESLint)                           │
│  5. Test with Coverage (vitest --coverage)  │
│  6. Upload Coverage Report (artifact, 14일)  │
│  7. Type Check (tsc --noEmit)               │
│  8. Build (next build)                      │
└─────────────────────────────────────────────┘
```

### Vercel 자동 배포

```
GitHub main push → Vercel Webhook → 빌드 → 배포
                                         ↓
                                    빌드 실패 시 이전 배포 유지
```

### Vercel Cron 자동 수집

```
매 정각 (0 * * * *) → GET /api/collector/cron
                    → 가장 오래된 6개 지역 증분 수집
                    → 66개 지역 약 11시간에 1바퀴
```

### 배포 검증 흐름

```
1. 로컬: npm test → npm run build (개발자 검증)
2. Push: GitHub Actions CI (자동 검증)
   - Lint 실패 → CI 빨간불
   - 테스트 실패 → CI 빨간불
   - 타입 에러 → CI 빨간불
   - 빌드 실패 → CI 빨간불
3. Vercel: 자동 빌드 + 배포
4. 배포 후: Vercel Dashboard에서 커밋 해시 확인
```

---

## 커버리지 설정

```typescript
// vitest.config.ts
test: {
  coverage: {
    provider: 'v8',
    reporter: ['text', 'text-summary', 'html'],
    include: ['src/lib/**', 'src/hooks/**'],
    exclude: ['**/__tests__/**', '**/node_modules/**'],
  },
}
```

---

## 테스트 작성 규칙

1. **파일 위치**: 대상 모듈과 같은 디렉토리의 `__tests__/` 하위
2. **네이밍**: `{module}.test.ts`
3. **언어**: describe/it 메시지는 한국어
4. **Mock**: `vi.mock`으로 외부 의존성(fetch, DB) 격리
5. **환경변수**: `vi.stubEnv`로 안전하게 격리
6. **기존 코드 수정 금지**: 테스트 파일만 추가

---

## 롤백 전략

### Vercel 배포 롤백
1. Vercel Dashboard → Deployments
2. 이전 정상 배포 선택 → `...` → **Promote to Production**
3. 즉시 이전 버전으로 트래픽 전환 (DNS 변경 없음, 수 초 내 완료)

### 코드 롤백
```bash
# 특정 커밋 되돌리기
git revert <commit-hash>
git push origin main
# → Vercel 자동 재배포

# 여러 커밋 되돌리기
git revert HEAD~3..HEAD --no-commit
git commit -m "revert: 최근 3개 커밋 롤백"
git push
```

### DB 마이그레이션 롤백
- Turso Hobby 플랜은 point-in-time recovery 미지원
- **백업**: 마이그레이션 전 `turso db dump` 실행
- **안전 원칙**: 테이블/컬럼 추가는 하위 호환, 컬럼 삭제/타입 변경은 별도 검증 필수
- **파괴적 변경 시**: 기존 컬럼 유지 + 새 컬럼 추가 → 데이터 마이그레이션 → 이전 컬럼 삭제 (3단계)

---

## DB 마이그레이션 전략

### 현재 방식
- `auth.ts`의 `initUserSchema()` → `CREATE TABLE IF NOT EXISTS` (앱 시작 시 자동 실행)
- `migrateUserSchema()` → `PRAGMA table_info`로 컬럼 확인 후 `ALTER TABLE` 추가

### 마이그레이션 흐름
```
1. 개발자가 initUserSchema()에 새 테이블/컬럼 추가
2. migrateUserSchema()에 기존 DB 호환 로직 추가
3. 배포 시 첫 API 호출에서 자동 실행 (별도 스크립트 불필요)
4. 파괴적 변경(컬럼 삭제, 타입 변경)은 수동 처리 필요
```

### 대안 검토

| 도구 | 장점 | 단점 | 채택 |
|------|------|------|------|
| Drizzle ORM | 타입 안전 마이그레이션 | libSQL 지원 초기, 학습 비용 | 미채택 |
| 수동 SQL + initSchema | 현재 방식, 단순 | 복잡한 마이그레이션 추적 어려움 | **채택** |
| Turso CLI dump/restore | 전체 백업 | point-in-time 불가 | 백업용 |

---

## Codecov 커버리지 연동

CI 파이프라인에서 Codecov로 커버리지를 자동 업로드합니다:
```yaml
# .github/workflows/ci.yml
- name: Upload coverage to Codecov
  uses: codecov/codecov-action@v4
  with:
    files: coverage/coverage-final.json
```

### 번들 크기 모니터링
빌드 후 `.next/static/` 크기를 CI 로그에 출력하여 번들 증가를 추적합니다.
