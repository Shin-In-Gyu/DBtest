# app/routers/knu.py
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel

from app.database.database import get_db
from app.database.models import Notice, Device
from app.services import knu_notice_service
from app.services.scraper import scrape_notice_content
from app.core.logger import get_logger

router = APIRouter()
logger = get_logger()

# --------------------------------------------------------------------------
# [기능 1] 공지사항 목록 조회 (검색/필터링 포함)
# --------------------------------------------------------------------------
@router.get("/notices")
async def read_notices(
    category: str = "all",
    q: Optional[str] = Query(None, description="검색어"),
    page: int = 1,
    sort_by: str = "date", # date(최신순) or views(인기순)
    db: Session = Depends(get_db)
):
    limit = 20
    skip = (page - 1) * limit
    
    # 서비스 계층에 검색 요청
    results = knu_notice_service.search_notices_from_db(
        db, category, query=q, skip=skip, limit=limit, sort_by=sort_by
    )
    return results

# --------------------------------------------------------------------------
# [기능 2] 공지사항 상세 조회 & 조회수 카운팅
# --------------------------------------------------------------------------
# 조회수를 DB에 바로 쓰지 않고 모아두는 버퍼 ( {공지ID : 클릭수} )
VIEW_COUNT_BUFFER = {}

@router.get("/notice/detail")
async def get_notice_detail(
    url: str, 
    notice_id: Optional[int] = None, 
    db: Session = Depends(get_db)
):
    """
    앱에서 공지를 클릭했을 때 호출됩니다.
    1. 조회수를 메모리 버퍼에 +1 합니다.
    2. 실시간 크롤링 데이터를 반환합니다.
    """
    # 조회수 버퍼링 (DB 부하 방지)
    if notice_id:
        if notice_id in VIEW_COUNT_BUFFER:
            VIEW_COUNT_BUFFER[notice_id] += 1
        else:
            VIEW_COUNT_BUFFER[notice_id] = 1

    # 실시간 상세 내용 크롤링
    try:
        content = await scrape_notice_content(url)
        return content
    except Exception as e:
        logger.error(f"상세 조회 실패: {e}")
        return {"error": str(e), "texts": []}

# --------------------------------------------------------------------------
# [기능 3] FCM 기기 등록 (앱 설치 시 호출)
# --------------------------------------------------------------------------
class DeviceRegisterRequest(BaseModel):
    token: str          # FCM 토큰
    keywords: str = None # 구독 키워드 (예: "장학,취업")

@router.post("/device/register")
async def register_device(request: DeviceRegisterRequest, db: Session = Depends(get_db)):
    """
    앱 사용자 정보를 등록하거나 업데이트합니다.
    """
    # 이미 등록된 기기인지 확인
    existing_device = db.query(Device).filter(Device.token == request.token).first()
    
    if existing_device:
        # 기존 사용자면 키워드만 업데이트
        existing_device.keywords = request.keywords
        logger.info(f"🔄 기기 업데이트 (Token: {request.token[:10]}...)")
    else:
        # 신규 사용자 등록
        new_device = Device(token=request.token, keywords=request.keywords)
        db.add(new_device)
        logger.info(f"✨ 새 기기 등록 (Token: {request.token[:10]}...)")
    
    try:
        db.commit()
        return {"message": "success", "keywords": request.keywords}
    except Exception as e:
        db.rollback()
        logger.error(f"❌ 기기 등록 실패: {e}")
        return {"error": str(e)}