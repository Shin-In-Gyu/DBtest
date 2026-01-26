# AWS EC2 서버 트러블슈팅 체크리스트

## ❌ 현재 문제
`curl http://16.184.63.211:8000/api/health` → **원격 서버에 연결할 수 없습니다**

## 🔍 확인 순서

### 1단계: AWS EC2 인스턴스 확인
- [ ] EC2 인스턴스가 "running" 상태인가?
- [ ] Public IP가 `16.184.63.211`이 맞는가?
- [ ] 인스턴스가 정지되지 않았는가?

### 2단계: Security Group 확인 ⚠️ **가장 중요!**
```
AWS Console → EC2 → Security Groups

필수 인바운드 규칙:
┌─────────────────┬──────────┬─────────────────┐
│ Type            │ Port     │ Source          │
├─────────────────┼──────────┼─────────────────┤
│ Custom TCP      │ 8000     │ 0.0.0.0/0       │ ← 필수!
│ SSH             │ 22       │ 0.0.0.0/0       │
└─────────────────┴──────────┴─────────────────┘
```

**8000 포트 추가 방법:**
1. Security Groups 페이지에서 해당 그룹 선택
2. "Inbound rules" 탭 → "Edit inbound rules"
3. "Add rule" 클릭
   - Type: Custom TCP
   - Port range: 8000
   - Source: 0.0.0.0/0 (또는 "Anywhere-IPv4")
   - Description: Kangrimi Backend API
4. "Save rules" 클릭

### 3단계: SSH로 서버 접속 확인

#### SSH 접속
```bash
ssh -i /path/to/your-key.pem ubuntu@16.184.63.211
# 또는
ssh -i /path/to/your-key.pem ec2-user@16.184.63.211
```

#### 서버에서 확인할 사항
```bash
# 1. Docker가 설치되어 있는가?
docker --version

# 2. Docker 컨테이너 실행 중인가?
docker ps
# 출력에 kangrimi-backend가 있어야 함

# 3. 컨테이너가 없다면 시작
cd /srv/kangrimi-backend
docker compose up -d

# 4. 컨테이너 로그 확인
docker logs kangrimi-backend
docker logs -f kangrimi-backend  # 실시간 로그

# 5. 로컬에서 헬스체크 (서버 내부)
curl http://localhost:8000/api/health
# 성공하면: {"status": "ok", ...}

# 6. 포트가 열려있는가?
sudo netstat -tlnp | grep 8000
# 또는
sudo ss -tlnp | grep 8000
# 출력: 0.0.0.0:8000 ... LISTEN

# 7. 방화벽 확인 (Ubuntu)
sudo ufw status
# inactive 또는 8000 포트가 allow 되어 있어야 함
```

### 4단계: GitHub Actions 배포 로그 확인
```
GitHub Repository → Actions 탭
- 최근 배포가 성공했는가?
- 에러 로그가 있는가?
```

### 5단계: Docker Compose 파일 확인
서버의 `/srv/kangrimi-backend/docker-compose.yml` 파일:
```yaml
services:
  app:
    image: hwanghotae/kangrimi-server:latest
    ports:
      - "8000:8000"  # 이 부분이 있어야 함
    # ... 나머지 설정
```

## 🔧 일반적인 해결 방법

### Case 1: Security Group 미설정
→ AWS Console에서 8000 포트 인바운드 규칙 추가

### Case 2: Docker 컨테이너 실행 안됨
```bash
cd /srv/kangrimi-backend
docker compose up -d app
docker logs kangrimi-backend
```

### Case 3: Docker Compose 파일 없음
```bash
# 서버에 docker-compose.yml 생성
cd /srv/kangrimi-backend
vi docker-compose.yml
# (docker-compose.prod.yml 내용 복사)

# 실행
docker compose up -d
```

### Case 4: 환경 변수 없음
```bash
cd /srv/kangrimi-backend
vi .env
# (.env 내용 복사)

# 재시작
docker compose restart app
```

### Case 5: 포트 충돌
```bash
# 8000 포트를 사용하는 프로세스 확인
sudo lsof -i :8000

# 다른 프로세스가 사용 중이면 종료하거나 포트 변경
```

## 🆘 긴급 대안

### 대안 1: 80 포트 사용 (추천)
HTTP 기본 포트인 80을 사용하면 Security Group 설정이 쉽습니다.

**docker-compose.yml 수정:**
```yaml
ports:
  - "80:8000"  # 외부 80 → 컨테이너 8000
```

**Frontend .env 수정:**
```bash
EXPO_PUBLIC_API_BASE_URL=http://16.184.63.211
# 포트 번호 없음 (80은 기본)
```

### 대안 2: HTTPS 설정 (권장)
1. 도메인 구매 (예: kangrimi.com)
2. AWS Route 53에서 DNS 설정
3. Let's Encrypt 인증서 발급
4. Nginx 리버스 프록시 설정

### 대안 3: AWS ALB 사용
1. Application Load Balancer 생성
2. HTTPS 리스너 추가 (ACM 인증서)
3. Target Group에 EC2 인스턴스 추가

## 📞 도움이 필요한 경우

### 확인할 정보
1. AWS Console에서 EC2 인스턴스 상태 스크린샷
2. Security Group 인바운드 규칙 스크린샷
3. SSH 접속 가능 여부
4. `docker ps` 명령어 출력

### 추가 질문
- EC2 인스턴스에 SSH로 접속할 수 있나요?
- Security Group을 수정할 권한이 있나요?
- Docker가 설치되어 있나요?
- `/srv/kangrimi-backend` 디렉토리가 존재하나요?
