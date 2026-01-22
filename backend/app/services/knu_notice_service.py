# app/services/knu_notice_service.py
import json
import html as html_lib
import asyncio
import re
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any, Union, cast
from bs4 import BeautifulSoup, Tag
from urllib.parse import urljoin, urlparse, parse_qsl, urlencode
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
NOTIFICATION_TARGET_CATEGORIES = {"academic", "job", "scholar", "event_internal", "event_external"}

async def crawl_and_sync_notices(db: AsyncSession, category: str = "univ"):
    config = NOTICE_CONFIGS.get(category)
    if not config:
        return

    site_type = config.get("type", "main_cms") 
    candidates_map: Dict[str, Dict[str, Any]] = {} # [수정] 구조 변경: {url: {"title": str, "is_pinned": bool}}
    
    # if site_type == "library":
    #     candidates_map = await _crawl_library_list(category, config)
    # elif site_type == "daeple":
    #     candidates_map = await _crawl_daeple_list(category, config)
    # else:
    candidates_map = await _crawl_main_cms_list(category)

    if not candidates_map:
        logger.info(f"ℹ️ [{category}] 신규 공지사항 없음 (또는 목록 파싱 실패)")
        return

    await _process_candidates(db, category, candidates_map)


async def _crawl_main_cms_list(category: str) -> Dict[str, Dict[str, Any]]:
    list_url, info_url, default_seq = get_urls(category)
    if not list_url: return {}

    logger.info(f"🔄 [{category}] CMS 목록 가져오는 중...")
    try:
        html_text = await fetch_html(list_url, params={"searchMenuSeq": default_seq})
        soup = BeautifulSoup(html_text, "html.parser")
    except Exception as e:
        logger.error(f"❌ [{category}] 목록 접속 실패: {e}")
        return {}
    # 공지사항 링크들을 먼저 찾습니다.
    rows = soup.select("div.tbody > ul")
    candidates: Dict[str, Dict[str, Any]] = {}

    for ul in rows:
        try:
            # 1. 해당 행(ul) 안에 상세 페이지 링크(a.detailLink)가 있는지 확인
            a = ul.select_one("a.detailLink[data-params]")
            if not a:
                continue

            # 2. 제목 추출 (a 태그의 텍스트 또는 title 속성) - 필독 감지 전에 먼저 추출
            text_title = a.get_text(" ", strip=True)
            attr_title = a.get("title", "")
            final_title = text_title or (attr_title if isinstance(attr_title, str) else "")

            # 3. [필독 감지] 해당 행(ul) 내부의 모든 li 요소를 확인하여 span.ali_a 태그 찾기
            is_pinned = False
            
            # 방법 1: ul 내부의 모든 span.ali_a 검색 (가장 정확한 방법)
            pin_elements = ul.select("span.ali_a")
            for pin_elem in pin_elements:
                pin_text = pin_elem.get_text(strip=True)
                if "필독" in pin_text:
                    is_pinned = True
                    break
            
            # 방법 2: 첫 번째 li 요소 확인 (li.first 또는 li:first-child)
            if not is_pinned:
                first_li = ul.select_one("li.first, li:first-child")
                if first_li:
                    # 첫 번째 li 내부의 span.ali_a 확인 (가장 정확)
                    ali_a = first_li.select_one("span.ali_a")
                    if ali_a:
                        ali_a_text = ali_a.get_text(strip=True)
                        if "필독" in ali_a_text:
                            is_pinned = True
                    # span.ali_a가 없으면 첫 번째 li 전체 텍스트 확인
                    if not is_pinned:
                        first_li_text = first_li.get_text(strip=True)
                        if "필독" in first_li_text:
                            is_pinned = True
            
            # 방법 3: ul 전체에서 "필독" 검색 (최후의 수단)
            if not is_pinned:
                ul_text = ul.get_text(strip=True)
                if "필독" in ul_text:
                    # 첫 번째 li에 "필독"이 있는지 확인
                    first_li = ul.select_one("li:first-child")
                    if first_li and "필독" in first_li.get_text(strip=True):
                        is_pinned = True
            
            # 4. 데이터 파라미터 파싱
            raw_params = a.get("data-params", "")
            if not raw_params: continue
            
            # 타입 안전성을 위해 문자열로 변환 (BeautifulSoup의 _AttributeValue 타입 처리)
            raw_params_str: str = str(raw_params)
            if not raw_params_str: continue
            
            # JSON 파싱 (홑따옴표 처리 포함)
            try:
                params = json.loads(raw_params_str)
            except:
                params = json.loads(raw_params_str.replace("'", '"'))

            if not (params.get("encMenuSeq") and params.get("encMenuBoardSeq")):
                continue

            # 5. 최종 상세 URL 생성
            detail_url = (
                f"{info_url}"
                f"?scrtWrtYn={'true' if params.get('scrtWrtYn') else 'false'}"
                f"&encMenuSeq={params.get('encMenuSeq')}"
                f"&encMenuBoardSeq={params.get('encMenuBoardSeq')}"
            )
            
            # 기존에 같은 URL이 있으면 is_pinned 값 유지 (필독이 우선)
            if detail_url in candidates:
                existing_is_pinned = candidates[detail_url].get("is_pinned", False)
                is_pinned = existing_is_pinned or is_pinned
            
            candidates[detail_url] = {"title": final_title.strip(), "is_pinned": is_pinned}
            
        except Exception as e:
            logger.debug(f"Row parsing error: {e}")
            continue
    
    return candidates


