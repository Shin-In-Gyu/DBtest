# 🔍 강림이 프로젝트 - 배포 전체 점검 체크리스트

## ✅ Frontend 설정 점검

### 1. 환경 변수 설정 ✅
- [x] `frontend/.env` 파일 생성됨
- [x] `EXPO_PUBLIC_API_BASE_URL=http://16.184.63.211` 설정됨 (80 포트)
- [x] `.gitignore`에 `.env` 포함되어 있어 Git에 올라가지 않음

### 2. HTTP 통신 허용 설정 ✅
- [x] **Android**: `app.json`에 `usesCleartextTraffic: true` 추가됨
- [x] **iOS**: `app.json`에 `NSAppTransportSecurity` 설정 추가됨
- [x] `app.json`에서 하드코딩된 `apiBaseUrl` 제거 (app.config.js에서만 관리)

### 3. 빌드 설정 확인
```bash
# 개발 빌드 테스트
cd frontend
npx expo prebuild --clean
npx expo run:android  # 또는 run:ios

# 프로덕션 빌드 (EAS Build)
eas build --platform android --profile production
```

### 4. 의존성 확인
- [x] `expo-constants` 패키지 설치됨 (v18.0.12)
- [x] `dotenv` 패키지 필요 (package.json에 없으면 추가 필요)

## ✅ Backend 설정 점검

### 1. 환경 변수 ✅
- [x] `backend/.env` 파일 존재
- [x] `DB_URL` 설정됨 (SQLite)
- [x] `GEMINI_API_KEY` 설정됨
- [x] `ADMIN_API_KEY` 설정됨
- [x] `ALLOWED_ORIGINS=` (빈 값 - 모든 origin 허용)
- [x] `ENABLE_TEST_ENDPOINTS=false` (프로덕션)

### 2. Docker 설정 ✅
- [x] `Dockerfile` 존재 및 올바른 설정
- [x] `docker-compose.prod.yml` 생성됨
- [x] 포트 8000 노출 설정됨 (내부), 80 포트로 리버스 프록시됨 (외부)

### 3. CORS 설정 ✅
- [x] `ALLOWED_ORIGINS` 빈 값으로 설정 (모든 origin 허용)
- [x] FastAPI CORS 미들웨어 올바르게 구성됨

### 4. GitHub Actions CI/CD ✅
- [x] `.github/workflows/main.yml` 존재
- [x] Docker Hub 자동 푸시 설정됨
- [x] AWS EC2 자동 배포 설정됨

## ✅ AWS EC2 서버 점검

### 1. 필수 확인 사항 ✅
```bash
# SSH 접속
ssh -i your-key.pem ubuntu@16.184.63.211

# 1. Docker 실행 여부 확인
docker ps

# 2. 컨테이너 로그 확인
docker logs kangrimi-backend

# 3. 헬스체크 (서버 내부)
curl http://localhost:8000/api/health

# 4. 외부에서 접근 테스트 (80 포트로 리버스 프록시됨)
curl http://16.184.63.211/api/health
```

### 2. AWS Security Group 설정 ✅
- [x] **확인 완료**: 80 포트가 인바운드 규칙에 개방됨
  - Type: HTTP
  - Port Range: 80
  - Source: 0.0.0.0/0 (또는 필요한 IP만)
- [x] Nginx 또는 리버스 프록시로 8000 → 80 포트 매핑됨

### 3. 서버 디렉토리 구조
```
/srv/kangrimi-backend/
├── docker-compose.yml
├── .env
├── data/
│   └── knoti.db (SQLite 사용 시)
└── serviceAccountKey.json (Firebase 사용 시)
```

### 4. 환경 변수 파일 (서버의 `/srv/kangrimi-backend/.env`)
```bash
DB_URL=sqlite+aiosqlite:///./data/knoti.db
GEMINI_API_KEY=your_key_here
ADMIN_API_KEY=your_key_here
SSL_VERIFY=true
ALLOWED_ORIGINS=
ENABLE_TEST_ENDPOINTS=false
ENVIRONMENT=production
```

