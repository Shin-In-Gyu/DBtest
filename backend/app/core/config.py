# backend/app/core/config.py
import json
import os

# 현재 config.py 파일이 있는 디렉토리 경로를 가져옵니다.
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# 같은 폴더에 있는 notices.json 경로를 설정합니다.
JSON_PATH = os.path.join(BASE_DIR, "notices.json")

# 기본 도메인 (필요 시 유지)
BASE = "https://web.kangnam.ac.kr"

# JSON 파일을 읽어서 NOTICE_CONFIGS 변수에 저장합니다.
try:
    with open(JSON_PATH, "r", encoding="utf-8") as f:
        NOTICE_CONFIGS = json.load(f)
except FileNotFoundError:
    print(f"Error:{JSON_PATH} 파일을 찾을 수 없습니다.")
    NOTICE_CONFIGS = {}        


def get_urls(category: str):
    """카테고리에 맞는 리스트/상세 URL 및 기본 Seq를 반환합니다."""
    conf = NOTICE_CONFIGS.get(category, NOTICE_CONFIGS["univ"])
    domain = conf["domain"]
    menu_id = conf["menu_id"]
    
    list_url = f"{domain}/menu/{menu_id}.do"
    info_url = f"{domain}/menu/board/info/{menu_id}.do"
    
    return list_url, info_url, conf["seq"]