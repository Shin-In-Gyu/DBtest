from urllib.parse import urlparse
from fastapi import HTTPException

ALLOWED_NETLOCS = {"web.kangnam.ac.kr"}

# 해당 url 형태가 아니면 에러 띄우기
# 보안: 크롤링 대상 도메인 제한

def ensure_allowed_url(url: str) -> str:
    p = urlparse(url)
    if p.scheme not in ("http", "https"):
        raise HTTPException(400, "invalid url")
    if p.netloc not in ALLOWED_NETLOCS:
        raise HTTPException(403, "forbidden domain")
    return url