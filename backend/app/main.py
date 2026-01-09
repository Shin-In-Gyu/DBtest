# app/main.py
import asyncio
from fastapi import FastAPI
from contextlib import asynccontextmanager
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi.middleware.cors import CORSMiddleware

from app.database.database import engine, Base, SessionLocal
from app.database.models import Notice 
from app.core.config import NOTICE_CONFIGS
from app.core.logger import get_logger
from app.services import knu_notice_service
from app.routers import knu
# 순환 참조 방지를 위해 버퍼는 라우터에서 가져옴
from app.routers.knu import VIEW_COUNT_BUFFER 

logger = get_logger()
Base.metadata.create_all(bind=engine)

scheduler = AsyncIOScheduler()

async def sync_view_counts():
    """메모리 버퍼(VIEW_COUNT_BUFFER) 내용을 DB에 반영"""
    if not VIEW_COUNT_BUFFER:
        return

    buffer_copy = VIEW_COUNT_BUFFER.copy()
    VIEW_COUNT_BUFFER.clear()

    logger.info(f"💾 [조회수 동기화] {len(buffer_copy)}개 데이터 반영 중...")
    
    db = SessionLocal()
    try:
        for notice_id, count in buffer_copy.items():
            notice = db.query(Notice).filter(Notice.id == notice_id).first()
            if notice:
                notice.app_views += count
        db.commit()
        logger.info("✅ 조회수 DB 반영 완료")
    except Exception as e:
        logger.error(f"❌ 조회수 반영 실패: {e}")
        db.rollback()
    finally:
        db.close()

async def scheduled_crawl_job():
    """정기 크롤링 작업 (30분 주기)"""
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

        # 서버 차단 방지 휴식
        if i < len(categories) - 1:
            await asyncio.sleep(2)
    
    logger.info("🏁 [스케줄러] 크롤링 완료")

async def scheduled_sync_job():
    """조회수 동기화 작업 (5분 주기)"""
    await sync_view_counts()

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("⚡ API Server Started! (K-Now Backend)")
    
    # 작업 분리: 크롤링은 30분, 조회수 저장은 5분마다
    scheduler.add_job(scheduled_crawl_job, 'interval', minutes=30)
    scheduler.add_job(scheduled_sync_job, 'interval', minutes=5)
    scheduler.start()
    
    # 서버 켜지면 5초 뒤 크롤링 한 번 실행
    asyncio.create_task(initial_crawl())
    
    yield 
    
    logger.info("🛑 서버 종료 중... 데이터 정리")
    await sync_view_counts()
    scheduler.shutdown()

async def initial_crawl():
    await asyncio.sleep(5)
    await scheduled_crawl_job()

app = FastAPI(lifespan=lifespan, title="K-Now API", version="2.0")

app.include_router(knu.router, prefix="/api/knu", tags=["KNU"])

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)