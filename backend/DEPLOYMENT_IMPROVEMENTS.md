# 백엔드 배포 전 개선 사항 보고서

**날짜**: 2026-01-24  
**버전**: v2.6 → v2.7  
**작업자**: AI Assistant  

---

## 📋 개선 사항 요약

배포 2일 전 보안, 안정성, 운영 편의성을 위해 백엔드를 전체적으로 개선했습니다.

### ✅ 완료된 개선 사항

1. ✅ **환경 변수 검증 시스템 추가**
2. ✅ **관리자 엔드포인트 보안 강화**
3. ✅ **에러 핸들링 개선**
4. ✅ **SSL 검증 제어 개선**
5. ✅ **입력 검증 강화**
6. ✅ **테스트 엔드포인트 보호**
7. ✅ **환경 설정 문서화**

---

## 🔐 1. 환경 변수 검증 시스템 추가

### 변경 내용
- **새 파일**: `backend/app/core/env_validator.py`
- 서버 시작 전 필수 환경 변수를 자동으로 검증
- 누락된 변수 발견 시 명확한 에러 메시지와 함께 서버 시작 차단

### 검증 항목
- ✅ `DB_URL`: 데이터베이스 연결 URL (필수)
- ⚠️ `GEMINI_API_KEY`: AI 요약 기능 (선택, 없으면 경고)
- ⚠️ `FIREBASE_KEY_PATH`: 푸시 알림 기능 (선택, 없으면 경고)
- ⚠️ `ADMIN_API_KEY`: 관리자 인증 (없으면 보안 경고)
- ⚠️ `ALLOWED_ORIGINS`: CORS 설정 (없으면 모든 origin 허용)

### 개선 효과
- ❌ **Before**: 환경 변수 누락 시 런타임 에러로 서버 다운
- ✅ **After**: 시작 전 검증으로 조기 발견 및 명확한 해결 방법 제시

### 사용 예시
```bash
# 환경 변수 누락 시
============================================================
🔍 환경 변수 검증 결과
============================================================

❌ 오류 (서버 시작 불가):
  ❌ DB_URL: 데이터베이스 URL이 설정되지 않았습니다.

⚠️  경고:
  ⚠️  ADMIN_API_KEY: 관리자 엔드포인트가 보호되지 않습니다. 보안 위험!

💡 해결 방법:
  1. .env.example 파일을 .env로 복사하세요
  2. .env 파일에서 필수 값들을 설정하세요
  3. 서버를 다시 시작하세요
```

---

## 🔒 2. 관리자 엔드포인트 보안 강화

### 변경 내용
- **새 파일**: `backend/app/middleware/auth.py`
- API 키 기반 인증 미들웨어 추가
- 관리자 전용 엔드포인트에 인증 적용

### 보호된 엔드포인트
1. **`POST /api/knu/admin/crawl`**: 수동 크롤링 실행
2. **`GET /api/knu/stats`**: 시스템 통계 조회
3. **`POST /api/test/trigger-notification`**: 테스트 알림 발송

### 사용 방법

**1단계: 관리자 API 키 설정**
```bash
# .env 파일에 추가
ADMIN_API_KEY=your-secure-random-key-here
```

**2단계: API 호출 시 헤더 포함**
```bash
# curl 예시
curl -X POST "http://localhost:8000/api/knu/admin/crawl" \
  -H "X-API-Key: your-secure-random-key-here"

# JavaScript fetch 예시
fetch('http://localhost:8000/api/knu/admin/crawl', {
  method: 'POST',
  headers: {
    'X-API-Key': 'your-secure-random-key-here'
  }
})
```

### 보안 키 생성 방법
```bash
# OpenSSL 사용 (권장)
openssl rand -hex 32

# Python 사용
python -c "import secrets; print(secrets.token_hex(32))"
```

### 개선 효과
- ❌ **Before**: 누구나 관리자 기능 접근 가능 (크롤링 강제 실행, 통계 조회 등)
- ✅ **After**: API 키 인증 필요, 무단 접근 차단

---

## 🛡️ 3. 에러 핸들링 개선

