# app/routers/knu.py
import json
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database.database import get_db
from app.database.models import Notice, Device
from app.services import knu_notice_service
from app.services.scraper import scrape_notice_content
from app.core.logger import get_logger
# [New] 스키마 임포트
from app.schemas import NoticeListResponse, NoticeDetailResponse, DeviceRegisterRequest

router = APIRouter()
logger = get_logger()

# 조회수 버퍼
VIEW_COUNT_BUFFER = {}

# [응답 모델 적용] List[NoticeListResponse] 형태로 나간다고 명시
@router.get("/notices", response_model=List[NoticeListResponse])
async def read_notices(
    category: str = "all",
    q: Optional[str] = Query(None, description="검색어"),
    page: int = 1,
    sort_by: str = "date",
    db: Session = Depends(get_db)
):
    limit = 20
    skip = (page - 1) * limit
    
    results = knu_notice_service.search_notices(
        db, category, query=q, skip=skip, limit=limit, sort_by=sort_by
    )
    return results

# [응답 모델 적용]
@router.get("/notice/detail", response_model=NoticeDetailResponse)
async def get_notice_detail(
    url: str, 
    notice_id: Optional[int] = None, 
    db: Session = Depends(get_db)
):
    # 1. DB 정보 조회 (조회수 증가용)
    notice_in_db = None
    if notice_id:
        notice_in_db = db.query(Notice).filter(Notice.id == notice_id).first()
        # 버퍼에 조회수 추가
        VIEW_COUNT_BUFFER[notice_id] = VIEW_COUNT_BUFFER.get(notice_id, 0) + 1

    # 2. 실시간 크롤링
    scraped = await scrape_notice_content(url)
    if not scraped:
        raise HTTPException(status_code=404, detail="내용을 불러올 수 없습니다.")

    # 3. 응답 데이터 조립 (Pydantic 모델에 맞춤)
    return {
        "id": notice_id if notice_id else 0,
        "title": scraped["title"],
        "link": url,
        "date": scraped["date"],
        "category": notice_in_db.category if notice_in_db else "unknown",
        "author": notice_in_db.author if notice_in_db else None,
        "content": "\n\n".join(scraped["texts"]),
        "images": scraped["images"], # 리스트 그대로 전달
        "files": scraped["files"],   # 리스트 그대로 전달
        "univ_views": scraped["univ_views"],
        # 앱 조회수 = DB저장값 + 현재 버퍼값
        "app_views": (notice_in_db.app_views if notice_in_db else 0) + VIEW_COUNT_BUFFER.get(notice_id, 0),
        "crawled_at": notice_in_db.crawled_at if notice_in_db else None
    }

# [요청 모델 적용] Body를 DeviceRegisterRequest 스키마로 검증
@router.post("/device/register")
async def register_device(request: DeviceRegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(Device).filter(Device.token == request.token).first()
    
    if existing:
        existing.keywords = request.keywords
        logger.info(f"🔄 기기 업데이트: {request.token[:8]}...")
    else:
        new_device = Device(token=request.token, keywords=request.keywords)
        db.add(new_device)
        logger.info(f"✨ 새 기기 등록: {request.token[:8]}...")
    
    try:
        db.commit()
        return {"message": "success", "keywords": request.keywords}
    except Exception as e:
        db.rollback()
        logger.error(f"❌ 기기 등록 실패: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")