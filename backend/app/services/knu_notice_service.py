# app/services/knu_notice_service.py
import json
import html as html_lib
import asyncio
from bs4 import BeautifulSoup
from urllib.parse import urljoin
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.services.ai_service import generate_summary
from app.core.config import get_urls, NOTICE_CONFIGS
from app.core.http import fetch_html
from app.database.models import Notice
from app.services.scraper import scrape_notice_content
from app.core.logger import get_logger
from app.services.notification_service import send_keyword_notifications

logger = get_logger()
SCRAPE_SEMAPHORE = asyncio.Semaphore(3) 
NOTIFICATION_TARGET_CATEGORIES = {"academic", "job", "scholar", "library"}

async def crawl_and_sync_notices(db: AsyncSession, category: str = "univ"):
    config = NOTICE_CONFIGS.get(category)
    if not config:
        return

    site_type = config.get("type", "main_cms") 

    candidates_map = {}
    
    if site_type == "library":
        candidates_map = await _crawl_library_list(category, config)
    else:
        candidates_map = await _crawl_main_cms_list(category)

    if not candidates_map:
        # 로그 레벨을 Info로 낮춰 불필요한 걱정 방지 (데이터가 진짜 없을 수도 있음)
        logger.info(f"ℹ️ [{category}] 신규 공지사항 없음 (또는 목록 파싱 실패)")
        return

    await _process_candidates(db, category, candidates_map)


async def _crawl_main_cms_list(category: str):
    list_url, info_url, default_seq = get_urls(category)
    if not list_url: return {}

    logger.info(f"🔄 [{category}] CMS 목록 가져오는 중...")
    try:
        html_text = await fetch_html(list_url, params={"searchMenuSeq": default_seq})
        soup = BeautifulSoup(html_text, "html.parser")
    except Exception as e:
        logger.error(f"❌ [{category}] 목록 접속 실패: {e}")
        return {}

    items = soup.select("a.detailLink[data-params]")
    candidates = {}

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
            candidates[detail_url] = list_title
        except: continue
    
    return candidates


# --------------------------------------------------------------------------
# [Logic B] 도서관 (lib.kangnam.ac.kr) 목록 파싱 (최종 수정)
# --------------------------------------------------------------------------
async def _crawl_library_list(category: str, config: dict):
    domain = config.get("domain")
    endpoint = config.get("list_endpoint") # /Board?n=notice
    full_url = urljoin(domain, endpoint)

    logger.info(f"🔄 [{category}] 도서관 목록 가져오는 중... ({full_url})")
    try:
        html_text = await fetch_html(full_url)
        soup = BeautifulSoup(html_text, "html.parser")
    except Exception as e:
        logger.error(f"❌ [{category}] 도서관 접속 실패: {e}")
        return {}

    candidates = {}
    
    # [핵심 변경] HTML 구조(dl, table 등) 무시하고 "Board/Detail" 링크만 찾음
    # 사용자가 제공한 URL 패턴: /Board/Detail/20251218...
    link_items = soup.select("a[href*='Board/Detail']")
    
    if not link_items:
        # 혹시나 해서 상대경로 '../Board/Detail' 등도 고려
        link_items = soup.select("a[href*='Detail']")

    if not link_items:
        logger.warning(f"⚠️ [{category}] 목록에서 상세 링크를 찾을 수 없습니다.")
        return {}

    for a in link_items:
        try:
            link_href = a.get("href")
            if not link_href: continue
            # URL에 'n=notice'가 포함되지 않은 경우(예: n=free)는 건너뜁니다.
            # -----------------------------------------------------------
            if "n=notice" not in link_href:
                continue
            # [제목 추출]
            # 링크 내부에 span(날짜, 작성자 등)이 섞여있으면 제거
            # (soup 객체 복사 비용을 아끼기 위해 텍스트 정제 방식 사용)
            
            # 1. 텍스트 추출 전 span 태그들 임시 제거 (DOM 조작 주의)
            # 여기서는 안전하게 text만 가져온 뒤 정제
            # 보통 도서관 구조: <a> Title <span class='mobile-date'>Date</span> </a>
            
            # span 태그를 제외한 직계 텍스트만 가져오는 것은 복잡하므로
            # 간단히 decompose() 사용 (현재 soup는 이 함수 끝나면 버려지므로 괜찮음)
            for span in a.select("span"):
                span.decompose()
            
            title = a.get_text(" ", strip=True)

            # 제목 유효성 체크
            if not title or len(title) < 2: 
                continue

            full_detail_url = urljoin(full_url, link_href)
            candidates[full_detail_url] = title
            
        except Exception:
            continue

    return candidates

# ... (아래 _process_candidates 등은 기존 코드와 동일)
async def _process_candidates(db: AsyncSession, category: str, candidates_map: dict):
    candidate_urls = list(candidates_map.keys())

    # DB 중복 체크
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

    # 저장 대상 선별
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

    logger.info(f"🚀 [{category}] {len(tasks)}개 신규 상세 수집 시작")

    results = await asyncio.gather(*tasks, return_exceptions=True)
    new_notices_buffer = [] 
    
    for i, result in enumerate(results):
        if isinstance(result, Exception) or not result:
            logger.warning(f"⚠️ 상세 파싱 실패: {meta_info[i]['detail_url']}")
            continue
            
        scraped_data = result
        meta = meta_info[i]
        final_title = scraped_data["title"] if scraped_data["title"] else meta["list_title"]
        
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

    # 트랜잭션 커밋
    if new_notices_buffer:
        try:
            await db.commit()
            logger.info(f"✅ [{category}] {len(new_notices_buffer)}개 저장 완료")
            
            if category in NOTIFICATION_TARGET_CATEGORIES:
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

async def safe_scrape_with_semaphore(url: str):
    """세마포어를 이용한 안전한 스크래핑"""
    async with SCRAPE_SEMAPHORE:
        await asyncio.sleep(0.5) 
        return await scrape_notice_content(url)

async def get_or_create_summary(db: AsyncSession, notice_id: int) -> str:
    """공지사항 요약을 가져오거나, 없으면 생성(필요시 재크롤링)하여 저장"""
    stmt = select(Notice).where(Notice.id == notice_id)
    result = await db.execute(stmt)
    notice = result.scalars().first()
    
    if not notice:
        raise ValueError("Notice not found")
        
    if notice.summary:
        return notice.summary

    content_to_use = notice.content or ""
    image_list = []
    
    if notice.images:
        try: image_list = json.loads(str(notice.images))
        except: pass

    if len(content_to_use) < 2:
        logger.info(f"🔍 [Auto-Rescrape] ID:{notice_id} 본문 보강 시도")
        scraped_data = await scrape_notice_content(notice.link)
        if scraped_data:
            content_to_use = "\n\n".join(scraped_data["texts"])
            image_list = scraped_data["images"]
            notice.content = content_to_use
            notice.images = json.dumps(image_list, ensure_ascii=False)

    summary = await generate_summary(content_to_use, image_list)
    notice.summary = summary
    await db.commit()
    return summary

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