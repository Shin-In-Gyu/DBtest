# app/routers/knu.py
# app/routers/knu.py
import json
from typing import List, Optional, Set, Dict, Any

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, or_, desc
from sqlalchemy.orm import selectinload # [추가] "selectinload" is not defined 에러 해결
from app.database.database import get_db
from app.database.models import Notice, Device, Scrap, Keyword
from app.schemas import (
    NoticeListResponse, 
    NoticeDetailResponse, 
    DeviceRegisterRequest, 
    ScrapRequest,
    KeywordSubscriptionRequest
)
from app.services import knu_notice_service
from app.services.scraper import scrape_notice_content
from app.core.logger import get_logger
from app.utils.security import ensure_allowed_url # [추가] SSRF 방지용 보안 함수
from app.core.config import NOTICE_CONFIGS
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
    
    results = await knu_notice_service.search_notices(
        db, category, query=q, skip=skip, limit=limit, sort_by=sort_by
    )

    if token:
        # [보완] 토큰 존재 여부 확인 시 fetchone() 방식보다 깔끔한 스칼라 조회
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
    # [1] 보안: 허용된 도메인인지 먼저 검증 (SSRF 방지)
    ensure_allowed_url(url) # [수정] 보안 검증 추가

    notice_in_db = None
    is_scraped = False

    # [2] DB 먼저 확인
    if notice_id:
        stmt = select(Notice).filter(Notice.id == notice_id)
        result = await db.execute(stmt)
        notice_in_db = result.scalars().first()

    # [3] 캐시 로직: DB에 본문 내용이 충분히 있다면 크롤링 건너뛰기
    # 본문 길이가 10자 미만인 경우만 새로 크롤링 (데이터 보강)
    if notice_in_db and notice_in_db.content and len(notice_in_db.content) > 10:
        logger.info(f"💾 [Cache Hit] DB 데이터를 반환합니다: {notice_id}")
        scraped_data: Dict[str, Any] = {
            "title": notice_in_db.title,
            "texts": [notice_in_db.content],
            "images": notice_in_db.images or [],
            "files": notice_in_db.files or [],
            "univ_views": notice_in_db.univ_views,
            "date": notice_in_db.date
        }
    else:
        # DB에 없거나 본문이 부실하면 실시간 크롤링 수행
        logger.info(f"🌐 [Scraping] 원문 페이지를 수집합니다: {url}")
        fetched = await scrape_notice_content(url)
        if not fetched:
            raise HTTPException(status_code=404, detail="원문 페이지를 불러올 수 없습니다.")
        scraped_data = fetched

    # [4] 스크랩 여부 확인
    if notice_id and token:
        stmt_device = select(Device).filter(Device.token == token)
        res_device = await db.execute(stmt_device)
        device = res_device.scalars().first()
        if device:
            stmt_check = select(Scrap).filter(Scrap.device_id == device.id, Scrap.notice_id == notice_id)
            res_check = await db.execute(stmt_check)
            is_scraped = bool(res_check.scalars().first())

    # [5] DB 업데이트 (내용이 바뀌었거나 새로 수집된 경우)
    if notice_in_db and not (notice_in_db.content and len(notice_in_db.content) > 10):
        notice_in_db.content = "\n\n".join(scraped_data.get("texts", []))
        try:
            await db.commit()
        except Exception:
            await db.rollback()

    univ_views = scraped_data.get("univ_views", 0)
    app_views = notice_in_db.app_views if notice_in_db else 0
    
    return {
        "id": notice_id if notice_id else 0,
        "title": scraped_data["title"],
        "link": url,
        "date": scraped_data["date"],
        "category": notice_in_db.category if notice_in_db else "unknown",
        "author": notice_in_db.author if notice_in_db else None,
        "content": "\n\n".join(scraped_data.get("texts", [])),
        "images": scraped_data.get("images", []),
        "files": scraped_data.get("files", []),
        "univ_views": univ_views,
        "app_views": app_views,
        "views": (univ_views or 0) + (app_views or 0),
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

@router.post("/device/subscriptions")
async def update_device_subscriptions(
    request: KeywordSubscriptionRequest, 
    db: AsyncSession = Depends(get_db)
):
    """
    사용자의 카테고리 구독 정보를 업데이트합니다. (이미지 UI의 '완료' 대응)
    """
    # 1. 기기 존재 확인
    stmt_device = select(Device).filter(Device.token == request.token).options(selectinload(Device.subscriptions))
    res_device = await db.execute(stmt_device)
    device = res_device.scalars().first()

    if not device:
        # 기기가 없으면 새로 생성
        device = Device(token=request.token)
        db.add(device)
        await db.flush() # ID 생성을 위해 flush
    
    # 2. 요청된 카테고리(Keyword) 객체들 가져오기
    if request.categories:
        # DB에 이미 존재하는 키워드 조회
        stmt_keys = select(Keyword).where(Keyword.word.in_(request.categories))
        res_keys = await db.execute(stmt_keys)
        existing_keywords = res_keys.scalars().all()
        existing_words = {k.word for k in existing_keywords}

        # DB에 없는 키워드는 새로 생성
        new_keywords = [
            Keyword(word=cat) for cat in request.categories if cat not in existing_words
        ]
        if new_keywords:
            db.add_all(new_keywords)
            await db.flush()
            all_keywords = existing_keywords + new_keywords
        else:
            all_keywords = existing_keywords
        
        # 3. 기기의 구독 리스트 교체 (M:N 관계 업데이트)
        device.subscriptions = all_keywords
    else:
        # 카테고리가 비어있으면 모든 구독 해제
        device.subscriptions = []

    try:
        await db.commit()
        logger.info(f"🔔 구독 업데이트 성공: {device.token[:8]}... -> {request.categories}")
        return {"message": "subscriptions updated", "count": len(device.subscriptions)}
    except Exception as e:
        await db.rollback()
        logger.error(f"❌ 구독 업데이트 실패: {e}")
        raise HTTPException(status_code=500, detail="Subscription sync failed")
    
# [New] 카테고리 매핑 테이블 반환 (프론트 UI용)
@router.get("/categories")
async def get_categories():
    """notices.json 기반으로 영문 키와 한글 이름을 매핑하여 반환합니다."""
    return [{"key": k, "name": v["name"]} for k, v in NOTICE_CONFIGS.items()]