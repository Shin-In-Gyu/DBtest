# app/services/scraper.py

from bs4 import BeautifulSoup
import httpx
from urllib.parse import urljoin
import re
from datetime import datetime

# [Exception] 구체적인 에러 처리를 위해 예외 클래스 명시
from httpx import TimeoutException, RequestError, HTTPStatusError

async def scrape_notice_content(url: str):
    """
    [2026-01-09 수정 v3]
    - Date Regex 개선: "2024. 1. 1" 처럼 공백이 섞인 날짜도 인식하도록 수정
    - Debugging: 날짜 파싱 실패 시 원본 텍스트를 출력하여 원인 파악 용이하게 함
    """
    # print(f"   ▶ [접속 시도] {url}") 
    
    try:
        async with httpx.AsyncClient(verify=False, timeout=10.0) as client:
            response = await client.get(url)
            response.raise_for_status()
            
    except (TimeoutException, RequestError) as e:
        print(f"   ❌ [네트워크 에러] 접속 실패 ({url})")
        return None
    except HTTPStatusError as e:
        print(f"   ❌ [HTTP 에러] {e.response.status_code} ({url})")
        return None
    except Exception as e:
        print(f"   ❌ [알 수 없는 에러] {e}")
        return None
    
    try:
        soup = BeautifulSoup(response.text, 'html.parser')

        data = {
            "title": "",
            "date": None,
            "texts": [],
            "images": [],
            "files": [],
            "univ_views": 0
        }

        # -------------------------------------------------------
        # 1. 제목 추출
        # -------------------------------------------------------
        title_tag = soup.select_one('.tblw_subj')
        if not title_tag:
            title_tag = soup.select_one('.subject') or soup.select_one('#contentTit')

        if title_tag:
            data["title"] = title_tag.get_text(strip=True)
        else:
            pass

        # -------------------------------------------------------
        # 2. 날짜 및 조회수 추출 (강력해진 버전)
        # -------------------------------------------------------
        date_tag = soup.select_one('.tblw_date')
        if date_tag:
            # 태그를 삭제하지 않고 전체 텍스트 가져옴
            full_text = date_tag.get_text(" ", strip=True)
            
            # (1) 조회수 추출 (숫자만 찾기)
            view_match = re.search(r'조회(?:수)?\s*[:]?\s*(\d+)', full_text)
            if view_match:
                data["univ_views"] = int(view_match.group(1))

            # (2) 날짜 추출 (Regex 개선)
            # \s* : 공백이 0개 이상 있어도 된다는 뜻
            # 2024 . 1 . 1 또는 2024-01-01 모두 인식
            date_pattern = r'(\d{4})\s*[\.\-\/]\s*(\d{1,2})\s*[\.\-\/]\s*(\d{1,2})'
            date_match = re.search(date_pattern, full_text)
            
            if date_match:
                year, month, day = date_match.groups()
                try:
                    data["date"] = datetime(int(year), int(month), int(day)).date()
                except ValueError:
                    print(f"   ⚠️ [날짜 변환 에러] {year}-{month}-{day} (유효하지 않은 날짜)")
            else:
                # [디버깅] 어떤 텍스트길래 못 찾았는지 로그에 찍어서 확인
                print(f"   ⚠️ [날짜 패턴 미일치] 원본: '{full_text}'")
        
        # -------------------------------------------------------
        # 3. 첨부파일 추출
        # -------------------------------------------------------
        file_links = soup.select('.wri_area.file a.link_file')
        for a in file_links:
            f_name = a.get_text(strip=True)
            f_link = a.get('href')
            if f_link:
                data["files"].append({
                    "name": f_name,
                    "url": urljoin(url, f_link)
                })

        # -------------------------------------------------------
        # 4. 본문 추출
        # -------------------------------------------------------
        content_div = soup.select_one('.tbl_view')
        if content_div:
            # 이미지
            for img in content_div.find_all('img'):
                src = img.get('src')
                if src:
                    data["images"].append(urljoin(url, src))
            
            # 텍스트
            lines = []
            paragraphs = content_div.find_all('p')
            if paragraphs:
                for p in paragraphs:
                    text = p.get_text(strip=True)
                    if text: lines.append(text)
                data["texts"] = lines
            else:
                text = content_div.get_text("\n", strip=True)
                if text: data["texts"] = [text]
        
        return data

    except Exception as e:
        print(f"   ❌ [파싱 에러] {url}: {e}")
        return None