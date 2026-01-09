# app/services/scraper.py
from bs4 import BeautifulSoup
import httpx
from urllib.parse import urljoin
import re
from datetime import datetime
from httpx import TimeoutException, RequestError, HTTPStatusError
from app.core.logger import get_logger

logger = get_logger()

async def scrape_notice_content(url: str):
    """
    공지사항 상세 페이지에 접속해 내용을 가져옵니다.
    Regex를 사용해 다양한 날짜 포맷과 조회수를 파싱합니다.
    """
    try:
        async with httpx.AsyncClient(verify=False, timeout=10.0) as client:
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

        # 1. 제목 추출
        title_tag = soup.select_one('.tblw_subj') or soup.select_one('.subject')
        if title_tag:
            data["title"] = title_tag.get_text(strip=True)

        # 2. 날짜 및 조회수 (Regex 사용)
        date_tag = soup.select_one('.tblw_date')
        if date_tag:
            full_text = date_tag.get_text(" ", strip=True)
            
            # 조회수 숫자 추출
            view_match = re.search(r'조회(?:수)?\s*[:]?\s*(\d+)', full_text)
            if view_match:
                data["univ_views"] = int(view_match.group(1))

            # 날짜 패턴 추출 (2024.1.1, 2024-01-01 등 모두 허용)
            date_match = re.search(r'(\d{4})\s*[\.\-\/]\s*(\d{1,2})\s*[\.\-\/]\s*(\d{1,2})', full_text)
            if date_match:
                y, m, d = date_match.groups()
                try:
                    data["date"] = datetime(int(y), int(m), int(d)).date()
                except ValueError:
                    logger.warning(f"⚠️ 날짜 변환 오류: {y}-{m}-{d}")

        # 3. 첨부파일
        for a in soup.select('.wri_area.file a.link_file'):
            f_link = a.get('href')
            if f_link:
                data["files"].append({
                    "name": a.get_text(strip=True),
                    "url": urljoin(url, f_link)
                })

        # 4. 본문 및 이미지
        content_div = soup.select_one('.tbl_view')
        if content_div:
            for img in content_div.find_all('img'):
                if img.get('src'):
                    data["images"].append(urljoin(url, img.get('src')))
            
            for p in content_div.find_all('p'):
                text = p.get_text(strip=True)
                if text: data["texts"].append(text)
        
        return data

    except Exception as e:
        logger.error(f"❌ 파싱 에러 {url}: {e}")
        return None