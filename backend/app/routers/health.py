# app/routers/health.py
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
import firebase_admin
from app.database.database import get_db
from app.core.logger import get_logger

router = APIRouter()
logger = get_logger()

@router.get("/health")
async def health_check(db: AsyncSession = Depends(get_db)):
    """
    서버 상태 확인용 엔드포인트
    - 데이터베이스 연결 상태
    - Firebase 초기화 상태
    - 전반적인 서비스 가용성
    """
    health_status = {
        "status": "healthy",
        "database": "unknown",
        "firebase": "unknown",
        "details": {}
    }
    
    # 1. DB 연결 확인
    try:
        await db.execute(text("SELECT 1"))
        health_status["database"] = "connected"
    except Exception as e:
        logger.error(f"❌ DB Health Check Failed: {e}")
        health_status["database"] = "disconnected"
        health_status["status"] = "unhealthy"
        health_status["details"]["db_error"] = str(e)
    
    # 2. Firebase 확인
    try:
        if firebase_admin._apps:
            health_status["firebase"] = "initialized"
        else:
            health_status["firebase"] = "not_initialized"
            health_status["details"]["firebase_warning"] = "Firebase not configured"
    except Exception as e:
        logger.error(f"❌ Firebase Health Check Failed: {e}")
        health_status["firebase"] = "error"
        health_status["details"]["firebase_error"] = str(e)
    
    # 3. 전체 상태 판단
    if health_status["database"] != "connected":
        return {"status_code": 503, **health_status}
    
    return health_status

@router.get("/health/simple")
async def simple_health():
    """간단한 헬스체크 (로드밸런서용)"""
    return {"status": "ok"}