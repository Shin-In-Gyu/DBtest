# app/core/config.py
import json
import os
from pathlib import Path
from dotenv import load_dotenv
import urllib3

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

BASE_DIR = Path(__file__).resolve().parent.parent.parent
ENV_PATH = BASE_DIR / ".env"

if ENV_PATH.exists():
    load_dotenv(dotenv_path=ENV_PATH)
else:
    load_dotenv()

SSL_VERIFY = os.getenv("SSL_VERIFY", "False").lower() == "true"

JSON_PATH = BASE_DIR / "app" / "core" / "notices.json"
NOTICE_CONFIGS = {}

try:
    with open(JSON_PATH, "r", encoding="utf-8") as f:
        NOTICE_CONFIGS = json.load(f)
except FileNotFoundError:
    print(f"⚠️ [Config] 설정 파일 없음: {JSON_PATH}")

def get_urls(category: str):
    """
    카테고리별 크롤링에 필요한 URL 정보를 반환합니다.
    [Update] 'library' 타입과 'main_cms' 타입을 구분하여 처리
    """
    conf = NOTICE_CONFIGS.get(category)
    if not conf:
        # 설정이 없으면 기본값(univ) 시도
        conf = NOTICE_CONFIGS.get("univ", {})
    
    if not conf:
        return "", "", ""
        
    base_domain = conf.get("domain", "")
    site_type = conf.get("type", "main_cms") # main_cms or library
    
    # 1. 도서관 (library) 타입
    if site_type == "library":
        # 예: https://lib.kangnam.ac.kr + /Board?n=notice
        url_path = conf.get("url_path", "/Board?n=notice")
        list_url = f"{base_domain}{url_path}"
        # 도서관은 detail_url 생성 시 domain이 필요하므로 info_url 자리에 domain을 넘김
        return list_url, base_domain, ""

    # 2. 일반 대학 CMS (main_cms) 타입
    else:
        menu_id = conf.get("menu_id", "")
        seq = conf.get("seq", "")
        
        list_url = f"{base_domain}/menu/{menu_id}.do"
        info_url = f"{base_domain}/menu/board/info/{menu_id}.do"
        
        return list_url, info_url, seq