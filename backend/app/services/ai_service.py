# app/services/ai_service.py
import os
import asyncio
import httpx
from pathlib import Path
from dotenv import load_dotenv
from google import genai
from google.genai import types
from app.core.logger import get_logger

logger = get_logger()

# ---------------------------------------------------------
# [설정 로드] .env 파일 경로를 명시적으로 탐색하여 로드
# ---------------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent.parent.parent
ENV_PATH = BASE_DIR / ".env"

if ENV_PATH.exists():
    load_dotenv(dotenv_path=ENV_PATH)
else:
    load_dotenv()

# API 키 확인
API_KEY = os.getenv("GEMINI_API_KEY")
CLIENT = None

if API_KEY:
    try:
        # [New] google-genai 최신 SDK 클라이언트 초기화
        CLIENT = genai.Client(api_key=API_KEY)
        logger.info(f"✅ Gemini Client 초기화 성공 (Key: ...{API_KEY[-5:]})")
    except Exception as e:
        logger.critical(f"🔥 Gemini Client 초기화 실패: {e}")
else:
    logger.critical("🔥 [비상] GEMINI_API_KEY가 설정되지 않았습니다.")

# 사용할 모델명 (무료 티어: gemma-2-9b-it, gemma-3-12b-it 등 상황에 맞춰 변경)
# 2026년 기준 최신 경량 모델 사용 권장
MODEL_NAME = "gemma-3-12b-it"

async def generate_summary(content: str, image_urls: list = None) -> str:
    """
    AI 요약 생성 함수 (재시도 로직 포함)
    """
    if not CLIENT:
        return "AI 서비스를 사용할 수 없습니다. (API Key Missing)"

    # 재시도 설정: 최대 3회, 대기 시간 2초 -> 4초 -> 8초
    max_retries = 3
    base_delay = 2

    for attempt in range(max_retries):
        try:
            # 1. 텍스트 요약
            if content and len(content) > 50 and (not image_urls or len(image_urls) == 0):
                prompt = f"""
                역할: 대학생을 위한 공지사항 핵심 요약 비서
                요청: 아래 공지사항 텍스트를 읽고, 바쁜 대학생이 즉시 이해할 수 있도록 핵심만 3~4줄로 요약해.
                조건:
                - 불필요한 인사말 생략.
                - 명사형 종결어미 사용 (예: ~함, ~임).
                - 신청 마감일, 장소, 대상 등 중요 정보 누락 금지.
                
                [공지 내용]
                {content[:4000]}
                """
                
                response = CLIENT.models.generate_content(
                    model=MODEL_NAME,
                    contents=prompt
                )
                return response.text.strip()

            # 2. 이미지 포함 요약 (멀티모달)
            elif image_urls and len(image_urls) > 0:
                target_url = image_urls[0]
                logger.info(f"🖼️ [Gemini] 이미지 분석 시도: {target_url}")

                # 이미지 다운로드 (비동기)
                async with httpx.AsyncClient(verify=False) as http_client:
                    img_resp = await http_client.get(target_url, timeout=15.0)
                    if img_resp.status_code != 200:
                        logger.warning(f"이미지 다운로드 실패: {img_resp.status_code}")
                        return "이미지를 불러올 수 없어 요약에 실패했습니다."
                    image_bytes = img_resp.content

                prompt_text = """
                이 공지사항 이미지를 분석해서 핵심 내용을 3줄로 요약해줘.
                날짜, 장소, 신청방법, 문의처 같은 핵심 정보를 반드시 포함해.
                말투는 간결하게 명사형(~함)으로 끝내.
                """

                response = CLIENT.models.generate_content(
                    model=MODEL_NAME,
                    contents=[
                        types.Part.from_bytes(data=image_bytes, mime_type="image/jpeg"),
                        prompt_text
                    ]
                )
                return response.text.strip()
            
            else:
                return "요약할 내용이 너무 적습니다."

        except Exception as e:
            error_str = str(e)
            
            # 429: Too Many Requests (Rate Limit) 처리
            if "429" in error_str or "RESOURCE_EXHAUSTED" in error_str:
                wait_time = base_delay * (2 ** attempt) # 2, 4, 8초 대기
                logger.warning(f"⏳ [Gemini] 사용량 초과 (429). {wait_time}초 후 재시도 ({attempt+1}/{max_retries})")
                await asyncio.sleep(wait_time)
                continue # 다음 loop로 이동
            
            # 그 외 에러는 즉시 로깅 후 종료
            logger.error(f"❌ [Gemini] 요약 에러: {e}")
            return "일시적인 오류로 요약할 수 없습니다."

    return "현재 사용자가 많아 요약할 수 없습니다. 잠시 후 다시 시도해주세요."