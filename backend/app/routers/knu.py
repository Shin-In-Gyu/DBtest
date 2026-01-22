# app/routers/knu.py
import json
from typing import List, Optional, cast
from datetime import date as DateType

from fastapi import APIRouter, Depends, Query, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, or_, desc, func, and_
from sqlalchemy.orm import selectinload
from slowapi import Limiter
from slowapi.util import get_remote_address

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
from app.utils.security import ensure_allowed_url
from app.core.config import NOTICE_CONFIGS

router = APIRouter()
logger = get_logger()
limiter = Limiter(key_func=get_remote_address)

# [New] 일반 카테고리 정의 (순서 지정용)
GENERAL_CATEGORIES = ["academic", "scholar", "learning", "job", "event_internal", "event_external"]

# ============================================================
# 공지사항 목록 조회 (페이지네이션 개선)
# ============================================================
@router.get("/notices")
async def read_notices(
    request: Request,
    category: str = "all",
    q: Optional[str] = Query(None, description="검색어"),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    sort_by: str = Query("date", pattern="^(date|views)$"),
    token: Optional[str] = Query(None, description="스크랩 확인용 토큰"),
    db: AsyncSession = Depends(get_db)
):
    """
    공지사항 목록 조회 (페이지네이션 + 메타데이터 포함)
    """
    skip = (page - 1) * size
    
    # 전체 개수 조회
    count_stmt = select(func.count(Notice.id))
    if category != "all":
        count_stmt = count_stmt.where(Notice.category == category)
    if q:
        count_stmt = count_stmt.where(Notice.title.like(f"%{q}%"))
    
    total_result = await db.execute(count_stmt)
    total = total_result.scalar() or 0
    
    # 목록 조회
    results = await knu_notice_service.search_notices(
        db, category, query=q, skip=skip, limit=size, sort_by=sort_by
    )

    # 스크랩 여부 확인
    if token:
        stmt_device = select(Device).filter(Device.token == token)
        res_device = await db.execute(stmt_device)
        device = res_device.scalars().first()
        
        if device:
            stmt_scrap = select(Scrap.notice_id).filter(Scrap.device_id == device.id)
            res_scrap = await db.execute(stmt_scrap)
            my_scrap_ids = set(res_scrap.scalars().all())
            
            for notice in results:
                # [수정] Notice 객체의 동적 속성 할당 (NoticeListResponse에서 처리됨)
                setattr(notice, "is_scraped", notice.id in my_scrap_ids)

    return {
        "items": results,
        "total": total,
        "page": page,
        "size": size,
        "total_pages": (total + size - 1) // size if total > 0 else 0
    }

# ============================================================
# 공지사항 상세 조회 (캐싱 로직 유지)
# ============================================================
@router.get("/notice/detail", response_model=NoticeDetailResponse)
async def get_notice_detail(
    request: Request,
    url: str, 
    notice_id: Optional[int] = None, 
    token: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    ensure_allowed_url(url)

    notice_in_db = None
    is_scraped = False

    if notice_id:
        stmt = select(Notice).filter(Notice.id == notice_id)
        result = await db.execute(stmt)
        notice_in_db = result.scalars().first()

    # 캐싱 로직
    if notice_in_db and notice_in_db.content and len(notice_in_db.content) > 10:
        logger.info(f"💾 [Cache Hit] DB 데이터를 반환합니다: {notice_id}")
        scraped_data = {
            "title": notice_in_db.title,
            "texts": [notice_in_db.content],
            "images": notice_in_db.images or [],
            "files": notice_in_db.files or [],
            "univ_views": notice_in_db.univ_views,
            "date": notice_in_db.date
        }
    else:
        logger.info(f"🌐 [Scraping] 원문 페이지를 수집합니다: {url}")
        fetched = await scrape_notice_content(url)
        if not fetched:
            raise HTTPException(status_code=404, detail="원문 페이지를 불러올 수 없습니다.")
        scraped_data = fetched

    # 스크랩 여부 확인
    if notice_id and token:
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

    # DB 업데이트
    if notice_in_db and not (notice_in_db.content and len(notice_in_db.content) > 10):
        notice_in_db.content = "\n\n".join(scraped_data.get("texts", []))
        try:
            await db.commit()
        except Exception:
            await db.rollback()

    univ_views = scraped_data.get("univ_views", 0)
    app_views = notice_in_db.app_views if notice_in_db else 0
    # [수정] NoticeDetailResponse 스키마에 맞춰 정확한 타입 가딩 후 반환
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
        "is_pinned": scraped_data.get("is_pinned", False), # [추가] 필독 여부 반환
        "summary": notice_in_db.summary if notice_in_db else None
    }

