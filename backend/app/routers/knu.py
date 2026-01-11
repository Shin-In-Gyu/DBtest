# app/routers/knu.py
import json
from typing import List, Optional, Set

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, or_, desc

from app.database.database import get_db
from app.database.models import Notice, Device, Scrap
from app.schemas import (
    NoticeListResponse, 
    NoticeDetailResponse, 
    DeviceRegisterRequest, 
    ScrapRequest
)
from app.services import knu_notice_service
from app.services.scraper import scrape_notice_content
from app.core.logger import get_logger

router = APIRouter()
logger = get_logger()

@router.get("/notices", response_model=List[NoticeListResponse])
async def read_notices(
    category: str = "all",
    q: Optional[str] = Query(None, description="검색어"),
    page: int = 1,
    sort_by: str = "date",
    token: Optional[str] = Query(None, description="스크랩 확인용 토큰"),
    db: AsyncSession = Depends(get_db)
):
    limit = 20
    skip = (page - 1) * limit
    
    # [Fix] q (Optional[str]) 전달 시 Pylance 호환성 확보 (Service 함수 시그니처 수정됨)
    results = await knu_notice_service.search_notices(
        db, category, query=q, skip=skip, limit=limit, sort_by=sort_by
    )

    if token:
        stmt_device = select(Device).filter(Device.token == token)
        res_device = await db.execute(stmt_device)
        device = res_device.scalars().first()
        
        if device:
            stmt_scrap = select(Scrap.notice_id).filter(Scrap.device_id == device.id)
            res_scrap = await db.execute(stmt_scrap)
            my_scrap_ids = set(res_scrap.scalars().all())
            
            for notice in results:
                if notice.id in my_scrap_ids:
                    notice.is_scraped = True

    return results

