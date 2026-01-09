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

# [Concurrency] 동시 요청 수 제한 (서버 부하 방지)
SCRAPE_SEMAPHORE = asyncio.Semaphore(5)

async def crawl_and_sync_notices(db: Session, category: str = "univ"):
    print(f"🔄 [{category}] 동기화 작업 시작...")
    
    list_url, info_url, default_seq = get_urls(category)
    
    # 1. 목록 페이지 가져오기 (네트워크 에러 처리)
    try:
        html_text = await fetch_html(list_url, params={"searchMenuSeq": default_seq})
        soup = BeautifulSoup(html_text, "html.parser")
    except Exception as e:
        print(f"❌ [{category}] 목록 접근 실패: {e}")
        return

    processed_links = set() 
    tasks = []      
    meta_info = []  

    # 2. 목록 파싱 및 Task 생성
    for a in soup.select("a.detailLink[data-params]"):
        try:
            list_title = a.get_text(" ", strip=True) or a.get("title", "").strip()
            raw = html_lib.unescape(a.get("data-params", "")).strip()

            # JSON 파싱 에러 처리
            try:
                params = json.loads(raw)
            except json.JSONDecodeError:
                # 홑따옴표 처리 시도
                try:
                    params = json.loads(raw.replace("'", '"'))
                except Exception:
                    continue 

            enc_menu_seq = params.get("encMenuSeq")
            enc_menu_board_seq = params.get("encMenuBoardSeq")
            scrt_wrt_yn = params.get("scrtWrtYn", False)

            if not (enc_menu_seq and enc_menu_board_seq):
                continue

            detail_url = (
                f"{info_url}"
                f"?scrtWrtYn={'true' if scrt_wrt_yn else 'false'}"
                f"&encMenuSeq={enc_menu_seq}"
                f"&encMenuBoardSeq={enc_menu_board_seq}"
            )

            if detail_url in processed_links: continue
            processed_links.add(detail_url)

            # DB 중복 체크
            if db.query(Notice).filter(Notice.link == detail_url).first():
                continue

            # Task 추가
            tasks.append(safe_scrape_with_semaphore(detail_url))
            meta_info.append({
                "list_title": list_title,
                "detail_url": detail_url,
                "category": category
            })

        except Exception as e:
            # 목록 아이템 하나 처리하다 에러나도 전체는 계속 진행
            print(f"⚠️ 아이템 전처리 스킵: {e}")
            continue

    if not tasks:
        print(f"💤 [{category}] 새로운 공지가 없습니다.")
        return

    print(f"🚀 [{category}] {len(tasks)}개의 공지 스크래핑 시작 (Async)...")
    
    # [Concurrency] 병렬 실행
    results = await asyncio.gather(*tasks)

    # 3. DB 저장
    new_count = 0
    
    for i, scraped_data in enumerate(results):
        meta = meta_info[i]
        
        # [Exception Handling] 스크래퍼가 None을 반환했다면(에러 발생) 저장 건너뜀
        if scraped_data is None:
            # print(f"   Pass: {meta['list_title']} (스크래핑 실패)")
            continue

        try:
            final_title = scraped_data["title"] if scraped_data["title"] else meta["list_title"]
            content_body = "\n\n".join(scraped_data["texts"])
            images_json = json.dumps(scraped_data["images"], ensure_ascii=False)
            files_json = json.dumps(scraped_data["files"], ensure_ascii=False)
            
            # [Date Fix] 이제 post_date는 datetime.date 객체임
            post_date = scraped_data.get("date")
            u_views = scraped_data.get("univ_views", 0)

            new_notice = Notice(
                title=final_title,
                link=meta["detail_url"],
                date=post_date,       # Date 타입 컬럼에 객체 저장
                content=content_body,
                images=images_json,
                files=files_json,
                category=meta["category"],
                univ_views=u_views,
                app_views=0
            )
            
            db.add(new_notice)
            new_count += 1
            
        except Exception as e:
            print(f"⚠️ DB 매핑 에러 ({meta['list_title']}): {e}")

    try:
        db.commit()
        if new_count > 0:
            print(f"✅ [{category}] {new_count}개 저장 완료!")
    except Exception as e:
        db.rollback()
        print(f"🔥 DB 커밋 실패: {e}")


async def safe_scrape_with_semaphore(url: str):
    """
    세마포어를 통해 동시 실행 제어
    """
    async with SCRAPE_SEMAPHORE:
        return await scrape_notice_content(url)


def search_notices_from_db(
    db: Session, 
    category: str, 
    query: str = None, 
    skip: int = 0, 
    limit: int = 20,
    sort_by: str = "date"
):
    sql = db.query(Notice)
    
    if category != "all":
        sql = sql.filter(Notice.category == category)
    
    if query:
        search_filter = f"%{query}%"
        sql = sql.filter(
            or_(Notice.title.like(search_filter), Notice.content.like(search_filter))
        )
    
    if sort_by == "views":
        # 인기순
        sql = sql.order_by((Notice.univ_views + Notice.app_views).desc())
    else:
        # [Date Fix] 날짜순 정렬 (Date 타입이므로 이제 1월이 10월보다 앞으로 오지 않고 정상 작동함)
        sql = sql.order_by(Notice.date.desc(), Notice.id.desc())
    
    return sql.offset(skip).limit(limit).all()