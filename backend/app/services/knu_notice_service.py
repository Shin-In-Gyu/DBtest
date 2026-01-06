import json
import html as html_lib
import asyncio
from bs4 import BeautifulSoup
from urllib.parse import urljoin
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.core.config import get_urls 
from app.core.http import fetch_html
from app.database.models import Notice

async def crawl_and_sync_notices(db: Session, category: str = "univ"):
    print(f"🔄 [{category}] 동기화 작업 시작...")
    
    list_url, info_url, default_seq = get_urls(category)
    
    try:
        html_text = await fetch_html(list_url, params={"searchMenuSeq": default_seq})
        soup = BeautifulSoup(html_text, "html.parser")
    except Exception as e:
        print(f"❌ [{category}] 네트워크 오류: {e}")
        return

    new_count = 0
    # [NEW] 이번 크롤링 턴에서 처리한 링크를 기억하는 집합
    processed_links = set() 
    
    for a in soup.select("a.detailLink[data-params]"):
        try:
            # 1. 파싱 로직
            title = a.get_text(" ", strip=True) or a.get("title", "").strip()
            raw = html_lib.unescape(a.get("data-params", "")).strip()

            try:
                params = json.loads(raw)
            except Exception:
                try:
                    params = json.loads(raw.replace("'", '"'))
                except Exception:
                    continue

            enc_menu_seq = params.get("encMenuSeq")
            enc_menu_board_seq = params.get("encMenuBoardSeq")
            scrt_wrt_yn = params.get("scrtWrtYn", False)

            if not (enc_menu_seq and enc_menu_board_seq):
                continue

            # 2. 링크 생성
            detail_url = (
                f"{info_url}"
                f"?scrtWrtYn={'true' if scrt_wrt_yn else 'false'}"
                f"&encMenuSeq={enc_menu_seq}"
                f"&encMenuBoardSeq={enc_menu_board_seq}"
            )

            # -------------------------------------------------------
            # [FIX] 이중 방어막 가동!
            # -------------------------------------------------------
            
            # 방어막 1단계: 방금 내가 처리한 링크인가? (상단 고정 공지 중복 방지)
            if detail_url in processed_links:
                continue
            processed_links.add(detail_url)

            # 방어막 2단계: 옛날에 DB에 저장한 링크인가?
            if db.query(Notice).filter(Notice.link == detail_url).first():
                continue

            # -------------------------------------------------------

            # 3. 상세 내용 가져오기
            detail_content = await get_notice_content_only(detail_url)

            # 4. 저장 준비
            new_notice = Notice(
                title=title,
                link=detail_url,
                content=detail_content,
                category=category,
            )
            db.add(new_notice)
            new_count += 1
            
            await asyncio.sleep(0.1) 

        except Exception as e:
            print(f"⚠️ 아이템 처리 중 에러: {e}")
            continue

    try:
        db.commit() # 한방에 저장
        if new_count > 0:
            print(f"✅ [{category}] {new_count}개 신규 공지 저장 완료!")
        else:
            print(f"💤 [{category}] 새로운 공지가 없습니다.")
    except Exception as e:
        db.rollback() # 에러나면 되돌리기
        print(f"🔥 DB 저장 중 치명적 오류 (롤백됨): {e}")


async def get_notice_content_only(detail_url: str) -> str:
    try:
        html = await fetch_html(detail_url)
        soup = BeautifulSoup(html, "html.parser")
        content_el = soup.select_one(".view_cont, .board_view, .contents, #contents, .content")
        return content_el.get_text("\n", strip=True) if content_el else ""
    except Exception:
        return ""

def search_notices_from_db(db: Session, category: str, query: str = None, skip: int = 0, limit: int = 20):
    sql = db.query(Notice)
    if category != "all":
        sql = sql.filter(Notice.category == category)
    if query:
        search_filter = f"%{query}%"
        sql = sql.filter(
            or_(Notice.title.like(search_filter), Notice.content.like(search_filter))
        )
    return sql.order_by(Notice.id.desc()).offset(skip).limit(limit).all()