@router.get("/notice/detail", response_model=NoticeDetailResponse)
async def get_notice_detail(
    url: str, 
    notice_id: Optional[int] = None, 
    token: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    notice_in_db = None
    is_scraped = False

    if notice_id:
        stmt = select(Notice).filter(Notice.id == notice_id)
        result = await db.execute(stmt)
        notice_in_db = result.scalars().first()

        if notice_in_db:
            if token:
                stmt_device = select(Device).filter(Device.token == token)
                res_device = await db.execute(stmt_device)
                device = res_device.scalars().first()
                
                if device:
                    stmt_check = select(Scrap).filter(
                        Scrap.device_id == device.id, 
                        Scrap.notice_id == notice_id
                    )
                    res_check = await db.execute(stmt_check)
                    is_scraped = bool(res_check.scalars().first())

    scraped_data = await scrape_notice_content(url)
    if not scraped_data:
        raise HTTPException(status_code=404, detail="원문 페이지를 불러올 수 없습니다.")

    # [Fix] Pylance: notice_in_db가 None이 아님을 보장한 후 접근
    if notice_in_db:
        new_full_content = "\n\n".join(scraped_data["texts"])
        # models.py에 타입 힌트를 추가했으므로 에러 사라짐
        if notice_in_db.content != new_full_content:
            notice_in_db.content = new_full_content
            try:
                await db.commit()
            except Exception:
                await db.rollback()

    univ_views = scraped_data.get("univ_views", 0)
    app_views = notice_in_db.app_views if notice_in_db else 0
    total_views = (univ_views or 0) + (app_views or 0)
    
    return {
        "id": notice_id if notice_id else 0,
        "title": scraped_data["title"],
        "link": url,
        "date": scraped_data["date"],
        "category": notice_in_db.category if notice_in_db else "unknown",
        "author": notice_in_db.author if notice_in_db else None,
        "content": "\n\n".join(scraped_data["texts"]),
        "images": scraped_data["images"],
        "files": scraped_data["files"],
        "univ_views": univ_views,
        "app_views": app_views,
        "views": total_views,
        "crawled_at": notice_in_db.crawled_at if notice_in_db else None,
        "is_scraped": is_scraped,
        "summary": notice_in_db.summary if notice_in_db else None
    }

@router.post("/notice/{notice_id}/view")
async def increment_view_count(notice_id: int, db: AsyncSession = Depends(get_db)):
    stmt = select(Notice).filter(Notice.id == notice_id)
    result = await db.execute(stmt)
    notice = result.scalars().first()
    
    if not notice:
        raise HTTPException(status_code=404, detail="공지사항을 찾을 수 없습니다")
    
    try:
        # [Fix] Optional[int]와 int 덧셈 처리 (models.py 힌트 덕분에 안전)
        current_views = notice.app_views or 0
        notice.app_views = current_views + 1
        await db.commit()
        await db.refresh(notice)
        
        return {
            "success": True,
            "app_views": notice.app_views
        }
    except Exception as e:
        await db.rollback()
        logger.error(f"조회수 증가 에러: {e}")
        raise HTTPException(status_code=500, detail="조회수 증가 실패")

@router.post("/notice/{notice_id}/summary")
async def create_notice_summary(notice_id: int, db: AsyncSession = Depends(get_db)):
    try:
        summary = await knu_notice_service.get_or_create_summary(db, notice_id)
        return {"summary": summary}
    except ValueError:
        raise HTTPException(status_code=404, detail="공지사항을 찾을 수 없습니다.")
    except Exception as e:
        logger.error(f"Summary Error: {e}")
        raise HTTPException(status_code=500, detail="서버 내부 오류")
        
@router.post("/device/register")
async def register_device(request: DeviceRegisterRequest, db: AsyncSession = Depends(get_db)):
    stmt = select(Device).filter(Device.token == request.token)
    result = await db.execute(stmt)
    existing = result.scalars().first()
    
    # [Note] 키워드 로직은 별도 테이블로 분리되었으므로, 여기서는 토큰 등록/갱신만 집중
    if not existing:
        new_device = Device(token=request.token)
        db.add(new_device)
        logger.info(f"✨ 기기 등록: {request.token[:8]}...")
    else:
        logger.info(f"🔄 기기 확인: {request.token[:8]}...")
    
    try:
        await db.commit()
        return {"message": "success"}
    except:
        await db.rollback()
        raise HTTPException(status_code=500, detail="기기 등록 실패")

@router.post("/scrap/{notice_id}")
async def toggle_scrap(notice_id: int, request: ScrapRequest, db: AsyncSession = Depends(get_db)):
    res_device = await db.execute(select(Device).filter(Device.token == request.token))
    device = res_device.scalars().first()
    if not device:
        raise HTTPException(status_code=404, detail="기기 등록이 필요합니다.")

    res_notice = await db.execute(select(Notice).filter(Notice.id == notice_id))
    notice = res_notice.scalars().first()
    if not notice:
        raise HTTPException(status_code=404, detail="공지사항이 없습니다.")

    stmt_scrap = select(Scrap).filter(
        Scrap.device_id == device.id, 
        Scrap.notice_id == notice_id
    )
    res_scrap = await db.execute(stmt_scrap)
    existing_scrap = res_scrap.scalars().first()

    try:
        if existing_scrap:
            await db.delete(existing_scrap)
            await db.commit()
            return {"status": "removed", "message": "스크랩 취소됨"}
        else:
            new_scrap = Scrap(device_id=device.id, notice_id=notice_id)
            db.add(new_scrap)
            await db.commit()
            return {"status": "added", "message": "스크랩 저장됨"}
    except Exception as e:
        await db.rollback()
        logger.error(f"스크랩 에러: {e}")
        raise HTTPException(status_code=500, detail="DB Error")

@router.get("/scraps", response_model=List[NoticeListResponse])
async def get_my_scraps(token: str, db: AsyncSession = Depends(get_db)):
    res_device = await db.execute(select(Device).filter(Device.token == token))
    device = res_device.scalars().first()
    
    if not device:
        return []

    stmt = (
        select(Notice)
        .join(Scrap, Notice.id == Scrap.notice_id)
        .filter(Scrap.device_id == device.id)
        .order_by(Scrap.created_at.desc())
    )
    result = await db.execute(stmt)
    scraped_notices = result.scalars().all()

    for notice in scraped_notices:
        notice.is_scraped = True
        
    return scraped_notices