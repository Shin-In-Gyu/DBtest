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

        # 1. 제목 (도서관 Sponge 구조 우선)
        title_tag = (
            soup.select_one('.sponge-page-guide h4') or # 도서관 표준
            soup.select_one('.subject') or 
            soup.select_one('h3.title') or # 변형 대응
            soup.select_one('h4.title') or
            soup.select_one('.tblw_subj') or 
            soup.select_one('.bo_v_tit') or
            soup.select_one('.bbs_view_title') or
            soup.select_one('.view_title')
        )
        if title_tag:
            # 내부에 span class="notice-cate" 같은게 있으면 제거
            for span in title_tag.select("span"):
                span.decompose()
            data["title"] = title_tag.get_text(strip=True)

        # 2. 날짜 및 조회수
        date_tag = (
            soup.select_one('.sponge-page-guide .pull-right') or
            soup.select_one('.sponge-board-view-info') or # 변형 대응
            soup.select_one('.tblw_date') or 
            soup.select_one('.date') or 
            soup.select_one('.writer_info') or
            soup.select_one('.bo_v_info') or
            soup.select_one('.bbs_view_info') or
            soup.select_one('.view_info')
        )
        
        if date_tag:
            full_text = date_tag.get_text(" ", strip=True)
            
            # 조회수
            view_match = re.search(r'조회(?:수)?\s*[:]?\s*(\d+)', full_text)
            if view_match:
                data["univ_views"] = int(view_match.group(1))
            else:
                nums = re.findall(r'\d+', full_text)
                if nums and len(nums) > 3: 
                     data["univ_views"] = int(nums[-1])

            # 날짜
            date_match = re.search(r'(\d{4})\s*[\.\-\/]\s*(\d{1,2})\s*[\.\-\/]\s*(\d{1,2})', full_text)
            if date_match:
                y, m, d = date_match.groups()
                data["date"] = datetime(int(y), int(m), int(d)).date()

        # 3. 첨부파일
        # 도서관 파일은 보통 .sponge-page-guide 하위 a 태그 중 download가 포함된 것
        file_selectors = '.sponge-page-guide a[href*="download"], .wri_area.file a.link_file, .file_area a, .bo_v_file a, .bbs_view_file a, .view_file a'
        for a in soup.select(file_selectors):
            f_link = a.get('href')
            if f_link and not f_link.startswith("#"):
                f_name = a.get_text(strip=True) or "첨부파일"
                data["files"].append({
                    "name": f_name,
                    "url": urljoin(url, f_link)
                })

        # 4. 본문
        content_div = (
            soup.select_one('.sponge-panel-white-remark') or 
            soup.select_one('.tbl_view') or 
            soup.select_one('.content_view') or 
            soup.select_one('.bo_v_con') or
            soup.select_one('.bbs_view_content') or
            soup.select_one('.view_content')
        )
        
        if content_div:
            # 이미지
            for img in content_div.find_all('img'):
                src = img.get('src')
                if src:
                    data["images"].append(urljoin(url, src))
            
            # 스크립트 제거
            for script in content_div(["script", "style"]):
                script.decompose()
            
            # 텍스트
            lines = []
            for element in content_div.find_all(['p', 'div', 'br', 'li']):
                text = element.get_text(strip=True)
                if text:
                    lines.append(text)
            
            if not lines:
                 data["texts"].append(content_div.get_text("\n", strip=True))
            else:
                 data["texts"] = lines
        
        return data

    except Exception as e:
        logger.error(f"❌ 파싱 로직 에러 ({url}): {e}")
        return None