# ============================================================
# 조회수 증가 (Rate Limiting 적용)
# ============================================================
@router.post("/notice/{notice_id}/view")
@limiter.limit("10/minute")
async def increment_view_count(
    request: Request,
    notice_id: int, 
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Notice).filter(Notice.id == notice_id)
    result = await db.execute(stmt)
    notice = result.scalars().first()
    
    if not notice:
        raise HTTPException(status_code=404, detail="공지사항을 찾을 수 없습니다")
    
    try:
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

# ============================================================
# AI 요약 생성 (Rate Limiting 강화)
# ============================================================
@router.post("/notice/{notice_id}/summary")
@limiter.limit("5/minute")
async def create_notice_summary(
    request: Request,
    notice_id: int, 
    db: AsyncSession = Depends(get_db)
):
    """
    AI 요약 생성 (분당 5회 제한)
    """
    try:
        summary = await knu_notice_service.get_or_create_summary(db, notice_id)
        return {"summary": summary}
    except ValueError:
        raise HTTPException(status_code=404, detail="공지사항을 찾을 수 없습니다.")
    except Exception as e:
        logger.error(f"Summary Error: {e}")
        raise HTTPException(status_code=500, detail="서버 내부 오류")

# ============================================================
# 기기 등록
# ============================================================
@router.post("/device/register")
async def register_device(
    request: DeviceRegisterRequest, 
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Device).filter(Device.token == request.token)
    result = await db.execute(stmt)
    existing = result.scalars().first()
    
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

# ============================================================
# 스크랩 토글
# ============================================================
@router.post("/scrap/{notice_id}")
async def toggle_scrap(
    notice_id: int, 
    request: ScrapRequest, 
    db: AsyncSession = Depends(get_db)
):
    res_device = await db.execute(
        select(Device).filter(Device.token == request.token)
    )
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

# ============================================================
# 내 스크랩 목록
# ============================================================
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

# ============================================================
# 카테고리 구독 설정
# ============================================================
@router.post("/device/subscriptions")
async def update_device_subscriptions(
    request: KeywordSubscriptionRequest, 
    db: AsyncSession = Depends(get_db)
):
    stmt_device = select(Device).filter(Device.token == request.token).options(
        selectinload(Device.subscriptions)
    )
    res_device = await db.execute(stmt_device)
    device = res_device.scalars().first()

    if not device:
        device = Device(token=request.token)
        db.add(device)
        await db.flush()
    
    if request.categories:
        stmt_keys = select(Keyword).where(Keyword.word.in_(request.categories))
        res_keys = await db.execute(stmt_keys)
        existing_keywords: List[Keyword] = list(res_keys.scalars().all())
        existing_words = {k.word for k in existing_keywords}

        new_keywords: List[Keyword] = [
            Keyword(word=cat) for cat in request.categories 
            if cat not in existing_words
        ]
        all_keywords: List[Keyword]
        if new_keywords:
            db.add_all(new_keywords)
            await db.flush()
            all_keywords = existing_keywords + new_keywords
        else:
            all_keywords = existing_keywords
        
        device.subscriptions = all_keywords
    else:
        device.subscriptions = []

    try:
        await db.commit()
        logger.info(f"🔔 구독 업데이트: {device.token[:8]}... -> {request.categories}")
        return {
            "message": "subscriptions updated", 
            "count": len(device.subscriptions)
        }
    except Exception as e:
        await db.rollback()
        logger.error(f"❌ 구독 업데이트 실패: {e}")
        raise HTTPException(status_code=500, detail="Subscription sync failed")

