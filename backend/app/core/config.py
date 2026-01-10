# app/core/config.py
import json
import os
from pathlib import Path
from dotenv import load_dotenv
import urllib3

# [배포 최적화] SSL 검증 비활성화 시 발생하는 노이즈 경고를 끕니다.
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# ---------------------------------------------------------
# [설정 로드] .env 파일 로드 (여기서 한 번만 수행)
# ---------------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent.parent.parent
ENV_PATH = BASE_DIR / ".env"

if ENV_PATH.exists():
    load_dotenv(dotenv_path=ENV_PATH)
else:
    load_dotenv() # 시스템 환경변수 사용 시

# [보안] SSL 검증 여부 (기본값: False - 학교 서버 구형 인증서 대비)
SSL_VERIFY = os.getenv("SSL_VERIFY", "False").lower() == "true"

# [데이터] 공지사항 설정 파일 로드
JSON_PATH = BASE_DIR / "app" / "core" / "notices.json"
NOTICE_CONFIGS = {}

try:
    with open(JSON_PATH, "r", encoding="utf-8") as f:
        NOTICE_CONFIGS = json.load(f)
except FileNotFoundError:
    print(f"⚠️ [Config] 설정 파일 없음: {JSON_PATH}")

def get_urls(category: str):
    """카테고리별 URL 및 파라미터 정보 반환"""
    conf = NOTICE_CONFIGS.get(category, NOTICE_CONFIGS.get("univ", {}))
    if not conf:
        return "", "", ""
        
    domain = conf.get("domain", "")
    menu_id = conf.get("menu_id", "")
    
    list_url = f"{domain}/menu/{menu_id}.do"
    info_url = f"{domain}/menu/board/info/{menu_id}.do"
    
    return list_url, info_url, conf.get("seq", "")