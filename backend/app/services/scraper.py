# backend/app/services/scraper.py
from bs4 import BeautifulSoup
import httpx
from urllib.parse import urljoin

async def scrape_notice_content(url: str):
    """
    URL에 접속하여 제목, 본문 텍스트, 이미지, 첨부파일 링크를 추출합니다.
    """
    async with httpx.AsyncClient(verify=False) as client: # verify=False는 SSL 에러 방지용 (필요시 제거)
        response = await client.get(url)
        response.raise_for_status()
    
    soup = BeautifulSoup(response.text, 'html.parser')

    # [중요] 사이트마다 HTML 구조가 다릅니다. 
    # 강남대 등 일반적인 국내 대학 게시판 구조(tbl_view, board_view 등)를 타겟팅합니다.
    # 실제 작동 시, 타겟 사이트의 F12(개발자도구)를 보고 class명을 미세조정해야 할 수 있습니다.
    
    # 1. 제목 추출
    title = ""
    title_tag = soup.select_one('.subject') or soup.select_one('h3') or soup.find('title')
    if title_tag:
        title = title_tag.get_text(strip=True)

    # 2. 본문 영역 찾기 (일반적인 게시판 클래스명 시도)
    content_div = soup.select_one('.view_con') or soup.select_one('.board_view_con') or soup.select_one('#bo_v_con')
    
    data = {
        "title": title,
        "texts": [],
        "images": [],
        "files": []
    }

    if content_div:
        # 3. 텍스트 추출 (HTML 태그 제거하고 순수 텍스트만)
        # 필요하다면 <p> 태그 단위로 리스트화 할 수도 있습니다.
        data["texts"] = [p.get_text(strip=True) for p in content_div.find_all('p') if p.get_text(strip=True)]
        if not data["texts"]: # p태그가 없으면 전체 텍스트
            data["texts"] = [content_div.get_text(strip=True)]

        # 4. 이미지 URL 추출
        for img in content_div.find_all('img'):
            src = img.get('src')
            if src:
                # 상대경로(/data/...)를 절대경로(http://.../data/...)로 변환
                full_url = urljoin(url, src)
                data["images"].append(full_url)

    # 5. 첨부파일 추출 (보통 view_file, file_down 등의 클래스를 씀)
    file_div = soup.select_one('.view_file') or soup.select_one('.file_area')
    if file_div:
        for a in file_div.find_all('a'):
            file_link = a.get('href')
            file_name = a.get_text(strip=True)
            if file_link:
                 data["files"].append({
                     "name": file_name,
                     "url": urljoin(url, file_link)
                 })

    return data