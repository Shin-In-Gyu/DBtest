# app/services/knu_notice_service.py
import json
import html as html_lib
import asyncio
from bs4 import BeautifulSoup
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.core.config import get_urls 
from app.core.http import fetch_html
from app.database.models import Notice
from app.services.scraper import scrape_notice_content
from app.core.logger import get_logger
from app.services.notification_service import send_keyword_notifications

logger = get_logger()
SCRAPE_SEMAPHORE = asyncio.Semaphore(5)
NOTIFICATION_TARGET_CATEGORIES = {"academic", "job", "scholar"}

async def crawl_and_sync_notices(db: Session, category: str = "univ"):
    list_url, info_url, default_seq = get_urls(category)
    if not list_url:
        return

    logger.info(f"🔄 [{category}] 동기화 시작")
    
    try:
        html_text = await fetch_html(list_url, params={"searchMenuSeq": default_seq})
        soup = BeautifulSoup(html_text, "html.parser")
    except Exception as e:
        logger.error(f"❌ [{category}] 목록 접근 실패: {e}")
        return

    processed_links = set()
    tasks = []      
    meta_info = []  

    items = soup.select("a.detailLink[data-params]")
    if not items:
        # 게시글이 없거나 차단된 경우
        return

    for a in items:
        try:
            list_title = a.get_text(" ", strip=True) or a.get("title", "").strip()
            raw = html_lib.unescape(a.get("data-params", "")).strip()

            try: params = json.loads(raw)
            except: 
                try: params = json.loads(raw.replace("'", '"'))
                except: continue 

            if not (params.get("encMenuSeq") and params.get("encMenuBoardSeq")):
                continue

            detail_url = (
                f"{info_url}"
                f"?scrtWrtYn={'true' if params.get('scrtWrtYn') else 'false'}"
                f"&encMenuSeq={params.get('encMenuSeq')}"
                f"&encMenuBoardSeq={params.get('encMenuBoardSeq')}"
            )

            if detail_url in processed_links: continue
            processed_links.add(detail_url)
            
            # [최적화] 이미 존재하는 링크는 스킵 (id만 조회해서 가볍게 체크)
            if db.query(Notice.id).filter(Notice.link == detail_url).first():
                continue

            tasks.append(safe_scrape_with_semaphore(detail_url))
            meta_info.append({"list_title": list_title, "detail_url": detail_url, "category": category})

        except Exception:
            continue

    if not tasks:
        return

    logger.info(f"🚀 [{category}] {len(tasks)}개 신규 공지 발견 -> 상세 수집 중")
    results = await asyncio.gather(*tasks)

    new_notices_buffer = [] # 알림용 데이터 임시 저장
    success_count = 0
    
    for i, scraped_data in enumerate(results):
        if scraped_data is None: continue
        meta = meta_info[i]

        try:
            final_title = scraped_data["title"] if scraped_data["title"] else meta["list_title"]
            
            new_notice = Notice(
                title=final_title,
                link=meta["detail_url"],
                date=scraped_data.get("date"),
                content="\n\n".join(scraped_data["texts"]),
                images=json.dumps(scraped_data["images"], ensure_ascii=False),
                files=json.dumps(scraped_data["files"], ensure_ascii=False),
                category=meta["category"],
                univ_views=scraped_data.get("univ_views", 0),
                app_views=0
            )
            
            db.add(new_notice)
            success_count += 1
            # 알림 발송을 위해 객체 정보를 딕셔너리로 저장
            new_notices_buffer.append({
                "title": final_title,
                "link": meta["detail_url"],
                "category": meta["category"]
            })
            
        except Exception as e:
            logger.error(f"⚠️ DB 매핑 에러: {e}")

    if success_count > 0:
        try:
            db.commit()
            logger.info(f"✅ [{category}] {success_count}개 저장 완료")
            
            # 알림 대상 카테고리면 알림 발송
            if category in NOTIFICATION_TARGET_CATEGORIES:
                await send_keyword_notifications(db, new_notices_buffer)
                
        except Exception as e:
            db.rollback()
            logger.critical(f"🔥 DB 커밋 실패: {e}")

async def safe_scrape_with_semaphore(url: str):
    async with SCRAPE_SEMAPHORE:
        await asyncio.sleep(0.1) # 서버 보호용 미세 딜레이
        return await scrape_notice_content(url)

# [DB 검색 함수] Router에서 사용
def search_notices(db: Session, category: str, query: str = None, skip: int = 0, limit: int = 20, sort_by: str = "date"):
    sql = db.query(Notice)
    if category != "all":
        sql = sql.filter(Notice.category == category)
    if query:
        search_filter = f"%{query}%"
        sql = sql.filter(or_(Notice.title.like(search_filter), Notice.content.like(search_filter)))
    
    if sort_by == "views":
        sql = sql.order_by((Notice.univ_views + Notice.app_views).desc())
    else:
        sql = sql.order_by(Notice.date.desc(), Notice.id.desc())
    
    return sql.offset(skip).limit(limit).all()