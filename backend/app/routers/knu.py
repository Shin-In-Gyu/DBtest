# app/routers/knu.py
import json
import traceback
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
from app.services.ai_service import generate_summary
from app.core.logger import get_logger

router = APIRouter()
logger = get_logger()

# --------------------------------------------------------------------------
# 1. 공지사항 목록 조회 (Async Refactored)
# --------------------------------------------------------------------------
@router.get("/notices", response_model=List[NoticeListResponse])
async def read_notices(
    category: str = "all",
    q: Optional[str] = Query(None, description="검색어"),
    page: int = 1,
    sort_by: str = "date",
    token: Optional[str] = Query(None, description="스크랩 확인용 토큰"),
    db: AsyncSession = Depends(get_db)  # Session -> AsyncSession 변경
):
    limit = 20
    skip = (page - 1) * limit
    
    # [Fix] 서비스 함수 호출 시 await 추가 (knu_notice_service가 async 함수임)
    results = await knu_notice_service.search_notices(
        db, category, query=q, skip=skip, limit=limit, sort_by=sort_by
    )

    # 스크랩 여부 마킹 (Async 쿼리로 변경)
    if token:
        # 기기 조회
        stmt_device = select(Device).filter(Device.token == token)
        res_device = await db.execute(stmt_device)
        device = res_device.scalars().first()
        
        if device:
            # 내 스크랩 목록 조회
            stmt_scrap = select(Scrap.notice_id).filter(Scrap.device_id == device.id)
            res_scrap = await db.execute(stmt_scrap)
            my_scrap_ids = set(res_scrap.scalars().all())
            
            for notice in results:
                if notice.id in my_scrap_ids:
                    notice.is_scraped = True

    return results

# --------------------------------------------------------------------------
# 2. 공지사항 상세 조회 (Async Refactored)
# --------------------------------------------------------------------------
@router.get("/notice/detail", response_model=NoticeDetailResponse)
async def get_notice_detail(
    url: str, 
    notice_id: Optional[int] = None, 
    token: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    notice_in_db = None
    is_scraped = False

    # A. DB 조회 및 조회수 증가
    if notice_id:
        stmt = select(Notice).filter(Notice.id == notice_id)
        result = await db.execute(stmt)
        notice_in_db = result.scalars().first()

        if notice_in_db:
            try:
                # 조회수 1 증가
                notice_in_db.app_views += 1
                await db.commit() # [Fix] await 추가
            except Exception:
                await db.rollback() # [Fix] await 추가

            # 스크랩 여부 확인
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

    # B. 실시간 내용 크롤링 (이미 Async 함수임)
    scraped_data = await scrape_notice_content(url)
    if not scraped_data:
        raise HTTPException(status_code=404, detail="원문 페이지를 불러올 수 없습니다.")

    # C. DB 업데이트 (Async Commit)
    if notice_in_db:
        new_full_content = "\n\n".join(scraped_data["texts"])
        if notice_in_db.content != new_full_content:
            notice_in_db.content = new_full_content
            try:
                await db.commit()
            except Exception:
                await db.rollback()

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
        "univ_views": scraped_data["univ_views"],
        "app_views": notice_in_db.app_views if notice_in_db else 0,
        "crawled_at": notice_in_db.crawled_at if notice_in_db else None,
        "is_scraped": is_scraped,
        "summary": notice_in_db.summary if notice_in_db else None
    }

# --------------------------------------------------------------------------
# 3. AI 요약 생성 (Async Refactored) - 에러 발생하던 부분
# --------------------------------------------------------------------------

@router.post("/notice/{notice_id}/summary")
async def create_notice_summary(notice_id: int, db: AsyncSession = Depends(get_db)):
    try:
        # 서비스 계층으로 로직 위임
        summary = await knu_notice_service.get_or_create_summary(db, notice_id)
        return {"summary": summary}
    except ValueError:
        raise HTTPException(status_code=404, detail="공지사항을 찾을 수 없습니다.")
    except Exception as e:
        logger.error(f"Summary Error: {e}")
        raise HTTPException(status_code=500, detail="서버 내부 오류")
# --------------------------------------------------------------------------
# 4. 기기 등록 및 스크랩 API (Async Refactored)
# --------------------------------------------------------------------------
@router.post("/device/register")
async def register_device(request: DeviceRegisterRequest, db: AsyncSession = Depends(get_db)):
    stmt = select(Device).filter(Device.token == request.token)
    result = await db.execute(stmt)
    existing = result.scalars().first()
    
    if existing:
        existing.keywords = request.keywords
        logger.info(f"🔄 기기 갱신: {request.token[:8]}...")
    else:
        new_device = Device(token=request.token, keywords=request.keywords)
        db.add(new_device)
        logger.info(f"✨ 기기 등록: {request.token[:8]}...")
    
    try:
        await db.commit()
        return {"message": "success", "keywords": request.keywords}
    except:
        await db.rollback()
        raise HTTPException(status_code=500, detail="기기 등록 실패")

@router.post("/scrap/{notice_id}")
async def toggle_scrap(notice_id: int, request: ScrapRequest, db: AsyncSession = Depends(get_db)):
    # 기기 확인
    res_device = await db.execute(select(Device).filter(Device.token == request.token))
    device = res_device.scalars().first()
    if not device:
        raise HTTPException(status_code=404, detail="기기 등록이 필요합니다.")

    # 공지 확인
    res_notice = await db.execute(select(Notice).filter(Notice.id == notice_id))
    notice = res_notice.scalars().first()
    if not notice:
        raise HTTPException(status_code=404, detail="공지사항이 없습니다.")

    # 스크랩 여부 확인
    stmt_scrap = select(Scrap).filter(
        Scrap.device_id == device.id, 
        Scrap.notice_id == notice_id
    )
    res_scrap = await db.execute(stmt_scrap)
    existing_scrap = res_scrap.scalars().first()

    try:
        if existing_scrap:
            # 삭제 시 delete(...) 대신 객체를 db.delete()로 넘기거나 stmt 실행
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

    # Join 쿼리 (2.0 Style)
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