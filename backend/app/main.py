import asyncio
from fastapi import FastAPI
from contextlib import asynccontextmanager
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from app.database.database import engine, Base, SessionLocal
from app.services import knu_notice_service
from app.routers import knu
from app.core.config import NOTICE_CONFIGS

Base.metadata.create_all(bind=engine)
scheduler = AsyncIOScheduler()

# [전역 변수] 실행 중인 초기화 태스크를 추적하기 위함
init_task = None

async def scheduled_job():
    # ... (기존과 동일한 크롤링 로직) ...
    print("🚀 [스케줄러] 데이터 동기화 작업 시작...")
    db = SessionLocal()
    categories = list(NOTICE_CONFIGS.keys())
    try:
        # [팁] 서버 뜨자마자 CPU 튀는 것 방지 (5초 대기)
        await asyncio.sleep(5) 
        
        for cat in categories:
            await knu_notice_service.crawl_and_sync_notices(db, cat)
    except Exception as e:
        # [중요] 여기서 에러나면 개발자에게 알림 가는 로직 필요 (현재는 로그만)
        print(f"❌ 작업 중 치명적 오류: {e}")
    finally:
        db.close()
    print("🏁 [스케줄러] 데이터 동기화 완료!")

@asynccontextmanager
async def lifespan(app: FastAPI):
    global init_task
    
    # 1. 스케줄러 시작
    scheduler.add_job(scheduled_job, 'interval', minutes=30)
    scheduler.start()
    
    # 2. 백그라운드 태스크 시작 (변수에 담아둠)
    print("⚡ 서버 시작! 5초 뒤 초기 데이터 수집을 시작합니다...")
    init_task = asyncio.create_task(scheduled_job())
    
    yield  # 서버 가동 중...
    
    # 3. [보완] 서버 종료 시 안전하게 정리
    print("🛑 서버 종료 중... 진행 중인 작업 확인...")
    scheduler.shutdown()
    
    # 초기화 작업이 아직 안 끝났으면 기다릴지, 취소할지 결정
    # 여기서는 "취소(Cancel)"하는 것이 일반적이지만, 중요하면 await init_task로 기다릴 수도 있음
    if init_task and not init_task.done():
        print("⚠️ 초기화 작업이 아직 진행 중입니다. 강제 종료합니다.")
        init_task.cancel()
        try:
            await init_task
        except asyncio.CancelledError:
            print("✅ 초기화 작업이 안전하게 취소되었습니다.")

app = FastAPI(lifespan=lifespan)
app.include_router(knu.router, prefix="/api/knu", tags=["knu"])

# ... (나머지 코드 동일)

# [NEW] 강제 업데이트 버튼
@app.get("/force-update")
async def force_update():
    await scheduled_job()
    return {"message": "전체 카테고리 강제 업데이트 완료! 이제 목록을 새로고침 해보세요."}

@app.get("/")
def read_root():
    return {"message": "Knoti API Server Running"}