### 변경 내용
**Before (`main.py:72-73`)**:
```python
try:
    get_client()
except: 
    pass  # 에러 무시!
```

**After**:
```python
try:
    get_client()
    logger.info("✅ HTTP Client 초기화 완료")
except Exception as e:
    logger.error(f"❌ HTTP Client 초기화 실패: {e}")
    raise  # 에러를 상위로 전파하여 명확한 실패 표시
```

### 개선 효과
- ❌ **Before**: 에러가 숨겨져서 디버깅 어려움
- ✅ **After**: 명확한 로그와 함께 에러 전파, 문제 조기 발견

---

## 🔐 4. SSL 검증 제어 개선

### 변경 내용
- 하드코딩된 `verify=False`를 환경 변수로 제어 가능하게 변경
- **수정 파일**: 
  - `backend/app/core/http.py`
  - `backend/app/services/scraper.py`

### 사용 방법
```bash
# .env 파일
SSL_VERIFY=true   # 프로덕션: SSL 검증 활성화 (권장)
SSL_VERIFY=false  # 개발: 일부 대학 사이트 인증서 문제 시 비활성화
```

### 동작 방식
```python
# 환경 변수에 따라 SSL 검증 on/off
ssl_verify = os.getenv("SSL_VERIFY", "False").lower() == "true"

async with httpx.AsyncClient(verify=ssl_verify, timeout=15.0) as client:
    # ...
```

### 개선 효과
- ❌ **Before**: 항상 SSL 검증 비활성화 (보안 위험)
- ✅ **After**: 환경별로 제어 가능, 프로덕션에서 보안 강화

---

## ✅ 5. 입력 검증 강화 (Pydantic)

### 변경 내용
- **수정 파일**: `backend/app/schemas.py`
- 모든 요청 스키마에 유효성 검사 추가

### 추가된 검증 규칙

#### DeviceRegisterRequest
```python
token: str = Field(..., min_length=10, max_length=500)

@field_validator('token')
def validate_token(cls, v: str) -> str:
    v = v.strip()  # 공백 제거
    if not v:
        raise ValueError("토큰은 비어있을 수 없습니다")
    return v
```

#### KeywordSubscriptionRequest
```python
categories: List[str] = Field(..., max_items=50)

@field_validator('categories')
def validate_categories(cls, v: List[str]) -> List[str]:
    # 중복 제거
    cleaned = list(set(cat.strip() for cat in v if cat.strip()))
    
    # 길이 제한 (각 카테고리 50자 이하)
    for cat in cleaned:
        if len(cat) > 50:
            raise ValueError(f"카테고리 이름이 너무 깁니다")
    
    return cleaned
```

#### NoticeBase
```python
title: str = Field(..., min_length=1, max_length=500)
link: str = Field(..., min_length=1, max_length=1000)
category: str = Field(..., min_length=1, max_length=50)
univ_views: int = Field(default=0, ge=0)  # 0 이상만 허용
```

### 개선 효과
- ❌ **Before**: 잘못된 데이터 입력 시 DB 에러 또는 예상치 못한 동작
- ✅ **After**: 요청 단계에서 검증, 명확한 에러 메시지 반환

### 에러 응답 예시
```json
{
  "detail": [
    {
      "type": "string_too_short",
      "loc": ["body", "token"],
      "msg": "String should have at least 10 characters",
      "input": "abc"
    }
  ]
}
```

---

## 🧪 6. 테스트 엔드포인트 보호

### 변경 내용
- **수정 파일**: `backend/app/routers/test_router.py`
- 테스트 엔드포인트 접근을 환경 변수로 제어
- 관리자 API 키 인증 추가

### 사용 방법

**개발 환경에서 테스트 활성화**:
```bash
# .env 파일
ENABLE_TEST_ENDPOINTS=true
ADMIN_API_KEY=your-admin-key
```

**프로덕션 환경**:
```bash
# .env 파일
ENABLE_TEST_ENDPOINTS=false  # 또는 설정하지 않음
```

