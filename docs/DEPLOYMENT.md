# 배포 가이드 — 부동산 매수 도우미

> 최종 업데이트: 2026-03-15 (v2.4 — Vercel + Turso 배포)

## 배포 아키텍처

```
GitHub (main 브랜치)
    ↓  push 시 자동 배포
Vercel (Next.js Serverless)
    ↓  API Routes
Turso (libSQL 원격 DB — Tokyo 리전)
    ↓
┌─ data.go.kr (공공데이터)
├─ 카카오 API (지도/검색/OAuth)
├─ ODsay API (대중교통, 브라우저 직접 호출)
└─ Azure OpenAI (AI 인사이트)
```

---

## 자동 배포 흐름

```
1. 로컬에서 코드 수정
2. git commit & git push origin main
3. GitHub → Vercel Webhook 자동 트리거
4. Vercel 빌드 시작 (npm run build)
   - NEXT_PUBLIC_* 환경변수가 빌드타임에 인라인
   - TypeScript 컴파일 + 정적 페이지 생성
5. 빌드 성공 → 자동 배포 (프로덕션 URL 갱신)
6. 빌드 실패 → 이전 배포 유지, Vercel Dashboard에서 에러 확인
```

### 주의사항

- **`NEXT_PUBLIC_*` 환경변수 변경 시**: 환경변수만 수정하면 반영 안 됨 → 반드시 **Redeploy** 필요 (빌드타임 인라인)
- **서버 환경변수 변경 시**: Redeploy 필요 (Vercel이 새 빌드를 만들어야 반영)
- **Redeploy 방법**: Vercel Dashboard → Deployments → 최근 배포 `...` → Redeploy

### 브랜치 전략

| 브랜치 | 배포 환경 | 설명 |
|--------|----------|------|
| `main` | Production | 자동 배포, 프로덕션 URL |
| 기타 브랜치 | Preview | PR 생성 시 미리보기 URL 자동 생성 |

---

## 데이터 수집 자동화 (Vercel Cron)

### 동작 방식

```
Vercel Cron (매 정각, 0 * * * *)
    ↓
GET /api/collector/cron
    ↓
DB에서 "가장 오래전 수집된" 6개 지역 선택
    ↓
해당 지역 최근 1개월 증분 수집
    ↓
66개 지역 전체를 약 11시간에 1바퀴 순회
```

### 설정 파일

`vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/collector/cron",
      "schedule": "0 * * * *"
    }
  ]
}
```

### 제약사항 (Hobby 플랜)

| 항목 | 제한 |
|------|------|
| Cron 개수 | 1개 |
| 함수 타임아웃 | 60초 |
| 해결 방식 | 라운드 로빈 (6개 지역/회) |
| 전체 순회 주기 | ~11시간 |

### 수동 수집 트리거

```bash
# 특정 지역 수집
curl -X POST https://your-domain.vercel.app/api/collector \
  -H "x-collector-secret: YOUR_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"lawdCodes": ["11680", "11710"], "months": 1}'

# 수집 상태 확인
curl https://your-domain.vercel.app/api/collector/status

# DB 통계
curl https://your-domain.vercel.app/api/collector/stats
```

---

## 환경변수 설정

### Vercel Dashboard 설정

Settings → Environment Variables에서 **Production** 체크 후 추가:

