import httpx
from fastapi import HTTPException
from app.core.logger import get_logger

logger = get_logger()

DEFAULT_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
  "Referer": "https://web.kangnam.ac.kr/",
  "Connection": "keep-alive"
}

async def fetch_html(url: str, params: dict | None = None) -> str:
    try:
        # verify=False 필수: 학교 사이트 SSL 인증서 문제 우회
        async with httpx.AsyncClient(
            timeout=20.0,
            follow_redirects=True,
            headers=DEFAULT_HEADERS,
            verify=False 
        ) as client:
            r = await client.get(url, params=params)
            r.raise_for_status()
            return r.text

    except httpx.HTTPStatusError as e:
        logger.error(f"❌ HTTP Error {e.response.status_code} at {url}")
        raise HTTPException(status_code=502, detail="Upstream Server Error")

    except Exception as e:
        logger.error(f"❌ Connection Error at {url}: {str(e)}")
        # 여기서 에러를 raise 하지 않고 빈 문자열을 줘서 로직이 멈추지 않게 할 수도 있음
        # 하지만 상위 로직 흐름상 raise 하는 것이 맞음
        raise HTTPException(status_code=500, detail="Proxy Connection Failed")