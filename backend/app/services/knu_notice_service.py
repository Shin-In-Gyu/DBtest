# app/services/knu_notice_service.py
import json
import html as html_lib
import asyncio
import re
from typing import Optional, List, Dict, Any, Union, cast
from bs4 import BeautifulSoup
from urllib.parse import urljoin
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from urllib.parse import urljoin, urlparse, parse_qsl, urlencode
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

    candidates_map = {}
    
    if site_type == "library":
        # candidates_map = await _crawl_library_list(category, config)
        pass
    elif site_type == "daeple":  # [Fix] 대플(취창업) 함수 연결
        # candidates_map = await _crawl_daeple_list(category, config)
        pass
    else:
        candidates_map = await _crawl_main_cms_list(category)

    if not candidates_map:
        logger.info(f"ℹ️ [{category}] 신규 공지사항 없음 (또는 목록 파싱 실패)")
        return

    await _process_candidates(db, category, candidates_map)


async def _crawl_main_cms_list(category: str):
    list_url, info_url, default_seq = get_urls(category)
    if not list_url: return {}

    logger.info(f"🔄 [{category}] CMS 목록 가져오는 중...")
    try:
        params = {"searchMenuSeq": default_seq} if default_seq else {}
        html_text = await fetch_html(list_url, params={"searchMenuSeq": default_seq})
        soup = BeautifulSoup(html_text, "html.parser")
    except Exception as e:
        logger.error(f"❌ [{category}] 목록 접속 실패: {e}")
        return {}

    items = soup.select("a.detailLink[data-params]")
    candidates = {}

    for a in items:
        try:
            # [Fix] Pylance Error: 'strip' unknown for AttributeValueList
            # 1. 텍스트 추출
            text_title = a.get_text(" ", strip=True)
            
            # 2. title 속성 안전하게 추출 (List | str | None 대응)
            attr_title_val = a.get("title", "")
            if isinstance(attr_title_val, list):
                attr_title_val = " ".join(attr_title_val)
            elif attr_title_val is None:
                attr_title_val = ""
            
            final_attr_title = str(attr_title_val).strip()
            
            # 3. 최종 제목 결정
            list_title = text_title or final_attr_title
            
            # [Fix] Pylance Error: get() returns str | list | None 대응
            raw_params_val = a.get("data-params", "")
            if isinstance(raw_params_val, list):
                raw_params_val = "".join(raw_params_val)
            elif raw_params_val is None:
                raw_params_val = ""
            
            raw_params = html_lib.unescape(str(raw_params_val)).strip()
            
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
# [Logic B] 도서관 (lib.kangnam.ac.kr) 목록 파싱
# --------------------------------------------------------------------------
async def _crawl_library_list(category: str, config: dict):
    domain = str(config.get("domain", ""))
    endpoint = str(config.get("url_path", "/Board?n=notice"))
    full_url = urljoin(domain, endpoint)

    logger.info(f"🔄 [{category}] 도서관 목록 가져오는 중... ({full_url})")
    try:
        html_text = await fetch_html(full_url)
        soup = BeautifulSoup(html_text, "html.parser")
    except Exception as e:
        logger.error(f"❌ [{category}] 도서관 접속 실패: {e}")
        return {}

    candidates = {}
    
    items = soup.select("dl.onroad-board dd")
    
    if not items:
        items = soup.select("a[href*='Board/Detail']")

    if not items:
        logger.warning(f"⚠️ [{category}] 목록 요소를 찾을 수 없습니다.")
        return {}

    for item in items:
        try:
            a_tag = item.find("a") if item.name == "dd" else item
            if not a_tag: continue

            link_href = a_tag.get("href")
            if not isinstance(link_href, str):
                continue

            if "n=notice" not in link_href:
                continue
            
            import copy
            a_clone = copy.copy(a_tag)
            for tag in a_clone.select("span, i, em"):
                tag.decompose()
            
            title = a_clone.get_text(" ", strip=True)

            if not title or len(title) < 2: 
                continue

            full_detail_url = urljoin(str(domain), link_href)
            candidates[full_detail_url] = title
            
        except Exception:
            continue

    return candidates
# --------------------------------------------------------------------------
# [Logic C] 대플 (취창업) 목록 파싱 (Javascript fnDetail 해석)
# --------------------------------------------------------------------------
# [Logic C] 대플 (취창업) 목록 파싱 (Javascript fnDetail 해석 - 최종 수정판)
from urllib.parse import urlparse, parse_qsl, urlencode # 상단 import에 추가 필요