| 변수 | 필수 | 용도 | 발급처 |
|------|:----:|------|--------|
| `TURSO_DATABASE_URL` | ✅ | Turso DB URL | [Turso](https://turso.tech) |
| `TURSO_AUTH_TOKEN` | ✅ | Turso 인증 토큰 | 동일 |
| `DATA_GO_KR_API_KEY` | ✅ | 실거래가·단지정보 수집 | [data.go.kr](https://www.data.go.kr) |
| `KAKAO_REST_API_KEY` | ✅ | 장소 검색 (서버) | [Kakao Developers](https://developers.kakao.com) |
| `NEXT_PUBLIC_KAKAO_MAP_KEY` | ✅ | 카카오맵 (클라이언트) | 동일 |
| `NEXT_PUBLIC_ODSAY_API_KEY` | ✅ | 대중교통 (클라이언트) | [ODsay](https://lab.odsay.com) |
| `NEXTAUTH_SECRET` | ✅ | NextAuth JWT 시크릿 | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | ✅ | 배포 URL | 예: `https://xxx.vercel.app` |
| `KAKAO_CLIENT_ID` | ✅ | 카카오 OAuth | Kakao Developers |
| `KAKAO_CLIENT_SECRET` | ✅ | 카카오 OAuth | 동일 |
| `AZURE_OPENAI_ENDPOINT` | ✅ | AI 인사이트 | Azure Portal |
| `AZURE_OPENAI_API_KEY` | ✅ | AI 인사이트 | 동일 |
| `AZURE_OPENAI_DEPLOYMENT` | ✅ | AI 모델명 | 예: `gpt-4.1-mini` |
| `CRON_SECRET` | ❌ | Cron 인증 | 랜덤 문자열 |
| `COLLECTOR_SECRET` | ❌ | 수동 수집 인증 | 랜덤 문자열 |
| `SEOUL_OPEN_DATA_KEY` | ❌ | 재개발 실데이터 | [서울열린데이터](https://data.seoul.go.kr) |

### 로컬 개발 환경

`.env.local` 파일 생성 (`.env.local.example` 참조):

```bash
# Turso (로컬에서는 주석처리하면 file:real-estate.db 사용)
# TURSO_DATABASE_URL=libsql://xxx.turso.io
# TURSO_AUTH_TOKEN=eyJ...

# 필수 API 키
DATA_GO_KR_API_KEY=<인코딩된 서비스키>
KAKAO_REST_API_KEY=<카카오 REST API 키>
NEXT_PUBLIC_KAKAO_MAP_KEY=<카카오 JS 앱 키>
NEXT_PUBLIC_ODSAY_API_KEY=<ODsay 웹 API 키>

# 인증
NEXTAUTH_SECRET=<openssl rand -base64 32>
NEXTAUTH_URL=http://localhost:3000
KAKAO_CLIENT_ID=<카카오 REST API 키>
KAKAO_CLIENT_SECRET=<카카오 Client Secret>

# AI
AZURE_OPENAI_ENDPOINT=https://xxx.openai.azure.com/
AZURE_OPENAI_API_KEY=<Azure OpenAI 키>
AZURE_OPENAI_DEPLOYMENT=gpt-4.1-mini
```

---

## 외부 서비스 설정

### 카카오 OAuth

1. [Kakao Developers](https://developers.kakao.com) → 애플리케이션 추가
2. **카카오 로그인** 활성화
3. **Redirect URI** 등록:
   - `http://localhost:3000/api/auth/callback/kakao`
   - `https://your-domain.vercel.app/api/auth/callback/kakao`
4. **보안** → Client Secret 생성
5. **동의항목**: 프로필 정보(닉네임/프로필 사진) 필수 동의

### 카카오맵 도메인 등록

Kakao Developers → 앱 → 플랫폼 → Web:
- `http://localhost:3000`
- `https://your-domain.vercel.app`

### ODsay 도메인 등록

[ODsay 콘솔](https://lab.odsay.com) → API Key 관리:
- 호출 타입: **웹**
- 허용 URI: `localhost:3000`, `your-domain.vercel.app`

### data.go.kr API 활용 신청

| API | 서비스ID |
|-----|---------|
| 아파트매매 실거래 상세 자료 | `15126469` |
| 공동주택 단지 목록 제공 서비스 | `15057332` |
| 공동주택 기본 정보 제공 서비스 | `15058453` |

### Turso DB

1. [turso.tech](https://turso.tech) 가입
2. DB 생성: `real-estate-helper`, 리전: `nrt` (Tokyo)
3. 토큰 발급 → `TURSO_AUTH_TOKEN`
4. 초기 데이터 마이그레이션: `node --use-system-ca --env-file=.env.local scripts/migrate-to-turso.mjs`

---

## 배포 전 점검

- [ ] Vercel 환경변수 전체 설정 (위 테이블 참조)
- [ ] Turso DB에 데이터 마이그레이션 완료
- [ ] 카카오 OAuth Redirect URI 등록
- [ ] 카카오맵 도메인 등록
- [ ] ODsay 웹 API 키 + 도메인 등록
- [ ] data.go.kr API 활용 신청 3건
- [ ] `npm run build` 로컬 빌드 성공 확인
- [ ] Vercel Dashboard에서 빌드 성공 확인

---

## 트러블슈팅

| 증상 | 원인 | 해결 |
|------|------|------|
| 카카오 로그인 후 redirect 오류 | `NEXTAUTH_URL`이 배포 URL과 불일치 | Vercel 환경변수 수정 + Redeploy |
| ODsay 경로 조회 실패 | ODsay 도메인 미등록 또는 웹 키 미사용 | ODsay 콘솔에서 도메인 등록 + `NEXT_PUBLIC_ODSAY_API_KEY` 확인 |
| 지도 안 뜸 | `NEXT_PUBLIC_KAKAO_MAP_KEY` 미설정 | Vercel 환경변수 추가 + Redeploy |
| DB 연결 실패 | `TURSO_DATABASE_URL` 미설정 | Vercel 환경변수 확인 |
| PRAGMA 에러 | Turso 원격 DB에서 WAL/synchronous 미지원 | `db.ts`에서 isRemote 분기 확인 |
| Cron 미실행 | `vercel.json` 미반영 | 파일 확인 후 재배포 |
| SSL 인증서 오류 (로컬) | 기업 네트워크 프록시 | `.npmrc`에 `node-options=--use-system-ca` |
