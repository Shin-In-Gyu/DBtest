# 🌍 환경 변수 관리 구조 설정 완료

## ✅ 변경된 파일 목록

### Frontend
1. ✅ `frontend/app.json` - `extra.apiBaseUrl` 필드 추가
2. ✅ `frontend/app.config.js` - 자동 감지 지원 (null 반환)
3. ✅ `frontend/api/base-uri.ts` - 플랫폼별 자동 감지 로직 추가
4. ✅ `frontend/.env.example` - 상세 설명 및 예시 추가
5. ✅ `frontend/package.json` - 환경별 스크립트 추가
6. ✅ `frontend/ENV_SETUP_GUIDE.md` - 완전한 설정 가이드 (신규)
7. ✅ `frontend/package.json` - cross-env 추가

### Backend
1. ✅ `backend/.env.example` - 상세 설명 및 환경별 예시 추가

---

## 🎯 주요 개선 사항

### 1. 자동 감지 기능 추가 ⭐

환경 변수가 설정되지 않으면 **자동으로 로컬 서버 감지**:

| 플랫폼 | 자동 감지 URL |
|--------|---------------|
| Android Emulator | `http://10.0.2.2:8000` |
| iOS Simulator | `http://localhost:8000` |
| Web | `http://localhost:8000` |

**코드 위치:** `frontend/api/base-uri.ts`

```typescript
const getDefaultApiUrl = (): string => {
  if (Platform.OS === "android") {
    return "http://10.0.2.2:8000";
  } else if (Platform.OS === "ios") {
    return "http://localhost:8000";
  } else {
    return "http://localhost:8000";
  }
};

const API_HOST = apiBaseUrl || getDefaultApiUrl();
```

### 2. 유연한 환경 변수 관리

**`app.config.js`에서 null 반환 지원:**

```javascript
const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || null;
```

- 환경 변수 있음 → 해당 URL 사용
- 환경 변수 없음 → null → 자동 감지 활성화

### 3. NPM 스크립트 추가

**`frontend/package.json`:**

```json
{
  "scripts": {
    "start": "expo start",
    "start:local": "cross-env EXPO_PUBLIC_API_BASE_URL=http://localhost:8000 expo start",
    "start:prod": "cross-env EXPO_PUBLIC_API_BASE_URL=http://16.184.63.211:8000 expo start"
  }
}
```

**사용:**
```bash
npm start         # 자동 감지
npm run start:local    # 로컬 서버 강제
npm run start:prod     # 프로덕션 서버
```

### 4. 상세한 .env.example

**환경별 예시 추가:**
- 자동 감지 (권장)
- 로컬 개발 서버
- 원격 개발 서버
- AWS 배포 서버
- 스테이징 서버
- 프로덕션 서버

### 5. 완전한 설정 가이드

**`frontend/ENV_SETUP_GUIDE.md` 생성:**
- 자동 감지 기능 설명
- 로컬 개발 환경 설정
- 원격 서버 연결 방법
- EAS Build 배포 가이드
- 문제 해결 (Troubleshooting)

---

## 📋 사용 방법

### 로컬 개발 (권장 - 자동 감지) ⭐

```bash
cd frontend

# .env 파일 없이 실행
npm start

# Android: http://10.0.2.2:8000 자동 사용
# iOS: http://localhost:8000 자동 사용
```

### 원격 서버 연결

**방법 1: .env 파일**
```bash
cd frontend
echo "EXPO_PUBLIC_API_BASE_URL=http://16.184.63.211:8000" > .env
npm start
```

**방법 2: NPM 스크립트**
```bash
npm run start:prod
```

**방법 3: 임시 환경 변수**
```bash
# Windows PowerShell
$env:EXPO_PUBLIC_API_BASE_URL="http://16.184.63.211:8000"
npm start

# Linux/Mac
EXPO_PUBLIC_API_BASE_URL=http://16.184.63.211:8000 npm start
```

### EAS Build 배포

```bash
# Secret 설정 (한 번만)
eas secret:create --scope project \
  --name EXPO_PUBLIC_API_BASE_URL \
  --value http://16.184.63.211:8000

# 빌드
eas build --profile production --platform android
```

---

## 🔄 기존 코드와의 호환성

### ✅ 완벽한 하위 호환성

기존에 `.env` 파일로 관리하던 방식도 그대로 작동합니다:

**기존 방식 (여전히 작동):**
```bash
# .env 파일
EXPO_PUBLIC_API_BASE_URL=http://16.184.63.211:8000
```

**새로운 방식 (자동 감지):**
```bash
# .env 파일 없음 또는 비워두기
# → 자동으로 플랫폼에 맞는 로컬 서버 사용
```

### 🔀 마이그레이션 가이드

**기존 팀원들에게:**

1. **변경 필요 없음** - 기존 `.env` 파일 그대로 사용 가능
2. **선택적 개선** - `.env` 파일 삭제하면 자동 감지 활성화
3. **새 기능 활용** - `npm run start:prod` 스크립트 사용 가능

