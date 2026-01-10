# app/core/security.py
from urllib.parse import urlparse
from fastapi import HTTPException
from app.core.config import NOTICE_CONFIGS # notices.json 데이터 로드

# [수정] 하드코딩 제거 -> notices.json 기반 동적 허용 리스트 생성
ALLOWED_NETLOCS = {"web.kangnam.ac.kr"} # 기본 도메인 포함

# 설정 파일에서 도메인 추출하여 화이트리스트에 추가
for key, conf in NOTICE_CONFIGS.items():
    domain = conf.get("domain", "")
    if domain:
        try:
            parsed = urlparse(domain)
            if parsed.netloc:
                ALLOWED_NETLOCS.add(parsed.netloc)
        except:
            pass

def ensure_allowed_url(url: str) -> str:
    """
    크롤링 대상 URL이 허용된 학교 도메인인지 검증합니다.
    """
    try:
        p = urlparse(url)
        if p.scheme not in ("http", "https"):
            raise HTTPException(400, "Invalid URL Scheme")
        
        # 포트 번호가 포함된 경우(예: :8080) 제거하고 비교
        netloc = p.netloc.split(":")[0]
        
        if netloc not in ALLOWED_NETLOCS:
            # 보안 로그를 위해 구체적인 도메인 명시 안 함
            raise HTTPException(403, "Forbidden Domain Target")
            
        return url
    except ValueError:
        raise HTTPException(400, "Invalid URL Format")