## 🔧 주요 문제 원인 분석

### ❌ Expo Go에서는 되는데 빌드하면 안되는 이유

1. **환경 변수 타이밍 차이**
   - Expo Go: 런타임에 환경 변수 읽음 (개발 서버가 제공)
   - 빌드: 컴파일 타임에 환경 변수가 번들에 포함되어야 함

2. **HTTP 통신 제한**
   - Expo Go: 개발 모드라 HTTP 허용
   - 프로덕션 빌드: 보안상 HTTP 기본 차단

3. **`.env` 파일 누락**
   - `.gitignore`에 포함되어 있어서 팀원 간 공유 안됨
   - 각자 로컬에 `.env` 파일 생성 필요

## 🚀 배포 테스트 시나리오

### 1. 로컬에서 Backend 테스트
```bash
cd backend
docker build -t kangrimi-test .
docker run -p 8000:8000 --env-file .env kangrimi-test
curl http://localhost:8000/api/health
```

### 2. Frontend 빌드 테스트
```bash
cd frontend

# .env 파일 확인
cat .env
# 출력: EXPO_PUBLIC_API_BASE_URL=http://16.184.63.211:8000

# 개발 빌드
npx expo prebuild --clean
npx expo run:android

# 프로덕션 빌드
eas build --platform android --profile production
```

### 3. 통합 테스트
1. Backend가 AWS에서 실행 중인지 확인
2. Frontend APK 설치 후 실행
3. 공지사항 목록이 정상적으로 로드되는지 확인
4. 네트워크 탭에서 API 호출 확인

## ⚠️ 현재 남은 작업

### 필수 확인 사항
1. ✅ **AWS Security Group**: 80 포트 개방됨
2. ✅ **서버 실행 상태**: Docker 컨테이너 정상 실행 중
3. ✅ **외부 접근 테스트**: `curl http://16.184.63.211/api/health` 성공
4. ✅ **API 엔드포인트**: 공지사항 목록, 카테고리 등 정상 작동

### 개선 권장 사항
1. **HTTPS 설정**: 도메인 + Let's Encrypt 또는 AWS ALB + ACM
2. **환경 변수 관리**: AWS Secrets Manager 또는 Parameter Store 사용
3. **로그 모니터링**: CloudWatch 또는 ELK 스택 구축
4. **데이터베이스**: SQLite → PostgreSQL (Supabase 또는 RDS)

## 📝 팀원 온보딩 가이드

새로운 팀원이 프로젝트를 시작할 때:

### Backend
```bash
cd backend
cp .env.example .env
# .env 파일 수정 (DB_URL, GEMINI_API_KEY 등)
docker-compose up -d
```

### Frontend
```bash
cd frontend
cp .env.example .env
# .env 파일 수정 (EXPO_PUBLIC_API_BASE_URL)
npm install
npx expo start
```

## 🐛 디버깅 팁

### Frontend에서 "Network Error" 발생 시
1. `.env` 파일이 있는지 확인
2. URL이 `http://16.184.63.211` (포트 번호 없이)인지 확인
3. `app.json`에 HTTP 허용 설정이 있는지 확인
4. 서버가 실제로 응답하는지 확인: `curl http://16.184.63.211/api/health`

### Backend에서 CORS 에러 발생 시
1. `.env`에서 `ALLOWED_ORIGINS=` (빈 값) 확인
2. Docker 컨테이너 재시작: `docker-compose restart app`

### 빌드 시 환경 변수를 못 찾는 경우
1. `expo prebuild --clean` 실행하여 네이티브 프로젝트 재생성
2. `.env` 파일이 `frontend/` 루트에 있는지 확인
3. `app.config.js`가 올바르게 dotenv를 로드하는지 확인
