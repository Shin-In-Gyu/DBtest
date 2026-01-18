# app/main.py
import asyncio
import urllib3
import uvicorn
import sys
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

# [설정] SSL 경고 제거
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# [Import]
from app.core.config import NOTICE_CONFIGS
from app.database.database import engine, Base, AsyncSessionLocal, init_db
from app.core.logger import get_logger
from app.core.http import close_client, get_client
from app.services import knu_notice_service, notification_service
from app.routers import knu, health
from app.routers import test_router

logger = get_logger()
scheduler = AsyncIOScheduler()

# [Rate Limiting 설정]
limiter = Limiter(key_func=get_remote_address, default_limits=["200/minute"])

async def scheduled_crawl_job():
    logger.info("🚀 [스케줄러] 정기 크롤링 시작")
    categories = list(NOTICE_CONFIGS.keys())
    
    for i, cat in enumerate(categories):
        async with AsyncSessionLocal() as db:
            try:
                await knu_notice_service.crawl_and_sync_notices(db, cat)
            except asyncio.CancelledError:
                logger.warning(f"🛑 [{cat}] 작업 취소됨")
                raise
            except Exception as e:
                logger.error(f"❌ [{cat}] 크롤링 실패: {e}")
        
        try:
            if i < len(categories) - 1:
                await asyncio.sleep(2)
        except asyncio.CancelledError:
            logger.warning("🛑 대기 중 작업 취소됨")
            raise

    logger.info("🏁 [스케줄러] 크롤링 완료")

async def initial_crawl():
    try:
        logger.info("⏳ 초기 크롤링 대기 중 (5초)...")
        await asyncio.sleep(5)
        await scheduled_crawl_job()
    except asyncio.CancelledError:
        logger.info("🛑 초기 크롤링 작업이 취소되었습니다.")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # ---------------- [시작 시점] ----------------
    await init_db()
    try:
        get_client()
    except: 
        pass
    
    logger.info("⚡ API Server Started! (Kangrimi Backend)")
    
    if not scheduler.running:
        scheduler.add_job(scheduled_crawl_job, 'interval', minutes=30)
        scheduler.start()
    
    crawl_task = asyncio.create_task(initial_crawl())
    
    yield
    
    # ---------------- [종료 시점] ----------------
    logger.info("🛑 서버 종료 시퀀스 시작...")
    
    if not crawl_task.done():
        crawl_task.cancel()
        try:
            await asyncio.wait_for(crawl_task, timeout=5.0)
        except (asyncio.CancelledError, asyncio.TimeoutError):
            logger.warning("⚠️ 크롤링 작업 강제 종료됨 (Timeout)")
        except Exception as e:
            logger.error(f"⚠️ 작업 종료 중 에러: {e}")

    if scheduler.running:
        scheduler.shutdown(wait=False)
        
    await close_client()
    await engine.dispose()
    
    logger.info("👋 서버 리소스가 정리되었습니다.")

app = FastAPI(lifespan=lifespan, title="K-Now API", version="2.6")

# [Rate Limiter 등록]
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# [라우터 등록]
app.include_router(health.router, prefix="/api", tags=["Health"])  # 헬스체크
app.include_router(test_router.router, tags=["Test"])
app.include_router(knu.router, prefix="/api/knu", tags=["KNU"])

# [CORS 설정 - 보안 강화]
ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS", 
    "http://localhost:3000,http://localhost:8000"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE", "PUT"],
    allow_headers=["Content-Type", "Authorization"],
)

# [전역 예외 처리]
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "서버 내부 오류가 발생했습니다."}
    )

# [404 커스텀 핸들러]
@app.exception_handler(404)
async def not_found_handler(request: Request, exc):
    return JSONResponse(
        status_code=404,
        content={"detail": "요청하신 리소스를 찾을 수 없습니다."}
    )

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app", 
        host="0.0.0.0", 
        port=8000, 
        reload=True 
    )