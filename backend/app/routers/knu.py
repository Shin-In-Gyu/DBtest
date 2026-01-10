# app/routers/knu.py
import json
import traceback
from typing import List, Optional, Set

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session

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
# 1. 공지사항 목록 조회
# --------------------------------------------------------------------------
@router.get("/notices", response_model=List[NoticeListResponse])
async def read_notices(
    category: str = "all",
    q: Optional[str] = Query(None, description="검색어"),
    page: int = 1,
    sort_by: str = "date",
    token: Optional[str] = Query(None, description="스크랩 확인용 토큰"),
    db: Session = Depends(get_db)
):
    limit = 20
    skip = (page - 1) * limit
    
    # DB 조회
    results = knu_notice_service.search_notices(
        db, category, query=q, skip=skip, limit=limit, sort_by=sort_by
    )

    # 스크랩 여부 마킹 (Set을 사용하여 O(1) 조회 속도 확보)
    if token:
        device = db.query(Device).filter(Device.token == token).first()
        if device:
            my_scrap_ids: Set[int] = {
                s.notice_id for s in db.query(Scrap.notice_id).filter(Scrap.device_id == device.id).all()
            }
            for notice in results:
                if notice.id in my_scrap_ids:
                    notice.is_scraped = True

    return results

# --------------------------------------------------------------------------
# 2. 공지사항 상세 조회 (본문 업데이트 및 정보 반환)
# --------------------------------------------------------------------------
@router.get("/notice/detail", response_model=NoticeDetailResponse)
async def get_notice_detail(
    url: str, 
    notice_id: Optional[int] = None, 
    token: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    notice_in_db = None
    is_scraped = False

    # A. DB 조회 및 조회수 증가
    if notice_id:
        notice_in_db = db.query(Notice).filter(Notice.id == notice_id).first()
        if notice_in_db:
            try:
                # 조회수 1 증가 (Dirty Read 방지 위해 별도 쿼리 권장되나 여기선 간단히 처리)
                notice_in_db.app_views += 1
                db.commit()
            except:
                db.rollback()

            # 스크랩 여부 확인
            if token:
                device = db.query(Device).filter(Device.token == token).first()
                if device and device.id:
                    exists = db.query(Scrap).filter(
                        Scrap.device_id == device.id, 
                        Scrap.notice_id == notice_id
                    ).first()
                    is_scraped = bool(exists)

    # B. 실시간 내용 크롤링
    scraped_data = await scrape_notice_content(url)
    if not scraped_data:
        raise HTTPException(status_code=404, detail="원문 페이지를 불러올 수 없습니다.")

    # C. DB에 본문 텍스트 백업 (AI 요약을 위함)
    if notice_in_db:
        new_full_content = "\n\n".join(scraped_data["texts"])
        # 내용이 변경되었거나 비어있었다면 업데이트
        if notice_in_db.content != new_full_content:
            notice_in_db.content = new_full_content
            try:
                db.commit()
            except:
                db.rollback()

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
# 3. AI 요약 생성 (On-Demand)
# --------------------------------------------------------------------------
@router.post("/notice/{notice_id}/summary")
async def create_notice_summary(notice_id: int, db: Session = Depends(get_db)):
    try:
        notice = db.query(Notice).filter(Notice.id == notice_id).first()
        if not notice:
            raise HTTPException(status_code=404, detail="공지사항을 찾을 수 없습니다.")

        # 이미 요약된 내용이 있으면 바로 반환 (캐싱 효과)
        if notice.summary:
            return {"summary": notice.summary}

        # 이미지 리스트 파싱 (JSON 에러 방지)
        image_list = []
        if notice.images:
            try:
                raw_images = str(notice.images).strip()
                if raw_images and raw_images.lower() != "none":
                    image_list = json.loads(raw_images)
            except json.JSONDecodeError:
                image_list = []

        # 요약 대상 텍스트 준비
        content_to_use = notice.content or ""

        # 내용 확인
        if len(content_to_use) < 10 and not image_list:
             raise HTTPException(status_code=400, detail="요약할 내용이 부족합니다.")

        # AI 호출
        logger.info(f"🤖 [Gemini] 요약 요청: ID {notice_id}")
        summary_text = await generate_summary(content_to_use, image_list)

        if not summary_text:
             raise HTTPException(status_code=500, detail="AI 응답을 받지 못했습니다.")

        # 결과 저장
        notice.summary = summary_text
        db.commit()
        
        return {"summary": summary_text}

    except HTTPException as http_ex:
        raise http_ex
    except Exception as e:
        db.rollback()
        logger.error(f"🔥 [Summary Error] {e}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail="서버 내부 오류 발생")

# --------------------------------------------------------------------------
# 4. 기기 등록 및 스크랩 API
# --------------------------------------------------------------------------
@router.post("/device/register")
async def register_device(request: DeviceRegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(Device).filter(Device.token == request.token).first()
    
    if existing:
        existing.keywords = request.keywords
        logger.info(f"🔄 기기 갱신: {request.token[:8]}...")
    else:
        new_device = Device(token=request.token, keywords=request.keywords)
        db.add(new_device)
        logger.info(f"✨ 기기 등록: {request.token[:8]}...")
    
    try:
        db.commit()
        return {"message": "success", "keywords": request.keywords}
    except:
        db.rollback()
        raise HTTPException(status_code=500, detail="기기 등록 실패")

@router.post("/scrap/{notice_id}")
async def toggle_scrap(notice_id: int, request: ScrapRequest, db: Session = Depends(get_db)):
    device = db.query(Device).filter(Device.token == request.token).first()
    if not device:
        raise HTTPException(status_code=404, detail="기기 등록이 필요합니다.")

    notice = db.query(Notice).filter(Notice.id == notice_id).first()
    if not notice:
        raise HTTPException(status_code=404, detail="공지사항이 없습니다.")

    existing_scrap = db.query(Scrap).filter(
        Scrap.device_id == device.id, 
        Scrap.notice_id == notice_id
    ).first()

    try:
        if existing_scrap:
            db.delete(existing_scrap)
            db.commit()
            return {"status": "removed", "message": "스크랩 취소됨"}
        else:
            new_scrap = Scrap(device_id=device.id, notice_id=notice_id)
            db.add(new_scrap)
            db.commit()
            return {"status": "added", "message": "스크랩 저장됨"}
    except Exception as e:
        db.rollback()
        logger.error(f"스크랩 에러: {e}")
        raise HTTPException(status_code=500, detail="DB Error")

@router.get("/scraps", response_model=List[NoticeListResponse])
async def get_my_scraps(token: str, db: Session = Depends(get_db)):
    device = db.query(Device).filter(Device.token == token).first()
    if not device:
        return []

    scraped_notices = (
        db.query(Notice)
        .join(Scrap, Notice.id == Scrap.notice_id)
        .filter(Scrap.device_id == device.id)
        .order_by(Scrap.created_at.desc())
        .all()
    )

    for notice in scraped_notices:
        notice.is_scraped = True
        
    return scraped_notices