# 배포 가이드 — 부동산 매수 도우미

> 최종 업데이트: 2026-03-14 (v2.2 — 카카오 OAuth 환경변수 추가)

## 배포 환경 선택

### Vercel 비호환 사유

- `better-sqlite3`는 네이티브 C++ 바인딩 → 서버리스 Lambda에서 실행 불가
- SQLite DB 파일은 로컬 파일시스템에 영구 저장 필요 → 서버리스는 휘발성 `/tmp`만 제공
- **결론: VPS(자체 서버) 배포 권장**

### 향후 Vercel 배포 전환 시

1. `better-sqlite3` → `@libsql/client` (Turso) 전환
2. Turso에 DB 마이그레이션
3. `serverExternalPackages` 설정 제거
4. 수집 모듈을 별도 cron 서비스로 분리

---

## VPS 배포 (권장)

### 사전 요구사항

- Node.js 20+ (LTS)
- npm 또는 pnpm
- Python 3 + C++ 빌드 도구 (better-sqlite3 빌드용, 대부분 OS에 기본 포함)

### 1. 환경변수 설정

서버에 `.env.local` 파일 생성:

```bash
# 필수
DATA_GO_KR_API_KEY=<인코딩된 서비스키>
KAKAO_REST_API_KEY=<카카오 REST API 키>
NEXT_PUBLIC_KAKAO_MAP_KEY=<카카오 JS 앱 키>
ODSAY_API_KEY=<ODsay API 키>

# 인증 (v2.2 신규)
NEXTAUTH_SECRET=<openssl rand -base64 32 로 생성>
NEXTAUTH_URL=https://your-domain.com      # 프로덕션 도메인
KAKAO_CLIENT_ID=<카카오 REST API 키>
KAKAO_CLIENT_SECRET=<카카오 Client Secret>

# 선택
SQLITE_DB_PATH=/var/data/real-estate.db   # 기본값: ./real-estate.db
# SEOUL_OPEN_DATA_KEY=<서울열린데이터 키>  # 재개발/재건축 실데이터 사용 시
```

**주의사항:**
- `DATA_GO_KR_API_KEY`는 URL-인코딩된 값을 그대로 사용 (이중 인코딩 방지 처리 완료)
- `NEXT_PUBLIC_` 접두사는 `KAKAO_MAP_KEY`에만 사용 (클라이언트 노출 필요)
- 사내망(프록시 환경)에서만 `NODE_TLS_REJECT_UNAUTHORIZED=0` 추가

### 2. 빌드 & 실행

```bash
# 의존성 설치
npm install

# 초기 데이터 수집 (최초 1회, 약 15~20분)
NODE_TLS_REJECT_UNAUTHORIZED=0 npx tsx scripts/collect-all.ts

# 프로덕션 빌드
npm run build

# 실행 (standalone 모드)
cd .next/standalone
cp -r ../../.next/static .next/static
cp -r ../../public public
cp ../../real-estate.db .         # DB 파일 복사
node server.js                    # 기본 포트 3000
```

### 3. 프로세스 관리 (PM2)

```bash
npm install -g pm2

# 앱 시작
pm2 start .next/standalone/server.js --name real-estate

# 자동 재시작 설정
pm2 startup
pm2 save

# 로그 확인
pm2 logs real-estate
```

### 4. 데이터 갱신 (Cron)

수집 모듈을 주기적으로 실행하여 최신 데이터를 유지:

```bash
# crontab -e
# 매일 새벽 3시에 최근 1개월 증분 수집
0 3 * * * cd /path/to/app && NODE_TLS_REJECT_UNAUTHORIZED=0 npx tsx scripts/collect-incremental.ts >> /var/log/collect.log 2>&1
```

또는 앱 내부 스케줄러 사용:
- `POST /api/collector` — 수동 수집 트리거
- `GET /api/collector/status` — 수집 진행 상황 조회
- `GET /api/collector/stats` — DB 통계 (거래 수, 단지 수, 기간)

---

## 환경변수 체크리스트

