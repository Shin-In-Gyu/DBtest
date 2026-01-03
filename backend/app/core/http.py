import httpx
from fastapi import HTTPException

DEFAULT_HEADERS = {
  "User-Agent": "Mozilla/5.0",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
  "Referer": "https://web.kangnam.ac.kr/",
}

async def fetch_html(url: str, params: dict | None = None) -> str:
    try:
        async with httpx.AsyncClient(
            timeout=20,
            follow_redirects=True,
            headers=DEFAULT_HEADERS,
        ) as client:
            r = await client.get(url, params=params)
            # 여기서 403/404/500이면 터짐
            r.raise_for_status()
            return r.text

    except httpx.HTTPStatusError as e:
        status = e.response.status_code
        body = (e.response.text or "")[:1000]
        raise HTTPException(status_code=502, detail=f"Upstream HTTP {status}: {body}")

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Proxy error: {e}")
    