# app/main.py
import asyncio
from fastapi import FastAPI
from contextlib import asynccontextmanager
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi.middleware.cors import CORSMiddleware
from app.services import notification_service
from app.database.database import engine, Base, SessionLocal
from app.core.config import NOTICE_CONFIGS
from app.core.logger import get_logger
from app.services import knu_notice_service
from app.routers import knu

logger = get_logger()

# DB 테이블 생성 (없으면 만듦)
Base.metadata.create_all(bind=engine)

scheduler = AsyncIOScheduler()

async def scheduled_crawl_job():
    """
    정기 크롤링 작업 (30분 주기)
    - 모든 카테고리(학사, 장학 등)를 순회하며 새 글이 있는지 확인합니다.
    """
    logger.info("🚀 [스케줄러] 정기 크롤링 시작")
    categories = list(NOTICE_CONFIGS.keys())
    
    for i, cat in enumerate(categories):
        db = SessionLocal()
        try:
            await knu_notice_service.crawl_and_sync_notices(db, cat)
        except Exception as e:
            logger.error(f"❌ [{cat}] 크롤링 중 오류: {e}")
        finally:
            db.close()

        # 서버가 차단당하지 않도록 카테고리 사이에 2초 휴식
        if i < len(categories) - 1:
            await asyncio.sleep(2)
    
    logger.info("🏁 [스케줄러] 크롤링 완료")

# [수정됨] scheduled_sync_job 삭제
# 조회수 동기화 작업이 더 이상 필요하지 않습니다.

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    서버의 시작과 종료 시점에 실행될 로직을 정의합니다.
    """
    logger.info("⚡ API Server Started! (K-Now Backend)")
    notification_service.initialize_firebase()
    # 작업 스케줄 등록: 크롤링은 30분마다 수행
    scheduler.add_job(scheduled_crawl_job, 'interval', minutes=30)
    scheduler.start()
    
    # 서버 켜지면 5초 뒤에 즉시 크롤링 한 번 실행 (개발 편의성)
    asyncio.create_task(initial_crawl())
    
    yield # 여기서 서버가 실행됩니다 (무한 대기)
    
    logger.info("🛑 서버 종료 중...")
    scheduler.shutdown()

async def initial_crawl():
    """서버 시작 직후 실행되는 1회성 크롤링"""
    await asyncio.sleep(5)
    await scheduled_crawl_job()

app = FastAPI(lifespan=lifespan, title="K-Now API", version="2.1")

app.include_router(knu.router, prefix="/api/knu", tags=["KNU"])

# CORS 설정: 프론트엔드(React/Flutter 등)에서 API를 호출할 수 있게 허용
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)