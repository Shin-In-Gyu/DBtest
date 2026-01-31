### 동계방학 프로젝트 원투쓰리

강남대학교 공지어플 개발

## 환경 설정

### 백엔드 연결 설정

프로젝트 루트에 `.env` 파일을 생성하고 다음을 추가하세요:

```env
EXPO_PUBLIC_API_BASE_URL=http://localhost:8000
```

**설정 예시:**
- 로컬 개발: `http://localhost:8000`
- 실제 기기 테스트: `http://192.168.0.100:8000` (PC의 로컬 IP 주소)
- 프로덕션: `https://api.example.com`

**기본 동작:**
- `.env` 파일이 없거나 `EXPO_PUBLIC_API_BASE_URL`이 설정되지 않은 경우:
  - Android 에뮬레이터: `http://10.0.2.2:8000`
  - 실제 기기/iOS: `http://localhost:8000`

**참고:** `EXPO_PUBLIC_` prefix는 Expo의 표준 방식입니다. 이 prefix가 있어야 클라이언트 코드에서 환경 변수에 접근할 수 있습니다.
