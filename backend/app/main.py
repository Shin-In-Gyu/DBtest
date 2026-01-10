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

# [중요] Config 로드
from app.core.config import NOTICE_CONFIGS
from app.database.database import engine, Base, AsyncSessionLocal
from app.core.logger import get_logger
from app.services import knu_notice_service, notification_service
from app.routers import knu

logger = get_logger()
scheduler = AsyncIOScheduler()

async def init_db():
    """DB 테이블 비동기 생성"""
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("🗄️ 데이터베이스 초기화 완료")
    except Exception as e:
        logger.critical(f"🔥 DB 초기화 실패: {e}")

async def scheduled_crawl_job():
    """정기 크롤링 작업"""
    logger.info("🚀 [스케줄러] 정기 크롤링 시작")
    categories = list(NOTICE_CONFIGS.keys())
    
    for i, cat in enumerate(categories):
        # 세션을 루프 밖에서 열지 않고, 각 크롤링 함수 내부나 여기서 짧게 엽니다.
        async with AsyncSessionLocal() as db:
            try:
                await knu_notice_service.crawl_and_sync_notices(db, cat)
            except asyncio.CancelledError:
                logger.warning(f"🛑 [{cat}] 작업 취소됨 (서버 종료)")
                raise # 취소 신호가 오면 작업을 즉시 중단
            except Exception as e:
                logger.error(f"❌ [{cat}] 크롤링 실패: {e}")
        
        # 서버 종료 신호 확인을 위해 sleep을 잘게 쪼개거나 그대로 둠
        if i < len(categories) - 1:
            await asyncio.sleep(2)
            
    logger.info("🏁 [스케줄러] 크롤링 완료")

async def initial_crawl():
    """서버 시작 후 5초 뒤 첫 크롤링"""
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
    
    logger.info("⚡ API Server Started! (K-Now Backend)")
    notification_service.initialize_firebase()
    
    if not scheduler.running:
        scheduler.add_job(scheduled_crawl_job, 'interval', minutes=30)
        scheduler.start()
    
    crawl_task = asyncio.create_task(initial_crawl())
    
    yield # 서버 실행 유지
    
    # ---------------- [종료 시점] ----------------
    logger.info("🛑 서버 종료 시퀀스 시작...")
    
    # 1. 진행 중인 태스크 취소
    if not crawl_task.done():
        crawl_task.cancel()
        try:
            await crawl_task
        except asyncio.CancelledError:
            pass

    # 2. 스케줄러 종료
    if scheduler.running:
        scheduler.shutdown(wait=False)
        
    # 3. [핵심] DB 커넥션 풀 강제 종료 (이게 없으면 프로세스가 안 끝날 수 있음)
    logger.info("🔌 DB 연결 해제 중...")
    await engine.dispose()
    
    logger.info("👋 서버 리소스가 정리되었습니다.")

app = FastAPI(lifespan=lifespan, title="K-Now API", version="2.5")

app.include_router(knu.router, prefix="/api/knu", tags=["KNU"])

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"],
)

if __name__ == "__main__":
    try:
        uvicorn.run(
            "app.main:app", 
            host="0.0.0.0", 
            port=8000, 
            reload=True 
        )
    except KeyboardInterrupt:
        pass
    finally:
        # [핵심] Uvicorn 종료 후에도 안 꺼지는 좀비 프로세스 강제 살처분
        print("\nProcess finished. Forcing exit...")
        sys.exit(0)