# ============================================================
# 카테고리 목록 조회
# ============================================================
@router.get("/categories")
async def get_categories():
    """notices.json 기반 카테고리 목록 반환 (프론트엔드 동적 구성용)"""
    general = []
    dept = []

    for key, val in NOTICE_CONFIGS.items():
        item = {
            "id": key,
            "label": val.get("name", key)
        }
        
        if key in GENERAL_CATEGORIES:
            general.append(item)
        else:
            dept.append(item)
            
    # 일반 카테고리: 지정된 순서대로 정렬
    general.sort(key=lambda x: GENERAL_CATEGORIES.index(x["id"]) if x["id"] in GENERAL_CATEGORIES else 999)
    
    # 학과 카테고리: 이름순 정렬
    dept.sort(key=lambda x: x["label"])
    
    return {
        "general": general,
        "dept": dept
    }

# ============================================================
# 수동 크롤링 실행 (테스트/디버깅용)
# ============================================================
@router.post("/admin/crawl")
async def manual_crawl(
    category: Optional[str] = Query(None, description="크롤링할 카테고리 (없으면 전체)"),
    db: AsyncSession = Depends(get_db)
):
    """수동으로 크롤링 실행 (필독 감지 테스트용)"""
    try:
        categories_to_crawl = [category] if category and category in NOTICE_CONFIGS else list(NOTICE_CONFIGS.keys())
        
        results = {}
        for cat in categories_to_crawl:
            logger.info(f"🚀 수동 크롤링 시작: {cat}")
            await knu_notice_service.crawl_and_sync_notices(db, cat)
            
            # 필독 공지 개수 확인
            stmt = select(func.count(Notice.id)).where(
                and_(Notice.category == cat, Notice.is_pinned == True)
            )
            result = await db.execute(stmt)
            pinned_count = result.scalar() or 0
            
            results[cat] = {
                "status": "success",
                "pinned_count": pinned_count
            }
        
        return {
            "message": "크롤링 완료",
            "results": results
        }
    except Exception as e:
        logger.error(f"❌ 수동 크롤링 실패: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================
# 고급 검색 (신규)
# ============================================================
@router.get("/search/advanced")
async def advanced_search(
    request: Request,
    q: Optional[str] = Query(None, description="검색어"),
    category: Optional[str] = Query(None),
    date_from: Optional[DateType] = Query(None),
    date_to: Optional[DateType] = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    """
    고급 검색 (제목+내용, 기간 필터)
    """
    stmt = select(Notice)
    
    # 검색어 (제목 + 내용)
    if q:
        stmt = stmt.where(
            or_(
                Notice.title.ilike(f"%{q}%"),
                Notice.content.ilike(f"%{q}%")
            )
        )
    
    # 카테고리 필터
    if category and category != "all":
        stmt = stmt.where(Notice.category == category)
    
    # 날짜 범위
    if date_from:
        stmt = stmt.where(Notice.date >= date_from)
    if date_to:
        stmt = stmt.where(Notice.date <= date_to)
    
    # 정렬 및 페이지네이션
    # [수정] 고급 검색에서도 필독 공지를 가장 먼저 보여줌
    stmt = stmt.order_by(
        Notice.is_pinned.desc(), 
        Notice.date.desc().nulls_last(), 
        Notice.id.desc()
    )
    stmt = stmt.offset((page - 1) * size).limit(size)
    
    result = await db.execute(stmt)
    notices = result.scalars().all()
    
    return {
        "items": notices,
        "page": page,
        "size": size
    }

# ============================================================
# 통계 API (신규)
# ============================================================
@router.get("/stats")
async def get_statistics(db: AsyncSession = Depends(get_db)):
    """
    관리자용 통계 정보
    """
    from datetime import datetime, timezone
    
    # 카테고리별 공지 개수
    category_result = await db.execute(
        select(Notice.category, func.count(Notice.id))
        .group_by(Notice.category)
    )
    category_stats = {str(row[0]): int(row[1]) for row in category_result.all()}
    
    # 오늘 크롤링된 공지 수
    today = datetime.now(timezone.utc).date()
    today_result = await db.execute(
        select(func.count(Notice.id))
        .where(func.date(Notice.crawled_at) == today)
    )
    today_count = today_result.scalar() or 0
    
    # 전체 기기 수
    device_result = await db.execute(select(func.count(Device.id)))
    device_count = device_result.scalar() or 0
    
    # 전체 공지 수
    total_result = await db.execute(select(func.count(Notice.id)))
    total_notices = total_result.scalar() or 0
    
    return {
        "total_notices": total_notices,
        "by_category": category_stats,
        "today_crawled": today_count,
        "total_devices": device_count
    }