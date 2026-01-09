# app/main.py
import asyncio
from fastapi import FastAPI
from contextlib import asynccontextmanager
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi.middleware.cors import CORSMiddleware

# [DB 및 설정]
from app.database.database import engine, Base, SessionLocal
from app.database.models import Notice 
from app.core.config import NOTICE_CONFIGS
from app.core.logger import get_logger

# [서비스 및 라우터]
from app.services import knu_notice_service
from app.routers import knu  # 라우터 등록을 위해 필요
from app.routers.knu import VIEW_COUNT_BUFFER  # [중요] 조회수 버퍼 가져오기

# 로거 설정
logger = get_logger()

# DB 테이블 자동 생성 (없으면 만듦)
Base.metadata.create_all(bind=engine)

# 스케줄러 생성
scheduler = AsyncIOScheduler()
init_task = None

# --------------------------------------------------------------------------
# [기능 1] 조회수 동기화 (메모리 -> DB)
# --------------------------------------------------------------------------
async def sync_view_counts():
    """
    사용자들이 클릭해서 메모리(VIEW_COUNT_BUFFER)에 쌓인 조회수를 
    실제 DB(Notices 테이블)에 반영하고, 메모리를 비웁니다.
    """
    if not VIEW_COUNT_BUFFER:
        return

    # 데이터 충돌 방지를 위해 복사본을 만들고 원본은 즉시 비움
    buffer_copy = VIEW_COUNT_BUFFER.copy()
    VIEW_COUNT_BUFFER.clear()

    logger.info(f"💾 [조회수 동기화] {len(buffer_copy)}개 게시글 데이터 반영 중...")
    
    db = SessionLocal()
    try:
        for notice_id, count in buffer_copy.items():
            # 해당 게시글을 찾아 조회수 증가
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

# --------------------------------------------------------------------------
# [기능 2] 정기 작업 스케줄러
# --------------------------------------------------------------------------
async def scheduled_job():
    """
    주기적으로 실행되는 작업 모음입니다.
    1. 조회수 DB 저장
    2. 학교 공지사항 크롤링 및 알림 발송
    """
    logger.info("🚀 [스케줄러] 정기 작업 시작...")
    
    db = SessionLocal()
    categories = list(NOTICE_CONFIGS.keys())
    
    try:
        # 1. 조회수 먼저 저장 (빈도가 잦을수록 데이터 유실 위험 적음)
        await sync_view_counts()

        # 2. 카테고리별 크롤링 실행
        for cat in categories:
            await knu_notice_service.crawl_and_sync_notices(db, cat)
            
    except Exception as e:
        logger.critical(f"❌ [스케줄러] 작업 중 치명적 오류: {e}")
    finally:
        db.close()
    
    logger.info("🏁 [스케줄러] 모든 작업 완료!")

# --------------------------------------------------------------------------
# [기능 3] 서버 수명주기 (Lifecycle) 관리
# --------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    global init_task
    logger.info("⚡ API Server Started! (K-Now Backend)")
    
    # 1. 스케줄러 등록 (30분마다 자동 실행)
    scheduler.add_job(scheduled_job, 'interval', minutes=30)
    scheduler.start()
    
    # 2. 서버 켜지자마자 초기 데이터 수집 예약 (5초 뒤 실행)
    logger.info("⏳ 초기 데이터 수집 태스크 예약됨")
    init_task = asyncio.create_task(initial_crawl())
    
    yield  # 서버 가동 중...
    
    # 3. 서버 종료 시 정리 작업
    logger.info("🛑 서버 종료 중... 남은 조회수 데이터 저장")
    await sync_view_counts()
    scheduler.shutdown()
    
    # 진행 중인 초기화 작업 취소
    if init_task and not init_task.done():
        init_task.cancel()
        try:
            await init_task
        except asyncio.CancelledError:
            pass

async def initial_crawl():
    await asyncio.sleep(5)
    await scheduled_job()

# FastAPI 앱 생성
app = FastAPI(lifespan=lifespan)

# 라우터 등록 (API 주소 연결)
app.include_router(knu.router, prefix="/api/knu", tags=["KNU"])

# CORS 설정 (프론트엔드 통신 허용)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)