| 변수 | 필수 | 용도 | 발급처 |
|------|:----:|------|--------|
| `DATA_GO_KR_API_KEY` | ✅ | 실거래가·단지정보 수집 | [data.go.kr](https://www.data.go.kr) |
| `KAKAO_REST_API_KEY` | ✅ | 장소 검색 (서버) | [Kakao Developers](https://developers.kakao.com) |
| `NEXT_PUBLIC_KAKAO_MAP_KEY` | ✅ | 카카오맵 표시 (클라이언트) | 동일 |
| `ODSAY_API_KEY` | ✅ | 출퇴근 대중교통 분석 | [ODsay](https://lab.odsay.com) |
| `SQLITE_DB_PATH` | ❌ | DB 파일 경로 | 기본: `./real-estate.db` |
| `NEXTAUTH_SECRET` | ✅ | NextAuth JWT 암호화 시크릿 | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | ✅ | NextAuth 콜백 URL (프로덕션 도메인) | 배포 도메인 |
| `KAKAO_CLIENT_ID` | ✅ | 카카오 OAuth 클라이언트 ID | [Kakao Developers](https://developers.kakao.com) |
| `KAKAO_CLIENT_SECRET` | ✅ | 카카오 OAuth 클라이언트 시크릿 | 동일 |
| `SEOUL_OPEN_DATA_KEY` | ❌ | 재개발/재건축 실데이터 | [서울열린데이터](https://data.seoul.go.kr) |
| `NODE_TLS_REJECT_UNAUTHORIZED` | ❌ | 사내망 SSL 우회 | 사내망 전용 |

### API 활용 신청 필요 목록 (data.go.kr)

| API | 서비스ID | 용도 |
|-----|---------|------|
| 아파트매매 실거래 상세 자료 | `15126469` | 실거래가 수집 |
| 공동주택 단지 목록 제공 서비스 | `15057332` | 단지 목록 (V3) |
| 공동주택 기본 정보 제공 서비스 | `15058453` | 단지 기본·상세정보 (V4) |

---

## 배포 전 점검 항목

- [ ] `.env.local` 환경변수 전체 설정 완료
- [ ] `npm run build` 에러 없이 완료
- [ ] `real-estate.db` 파일 존재 (초기 수집 완료)
- [ ] DB에 trades 레코드 존재: `GET /api/collector/stats`
- [ ] 카카오맵 도메인 등록 (Kakao Developers 콘솔 → 플랫폼 → Web → 사이트 도메인)
- [ ] ODsay API 도메인 등록 (ODsay 콘솔 → 서비스 관리)
- [ ] data.go.kr API 활용 신청 3건 완료 (위 표 참조)
- [ ] 카카오 OAuth 설정 완료 (Kakao Developers 콘솔, 아래 참조)
- [ ] `NEXTAUTH_SECRET` 생성 및 설정
- [ ] 방화벽: 포트 3000 (또는 리버스 프록시 80/443) 오픈

---

## 카카오 OAuth 설정 가이드 (v2.2 신규)

### 1. Kakao Developers 콘솔 설정

1. [Kakao Developers](https://developers.kakao.com) 로그인
2. **내 애플리케이션** → **애플리케이션 추가하기**
3. 앱 생성 후 **앱 키** 확인:
   - `REST API 키` → `.env.local`의 `KAKAO_CLIENT_ID`
4. **제품 설정** → **카카오 로그인** → **활성화** ON
5. **Redirect URI** 등록:
   - 개발: `http://localhost:3000/api/auth/callback/kakao`
   - 프로덕션: `https://your-domain.com/api/auth/callback/kakao`
6. **보안** → **Client Secret** 생성 → `.env.local`의 `KAKAO_CLIENT_SECRET`
7. **동의항목** 설정 (닉네임/프로필 이미지 표시에 필요):
   - **프로필 정보(닉네임/프로필 사진)** → 필수 동의
   - **카카오계정(이메일)** → 선택 동의 (선택 사항)

### 2. 환경변수 생성

```bash
# NEXTAUTH_SECRET 생성 (랜덤 문자열)
openssl rand -base64 32
```