# async def _crawl_library_list(category: str, config: dict) -> Dict[str, Dict[str, Any]]:
#     domain = str(config.get("domain", ""))
#     endpoint = str(config.get("url_path", "/Board?n=notice"))
#     full_url = urljoin(domain, endpoint)

#     try:
#         html_text = await fetch_html(full_url)
#         soup = BeautifulSoup(html_text, "html.parser")
#     except Exception as e:
#         logger.error(f"❌ [{category}] 도서관 접속 실패: {e}")
#         return {}

#     candidates: Dict[str, Dict[str, Any]] = {}
#     items = soup.select("dl.onroad-board dd") or soup.select("a[href*='Board/Detail']")

#     for item in items:
#         try:
#             a_tag = item.find("a") if item.name == "dd" else item
#             if not isinstance(a_tag, Tag): continue

#             link_href = a_tag.get("href")
#             if not isinstance(link_href, str) or "n=notice" not in link_href: continue
            
#             # 도서관의 경우 보통 'notice' 아이콘이나 텍스트로 구분
#             is_pinned = "공지" in item.get_text() or "notice" in str(item.get("class", ""))

#             import copy
#             a_clone = copy.copy(a_tag)
#             for tag in a_clone.select("span, i, em"): tag.decompose()
#             title = a_clone.get_text(" ", strip=True)

#             if not title or len(title) < 2: continue

#             full_detail_url = urljoin(domain, link_href)
#             candidates[full_detail_url] = {"title": title, "is_pinned": is_pinned}
#         except: continue

#     return candidates


# async def _crawl_daeple_list(category: str, config: dict) -> Dict[str, Dict[str, Any]]:
#     list_url, info_base_url, _ = get_urls(category)
#     if not list_url: return {}

#     try:
#         html_text = await fetch_html(list_url)
#         soup = BeautifulSoup(html_text, "html.parser")
#     except Exception as e:
#         logger.error(f"❌ [{category}] 대플 접속 실패: {e}")
#         return {}

#     candidates: Dict[str, Dict[str, Any]] = {}
#     parsed_list_url = urlparse(list_url)
#     base_query_params = dict(parse_qsl(parsed_list_url.query))
    
#     rows = soup.select(".bbsBoard tbody tr") or soup.select("table tbody tr")

#     for i, row in enumerate(rows):
#         try:
#             # [필독 감지] 대플은 보통 첫 번째 td에 '공지' 이미지가 있음
#             is_pinned = False
#             first_td = row.select_one("td")
#             if first_td and (first_td.select_one("img") or "공지" in first_td.get_text()):
#                 is_pinned = True

#             title_cell = row.select_one(".ellipsis, .subject") or row.find('a').parent
#             a_tag = title_cell.find("a") if title_cell else None
#             if not isinstance(a_tag, Tag): continue

#             title = a_tag.get_text(" ", strip=True)
#             href = str(a_tag.get("href") or a_tag.get("onclick") or "")
#             if len(title) < 2: continue

