# app/services/scraper.py
from bs4 import BeautifulSoup
import httpx
from urllib.parse import urljoin
import re
from datetime import datetime
from app.core.logger import get_logger
from app.core.config import SSL_VERIFY

logger = get_logger()

async def scrape_notice_content(url: str):
    """
    공지사항 상세 페이지 스크래핑
    """
    try:
        # verify=SSL_VERIFY 설정을 사용하여 보안 유연성 확보
        async with httpx.AsyncClient(verify=SSL_VERIFY, timeout=15.0) as client:
            response = await client.get(url)
            response.raise_for_status()
    except Exception as e:
        logger.error(f"❌ 접속 실패 ({url}): {e}")
        return None
    
    try:
        soup = BeautifulSoup(response.text, 'html.parser')
        data = {
            "title": "", "date": None, "texts": [], 
            "images": [], "files": [], "univ_views": 0
        }

        # 1. 제목 (다양한 클래스 대응)
        title_tag = soup.select_one('.tblw_subj') or soup.select_one('.subject') or soup.select_one('h4.title')
        if title_tag:
            data["title"] = title_tag.get_text(strip=True)

        # 2. 날짜 및 조회수
        date_tag = soup.select_one('.tblw_date') or soup.select_one('.date')
        if date_tag:
            full_text = date_tag.get_text(" ", strip=True)
            
            view_match = re.search(r'조회(?:수)?\s*[:]?\s*(\d+)', full_text)
            if view_match:
                data["univ_views"] = int(view_match.group(1))

            date_match = re.search(r'(\d{4})\s*[\.\-\/]\s*(\d{1,2})\s*[\.\-\/]\s*(\d{1,2})', full_text)
            if date_match:
                y, m, d = date_match.groups()
                data["date"] = datetime(int(y), int(m), int(d)).date()

        # 3. 첨부파일
        for a in soup.select('.wri_area.file a.link_file, .file_area a'):
            f_link = a.get('href')
            if f_link and not f_link.startswith("#"):
                data["files"].append({
                    "name": a.get_text(strip=True),
                    "url": urljoin(url, f_link)
                })

        # 4. 본문 및 이미지
        content_div = soup.select_one('.tbl_view') or soup.select_one('.content_view')
        if content_div:
            # 이미지 절대경로 변환
            for img in content_div.find_all('img'):
                src = img.get('src')
                if src:
                    data["images"].append(urljoin(url, src))
            
            # 텍스트 추출
            for p in content_div.find_all(['p', 'div']):
                text = p.get_text(strip=True)
                if text: data["texts"].append(text)
        
        return data

    except Exception as e:
        logger.error(f"❌ 파싱 에러 {url}: {e}")
        return None