async def _crawl_daeple_list(category: str, config: dict):
    list_url, info_base_url, _ = get_urls(category)
    if not list_url: return {}

    logger.info(f"🔄 [{category}] 대플 목록 가져오는 중... ({list_url})")
    try:
        html_text = await fetch_html(list_url)
        soup = BeautifulSoup(html_text, "html.parser")
    except Exception as e:
        logger.error(f"❌ [{category}] 대플 접속 실패: {e}")
        return {}

    candidates = {}
    
    # [1] 목록 URL에서 필수 파라미터(메뉴코드 등) 추출
    # 예: CURRENT_MENU_CODE=MENU0067&TOP_MENU_CODE=MENU0067&BD_NO=1
    parsed_list_url = urlparse(list_url)
    base_query_params = dict(parse_qsl(parsed_list_url.query))
    
    # [2] 행(Row) 찾기
    rows = soup.select(".bbsBoard tbody tr")
    if not rows: rows = soup.select("table tbody tr")
    if not rows: rows = soup.select("table tr")
        
    logger.info(f"🔍 [{category}] 감지된 행 개수: {len(rows)}")

    for i, row in enumerate(rows):
        try:
            # 제목 셀 찾기 (th 또는 td)
            title_cell = (
                row.select_one("th.ellipsis") or 
                row.select_one("td.ellipsis") or 
                row.select_one("td.subject")
            )
            
            if not title_cell:
                # 못 찾았으면 a 태그가 있는 첫 번째 셀 시도
                for cell in row.find_all(['td', 'th']):
                    if cell.find('a'):
                        title_cell = cell
                        break
            
            if not title_cell: continue
            
            a_tag = title_cell.find("a")
            if not a_tag: continue

            # 데이터 추출
            title = a_tag.get_text(" ", strip=True)
            href = a_tag.get("href") or a_tag.get("onclick") or ""
            
            if len(title) < 2: continue

            # [3] 자바스크립트 인자 파싱
            # fnDetail('3862', '', '109414', '1') -> [3862, '', 109414, 1]
            args = re.findall(r"['\"]([^'\"]*)['\"]", str(href))
            
            if len(args) >= 3:
                ntt_sn = args[0]  # 3862
                bbs_id = args[2]  # 109414
                
                # [4] URL 조립 (필수 파라미터 병합)
                # 기존 q_bbsId -> bbsId 로 변경 (404 해결 시도)
                detail_params = {
                    "bbsId": bbs_id,
                    "nttSn": ntt_sn,
                    **base_query_params # 리스트의 메뉴 코드 등을 그대로 상속
                }
                
                # 쿼리스트링 생성
                query_string = urlencode(detail_params)
                full_detail_url = f"{info_base_url}?{query_string}"
                
                candidates[full_detail_url] = title
            else:
                if i < 3: 
                    logger.warning(f"⚠️ [daeple] 링크 파싱 실패 (Row {i}): {href}")

        except Exception as e:
            logger.error(f"❌ [daeple] Row {i} 처리 중 에러: {e}")
            continue

    if candidates:
        logger.info(f"✅ [{category}] 유효 공지 {len(candidates)}개 식별됨")
    else:
        logger.warning(f"⚠️ [{category}] 행은 찾았으나 유효한 공지 링크를 추출하지 못했습니다.")
        
    return candidates

async def _process_candidates(db: AsyncSession, category: str, candidates_map: dict):
    candidate_urls = list(candidates_map.keys())
    if not candidate_urls: return

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
        # [수정] Exception 타입 체크 강화
        if isinstance(result, Exception) or not result:
            logger.warning(f"⚠️ 상세 파싱 실패: {meta_info[i]['detail_url']} | 사유: {result}")
            continue
        
        scraped_data = cast(Dict[str, Any], result)
        meta = meta_info[i]
        
        # [보완] 제목이 크롤링 데이터에 없으면 목록 제목 사용 (Pylance safe)
        scraped_title = scraped_data.get("title")
        final_title = str(scraped_title) if scraped_title else meta["list_title"]
        
        # [보완] 리스트 형태의 데이터 안전하게 조인
        content_lines = scraped_data.get("texts", [])
        final_content = "\n\n".join(content_lines) if isinstance(content_lines, list) else ""

        new_notice = Notice(
            title=final_title,
            link=meta["detail_url"],
            date=scraped_data.get("date"),
            content=final_content,
            images=scraped_data.get("images", []),
            files=scraped_data.get("files", []),
            category=meta["category"],
            univ_views=scraped_data.get("univ_views", 0),
            app_views=0
        )
        db.add(new_notice)
        new_notices_buffer.append(new_notice)
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
    async with SCRAPE_SEMAPHORE:
        await asyncio.sleep(0.5) 
        return await scrape_notice_content(url)

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

async def search_notices(
    db: AsyncSession, 
    category: str, 
    query: Optional[str] = None, 
    skip: int = 0, 
    limit: int = 20, 
    sort_by: str = "date"
):
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