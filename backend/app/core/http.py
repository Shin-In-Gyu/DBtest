# app/core/http.py
import httpx
from fastapi import HTTPException
from app.core.logger import get_logger

logger = get_logger()

DEFAULT_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
  "Connection": "keep-alive"
}

_global_client: httpx.AsyncClient | None = None
_is_shutting_down = False  # [New] 종료 신호 플래그

def get_client() -> httpx.AsyncClient:
    global _global_client
    
    # [Fix] 종료 중이면 클라이언트를 새로 만들지 않고 에러 발생시킴
    if _is_shutting_down:
        raise HTTPException(status_code=503, detail="Server is shutting down")

    if _global_client is None:
        limits = httpx.Limits(max_keepalive_connections=20, max_connections=50)
        timeout = httpx.Timeout(20.0, connect=5.0)
        
        _global_client = httpx.AsyncClient(
            timeout=timeout,
            limits=limits,
            headers=DEFAULT_HEADERS,
            verify=False,
            follow_redirects=True
        )
    return _global_client

async def close_client():
    global _global_client, _is_shutting_down
    _is_shutting_down = True  # [Fix] 종료 시작 알림
    
    if _global_client:
        await _global_client.aclose()
        _global_client = None
        logger.info("💤 HTTP Client Closed")

async def fetch_html(url: str, params: dict | None = None) -> str:
    try:
        # 종료 중일 때 get_client 호출 시 에러가 발생하므로 여기서 잡힘
        client = get_client()
        response = await client.get(url, params=params)
        response.raise_for_status()
        return response.text

    except httpx.HTTPStatusError as e:
        logger.error(f"❌ HTTP Error {e.response.status_code} at {url}")
        raise HTTPException(status_code=502, detail="Upstream Server Error")
    except Exception as e:
        # 종료 중 발생하는 에러는 로그 레벨을 낮추거나 무시
        if _is_shutting_down:
            logger.warning(f"🛑 Shutdown interrupt at {url}")
            return "" 
        logger.error(f"❌ Connection Error at {url}: {str(e)}")
        raise HTTPException(status_code=500, detail="Proxy Connection Failed")