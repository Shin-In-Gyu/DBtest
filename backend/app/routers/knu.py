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

@router.get("/notice/detail")
async def get_notice_detail(url: str):
    """
    특정 공지사항 URL을 받아 앱에서 보기 좋은 JSON 형태로 반환합니다.
    """
    try:
        content = await scrape_notice_content(url)
        return content
    except Exception as e:
        # 크롤링 실패 시 예외 처리 (로그 남기기 등)
        return {"error": str(e), "title": "로딩 실패",
                 "texts": ["내용을 불러올 수 없습니다."], "images": [], "files": []}