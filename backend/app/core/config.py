# app/core/config.py
import json
import os
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
JSON_PATH = os.path.join(BASE_DIR, "core", "notices.json")

# [보안] SSL 검증 여부 (기본값: False - 학교 서버 구형 인증서 대비)
# 환경변수 SSL_VERIFY가 'True'일 때만 검증 켬
SSL_VERIFY = os.getenv("SSL_VERIFY", "False").lower() == "true"

try:
    with open(JSON_PATH, "r", encoding="utf-8") as f:
        NOTICE_CONFIGS = json.load(f)
except FileNotFoundError:
    print(f"⚠️ 설정 파일 없음: {JSON_PATH}")
    NOTICE_CONFIGS = {}

def get_urls(category: str):
    conf = NOTICE_CONFIGS.get(category, NOTICE_CONFIGS.get("univ", {}))
    if not conf:
        return "", "", ""
        
    domain = conf.get("domain", "")
    menu_id = conf.get("menu_id", "")
    
    list_url = f"{domain}/menu/{menu_id}.do"
    info_url = f"{domain}/menu/board/info/{menu_id}.do"
    
    return list_url, info_url, conf.get("seq", "")