### 개선 효과
- ❌ **Before**: 프로덕션에서도 테스트 엔드포인트 노출
- ✅ **After**: 환경 변수로 제어, 프로덕션에서 자동 비활성화

---

## 📄 7. 환경 설정 문서화

### 변경 내용
- **수정 파일**: `backend/.env.example`
- 모든 환경 변수에 대한 상세한 설명 추가
- 각 변수의 필수/선택 여부, 사용 용도, 예시 포함

### 주요 추가 항목
```bash
# 관리자 API 키 (보안)
ADMIN_API_KEY=your-secure-admin-api-key-here

# CORS 설정 (프로덕션 필수)
ALLOWED_ORIGINS=https://your-app.com,https://admin.your-app.com

# 테스트 엔드포인트 제어
ENABLE_TEST_ENDPOINTS=false

# 환경 구분
ENVIRONMENT=production
```

---

## 📊 변경 파일 목록

### 새로 추가된 파일
1. `backend/app/core/env_validator.py` - 환경 변수 검증
2. `backend/app/middleware/auth.py` - 관리자 인증
3. `backend/DEPLOYMENT_IMPROVEMENTS.md` - 이 문서

### 수정된 파일
1. `backend/app/main.py` - 환경 변수 검증 추가, 에러 핸들링 개선
2. `backend/app/routers/knu.py` - 관리자 엔드포인트 인증 추가
3. `backend/app/routers/test_router.py` - 테스트 엔드포인트 보호
4. `backend/app/core/http.py` - SSL 검증 환경 변수 제어
5. `backend/app/services/scraper.py` - SSL 검증 환경 변수 제어
6. `backend/app/schemas.py` - 입력 검증 강화
7. `backend/.env.example` - 환경 변수 문서화

---

## 🚀 배포 전 체크리스트

### 1. 환경 변수 설정

```bash
# 1. .env 파일 생성
cp .env.example .env

# 2. 필수 값 설정
DB_URL=postgresql+asyncpg://user:password@localhost:5432/knoti_db  # PostgreSQL 권장
ADMIN_API_KEY=$(openssl rand -hex 32)  # 보안 키 생성
ALLOWED_ORIGINS=https://your-production-domain.com
SSL_VERIFY=true
ENABLE_TEST_ENDPOINTS=false

# 3. 선택 값 설정 (기능 사용 시)
GEMINI_API_KEY=your-gemini-api-key
FIREBASE_KEY_PATH=/path/to/serviceAccountKey.json
```

### 2. 관리자 API 키 저장

```bash
# 생성된 키를 안전한 곳에 보관
echo "ADMIN_API_KEY=$(openssl rand -hex 32)" >> .env

# 팀원들과 안전한 방법으로 공유 (Slack 비밀 메시지, 1Password 등)
```

### 3. 데이터베이스 마이그레이션

```bash
# SQLite에서 PostgreSQL로 전환 (프로덕션 권장)
# 기존 데이터가 있다면 백업 필수!

# 백업
cp knoti.db knoti.db.backup

# 새 DB로 마이그레이션 (별도 스크립트 필요)
```

### 4. 서버 시작 테스트

```bash
# 환경 변수 검증 확인
python -m app.main

# 정상 출력 예시:
# ============================================================
# 🔍 환경 변수 검증 결과
# ============================================================
# ✅ 모든 환경 변수가 올바르게 설정되었습니다.
# ============================================================
# ⚡ API Server Started! (Kangrimi Backend)
```

### 5. 관리자 API 테스트

```bash
# 통계 조회 (인증 필요)
curl -X GET "http://localhost:8000/api/knu/stats" \
  -H "X-API-Key: your-admin-api-key"

# 수동 크롤링 (인증 필요)
curl -X POST "http://localhost:8000/api/knu/admin/crawl" \
  -H "X-API-Key: your-admin-api-key"
```

---

## 🔧 운영 가이드

### 관리자 기능 사용법

