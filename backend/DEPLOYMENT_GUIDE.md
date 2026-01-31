# 강림이 (Kangrimi) Backend - 배포 가이드

## 📋 개요
경북대학교 공지사항 알림 서비스 백엔드 API 서버

## 🚀 AWS EC2 배포 현황

### 서버 정보
- **IP 주소**: `16.184.63.211`
- **포트**: `80` (기본 HTTP 포트)
- **프로토콜**: HTTP (HTTPS 미설정)
- **API Base URL**: `http://16.184.63.211`

### 배포 방식
- Docker 컨테이너 기반
- GitHub Actions CI/CD 자동 배포
- Docker Hub를 통한 이미지 관리

## 🔧 AWS EC2 서버 설정

### 1. 환경 변수 설정 (`/srv/kangrimi-backend/.env`)
```bash
# 데이터베이스
DB_URL=sqlite+aiosqlite:///./data/knoti.db  # 또는 PostgreSQL URL

# AI 서비스
GEMINI_API_KEY=your_gemini_api_key_here

# 보안
ADMIN_API_KEY=your_secure_admin_key_here
SSL_VERIFY=true

# CORS (모든 origin 허용)
ALLOWED_ORIGINS=

# 환경
ENVIRONMENT=production
ENABLE_TEST_ENDPOINTS=false
```

### 2. Docker Compose 파일
서버의 `/srv/kangrimi-backend/docker-compose.yml` 위치에 배치

### 3. 포트 설정
- AWS Security Group에서 **80 포트 개방** 필요
- 인바운드 규칙: `0.0.0.0/0` (모든 IP) 또는 특정 IP만 허용
- 참고: 서버 내부에서는 8000 포트로 실행되지만, 외부에는 80 포트로 리버스 프록시됨 (Nginx 등)

## 📱 Frontend 연동 설정

### frontend/.env 파일
```bash
# HTTP 프로토콜 사용 (HTTPS 아님)
EXPO_PUBLIC_API_BASE_URL=http://16.184.63.211:8000
```

### app.json 설정
HTTP 통신 허용 설정이 필요합니다:

```json
{
  "expo": {
    "android": {
      "usesCleartextTraffic": true  // Android HTTP 허용
    },
    "ios": {
      "infoPlist": {
        "NSAppTransportSecurity": {
          "NSAllowsArbitraryLoads": true  // iOS HTTP 허용
        }
      }
    }
  }
}
```

## 🔄 배포 프로세스

### 자동 배포 (GitHub Actions)
1. `main` 브랜치에 코드 푸시
2. GitHub Actions가 자동으로:
   - Docker 이미지 빌드
   - Docker Hub에 푸시
   - AWS EC2 서버에 SSH 접속
   - 최신 이미지 pull 및 컨테이너 재시작

### 수동 배포
SSH로 서버 접속 후:

```bash
cd /srv/kangrimi-backend

# 최신 이미지 받기
docker compose pull app

# 컨테이너 재시작
docker compose up -d app

# 로그 확인
docker compose logs -f app
```

## 🔍 서버 상태 확인

### 헬스체크
```bash
curl http://16.184.63.211/api/health
```

### 로그 확인
```bash
docker compose logs -f app
```

### 컨테이너 상태
```bash
docker compose ps
```

## ⚠️ 주의사항

### HTTP vs HTTPS
- 현재는 **HTTP만 지원** (인증서 미설정)
- HTTPS 설정을 원하면:
  1. 도메인 구매 필요
  2. Nginx + Let's Encrypt 설정
  3. 또는 AWS ALB + ACM 사용

### CORS 설정
- 현재 `ALLOWED_ORIGINS=` (빈 값) → 모든 origin 허용
- 프로덕션에서는 보안상 특정 도메인만 허용 권장

### 데이터 백업
- SQLite 사용 시: `/srv/kangrimi-backend/data/knoti.db` 정기 백업
- PostgreSQL 사용 시: DB 자체 백업 정책 수립

## 🐛 트러블슈팅

### 문제: Expo Go에서는 되는데 빌드하면 안됨
**원인**: 
- `.env` 파일 누락
- Expo Go는 런타임에 환경 변수 읽음
- 빌드는 컴파일 타임에 환경 변수 필요

**해결**:
```bash
cd frontend
echo "EXPO_PUBLIC_API_BASE_URL=http://16.184.63.211" > .env
```

### 문제: Network Error 또는 연결 실패
**확인사항**:
1. AWS Security Group에서 80 포트 개방 확인
2. 백엔드 컨테이너 실행 중인지 확인: `docker ps`
3. 헬스체크 테스트: `curl http://16.184.63.211/api/health`
4. `app.json`에 HTTP 허용 설정 확인

### 문제: CORS 에러
**해결**:
- Backend `.env`에서 `ALLOWED_ORIGINS=` (빈 값으로 설정)
- 또는 Frontend 도메인 명시: `ALLOWED_ORIGINS=http://your-app-domain.com`

## 📚 관련 문서
- [FastAPI 공식 문서](https://fastapi.tiangolo.com/)
- [Docker Compose 문서](https://docs.docker.com/compose/)
- [Expo 환경 변수 가이드](https://docs.expo.dev/guides/environment-variables/)