#             args = re.findall(r"['\"]([^'\"]*)['\"]", href)
#             if len(args) >= 3:
#                 detail_params = {
#                     "bbsId": args[2],
#                     "nttSn": args[0],
#                     **base_query_params
#                 }
#                 full_detail_url = f"{info_base_url}?{urlencode(detail_params)}"
#                 candidates[full_detail_url] = {"title": title, "is_pinned": is_pinned}

#         except Exception as e:
#             logger.debug(f"Row {i} skip: {e}")
#             continue
        
#     return candidates


async def _process_candidates(db: AsyncSession, category: str, candidates_map: Dict[str, Dict[str, Any]]):
    candidate_urls = list(candidates_map.keys())
    if not candidate_urls: return

    try:
        # 기존 공지사항 조회 (링크와 is_pinned 정보 포함)
        stmt = select(Notice).where(and_(Notice.category == category, Notice.link.in_(candidate_urls)))
        result = await db.execute(stmt)
        existing_notices = {notice.link: notice for notice in result.scalars().all()}
        existing_links = set(existing_notices.keys())
    except Exception as e:
        logger.error(f"🔥 [{category}] DB 조회 실패: {e}")
        return

    tasks = []      
    meta_info = []  
    processed_in_this_run = set()
    pinned_count = 0  # 필독 공지 카운트

    # 기존 공지사항의 필독 상태 업데이트
    updated_count = 0
    for url, data in candidates_map.items():
        if url in existing_notices:
            existing_notice = existing_notices[url]
            new_is_pinned = data["is_pinned"]
            old_is_pinned = existing_notice.is_pinned
            if old_is_pinned != new_is_pinned:
                existing_notice.is_pinned = new_is_pinned
                updated_count += 1
        if data["is_pinned"]:
            pinned_count += 1

    # 신규 공지사항 처리
    for url, data in candidates_map.items():
        if url in existing_links or url in processed_in_this_run: continue
        processed_in_this_run.add(url)
        is_pinned_flag = data.get("is_pinned", False)
        tasks.append(safe_scrape_with_semaphore(url))
        meta_info.append({"list_title": data.get("title", ""), "is_pinned": bool(is_pinned_flag), "detail_url": url, "category": category})
    
    if updated_count > 0:
        try:
            await db.commit()
            logger.info(f"✅ [{category}] 기존 공지 {updated_count}개 필독 상태 업데이트 완료")
        except Exception as e:
            await db.rollback()
            logger.error(f"🔥 [{category}] 필독 상태 업데이트 실패: {e}")
    
    if pinned_count > 0:
        logger.info(f"📌 [{category}] 총 {pinned_count}개 필독 공지 감지됨")

    # [추가] 크롤링 목록에 없는 필독 공지 자동 해제 (시간이 지나 목록에서 사라진 필독 공지 처리)
    try:
        crawled_urls = set(candidates_map.keys())
        
        # 방법 1: 크롤링 목록에 없는 필독 공지 해제
        stmt_old_pinned = select(Notice).where(
            Notice.category == category,
            Notice.is_pinned == True,
            Notice.link.not_in(crawled_urls) if crawled_urls else Notice.link != ""
        )
        result_old_pinned = await db.execute(stmt_old_pinned)
        old_pinned_notices = result_old_pinned.scalars().all()
        
        unpinned_count = 0
        for notice in old_pinned_notices:
            notice.is_pinned = False
            unpinned_count += 1
            logger.info(f"📌→📄 [{category}] 필독 해제: {notice.title[:50]}...")
        
        # 방법 2: 안전장치 - 30일 이상 된 필독 공지 자동 해제
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=30)
        stmt_expired = select(Notice).where(
            Notice.category == category,
            Notice.is_pinned == True,
            Notice.crawled_at < cutoff_date
        )
        result_expired = await db.execute(stmt_expired)
        expired_notices = result_expired.scalars().all()
        
        expired_count = 0
        for notice in expired_notices:
            if notice not in old_pinned_notices:  # 중복 방지
                notice.is_pinned = False
                expired_count += 1
                logger.info(f"⏰ [{category}] 오래된 필독 자동 해제 (30일+): {notice.title[:50]}...")
        
        total_unpinned = unpinned_count + expired_count
        if total_unpinned > 0:
            await db.commit()
            logger.info(f"✅ [{category}] {total_unpinned}개 필독 공지 자동 해제 완료 (목록 밖: {unpinned_count}, 기한 만료: {expired_count})")
    except Exception as e:
        logger.error(f"⚠️ [{category}] 필독 자동 해제 실패: {e}")
        # 실패해도 크롤링은 계속 진행

    if not tasks: return

    logger.info(f"🚀 [{category}] {len(tasks)}개 신규 상세 수집 시작")
    results = await asyncio.gather(*tasks, return_exceptions=True)
    new_notices_buffer = [] 
    
    for i, result in enumerate(results):
        if isinstance(result, Exception) or not result: 
            continue
        
        if i >= len(meta_info):
            logger.error(f"🔥 [{category}] 인덱스 불일치: result 인덱스 {i} >= meta_info 길이 {len(meta_info)}")
            continue
            
        scraped_data = cast(Dict[str, Any], result)
        meta = meta_info[i]
        
        final_title = str(scraped_data.get("title") or meta["list_title"])
        content_lines = scraped_data.get("texts", [])
        final_content = "\n\n".join(content_lines) if isinstance(content_lines, list) else ""
        is_pinned_value = meta.get("is_pinned", False)
        
        new_notice = Notice(
            title=final_title,
            link=meta["detail_url"],
            date=scraped_data.get("date"),
            content=final_content,
            images=scraped_data.get("images", []),
            files=scraped_data.get("files", []),
            category=meta["category"],
            univ_views=scraped_data.get("univ_views", 0),
            app_views=0,
            is_pinned=is_pinned_value # [추가] 필독 여부 저장
        )
        
        if is_pinned_value:
            logger.info(f"📌 [{category}] 필독 공지 저장: {final_title[:60]}...")
        
        db.add(new_notice)
        new_notices_buffer.append(new_notice)

    if new_notices_buffer:
        try:
            await db.commit()
            logger.info(f"✅ [{category}] {len(new_notices_buffer)}개 저장 완료")
            
            if category in NOTIFICATION_TARGET_CATEGORIES:
                await send_keyword_notifications(db, new_notices_buffer)
        except Exception as e:
            await db.rollback()
            logger.error(f"🔥 DB 커밋 실패: {e}")


