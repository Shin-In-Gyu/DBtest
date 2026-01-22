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
    conf = NOTICE_CONFIGS.get(category)
    if not conf:
        conf = NOTICE_CONFIGS.get("univ", {})
    
    if not conf:
        return "", "", ""
        
    base_domain = str(conf.get("domain", ""))
    site_type = conf.get("type", "main_cms")
    
    # 1. 도서관
    if site_type == "library":
        url_path = str(conf.get("url_path", "/Board?n=notice"))
        list_url = f"{base_domain}{url_path}"
        return list_url, base_domain, ""

    # 2. [New] 대플 (취창업)
    elif site_type == "daeple":
        url_path = str(conf.get("url_path", ""))
        list_url = f"{base_domain}{url_path}"
        # 상세 URL의 Base가 되는 주소 반환
        info_url = f"{base_domain}/user/Bd/BdCm010D.do" 
        return list_url, info_url, ""

    # 3. 일반 대학 CMS
    else:
        menu_id = conf.get("menu_id", "")
        seq = conf.get("seq", "")
        list_url = f"{base_domain}/menu/{menu_id}.do"
        info_url = f"{base_domain}/menu/board/info/{menu_id}.do"
        return list_url, info_url, seq