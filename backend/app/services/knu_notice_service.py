import json
import html as html_lib
import asyncio
from bs4 import BeautifulSoup
from sqlalchemy.orm import Session
from sqlalchemy import or_

# [설정 및 유틸리티] 프로젝트 내 다른 파일들에서 필요한 기능을 가져옵니다.
from app.core.config import get_urls 
from app.core.http import fetch_html
from app.database.models import Notice

# [스크래퍼] 상세 페이지의 내부(본문, 파일, 이미지)를 긁어오는 핵심 함수입니다.
from app.services.scraper import scrape_notice_content

async def crawl_and_sync_notices(db: Session, category: str = "univ"):
    """
    지정된 카테고리(예: 'univ', 'job' 등)의 공지사항을 크롤링하여 DB와 동기화합니다.
    
    1. 목록 페이지에 접속하여 게시글 리스트를 가져옵니다.
    2. 각 게시글의 상세 페이지 링크를 생성합니다.
    3. DB에 없는 새로운 글이라면 상세 페이지 내용을 스크래핑합니다.
    4. 제목, 본문, 이미지(JSON), 파일(JSON)로 정리하여 DB에 저장합니다.
    """
    print(f"🔄 [{category}] 동기화 작업 시작...")
    
    # 1. 설정 파일(config.py)에서 해당 카테고리의 URL 정보 가져오기
    list_url, info_url, default_seq = get_urls(category)
    
    # 2. 목록 페이지 HTML 가져오기 (네트워크 요청)
    try:
        # fetch_html: 비동기 HTTP 요청을 보내 HTML 텍스트를 받아옵니다.
        html_text = await fetch_html(list_url, params={"searchMenuSeq": default_seq})
        soup = BeautifulSoup(html_text, "html.parser") # HTML 파싱 준비
    except Exception as e:
        print(f"❌ [{category}] 네트워크 오류 발생: {e}")
        return

    new_count = 0 # 새로 저장된 글의 개수를 세기 위한 변수
    
    # [방어막 1] 이번 실행 루프에서 처리한 URL을 기록하는 집합 (상단 고정 공지 중복 방지용)
    processed_links = set() 
    
    # 3. HTML에서 공지사항 리스트(<a> 태그) 추출하여 반복문 실행
    # select("a.detailLink[data-params]") : class가 detailLink이고 data-params 속성이 있는 <a> 태그만 찾음
    for a in soup.select("a.detailLink[data-params]"):
        try:
            # -------------------------------------------------------
            # [Step 1] 목록에서 기본 정보(제목, 파라미터) 추출
            # -------------------------------------------------------
            list_title = a.get_text(" ", strip=True) or a.get("title", "").strip()
            
            # data-params 속성에 있는 암호화된 파라미터 문자열을 가져옴 (HTML 특수문자 해독 포함)
            raw = html_lib.unescape(a.get("data-params", "")).strip()

            # JSON 형태의 문자열을 파이썬 딕셔너리로 변환
            try:
                params = json.loads(raw)
            except Exception:
                # 가끔 JSON 표준인 큰따옴표(") 대신 작은따옴표(')를 쓰는 경우가 있어 예외 처리
                try:
                    params = json.loads(raw.replace("'", '"'))
                except Exception:
                    continue # JSON 파싱 실패 시 해당 글 건너뜀

            # 링크 생성에 필요한 핵심 ID 값 추출
            enc_menu_seq = params.get("encMenuSeq")
            enc_menu_board_seq = params.get("encMenuBoardSeq")
            scrt_wrt_yn = params.get("scrtWrtYn", False) # 비밀글 여부

            # 필수 파라미터가 없으면 건너뜀
            if not (enc_menu_seq and enc_menu_board_seq):
                continue

            # -------------------------------------------------------
            # [Step 2] 상세 페이지 접속을 위한 최종 URL 조립
            # -------------------------------------------------------
            detail_url = (
                f"{info_url}"
                f"?scrtWrtYn={'true' if scrt_wrt_yn else 'false'}"
                f"&encMenuSeq={enc_menu_seq}"
                f"&encMenuBoardSeq={enc_menu_board_seq}"
            )

            # [중복 검사 1] 방금 처리한 링크라면 건너뜀 (상단 고정 공지가 목록에 중복 노출되는 경우 방지)
            if detail_url in processed_links:
                continue
            processed_links.add(detail_url)

            # [중복 검사 2] 이미 DB에 저장된 링크라면 건너뜀 (가장 중요한 부분!)
            # filter(Notice.link == detail_url) : 링크가 일치하는 데이터가 있는지 확인
            if db.query(Notice).filter(Notice.link == detail_url).first():
                continue

            # -------------------------------------------------------
            # [Step 3] 상세 페이지 내용 스크래핑 (scraper.py 호출)
            # -------------------------------------------------------
            try:
                # 여기서 실제로 상세 페이지에 접속하여 제목, 본문, 이미지, 파일 정보를 가져옴
                # scraped_data = {"title": "...", "texts": [...], "images": [...], "files": [...]}
                scraped_data = await scrape_notice_content(detail_url)
            except Exception as e:
                print(f"   ⚠️ 상세 크롤링 실패 ({list_title}): {e}")
                continue

            # -------------------------------------------------------
            # [Step 4] 데이터 가공 및 DB 객체 생성
            # -------------------------------------------------------
            
            # (1) 제목 결정: 상세 페이지 안의 제목이 더 정확하므로 우선 사용, 없으면 목록 제목 사용
            final_title = scraped_data["title"] if scraped_data["title"] else list_title
            
            # (2) 본문 병합: 여러 줄로 나뉜 텍스트 리스트를 하나의 문자열로 합침
            content_body = "\n\n".join(scraped_data["texts"])

            # (3) [중요] 이미지와 파일 리스트를 JSON 문자열로 변환
            # DB에는 리스트를 직접 저장할 수 없으므로 텍스트(JSON) 형태로 변환해서 저장해야 함
            # ensure_ascii=False : 한글이 깨지지 않고 사람이 읽을 수 있는 형태로 저장됨
            images_json = json.dumps(scraped_data["images"], ensure_ascii=False)
            files_json = json.dumps(scraped_data["files"], ensure_ascii=False)

            # (4) Notice 모델 객체 생성 (DB 테이블의 한 행을 만듦)
            new_notice = Notice(
                title=final_title,
                link=detail_url,
                content=content_body, # 순수 본문 텍스트
                images=images_json,   # 이미지 URL 리스트 (JSON String)
                files=files_json,     # 파일 정보 리스트 (JSON String)
                category=category,    # 현재 카테고리 (univ, job 등)
            )
            
            # DB 세션에 추가 (아직 커밋은 안 함)
            db.add(new_notice)
            new_count += 1
            
            # [매너] 서버에 너무 빠른 요청을 보내지 않도록 0.1초 대기
            await asyncio.sleep(0.1) 

        except Exception as e:
            print(f"⚠️ 아이템 처리 중 예기치 못한 에러: {e}")
            continue

    # -------------------------------------------------------
    # [Step 5] 최종 DB 저장 (Commit)
    # -------------------------------------------------------
    try:
        db.commit() # 모아둔 데이터를 한 번에 실제 DB에 반영
        if new_count > 0:
            print(f"✅ [{category}] {new_count}개 신규 공지 저장 완료!")
        else:
            print(f"💤 [{category}] 새로운 공지가 없습니다.")
    except Exception as e:
        db.rollback() # 에러 발생 시 변경 사항을 모두 취소 (데이터 무결성 보호)
        print(f"🔥 DB 저장 중 치명적 오류 (롤백됨): {e}")


# [조회 함수] API에서 호출하여 DB에 저장된 공지사항을 검색/조회하는 함수
def search_notices_from_db(db: Session, category: str, query: str = None, skip: int = 0, limit: int = 20):
    """
    DB에서 공지사항을 검색합니다.
    - category: 특정 카테고리 필터링 ('all'이면 전체)
    - query: 제목 또는 본문에 포함된 검색어
    - skip, limit: 페이징 처리 (skip만큼 건너뛰고 limit만큼 가져옴)
    """
    sql = db.query(Notice)
    
    # 카테고리 필터링
    if category != "all":
        sql = sql.filter(Notice.category == category)
    
    # 검색어 필터링 (제목 OR 본문)
    if query:
        search_filter = f"%{query}%"
        sql = sql.filter(
            or_(Notice.title.like(search_filter), Notice.content.like(search_filter))
        )
    
    # 최신순(id 내림차순) 정렬 후 결과 반환
    return sql.order_by(Notice.id.desc()).offset(skip).limit(limit).all()