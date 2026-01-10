# app/services/knu_notice_service.py
import json
import html as html_lib
import asyncio
from bs4 import BeautifulSoup
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from app.services.ai_service import generate_summary
from app.core.config import get_urls 
from app.core.http import fetch_html
from app.database.models import Notice
from app.services.scraper import scrape_notice_content
from app.core.logger import get_logger
from app.services.notification_service import send_keyword_notifications

logger = get_logger()
# 동시성 제한 (학교 서버 부하 방지용)
SCRAPE_SEMAPHORE = asyncio.Semaphore(3) 
NOTIFICATION_TARGET_CATEGORIES = {"academic", "job", "scholar"}

# [주의] 이 함수는 반드시 파일의 최상위 레벨(들여쓰기 없음)에 있어야 합니다.
async def crawl_and_sync_notices(db: AsyncSession, category: str = "univ"):
    """
    해당 카테고리의 공지사항을 크롤링하고 DB에 저장합니다.
    """
    list_url, info_url, default_seq = get_urls(category)
    if not list_url: return

    logger.info(f"🔄 [{category}] 목록 가져오는 중...")
    
    # 1. 목록 HTML 가져오기
    try:
        html_text = await fetch_html(list_url, params={"searchMenuSeq": default_seq})
        soup = BeautifulSoup(html_text, "html.parser")
    except Exception as e:
        logger.error(f"❌ [{category}] 네트워크 접속 실패: {e}")
        return

    items = soup.select("a.detailLink[data-params]")
    if not items: 
        logger.info(f"ℹ️ [{category}] 게시글이 없거나 파싱 실패")
        return

    # 2. 후보군 추출
    candidates_map = {} 
    
    for a in items:
        try:
            list_title = a.get_text(" ", strip=True) or a.get("title", "").strip()
            raw_params = html_lib.unescape(a.get("data-params", "")).strip()
            
            try: params = json.loads(raw_params)
            except: 
                try: params = json.loads(raw_params.replace("'", '"'))
                except: continue 

            if not (params.get("encMenuSeq") and params.get("encMenuBoardSeq")): continue

            detail_url = (
                f"{info_url}"
                f"?scrtWrtYn={'true' if params.get('scrtWrtYn') else 'false'}"
                f"&encMenuSeq={params.get('encMenuSeq')}"
                f"&encMenuBoardSeq={params.get('encMenuBoardSeq')}"
            )
            candidates_map[detail_url] = list_title
        except: continue
    
    if not candidates_map: return
    candidate_urls = list(candidates_map.keys())

    # 3. DB 중복 체크 (Async Query)
    try:
        stmt = select(Notice.link).where(
            and_(
                Notice.category == category,
                Notice.link.in_(candidate_urls)
            )
        )
        result = await db.execute(stmt)
        existing_links = set(result.scalars().all())
    except Exception as e:
        logger.error(f"🔥 [{category}] DB 조회 실패: {e}")
        return

    # 4. 저장 대상 선별
    tasks = []      
    meta_info = []  
    processed_in_this_run = set()

    for url, title in candidates_map.items():
        if url in existing_links: continue
        if url in processed_in_this_run: continue
        processed_in_this_run.add(url)

        tasks.append(safe_scrape_with_semaphore(url))
        meta_info.append({"list_title": title, "detail_url": url, "category": category})

    if not tasks:
        return

    logger.info(f"🚀 [{category}] {len(tasks)}개 신규 공지 상세 수집 시작")

    # 5. 비동기 크롤링 실행
    results = await asyncio.gather(*tasks, return_exceptions=True)
    new_notices_buffer = [] 
    
    for i, result in enumerate(results):
        # 예외 발생 시 건너뜀
        if isinstance(result, Exception) or not result:
            continue
            
        scraped_data = result
        meta = meta_info[i]
        final_title = scraped_data["title"] or meta["list_title"]
        
        new_notice = Notice(
            title=final_title,
            link=meta["detail_url"],
            date=scraped_data.get("date"),
            content="\n\n".join(scraped_data["texts"]),
            images=scraped_data["images"],
            files=scraped_data["files"],
            category=meta["category"],
            univ_views=scraped_data.get("univ_views", 0),
            app_views=0
        )
        db.add(new_notice)
        new_notices_buffer.append(new_notice)

    # 6. 트랜잭션 커밋
    if new_notices_buffer:
        try:
            await db.commit()
            logger.info(f"✅ [{category}] {len(new_notices_buffer)}개 저장 완료")
            
            if category in NOTIFICATION_TARGET_CATEGORIES:
                # 알림 발송 시도 (실패해도 크롤링은 성공 처리)
                try:
                    await send_keyword_notifications(db, new_notices_buffer)
                except Exception as ne:
                    logger.error(f"⚠️ 알림 발송 중 오류: {ne}")
                    
        except Exception as e:
            await db.rollback()
            if "UNIQUE constraint" in str(e):
                logger.warning(f"⚠️ [{category}] 중복 데이터 무시됨")
            else:
                logger.error(f"🔥 DB 커밋 실패: {e}")

async def get_or_create_summary(db: AsyncSession, notice_id: int) -> str:
    """
    공지사항 요약을 가져오거나, 없으면 생성(필요시 재크롤링)하여 저장하는 비즈니스 로직
    """
    stmt = select(Notice).where(Notice.id == notice_id)
    result = await db.execute(stmt)
    notice = result.scalars().first()
    
    if not notice:
        raise ValueError("Notice not found")
        
    if notice.summary:
        return notice.summary

    # 본문이 너무 짧으면(50자 미만) 재크롤링 시도
    content_to_use = notice.content or ""
    image_list = []
    
    if notice.images:
        try:
            image_list = json.loads(str(notice.images))
        except:
            pass

    if len(content_to_use) < 50:
        logger.info(f"🔍 [Auto-Rescrape] ID:{notice_id} 본문 보강 시도")
        # [주의] scrape_notice_content 내부에서도 get_client()를 쓰도록 scraper.py 수정 필요
        # 현재는 scraper.py가 내부적으로 httpx를 쓴다면 수정 권장, 여기선 기존 함수 호출
        scraped_data = await scrape_notice_content(notice.link)
        
        if scraped_data:
            content_to_use = "\n\n".join(scraped_data["texts"])
            image_list = scraped_data["images"]
            
            notice.content = content_to_use
            notice.images = json.dumps(image_list, ensure_ascii=False)

    # AI 요약 생성
    summary = await generate_summary(content_to_use, image_list)
    
    # DB 저장
    notice.summary = summary
    await db.commit()
    
    return summary
async def safe_scrape_with_semaphore(url: str):
    """세마포어를 이용한 안전한 스크래핑"""
    async with SCRAPE_SEMAPHORE:
        await asyncio.sleep(0.5) 
        return await scrape_notice_content(url)

async def search_notices(db: AsyncSession, category: str, query: str = None, skip: int = 0, limit: int = 20, sort_by: str = "date"):
    """공지사항 검색 및 조회 (API용)"""
    stmt = select(Notice)
    
    if category != "all":
        stmt = stmt.where(Notice.category == category)
        
    if query:
        stmt = stmt.where(Notice.title.like(f"%{query}%"))
        
    if sort_by == "views":
        stmt = stmt.order_by(Notice.univ_views.desc())
    else:
        stmt = stmt.order_by(Notice.date.desc().nulls_last(), Notice.id.desc())
        
    stmt = stmt.offset(skip).limit(limit)
    result = await db.execute(stmt)
    return result.scalars().all()