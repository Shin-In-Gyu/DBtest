# app/services/scraper.py
from bs4 import BeautifulSoup
import httpx
from urllib.parse import urljoin
import re
from datetime import datetime
from app.core.logger import get_logger

logger = get_logger()

async def scrape_notice_content(url: str):
    try:
        async with httpx.AsyncClient(verify=False, timeout=15.0) as client:
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

        # -----------------------------------------------------------
        # 1. 제목 추출
        # -----------------------------------------------------------
        title_tag = (
            soup.select_one('.board-view-title') or # [New] 대플
            soup.select_one('.sponge-page-guide h4') or 
            soup.select_one('.sponge-page-title-section h3') or
            soup.select_one('.subject') or 
            soup.select_one('h3.title') or 
            soup.select_one('h4.title') or
            soup.select_one('.tblw_subj') or 
            soup.select_one('.bo_v_tit') or
            soup.select_one('.view_title')
        )

        if title_tag:
            for span in title_tag.select("span"):
                span.decompose()
            data["title"] = title_tag.get_text(strip=True)

        # -----------------------------------------------------------
        # 2. 날짜 및 조회수 추출
        # -----------------------------------------------------------
        date_tag = (
            soup.select_one('.board-view-info') or       # [New] 대플
            soup.select_one('.sponge-page-guide .pull-right') or 
            soup.select_one('.sponge-board-view-info') or        
            soup.select_one('.tblw_date') or 
            soup.select_one('.date') or 
            soup.select_one('.writer_info') or
            soup.select_one('.bo_v_info') or
            soup.select_one('.view_info')
        )
        
        if date_tag:
            full_text = date_tag.get_text(" ", strip=True)
            
            view_match = re.search(r'(?:조회|View)(?:수)?\s*[:]?\s*(\d+)', full_text, re.IGNORECASE)
            if view_match:
                data["univ_views"] = int(view_match.group(1))
            
            # 날짜 (Regex: 2025.10.20 등)
            date_match = re.search(r'(\d{4})\s*[\.\-\/]\s*(\d{1,2})\s*[\.\-\/]\s*(\d{1,2})', full_text)
            if date_match:
                y, m, d = date_match.groups()
                data["date"] = datetime(int(y), int(m), int(d)).date()

        # -----------------------------------------------------------
        # 3. 첨부파일 추출
        # -----------------------------------------------------------
        file_selectors = (
            '.board-view-file a, '          # [New] 대플
            '.sponge-page-guide a[href*="ownload"], '  
            '.wri_area.file a.link_file, '
            '.file_area a, '
            '.bo_v_file a, '
            '.view_file a'
        )
        for a in soup.select(file_selectors):
            f_link = a.get('href')
            
            if isinstance(f_link, str) and not f_link.startswith("#") and "javascript" not in f_link:
                f_name = a.get_text(strip=True) or "첨부파일"
                full_file_url = urljoin(url, f_link)
                
                if not any(f['url'] == full_file_url for f in data["files"]):
                    data["files"].append({
                        "name": f_name,
                        "url": full_file_url
                    })

        # -----------------------------------------------------------
        # 4. 본문 내용 추출
        # -----------------------------------------------------------
        content_div = (
            soup.select_one('.board-view-cont') or     # [New] 대플
            soup.select_one('.sponge-panel-white-remark') or 
            soup.select_one('.tbl_view') or 
            soup.select_one('.content_view') or 
            soup.select_one('.bo_v_con') or
            soup.select_one('.view_content')
        )
        
        if content_div:
            # 이미지
            for img in content_div.find_all('img'):
                src = img.get('src')
                if isinstance(src, str):
                    data["images"].append(urljoin(url, src))
            
            # 스크립트 제거
            for script in content_div(["script", "style", "iframe"]):
                script.decompose()
            
            # 텍스트
            lines = []
            for element in content_div.find_all(['p', 'div', 'br', 'li', 'h4', 'h5']):
                text = element.get_text(strip=True)
                if text:
                    lines.append(text)
            
            if not lines:
                 raw_text = content_div.get_text("\n", strip=True)
                 if raw_text:
                    data["texts"].append(raw_text)
            else:
                 data["texts"] = lines
        
        return data

    except Exception as e:
        logger.error(f"❌ 파싱 로직 에러 ({url}): {e}")
        return None