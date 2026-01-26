# 🚨 긴급 해결: 배포 환경 vs Expo Go 차이점

## 문제 상황
> "AWS로 배포했고 도메인은 https://16.184.63.211이고 빌드하면 안되는데 expo go 환경에서는 된다"

## ✅ 해결 완료 사항

### 1. **Frontend `.env` 파일 생성** ✅
**문제**: `.env` 파일이 없어서 빌드 시 API URL을 찾지 못함

**해결**: `frontend/.env` 파일 생성
```bash
EXPO_PUBLIC_API_BASE_URL=http://16.184.63.211:8000
```

**참고**: 
- `.gitignore`에 `.env`가 포함되어 있어 Git에 올라가지 않음
- 팀원 각자 로컬에 생성 필요

### 2. **HTTP 통신 허용 설정** ✅
**문제**: React Native는 기본적으로 HTTP 통신 차단 (iOS ATS, Android Cleartext)

**해결**: `frontend/app.json` 수정
```json
{
  "android": {
    "usesCleartextTraffic": true
  },
  "ios": {
    "infoPlist": {
      "NSAppTransportSecurity": {
        "NSAllowsArbitraryLoads": true
      }
    }
  }
}
```

### 3. **Backend CORS 설정** ✅
**문제**: `ALLOWED_ORIGINS`가 특정 도메인으로 제한되어 있어 요청 차단

**해결**: `backend/.env` 수정
```bash
ALLOWED_ORIGINS=  # 빈 값 = 모든 origin 허용
```

### 4. **dotenv 패키지 추가** ✅
**문제**: `app.config.js`에서 `.env` 읽으려면 dotenv 필요

**해결**: `frontend/package.json`에 추가
```bash
npm install dotenv
```

### 5. **하드코딩된 URL 제거** ✅
**문제**: `app.json`에 하드코딩된 `apiBaseUrl` 있음

**해결**: `app.json`에서 제거, `app.config.js`에서만 관리

## 🔍 왜 Expo Go에서는 되는데 빌드에서는 안될까?

### Expo Go (개발 모드) ✅ 동작
1. **환경 변수 로딩**: Metro bundler가 런타임에 환경 변수 제공
2. **HTTP 허용**: 개발 모드라 HTTP 통신 허용
3. **동적 설정**: 코드 변경 시 실시간 반영

### 프로덕션 빌드 ❌ 동작 안함 (수정 전)
1. **환경 변수 필요**: 컴파일 타임에 `.env` 파일 필요
2. **HTTP 차단**: 보안상 HTTP 기본 차단 (설정 필요)
3. **정적 번들**: 빌드 시점의 설정만 포함

## 📋 다음 단계 (실행 필요)

### Frontend 빌드 테스트
```bash
cd frontend

# 1. 의존성 설치
npm install

# 2. 네이티브 프로젝트 재생성
npx expo prebuild --clean

# 3. 개발 빌드 실행
npm run android  # 또는 npm run ios

# 4. 프로덕션 빌드 (EAS)
eas build --platform android --profile production
```

### Backend 배포 확인
AWS EC2 서버에서 확인:
```bash
# 1. 헬스체크
curl http://localhost:8000/api/health
curl http://16.184.63.211:8000/api/health

# 2. Docker 상태
docker ps
docker logs kangrimi-backend

# 3. 환경 변수 확인
cat /srv/kangrimi-backend/.env
```

### AWS Security Group 확인 ⚠️
- AWS Console → EC2 → Security Groups
- 인바운드 규칙에 **8000 포트 개방** 필요
  - Type: Custom TCP
  - Port: 8000
  - Source: 0.0.0.0/0 (또는 필요한 IP)

## 🔧 주요 설정 파일 변경 사항

### 변경된 파일 목록
1. ✅ `frontend/.env` - 새로 생성
2. ✅ `frontend/app.json` - HTTP 허용 설정 추가
3. ✅ `frontend/package.json` - dotenv 추가
4. ✅ `backend/.env` - CORS 설정 수정
5. ✅ `backend/docker-compose.prod.yml` - 새로 생성

### 생성된 문서 파일
1. ✅ `backend/DEPLOYMENT_GUIDE.md` - 배포 가이드
2. ✅ `frontend/README.md` - 프론트엔드 사용법
3. ✅ `DEPLOYMENT_CHECKLIST.md` - 전체 점검 체크리스트

## ⚠️ 주의사항

### HTTP vs HTTPS
- **현재**: `http://16.184.63.211:8000` (HTTP)
- IP 주소는 기본적으로 SSL 인증서 없음
- HTTPS 원하면:
  1. 도메인 구매
  2. Let's Encrypt 인증서 발급
  3. Nginx 리버스 프록시 설정

### 보안 고려사항
- `ALLOWED_ORIGINS=` (빈 값)은 개발/테스트용
- 프로덕션에서는 특정 도메인만 허용 권장
- `usesCleartextTraffic` / `NSAllowsArbitraryLoads`는 보안 위험
  - 가능하면 HTTPS 사용 권장

### 팀 협업
- `.env` 파일은 Git에 올라가지 않음
- 새 팀원은 `.env.example`을 복사해서 `.env` 생성 필요
- 환경별 설정 차이 문서화 필요

## 📊 테스트 체크리스트

### Backend 테스트
- [ ] AWS EC2에서 Docker 컨테이너 실행 중
- [ ] `curl http://16.184.63.211:8000/api/health` 응답 확인
- [ ] Security Group 8000 포트 개방 확인
- [ ] 로그에 에러 없는지 확인

### Frontend 테스트
- [ ] `.env` 파일 존재 및 올바른 URL 설정
- [ ] `app.json`에 HTTP 허용 설정 있음
- [ ] `npm install` 후 의존성 설치 완료
- [ ] Expo Go에서 테스트
- [ ] 네이티브 빌드로 테스트
- [ ] 프로덕션 빌드로 테스트

### 통합 테스트
- [ ] 빌드한 APK에서 공지사항 목록 로드됨
- [ ] 네트워크 에러 없음
- [ ] API 호출 정상 동작

## 🎯 핵심 요약

| 항목 | 문제 | 해결 |
|------|------|------|
| 환경 변수 | `.env` 없음 | `frontend/.env` 생성 |
| HTTP 통신 | 빌드 시 차단 | `app.json`에 허용 설정 |
| CORS | Origin 제한 | `ALLOWED_ORIGINS=` 빈 값 |
| 의존성 | dotenv 없음 | `package.json`에 추가 |
| URL 관리 | 하드코딩 | `app.config.js`로 통합 |

**다음 작업**: Frontend 빌드 테스트 + AWS Security Group 8000 포트 개방 확인
