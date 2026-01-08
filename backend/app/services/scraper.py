from bs4 import BeautifulSoup
import httpx
from urllib.parse import urljoin

async def scrape_notice_content(url: str):
    """
    [2026-01-08 수정]
    제공된 스크린샷 구조에 맞춰 제목(.tblw_subj), 본문(.tbl_view), 파일(.wri_area.file)을 추출합니다.
    """
    print(f"   ▶ [접속 시도] {url}")
    
    try:
        async with httpx.AsyncClient(verify=False) as client:
            response = await client.get(url)
            response.raise_for_status()
    except Exception as e:
        print(f"   ❌ [접속 실패] {e}")
        return {"title": "", "texts": [], "images": [], "files": []}
    
    soup = BeautifulSoup(response.text, 'html.parser')

    data = {
        "title": "",
        "date": "",
        "texts": [],
        "images": [],
        "files": []
    }

    # -------------------------------------------------------
    # 1. 제목 추출 (핵심 수정 사항)
    # 스크린샷 경로: .thead.view -> ul -> li -> .inner_txt -> .tblw_subj
    # -------------------------------------------------------
    title_tag = soup.select_one('.tblw_subj')
    
    if not title_tag:
        # 혹시 모를 예비용 (기존 강남대 패턴)
        title_tag = soup.select_one('.subject') or soup.select_one('#contentTit')

    if title_tag:
        # 제목 안에 [취업] 같은 뱃지가 span으로 들어있을 수 있으니 텍스트만 깔끔하게 가져옴
        data["title"] = title_tag.get_text(strip=True)
        print(f"   ✅ [제목 발견] {data['title']}")
    else:
        print("   ⚠️ [제목 찾기 실패] HTML 구조가 또 다른 패턴일 수 있습니다.")

    # 1-2. 날짜 추출
    # 스크린샷 구조: .tblw_date -> span -> (<span class="hide_txt">등록날짜</span>) + "날짜텍스트"
    # -------------------------------------------------------
    date_text = ""
    date_tag = soup.select_one('.tblw_date')

    if date_tag:
        for span in date_tag.find_all('span'):
            if "조회수" in span.get_text():
                span.decompose()  # DOM에서 조회수 영역 삭제
        # "등록날짜"라고 적힌 숨겨진 라벨(<span class="hide_txt">)을 찾습니다.
        label = date_tag.select_one('.hide_txt')
        
        # 라벨이 있으면 DOM에서 아예 삭제(decompose)해버립니다. 
        # 그래야 나중에 get_text할 때 "등록날짜"라는 글자가 섞이지 않습니다.
        if label:
            label.decompose()
        
        # 라벨을 지운 상태에서 남은 텍스트(순수 날짜)만 깔끔하게 가져옵니다.
        date_text = date_tag.get_text(strip=True)
        print(f"   📅 [날짜 발견] {date_text}")
    else:
        # 혹시 구조가 다를 경우를 대비한 예비 로직 (필요시 추가)
        print("   ⚠️ [날짜] 정보를 찾을 수 없습니다.")

    # 추출한 날짜를 딕셔너리에 담습니다.
    data["date"] = date_text

    # -------------------------------------------------------
    # 2. 첨부파일 추출
    # 스크린샷 경로: .wri_area.file -> a.link_file
    # -------------------------------------------------------
    # 본문과 별도의 영역에 있으므로 전체 문서에서 해당 클래스를 찾습니다.
    file_links = soup.select('.wri_area.file a.link_file')
    
    if file_links:
        print(f"   📎 [첨부파일] {len(file_links)}개 발견")
        for a in file_links:
            f_name = a.get_text(strip=True)
            f_link = a.get('href')
            if f_link:
                # view_image.do 같은 이미지 보기 링크가 아니라 download.do 링크만 가져오도록 필터링 가능
                # 여기서는 일단 다 가져옵니다.
                full_url = urljoin(url, f_link)
                data["files"].append({
                    "name": f_name,
                    "url": full_url
                })
    

    

    # -------------------------------------------------------
    # 3. 본문 텍스트 & 이미지 추출
    # 스크린샷 경로: .tbody -> ... -> .tbl_view
    # -------------------------------------------------------
    content_div = soup.select_one('.tbl_view')
    
    if content_div:
        # (1) 이미지 추출 (본문 내 삽입된 이미지)
        imgs = content_div.find_all('img')
        for img in imgs:
            src = img.get('src')
            if src:
                data["images"].append(urljoin(url, src))
        
        # (2) 텍스트 추출
        # 스크린샷에 보면 <p> 태그가 많으므로 p 태그 단위로 줄바꿈 처리
        lines = []
        paragraphs = content_div.find_all('p')
        
        if paragraphs:
            for p in paragraphs:
                # display:none 스타일이 있는 p태그(숨겨진 텍스트)는 제외할지 결정해야 함
                # 일단은 다 가져오되, 너무 지저분하면 필터링 추가 필요
                text = p.get_text(strip=True)
                if text:
                    lines.append(text)
            data["texts"] = lines
        else:
            # p태그가 없는 경우 통으로 가져오기
            text = content_div.get_text("\n", strip=True)
            if text:
                data["texts"] = [text]
        
        if data["texts"]:
            print(f"   📝 [본문] {len(data['texts'])}줄 추출됨")
    else:
        print("   ❌ [본문 영역(.tbl_view) 찾기 실패]")

    return data