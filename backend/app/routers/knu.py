from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database.database import get_db
from app.database.models import Notice
from app.services import knu_notice_service
from app.services.scraper import scrape_notice_content # 위에서 만든 모듈 import

router = APIRouter()

@router.get("/notices")
async def read_notices(
    category: str = "all",
    q: Optional[str] = Query(None, description="검색어"),
    page: int = 1,
    db: Session = Depends(get_db)
):
    limit = 20
    skip = (page - 1) * limit
    
    results = knu_notice_service.search_notices_from_db(
        db, category, query=q, skip=skip, limit=limit
    )
    
    return results

# [NEW] 조회수 버퍼 (메모리에 임시 저장)
# 구조: { notice_id : count } -> { 5: 1, 10: 3 }
VIEW_COUNT_BUFFER = {}

@router.get("/notice/detail")
async def get_notice_detail(
    url: str, 
    notice_id: Optional[int] = None, # [NEW] 앱에서 ID를 같이 넘겨줘야 정확함
    db: Session = Depends(get_db)
):
    """
    상세 내용을 반환하고, 앱 내 조회수(app_views)를 메모리 버퍼에 증가시킵니다.
    """
    # 1. 버퍼에 조회수 증가 (DB 부하 0)
    if notice_id:
        if notice_id in VIEW_COUNT_BUFFER:
            VIEW_COUNT_BUFFER[notice_id] += 1
        else:
            VIEW_COUNT_BUFFER[notice_id] = 1

    # 2. 크롤링 데이터 반환 (기존 로직)
    # (이미지, 본문 등은 실시간 크롤링하거나 DB에 저장된 내용을 줄 수도 있음)
    # 여기서는 기존 로직 유지
    try:
        content = await scrape_notice_content(url)
        return content
    except Exception as e:
        return {"error": str(e), "texts": []}