import json
import html as html_lib
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse

from app.core.config import BASE, get_urls 
from app.core.http import fetch_html
from app.utils.dedupe import dedupe_by_url

# [현직자 Tip] 목록 조회 시, 학교 서버의 과부하를 방지하기 위해 
# User-Agent 설정이나 적절한 딜레이(Rate Limiting)가 고려되어야 합니다.
async def get_notice_list(category: str = "univ"):
    """
    특정 카테고리의 공지사항 목록을 파싱하여 반환합니다.
    """
    # 1. 설정값 로드: 중앙 집중식 관리(config.py)를 통해 URL 변경 시 대응력을 높임
    list_url, info_url, default_seq = get_urls(category)
    
    # 2. HTTP 요청: searchMenuSeq는 게시판 식별자임
    html_text = await fetch_html(list_url, params={"searchMenuSeq": default_seq})
    soup = BeautifulSoup(html_text, "html.parser")

    items = []
    
    # 3. 데이터 추출: 강남대 사이트는 <a> 태그 내 data-params 속성에 상세 페이지 정보를 JSON 형태로 담고 있음
    # [주의] 셀렉터 a.detailLink가 변경될 경우 크롤링이 중단되므로, 에러 로깅이 필수적인 구간
    for a in soup.select("a.detailLink[data-params]"):
        # UI/UX를 고려해 제목 앞뒤 공백 제거 및 Fallback(title 속성) 처리
        title = a.get_text(" ", strip=True) or a.get("title", "").strip()
        
        # [중요] HTML Entity(&quot; 등)를 실제 문자로 변환하지 않으면 JSON 파싱 에러 발생
        raw = html_lib.unescape(a.get("data-params", "")).strip()

        # 4. JSON 파싱 보정 (Strict Parsing vs Flexible Parsing)
        # 실무에서는 데이터 포맷이 깨져서 오는 경우가 빈번하므로 2단계 예외처리를 적용함
        try:
            params = json.loads(raw)
        except Exception:
            try:
                # 싱글 쿼테이션(')을 더블 쿼테이션(")으로 교체하여 파싱 시도
                params = json.loads(raw.replace("'", '"'))
            except Exception:
                # 파싱 불가 시 해당 아이템은 Skip하고 로그를 남기는 것이 안전함
                continue

        # 상세 페이지 이동에 필요한 고유 식별자(Encrypted Key) 추출
        enc_menu_seq = params.get("encMenuSeq")
        enc_menu_board_seq = params.get("encMenuBoardSeq") # [Fix] 오타 주의: API 응답값 확인 필요
        scrt_wrt_yn = params.get("scrtWrtYn", False)

        if not (enc_menu_seq and enc_menu_board_seq):
            continue
        
        # 5. Detail URL 역설계 (Reverse Engineering)
        # 학교 사이트의 클라이언트 측 JS 로직을 서버 측에서 URL로 재구성함
        detail_url = (
            f"{info_url}"
            f"?scrtWrtYn={'true' if scrt_wrt_yn else 'false'}"
            f"&encMenuSeq={enc_menu_seq}"
            f"&encMenuBoardSeq={enc_menu_board_seq}"
        )
        items.append({"title": title, "detailUrl": detail_url})

    # [최종 단계] 중복 데이터 제거: 동일 공지가 여러 개 노출되는 케이스 방지
    items = dedupe_by_url(items)
    return {"count": len(items), "items": items}

async def get_notice_detail(detail_url: str):
    """
    상세 페이지의 본문과 첨부파일을 추출합니다.
    """
    html = await fetch_html(detail_url)
    soup = BeautifulSoup(html, "html.parser")
    
    # [Context Awareness] 강남대는 학부/부서별로 도메인이 다를 수 있음 (sae.kangnam.ac.kr 등)
    # 절대 경로 생성을 위해 현재 접속한 상세 페이지의 도메인(Scheme + Host)을 동적으로 추출
    parsed_uri = urlparse(detail_url)
    current_domain = f"{parsed_uri.scheme}://{parsed_uri.netloc}"

    # 1. 제목 파싱: 사이트 개편에 대비해 예상되는 모든 클래스명을 리스트업함 (Multi-selector)
    title_el = soup.select_one("h3, h2, .view_title, .board_view_title, .title")
    title = title_el.get_text(" ", strip=True) if title_el else ""

    # 2. 본문 파싱: HTML 태그를 제거하고 텍스트만 추출하되, 가독성을 위해 개행(\n) 유지
    content_el = soup.select_one(".view_cont, .board_view, .contents, #contents, .content")
    content = content_el.get_text("\n", strip=True) if content_el else ""

    # 3. 첨부파일 파싱
    files = []
    # 파일 다운로드 트리거가 되는 href 키워드를 필터링하여 수집
    for a in soup.select('a[href*="download"], a[href*="file"], a[href*="atch"], a[href*="FileDown"]'):
        text = a.get_text(" ", strip=True)
        href = a.get("href")
        if href:
            # [현직자 포인트] 상대 경로(/cms/...)를 절대 경로(https://...)로 자동 변환
            # urljoin은 current_domain과 href를 지능적으로 합쳐줌
            files.append({
                "name": text or "첨부파일", 
                "url": urljoin(current_domain, href)
            })

    return {"title": title, "content": content, "files": files}