# app/core/config.py
import json
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
JSON_PATH = os.path.join(BASE_DIR, "notices.json")

# URL 정보가 담긴 JSON 로드
try:
    with open(JSON_PATH, "r", encoding="utf-8") as f:
        NOTICE_CONFIGS = json.load(f)
except FileNotFoundError:
    NOTICE_CONFIGS = {}

def get_urls(category: str):
    """카테고리별 목록/상세 URL 반환"""
    conf = NOTICE_CONFIGS.get(category, NOTICE_CONFIGS["univ"])
    domain = conf["domain"]
    menu_id = conf["menu_id"]
    
    list_url = f"{domain}/menu/{menu_id}.do"
    info_url = f"{domain}/menu/board/info/{menu_id}.do"
    
    return list_url, info_url, conf["seq"]