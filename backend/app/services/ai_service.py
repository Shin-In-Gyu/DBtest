# app/services/ai_service.py
import os
from typing import List, Optional, Any

from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception_type,
)

from app.core.logger import get_logger
from app.core.http import get_client

logger = get_logger()

# ---------------------------------------------------------
# AI 기능 ON/OFF 스위치 (기본: OFF)
# ---------------------------------------------------------
AI_ENABLED = os.getenv("AI_ENABLED", "false").lower() in ("1", "true", "yes", "on")

# ---------------------------------------------------------
# [Gemini 클라이언트 초기화] - AI_ENABLED일 때만 시도
# ---------------------------------------------------------
API_KEY = os.getenv("GEMINI_API_KEY")

CLIENT = None
types = None
MODEL_NAME = os.getenv("GEMINI_MODEL", "gemma-3-12b-it")

if AI_ENABLED and API_KEY:
    try:
        # ✅ google-genai SDK일 때만 import 시도
        from google import genai as _genai  # type: ignore
        from google.genai import types as _types  # type: ignore

        CLIENT = _genai.Client(api_key=API_KEY)
        types = _types
        logger.info(f"✅ Gemini Client 초기화 성공 (Model: {MODEL_NAME})")
    except Exception as e:
        # import 실패든 초기화 실패든 -> AI OFF로 떨어뜨려서 서버는 살린다
        CLIENT = None
        types = None
        AI_ENABLED = False
        logger.warning(f"⚠️ AI 비활성화됨 (Gemini 초기화 실패): {e}")
else:
    if not AI_ENABLED:
        logger.info("ℹ️ AI_ENABLED=false → AI 요약 기능 비활성화")
    elif not API_KEY:
        logger.info("ℹ️ GEMINI_API_KEY 미설정 → AI 요약 기능 비활성화")


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    retry=retry_if_exception_type(Exception),
    reraise=True,
)
async def _call_gemini_api(contents_payload: List[Any]) -> Any:
    """실제 API 호출 내부 함수 (Retry 데코레이터 적용)"""
    if CLIENT is None:
        raise ValueError("Gemini Client is not initialized (AI disabled or missing SDK/API key)")

    return CLIENT.models.generate_content(
        model=MODEL_NAME,
        contents=contents_payload,
    )


async def generate_summary(content: str, image_urls: Optional[List[str]] = None) -> str:
    """
    AI 요약 함수.
    - AI가 꺼져있거나(기본), SDK/키 문제면 서버는 정상 동작하고 여기서만 안내 문구 반환.
    """
    if CLIENT is None or types is None:
        # ✅ AI 기능을 완전히 빼고 싶으면 여기서 "" 반환으로 바꿔도 됨
        return "AI 요약 기능이 비활성화되어 있습니다."

    base_prompt = """
역할: 대학생을 위한 공지사항 핵심 요약 비서
요청: 공지사항 텍스트와 이미지를 분석해서 핵심 내용을 3줄 이내로 요약해.
조건:
1. 불필요한 인사말 생략, 명사형 종결(~함).
2. 신청 마감일, 날짜, 장소, 대상 등 중요 정보 절대 누락 금지.
3. 텍스트와 이미지 내용이 다르면 이미지 우선.
"""

    safe_content = str(content) if content else ""
    if safe_content:
        base_prompt += f"\n\n[공지 텍스트]\n{safe_content[:4000]}"

    contents_payload: List[Any] = []

    # (1) 이미지 처리 (첫 장만)
    if image_urls:
        target_url = image_urls[0]
        http_client = get_client()
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
        if response and getattr(response, "text", None):
            return response.text.strip()
        return "요약 결과가 없습니다."
    except Exception as e:
        logger.error(f"❌ [Gemini] 요약 최종 실패: {e}")
        return "일시적인 오류로 요약할 수 없습니다."
