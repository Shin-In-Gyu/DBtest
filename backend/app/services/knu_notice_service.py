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

# 동시 접속 제한 (최대 5개) - 학교 서버 차단 방지
SCRAPE_SEMAPHORE = asyncio.Semaphore(5)

# 알림을 보낼 대상 카테고리
NOTIFICATION_TARGET_CATEGORIES = {"academic", "job", "scholar"}

async def crawl_and_sync_notices(db: Session, category: str = "univ"):
    logger.info(f"🔄 [{category}] 동기화 작업 시작...")
    
    # 1. 목록 페이지 가져오기
    list_url, info_url, default_seq = get_urls(category)
    try:
        html_text = await fetch_html(list_url, params={"searchMenuSeq": default_seq})
        soup = BeautifulSoup(html_text, "html.parser")
    except Exception as e:
        logger.error(f"❌ [{category}] 목록 접근 실패: {e}")
        return

    processed_links = set()
    tasks = []      
    meta_info = []  

    # 2. 목록 파싱 & 신규 글 필터링
    for a in soup.select("a.detailLink[data-params]"):
        try:
            list_title = a.get_text(" ", strip=True) or a.get("title", "").strip()
            raw = html_lib.unescape(a.get("data-params", "")).strip()

            # JSON 파싱 (가끔 형식이 깨진 경우가 있어 예외처리)
            try:
                params = json.loads(raw)
            except Exception:
                try: params = json.loads(raw.replace("'", '"'))
                except: continue 

            # 필수 파라미터 확인
            if not (params.get("encMenuSeq") and params.get("encMenuBoardSeq")):
                continue

            # 상세 URL 생성
            detail_url = (
                f"{info_url}"
                f"?scrtWrtYn={'true' if params.get('scrtWrtYn') else 'false'}"
                f"&encMenuSeq={params.get('encMenuSeq')}"
                f"&encMenuBoardSeq={params.get('encMenuBoardSeq')}"
            )

            # 중복 체크 (이번 실행 내 & DB 내)
            if detail_url in processed_links: continue
            processed_links.add(detail_url)
            
            if db.query(Notice).filter(Notice.link == detail_url).first():
                continue

            # 작업 예약 (실행은 나중에)
            tasks.append(safe_scrape_with_semaphore(detail_url))
            meta_info.append({
                "list_title": list_title,
                "detail_url": detail_url,
                "category": category
            })

        except Exception:
            continue

    if not tasks:
        logger.info(f"💤 [{category}] 새 공지 없음")
        return

    # 3. 병렬 스크래핑 실행 (asyncio.gather)
    logger.info(f"🚀 [{category}] {len(tasks)}개 신규 공지 스크래핑...")
    results = await asyncio.gather(*tasks)

    # 4. DB 저장 및 알림용 버퍼 생성
    new_notices_buffer = []
    new_count = 0
    
    for i, scraped_data in enumerate(results):
        meta = meta_info[i]
        if scraped_data is None: continue # 실패한 건 패스

        try:
            # 제목 우선순위: 상세페이지 > 목록페이지
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
            new_count += 1
            
            # 알림 발송을 위해 버퍼에 추가
            new_notices_buffer.append({
                "title": final_title,
                "link": meta["detail_url"],
                "category": meta["category"]
            })
            
        except Exception as e:
            logger.error(f"⚠️ DB 매핑 에러: {e}")

    try:
        db.commit()
        if new_count > 0:
            logger.info(f"✅ [{category}] {new_count}개 저장 완료")
            
            # 5. 키워드 알림 발송 (해당되는 카테고리만)
            if category in NOTIFICATION_TARGET_CATEGORIES:
                await send_keyword_notifications(db, new_notices_buffer)
                
    except Exception as e:
        db.rollback()
        logger.critical(f"🔥 DB 커밋 실패: {e}")

async def safe_scrape_with_semaphore(url: str):
    """동시 접속 수 제한을 적용하여 스크래퍼 호출"""
    async with SCRAPE_SEMAPHORE:
        return await scrape_notice_content(url)

# DB 검색 함수
def search_notices_from_db(db: Session, category: str, query: str = None, skip: int = 0, limit: int = 20, sort_by: str = "date"):
    sql = db.query(Notice)
    if category != "all":
        sql = sql.filter(Notice.category == category)
    if query:
        search_filter = f"%{query}%"
        sql = sql.filter(or_(Notice.title.like(search_filter), Notice.content.like(search_filter)))
    
    # 정렬 로직 (날짜순 / 조회순)
    if sort_by == "views":
        sql = sql.order_by((Notice.univ_views + Notice.app_views).desc())
    else:
        sql = sql.order_by(Notice.date.desc(), Notice.id.desc())
    
    return sql.offset(skip).limit(limit).all()