#### 1. 수동 크롤링 실행
```bash
# 전체 카테고리 크롤링
curl -X POST "https://your-api.com/api/knu/admin/crawl" \
  -H "X-API-Key: your-admin-key"

# 특정 카테고리만 크롤링
curl -X POST "https://your-api.com/api/knu/admin/crawl?category=academic" \
  -H "X-API-Key: your-admin-key"
```

#### 2. 시스템 통계 조회
```bash
curl -X GET "https://your-api.com/api/knu/stats" \
  -H "X-API-Key: your-admin-key"
```

#### 3. 테스트 알림 발송 (개발 환경)
```bash
# ENABLE_TEST_ENDPOINTS=true 필요
curl -X POST "https://your-api.com/api/test/trigger-notification" \
  -H "X-API-Key: your-admin-key" \
  -H "Content-Type: application/json" \
  -d '{
    "category": "scholar",
    "title": "테스트 알림"
  }'
```

### 문제 해결

#### 환경 변수 검증 실패
```
문제: 서버 시작 시 환경 변수 검증 에러
해결: .env 파일을 확인하고 누락된 필수 변수 추가
```

#### 관리자 API 인증 실패
```
문제: 403 Forbidden - 유효하지 않은 API 키
해결: 
  1. .env 파일의 ADMIN_API_KEY 확인
  2. 요청 헤더에 X-API-Key 포함 여부 확인
  3. 키 값이 정확한지 확인 (공백 등 주의)
```

#### SSL 검증 에러
```
문제: SSL certificate verify failed
해결: 
  - 개발 환경: SSL_VERIFY=false 설정
  - 프로덕션: 대학 웹사이트 인증서 확인 또는 특정 도메인만 예외 처리
```

---

## 📈 개선 효과 요약

| 항목 | Before | After | 개선도 |
|------|--------|-------|--------|
| 보안 | 인증 없음 | API 키 인증 | ⭐⭐⭐⭐⭐ |
| 안정성 | 런타임 에러 | 시작 전 검증 | ⭐⭐⭐⭐⭐ |
| 입력 검증 | 기본 검증 | 강화된 검증 | ⭐⭐⭐⭐ |
| SSL 보안 | 항상 비활성화 | 환경별 제어 | ⭐⭐⭐⭐ |
| 운영 편의성 | 매뉴얼 필요 | 자동 검증 | ⭐⭐⭐⭐⭐ |

---

## 🎯 향후 개선 권장 사항

현재 개선으로 배포 가능한 수준이 되었지만, 추가 개선을 원한다면:

### 단기 (1-2주)
- [ ] 단위 테스트 추가 (pytest)
- [ ] CI/CD 파이프라인 구축 (GitHub Actions)
- [ ] Sentry 등 에러 모니터링 도구 연동

### 중기 (1-2개월)
- [ ] Redis 캐싱 레이어 추가
- [ ] PostgreSQL 연결 풀 최적화
- [ ] API 문서 자동 생성 (Swagger UI)

### 장기 (3개월+)
- [ ] JWT 기반 사용자 인증 시스템
- [ ] 관리자 대시보드 웹 페이지
- [ ] 로그 집계 시스템 (ELK Stack)

---

## 👥 팀원 공유용 요약

**"배포 전 백엔드 보안 및 안정성 개선 완료"**

1. ✅ 관리자 기능 API 키 인증 추가 (무단 접근 차단)
2. ✅ 환경 변수 자동 검증 (시작 전 오류 감지)
3. ✅ 입력 데이터 검증 강화 (잘못된 요청 차단)
4. ✅ SSL 검증 제어 가능 (환경별 설정)
5. ✅ 테스트 엔드포인트 보호 (프로덕션 비활성화)

**필수 작업**:
- `.env.example`을 `.env`로 복사 후 값 설정
- `ADMIN_API_KEY` 생성 및 안전하게 보관
- 프로덕션 환경에서 `ALLOWED_ORIGINS` 설정

**관리자 API 사용법**:
모든 관리자 요청에 `X-API-Key` 헤더 포함 필요

---

**문의사항**: 이 문서를 확인 후 질문이 있으면 팀 채널에 공유해주세요.

**작성일**: 2026-01-24  
**다음 검토일**: 배포 후 1주일