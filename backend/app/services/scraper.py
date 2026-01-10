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
    공지사항 상세 페이지 스크래핑 (에러 방어 로직 강화)
    """
    try:
        # 타임아웃 15초, SSL 검증 무시(학교 서버 호환성)
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

        # 1. 제목 (다양한 선택자 대응)
        # .tblw_subj: 일반 게시판, .subject: 구형 게시판, h4.title: 반응형 게시판
        title_tag = (
            soup.select_one('.tblw_subj') or 
            soup.select_one('.subject') or 
            soup.select_one('h4.title') or
            soup.select_one('.bo_v_tit') # 추가됨
        )
        if title_tag:
            data["title"] = title_tag.get_text(strip=True)

        # 2. 날짜 및 조회수 (가장 에러가 많이 나는 부분 -> 안전하게 수정)
        date_tag = (
            soup.select_one('.tblw_date') or 
            soup.select_one('.date') or 
            soup.select_one('.writer_info') or
            soup.select_one('.bo_v_info') # 추가됨
        )
        
        if date_tag:
            full_text = date_tag.get_text(" ", strip=True)
            
            # [조회수 추출] 숫자만 안전하게 뽑기
            view_match = re.search(r'조회(?:수)?\s*[:]?\s*(\d+)', full_text)
            if view_match:
                data["univ_views"] = int(view_match.group(1))

            # [날짜 추출 - 핵심 수정]
            # 년-월-일 (YYYY.MM.DD 또는 YYYY-MM-DD 등) 패턴을 찾음
            # 바로 unpacking(y,m,d = ...) 하지 않고 개수 확인 후 처리
            date_match = re.search(r'(\d{4})\s*[\.\-\/]\s*(\d{1,2})\s*[\.\-\/]\s*(\d{1,2})', full_text)
            
            if date_match:
                groups = date_match.groups()
                if len(groups) == 3:
                    y, m, d = groups
                    data["date"] = datetime(int(y), int(m), int(d)).date()
            else:
                # 혹시 날짜가 YYYY.MM 형태로만 있는 경우 방어 코드 (1일로 설정)
                short_match = re.search(r'(\d{4})\s*[\.\-\/]\s*(\d{1,2})', full_text)
                if short_match:
                    y, m = short_match.groups()
                    data["date"] = datetime(int(y), int(m), 1).date()

        # 3. 첨부파일
        # .wri_area: 일반, .file_area: 구형
        for a in soup.select('.wri_area.file a.link_file, .file_area a, .bo_v_file a'):
            f_link = a.get('href')
            if f_link and not f_link.startswith("#"):
                # 파일명이 없는 경우 대비
                f_name = a.get_text(strip=True) or "첨부파일"
                data["files"].append({
                    "name": f_name,
                    "url": urljoin(url, f_link)
                })

        # 4. 본문 및 이미지
        content_div = (
            soup.select_one('.tbl_view') or 
            soup.select_one('.content_view') or 
            soup.select_one('.bo_v_con')
        )
        
        if content_div:
            # 이미지 절대경로 변환
            for img in content_div.find_all('img'):
                src = img.get('src')
                if src:
                    data["images"].append(urljoin(url, src))
            
            # 텍스트 추출 (스크립트/스타일 태그 제거 후)
            for script in content_div(["script", "style"]):
                script.decompose()
                
            for p in content_div.find_all(['p', 'div', 'span']):
                text = p.get_text(strip=True)
                if text: data["texts"].append(text)
        
        return data

    except Exception as e:
        # 에러가 나더라도 죽지 않고 로그만 남기고 None 반환
        # (호출하는 쪽에서 건너뛰게 됨)
        logger.error(f"❌ 파싱 로직 에러 ({url}): {e}")
        return None