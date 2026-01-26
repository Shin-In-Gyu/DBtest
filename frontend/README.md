# 강림이 (Kangrimi) Frontend

경북대학교 공지사항 알림 앱 - React Native (Expo)

## 🚀 시작하기

### 1. 의존성 설치
```bash
cd frontend
npm install
```

### 2. 환경 변수 설정
`.env` 파일을 생성하고 백엔드 API URL을 설정하세요:

```bash
# .env 파일 생성
cat > .env << EOF
# 프로덕션 서버 (AWS)
EXPO_PUBLIC_API_BASE_URL=http://16.184.63.211:8000

# 로컬 개발 서버
# EXPO_PUBLIC_API_BASE_URL=http://localhost:8000
EOF
```

**중요**: `.env` 파일은 `.gitignore`에 포함되어 있어 Git에 올라가지 않습니다. 팀원마다 각자 생성해야 합니다.

### 3. 개발 서버 실행

#### Expo Go 사용 (권장 - 개발)
```bash
npm start
```
- QR 코드를 스캔하여 Expo Go 앱에서 실행

#### 네이티브 빌드로 실행 (개발)
```bash
# Android
npm run android

# iOS
npm run ios
```

## 📦 빌드 방법

### 개발 빌드 (로컬)
```bash
# 네이티브 프로젝트 생성
npx expo prebuild --clean

# Android APK
npm run build:android:apk

# Android AAB
npm run build:android:bundle
```

### 프로덕션 빌드 (EAS Build)
```bash
# EAS CLI 설치 (처음만)
npm install -g eas-cli

# 로그인
eas login

# Android 빌드
eas build --platform android --profile production

# iOS 빌드
eas build --platform ios --profile production
```

## ⚙️ 환경 설정 파일

### `app.config.js`
- `.env` 파일에서 환경 변수를 읽어서 앱 설정에 주입
- `EXPO_PUBLIC_API_BASE_URL`을 `expo-constants`로 접근 가능하게 함

### `app.json`
- Expo 앱 기본 설정
- HTTP 통신 허용 설정 포함:
  - Android: `usesCleartextTraffic: true`
  - iOS: `NSAppTransportSecurity.NSAllowsArbitraryLoads: true`

### `.env` (Git에 올라가지 않음)
- API 서버 URL 설정
- 로컬 개발 vs 프로덕션 환경 전환 가능

## 🔧 주요 기능

### 공지사항 조회
- 경북대 여러 카테고리의 공지사항 실시간 확인
- 북마크 기능
- 검색 기능

### 캠퍼스 맵
- 네이버 지도 기반 캠퍼스 지도

### 푸시 알림
- Firebase Cloud Messaging 기반
- 새 공지사항 알림

## 🐛 트러블슈팅

### Expo Go에서는 되는데 빌드하면 안될 때

**문제**: 빌드한 APK/IPA에서 "Network Error" 발생

**원인**:
1. `.env` 파일이 없어서 API URL을 찾지 못함
2. HTTP 통신이 차단됨 (Android/iOS 보안 정책)

**해결**:
```bash
# 1. .env 파일 확인
cat .env
# EXPO_PUBLIC_API_BASE_URL=http://16.184.63.211:8000 가 있어야 함

# 2. app.json에 HTTP 허용 설정 확인
# Android: "usesCleartextTraffic": true
# iOS: "NSAppTransportSecurity": { "NSAllowsArbitraryLoads": true }

# 3. 네이티브 프로젝트 재생성
npx expo prebuild --clean

# 4. 다시 빌드
npm run android
```

### API 호출 실패 시

```bash
# 1. Backend 서버 상태 확인
curl http://16.184.63.211:8000/api/health

# 2. .env 파일 URL 확인
cat .env

# 3. 앱 재시작 후 로그 확인
npx expo start --clear
```

### 환경 변수가 undefined일 때

```bash
# 1. dotenv 패키지 설치 확인
npm install dotenv

# 2. .env 파일이 frontend/ 루트에 있는지 확인
ls -la .env

# 3. app.config.js가 올바르게 설정되었는지 확인
cat app.config.js
```

## 📂 프로젝트 구조

```
frontend/
├── app/                    # Expo Router 페이지
│   ├── (tabs)/            # 탭 네비게이션 화면
│   ├── _layout.tsx        # 루트 레이아웃
│   └── providers/         # Context Providers
├── components/            # 재사용 컴포넌트
├── constants/             # 상수, 색상, 설정
├── api/                   # API 클라이언트
├── assets/                # 이미지, 아이콘
├── app.config.js          # Expo 설정 (환경 변수)
├── app.json               # Expo 메타데이터
├── .env                   # 환경 변수 (Git 제외)
├── .env.example           # 환경 변수 템플릿
└── package.json           # 의존성 관리
```

## 🔗 관련 문서

- [Expo 공식 문서](https://docs.expo.dev/)
- [React Native 공식 문서](https://reactnative.dev/)
- [Expo Router](https://docs.expo.dev/router/introduction/)
- [EAS Build](https://docs.expo.dev/build/introduction/)

## 📱 지원 플랫폼

- **Android**: API 21+ (Android 5.0+)
- **iOS**: iOS 13.4+
- **Web**: (개발 중)
