# app/main.py
import asyncio
import urllib3
import uvicorn
import sys
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.asyncio import AsyncIOScheduler

# [설정] SSL 경고 제거
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# [Import]
from app.core.config import NOTICE_CONFIGS
from app.database.database import engine, Base, AsyncSessionLocal, init_db
from app.core.logger import get_logger
from app.core.http import close_client, get_client
from app.services import knu_notice_service, notification_service
from app.routers import knu

logger = get_logger()
scheduler = AsyncIOScheduler()

async def scheduled_crawl_job():
    logger.info("🚀 [스케줄러] 정기 크롤링 시작")
    categories = list(NOTICE_CONFIGS.keys())
    
    for i, cat in enumerate(categories):
        async with AsyncSessionLocal() as db:
            try:
                await knu_notice_service.crawl_and_sync_notices(db, cat)
            except asyncio.CancelledError:
                logger.warning(f"🛑 [{cat}] 작업 취소됨")
                raise # [중요] 취소 신호를 상위로 전파해야 즉시 종료됨
            except Exception as e:
                logger.error(f"❌ [{cat}] 크롤링 실패: {e}")
        
        # [Fix] sleep 중에도 취소 신호 체크
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
        get_client() # 클라이언트 웜업
    except: pass
    
    logger.info("⚡ API Server Started! (K-Now Backend)")
    notification_service.initialize_firebase()
    
    if not scheduler.running:
        scheduler.add_job(scheduled_crawl_job, 'interval', minutes=30)
        scheduler.start()
    
    crawl_task = asyncio.create_task(initial_crawl())
    
    yield # 서버 실행 유지
    
    # ---------------- [종료 시점] ----------------
    logger.info("🛑 서버 종료 시퀀스 시작...")
    
    # 1. 진행 중인 태스크 취소 (타임아웃 적용)
    if not crawl_task.done():
        crawl_task.cancel()
        try:
            # [핵심] 5초 안에 안 꺼지면 그냥 포기하고 다음 단계로 진행 (무한 대기 방지)
            await asyncio.wait_for(crawl_task, timeout=5.0)
        except (asyncio.CancelledError, asyncio.TimeoutError):
            logger.warning("⚠️ 크롤링 작업 강제 종료됨 (Timeout)")
        except Exception as e:
            logger.error(f"⚠️ 작업 종료 중 에러: {e}")

    # 2. 스케줄러 종료
    if scheduler.running:
        scheduler.shutdown(wait=False)
        
    # 3. 리소스 정리
    await close_client() # HTTP 클라이언트 종료
    await engine.dispose() # DB 연결 종료
    
    logger.info("👋 서버 리소스가 정리되었습니다.")

app = FastAPI(lifespan=lifespan, title="K-Now API", version="2.5")

app.include_router(knu.router, prefix="/api/knu", tags=["KNU"])

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"],
)

if __name__ == "__main__":
    # [핵심] try-except KeyboardInterrupt 제거 -> Uvicorn에게 신호 처리 위임
    # uvicorn.run 자체가 내부적으로 시그널 핸들링을 하므로, 
    # 외부에서 감싸면 충돌이 일어나 터미널이 먹통될 수 있음.
    uvicorn.run(
        "app.main:app", 
        host="0.0.0.0", 
        port=8000, 
        reload=True 
    )