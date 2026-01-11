# app/services/ai_service.py
import os
import httpx
from typing import List, Optional, Any
from google import genai
from google.genai import types
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

from app.core.logger import get_logger
from app.core.http import get_client

logger = get_logger()

# ---------------------------------------------------------
# [Gemini 클라이언트 초기화]
# ---------------------------------------------------------
API_KEY = os.getenv("GEMINI_API_KEY")
# [설정] 전역 변수는 Optional로 선언 (초기값 None)
CLIENT: Optional[genai.Client] = None
MODEL_NAME = "gemma-3-12b-it"

if API_KEY:
    try:
        CLIENT = genai.Client(api_key=API_KEY)
        logger.info(f"✅ Gemini Client 초기화 성공 (Model: {MODEL_NAME})")
    except Exception as e:
        logger.critical(f"🔥 Gemini Client 초기화 실패: {e}")

# [Retry 설정] 429, 5xx 에러 시 지수 백오프
@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    retry=retry_if_exception_type(Exception), 
    reraise=True
)
async def _call_gemini_api(contents_payload: List[Any]) -> Any:
    """실제 API 호출 내부 함수 (Retry 데코레이터 적용)"""
    
    # [수정] 전역 변수 CLIENT를 로컬 변수로 가져와서 None 체크 수행
    # Pylance 오류: "models is not a known attribute of None" 해결
    client = CLIENT
    if client is None:
        raise ValueError("Gemini Client is not initialized")
    
    # [수정] client가 None이 아님을 보장한 상태에서 호출
    # Pylance 오류: "Expression of type 'None'..." 해결
    return client.models.generate_content(
        model=MODEL_NAME,
        contents=contents_payload
    )

async def generate_summary(content: str, image_urls: Optional[List[str]] = None) -> str:
    # 1. 클라이언트 상태 확인
    if CLIENT is None:
        return "AI 서비스를 사용할 수 없습니다. (API Key Missing)"

    base_prompt = """
    역할: 대학생을 위한 공지사항 핵심 요약 비서
    요청: 공지사항 텍스트와 이미지를 분석해서 핵심 내용을 3줄 이내로 요약해.
    조건:
    1. 불필요한 인사말 생략, 명사형 종결(~함).
    2. 신청 마감일, 날짜, 장소, 대상 등 중요 정보 절대 누락 금지.
    3. 텍스트와 이미지 내용이 다르면 이미지 우선.
    """

    # [안전 처리] content가 None일 경우 빈 문자열로 변환
    safe_content = str(content) if content else ""
    if safe_content:
        base_prompt += f"\n\n[공지 텍스트]\n{safe_content[:4000]}"

    contents_payload: List[Any] = []

    # (1) 이미지 처리
    if image_urls and len(image_urls) > 0:
        target_url = image_urls[0]
        http_client = get_client() # [변수명 변경] 혼동 방지
        
        try:
            logger.info(f"🖼️ [Gemini] 이미지 다운로드: {target_url}")
            img_resp = await http_client.get(target_url) 
            
            if img_resp.status_code == 200:
                contents_payload.append(
                    types.Part.from_bytes(data=img_resp.content, mime_type="image/jpeg")
                )
        except Exception as img_err:
            logger.warning(f"이미지 처리 중 에러(무시): {img_err}")

    # (2) 프롬프트 추가
    contents_payload.append(base_prompt)

    # (3) 내용 검증
    has_image = len(contents_payload) > 1 
    if not has_image and len(safe_content) < 20:
        return "요약할 내용이 너무 적습니다."

    # (4) API 호출
    try:
        response = await _call_gemini_api(contents_payload)
        
        # [수정] response.text가 None일 가능성 처리
        # Pylance 오류: "strip is not a known attribute of None" 해결
        if response and response.text:
            return response.text.strip()
        else:
            return "요약 결과가 없습니다."
            
    except Exception as e:
        logger.error(f"❌ [Gemini] 요약 최종 실패: {e}")
        return "일시적인 오류로 요약할 수 없습니다."