**새 팀원들에게:**

1. `.env` 파일 생성하지 않고 바로 `npm start`
2. 자동으로 로컬 서버에 연결됨
3. 원격 서버 필요 시에만 환경 변수 설정

---

## 🎓 환경별 설정 예시

### 1. 로컬 개발

```bash
# 백엔드
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8000

# 프론트엔드 (자동 감지)
cd frontend
npm start
```

### 2. 원격 개발 서버 (AWS)

```bash
# 프론트엔드
cd frontend
echo "EXPO_PUBLIC_API_BASE_URL=http://16.184.63.211:8000" > .env
npm start
```

### 3. 물리 디바이스 테스트

```bash
# 컴퓨터 IP 확인 (예: 192.168.0.100)
ipconfig  # Windows
ifconfig  # Mac/Linux

# 백엔드 - 모든 네트워크 인터페이스에서 수신
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8000

# 프론트엔드
cd frontend
echo "EXPO_PUBLIC_API_BASE_URL=http://192.168.0.100:8000" > .env
npm start
```

### 4. 프로덕션 빌드

```bash
# EAS Secret 설정
eas secret:create --scope project \
  --name EXPO_PUBLIC_API_BASE_URL \
  --value https://api.yourserver.com

# 빌드
eas build --profile production --platform android
```

---

## 🐛 문제 해결

### 환경 변수가 반영되지 않음

```bash
# 캐시 삭제
npx expo start --clear

# 네이티브 프로젝트 재생성
npx expo prebuild --clean
```

### Android Emulator에서 localhost 연결 안됨

```bash
# 자동 감지 사용 (권장)
# .env 파일 삭제 또는 비우기
npm start

# 또는 수동 설정
echo "EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:8000" > .env
```

### 물리 디바이스에서 연결 안됨

1. 같은 WiFi 네트워크 확인
2. 방화벽 확인 (8000 포트 허용)
3. 백엔드를 `0.0.0.0:8000`에서 실행

---

## 📊 설정 비교표

| 상황 | 이전 방식 | 새로운 방식 |
|------|----------|-----------|
| 로컬 개발 | `.env` 파일 필수 | 자동 감지 (파일 불필요) |
| Android Emulator | 수동 설정 (`10.0.2.2`) | 자동 감지 |
| iOS Simulator | 수동 설정 (`localhost`) | 자동 감지 |
| 원격 서버 | `.env` 파일 수정 | `.env` 또는 스크립트 |
| 환경 전환 | `.env` 파일 수정 | `npm run start:*` |
| EAS Build | Secret 설정 | Secret 설정 (동일) |

---

## 🎉 장점 요약

### 개발자 경험 개선
- ✅ **Zero Config**: 로컬 개발 시 설정 불필요
- ✅ **자동 감지**: 플랫폼별 최적 URL 자동 선택
- ✅ **빠른 전환**: NPM 스크립트로 환경 변경
- ✅ **명확한 로깅**: 콘솔에 현재 API URL 출력

### 유지보수성 향상
- ✅ **중앙 관리**: `app.config.js`에서 로직 통합
- ✅ **문서화**: 상세한 가이드 제공
- ✅ **하위 호환성**: 기존 방식도 그대로 작동
- ✅ **타입 안전성**: TypeScript로 타입 체크

### 팀 협업 강화
- ✅ **온보딩 간소화**: 신규 팀원이 바로 시작 가능
- ✅ **실수 방지**: 자동 감지로 설정 오류 감소
- ✅ **환경별 분리**: 명확한 환경별 설정 방법
- ✅ **문서 제공**: 완전한 설정 가이드

---

## 📚 관련 문서

- **설정 가이드**: `frontend/ENV_SETUP_GUIDE.md`
- **Frontend 예시**: `frontend/.env.example`
- **Backend 예시**: `backend/.env.example`
- **Expo 공식 문서**: [Environment Variables](https://docs.expo.dev/guides/environment-variables/)

---

## 🚀 다음 단계

### 팀원들에게 공유할 내용

1. **기존 팀원**: "`.env` 파일 삭제하면 자동으로 로컬 서버 연결됩니다"
2. **새 팀원**: "`.env` 파일 없이 바로 `npm start` 하세요"
3. **배포 담당**: "`frontend/ENV_SETUP_GUIDE.md` 참고"

### 권장 사항

1. ✅ 로컬 개발은 자동 감지 사용
2. ✅ 원격 서버는 NPM 스크립트 사용
3. ✅ 프로덕션은 EAS Secret 사용
4. ✅ 문제 발생 시 가이드 문서 참고

---

**환경 변수 관리 구조 설정이 완료되었습니다! 🎉**

이제 팀원들이 더 쉽게 개발 환경을 설정하고, 환경별로 서버를 전환할 수 있습니다.