async def safe_scrape_with_semaphore(url: str):
    async with SCRAPE_SEMAPHORE:
        await asyncio.sleep(0.5) 
        return await scrape_notice_content(url)


async def search_notices(
    db: AsyncSession, 
    category: str, 
    query: Optional[str] = None, 
    skip: int = 0, 
    limit: int = 20, 
    sort_by: str = "date"
):
    """공지사항 검색 및 조회 (API용) - 필독 우선 정렬 적용"""
    stmt = select(Notice)
    if category != "all":
        stmt = stmt.where(Notice.category == category)
    if query:
        stmt = stmt.where(Notice.title.like(f"%{query}%"))
    
    # [수정] 1순위: 필독(is_pinned), 2순위: 날짜(date), 3순위: ID
    if sort_by == "views":
        stmt = stmt.order_by(Notice.is_pinned.desc(), Notice.univ_views.desc())
    else:
        stmt = stmt.order_by(Notice.is_pinned.desc(), Notice.date.desc().nulls_last(), Notice.id.desc())
        
    stmt = stmt.offset(skip).limit(limit)
    result = await db.execute(stmt)
    return result.scalars().all()

# ... (기존 get_or_create_summary 함수 유지)

async def get_or_create_summary(db: AsyncSession, notice_id: int) -> str:
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

    if len(content_to_use) < 5:
        logger.info(f"🔍 [Auto-Rescrape] ID:{notice_id} 본문 보강 시도")
        scraped_data = await scrape_notice_content(notice.link)
        if scraped_data:
            content_to_use = "\n\n".join(scraped_data.get("texts", []))
            image_list = scraped_data.get("images", [])
            notice.content = content_to_use
            try:
                notice.images = image_list 
            except: pass
            
    summary = await generate_summary(content_to_use, image_list)
    notice.summary = summary
    await db.commit()
    return summary