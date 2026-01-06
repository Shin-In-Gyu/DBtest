from fastapi import FastAPI
from contextlib import asynccontextmanager
from apscheduler.schedulers.asyncio import AsyncIOScheduler # (주의) BackgroundScheduler 대신 이거 추천
from app.database.database import engine, Base, SessionLocal
from app.services import knu_notice_service
from app.routers import knu

# DB 테이블 생성
Base.metadata.create_all(bind=engine)

scheduler = AsyncIOScheduler()

async def scheduled_job():
    print("🚀 [스케줄러] 데이터 동기화 작업 시작...")
    db = SessionLocal()
    categories = ["univ", "bachelor", "scholarship"] 
    try:
        for cat in categories:
            await knu_notice_service.crawl_and_sync_notices(db, cat)
    except Exception as e:
        print(f"❌ 작업 중 치명적 오류: {e}")
    finally:
        db.close()
    print("🏁 [스케줄러] 데이터 동기화 완료!")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. 스케줄러 시작
    scheduler.add_job(scheduled_job, 'interval', minutes=30)
    scheduler.start()
    
    # 2. [핵심] 서버 켜지자마자 한 번 실행! (이 주석을 푸세요)
    print("⚡ 서버 시작! 초기 데이터를 수집합니다...")
    await scheduled_job() 
    
    yield
    
    scheduler.shutdown()

app = FastAPI(lifespan=lifespan)

app.include_router(knu.router, prefix="/api/knu", tags=["knu"])

# [NEW] 강제로 크롤링 돌리는 버튼 (테스트용)
@app.get("/force-update")
async def force_update():
    await scheduled_job()
    return {"message": "강제 업데이트 완료! 이제 목록을 새로고침 해보세요."}

@app.get("/")
def read_root():
    return {"message": "Knoti API Server Running"}