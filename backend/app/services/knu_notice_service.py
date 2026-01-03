import json
import html as html_lib
from bs4 import BeautifulSoup
from urllib.parse import urljoin

from app.core.config import BASE, LIST_URL, INFO_URL
from app.core.http import fetch_html
from app.utils.dedupe import dedupe_by_url

# 목록 페이지 HTML → 공지 제목 + 상세URL 리스트 만들기(중복 제거 포함)
async def get_notice_list(searchMenuSeq: int = 0):
    html_text = await fetch_html(LIST_URL, params={"searchMenuSeq": searchMenuSeq})
    # BeautifulSoup: HTML에서 원하는 태그/클래스 찾아서 텍스트 뽑는 파서.
    soup = BeautifulSoup(html_text, "html.parser")

    items = []
    
    # CSS 셀렉터로 a 태그 중에서 클래스가 detailLink이고 data-params 속성이 있는 것만 선택
    for a in soup.select("a.detailLink[data-params]"):
        # title = a 태그 안의 텍스트를 공백 포함해서 깔끔히 뽑고 없으면 title 속성도 fallback으로 씀
        # raw = data-params 속성값을 가져온 다음 &quot; 같은 HTML 엔티티가 있으면 unescape로 복원
        title = a.get_text(" ", strip=True) or a.get("title", "").strip()
        raw = html_lib.unescape(a.get("data-params", "")).strip()

        # JSON 파싱 (깨져있을 때 보정까지)
        try:
            params = json.loads(raw)
        except Exception:
            try:
                params = json.loads(raw.replace("'", '"'))
            except Exception:
                continue
              
        # 상세 페이지 만들 키 값 추출
        enc_menu_seq = params.get("encMenuSeq")
        enc_menu_board_seq = params.get("encMenuBoardSeq")
        scrt_wrt_yn = params.get("scrtWrtYn", False)

        if not (enc_menu_seq and enc_menu_board_seq):
            continue
        
        # detail_url 조립 + items에 추가.
        # INFO_URL 뒤에 쿼리스트링을 붙여서 상세 페이지 URL을 직접 생성
        detail_url = (
            f"{INFO_URL}"
            f"?scrtWrtYn={'true' if scrt_wrt_yn else 'false'}"
            f"&encMenuSeq={enc_menu_seq}"
            f"&encMenuBoardSeq={enc_menu_board_seq}"
        )
        items.append({"title": title, "detailUrl": detail_url})

    # detailUrl 중복 제거 / {count, items} 형태로 반환 → 프론트에서 쓰기 편함
    items = dedupe_by_url(items)
    return {"count": len(items), "items": items}

# 상세 페이지 HTML → 제목/본문/첨부파일 링크 파싱
async def get_notice_detail(detail_url: str):
    html = await fetch_html(detail_url)
    soup = BeautifulSoup(html, "html.parser")

    # !! 이거는 조사해야할 부분 !!
    # 제목 파싱 제목이 있을 만한 selector 후보들을 여러 개 넣어둔 것
    title_el = soup.select_one("h3, h2, .view_title, .board_view_title, .title")
    title = title_el.get_text(" ", strip=True) if title_el else ""

    # 본문 파싱 본문이 있을 만한 영역 후보 selector들
    content_el = soup.select_one(".view_cont, .board_view, .contents, #contents, .content")
    content = content_el.get_text("\n", strip=True) if content_el else soup.get_text("\n", strip=True)

    # 첨부파일 링크 추정 수집
    files = []
    for a in soup.select('a[href*="download"], a[href*="file"], a[href*="atch"], a[href*="FileDown"]'):
        text = a.get_text(" ", strip=True)
        href = a.get("href")
        if href:
            files.append({"name": text or "file", "url": urljoin(BASE, href)})

    # 최종 반환
    return {"title": title, "content": content, "files": files}
