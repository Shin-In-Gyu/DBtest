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
# 동시 접속 제한 (너무 많은 요청은 학교 서버 IP 차단 원인이 됨)
SCRAPE_SEMAPHORE = asyncio.Semaphore(5)
NOTIFICATION_TARGET_CATEGORIES = {"academic", "job", "scholar"}

async def crawl_and_sync_notices(db: Session, category: str = "univ"):
    """
    해당 카테고리의 공지사항 목록을 긁어와서 DB와 동기화합니다.
    """
    list_url, info_url, default_seq = get_urls(category)
    if not list_url:
        return

    logger.info(f"🔄 [{category}] 동기화 시작...")
    
    # 1. 목록 HTML 가져오기
    try:
        html_text = await fetch_html(list_url, params={"searchMenuSeq": default_seq})
        soup = BeautifulSoup(html_text, "html.parser")
    except Exception as e:
        logger.error(f"❌ [{category}] 목록 접근 실패: {e}")
        return

    # 2. 파싱 및 신규 게시글 탐색
    tasks = []      
    meta_info = []  
    processed_links = set()

    items = soup.select("a.detailLink[data-params]")
    if not items:
        return

    for a in items:
        try:
            # 제목 및 파라미터 추출
            list_title = a.get_text(" ", strip=True) or a.get("title", "").strip()
            raw_params = html_lib.unescape(a.get("data-params", "")).strip()

            # 안전한 JSON 로드
            params = {}
            try:
                params = json.loads(raw_params)
            except json.JSONDecodeError:
                # 가끔 따옴표가 잘못된 경우가 있음 -> 단순 치환 시도
                try: 
                    params = json.loads(raw_params.replace("'", '"'))
                except: 
                    continue 

            if not (params.get("encMenuSeq") and params.get("encMenuBoardSeq")):
                continue

            # 상세 URL 조합
            detail_url = (
                f"{info_url}"
                f"?scrtWrtYn={'true' if params.get('scrtWrtYn') else 'false'}"
                f"&encMenuSeq={params.get('encMenuSeq')}"
                f"&encMenuBoardSeq={params.get('encMenuBoardSeq')}"
            )

            # 중복 체크
            if detail_url in processed_links: 
                continue
            processed_links.add(detail_url)
            
            # DB에 이미 있는지 확인 (가벼운 쿼리)
            if db.query(Notice.id).filter(Notice.link == detail_url).first():
                continue

            # 신규 글이면 상세 스크래핑 태스크 추가
            tasks.append(safe_scrape_with_semaphore(detail_url))
            meta_info.append({
                "list_title": list_title, 
                "detail_url": detail_url, 
                "category": category
            })

        except Exception:
            continue

    if not tasks:
        return

    logger.info(f"🚀 [{category}] {len(tasks)}개 신규 공지 수집 중...")
    
    # 3. 비동기 병렬 스크래핑 수행
    results = await asyncio.gather(*tasks)

    new_notices_buffer = [] 
    success_count = 0
    
    # 4. 결과 저장
    for i, scraped_data in enumerate(results):
        if scraped_data is None: 
            continue
        
        meta = meta_info[i]
        final_title = scraped_data["title"] if scraped_data["title"] else meta["list_title"]
        
        try:
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
            
            new_notices_buffer.append({
                "title": final_title,
                "link": meta["detail_url"],
                "category": meta["category"]
            })
            
        except Exception as e:
            logger.error(f"⚠️ DB 매핑 에러 ({meta['list_title']}): {e}")

    if success_count > 0:
        try:
            db.commit()
            logger.info(f"✅ [{category}] {success_count}개 저장 완료")
            
            # 키워드 알림 발송
            if category in NOTIFICATION_TARGET_CATEGORIES:
                await send_keyword_notifications(db, new_notices_buffer)
                
        except Exception as e:
            db.rollback()
            logger.critical(f"🔥 DB 커밋 실패: {e}")

async def safe_scrape_with_semaphore(url: str):
    """
    세마포어를 이용해 동시 접속 수를 제한하며 스크래핑합니다.
    """
    async with SCRAPE_SEMAPHORE:
        await asyncio.sleep(0.1) # 서버 과부하 방지용 미세 딜레이
        return await scrape_notice_content(url)

def search_notices(db: Session, category: str, query: str = None, skip: int = 0, limit: int = 20, sort_by: str = "date"):
    """
    공지사항 검색 및 필터링 쿼리 빌더
    """
    sql = db.query(Notice)
    
    if category != "all":
        sql = sql.filter(Notice.category == category)
        
    if query:
        search_filter = f"%{query}%"
        sql = sql.filter(or_(Notice.title.like(search_filter), Notice.content.like(search_filter)))
    
    if sort_by == "views":
        # 학교 조회수 + 앱 내 조회수 합산 정렬
        sql = sql.order_by((Notice.univ_views + Notice.app_views).desc())
    else:
        # 최신순 (날짜 -> ID 역순)
        sql = sql.order_by(Notice.date.desc(), Notice.id.desc())
    
    return sql.offset(skip).limit(limit).all()