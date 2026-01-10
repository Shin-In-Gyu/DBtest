# app/services/ai_service.py
import os
import asyncio
import httpx
from google import genai
from google.genai import types
from app.core.logger import get_logger
# config.py에서 로드된 환경변수를 사용하므로 여기서 load_dotenv 불필요

logger = get_logger()

# ---------------------------------------------------------
# [Gemini 클라이언트 초기화]
# ---------------------------------------------------------
API_KEY = os.getenv("GEMINI_API_KEY")
CLIENT = None
MODEL_NAME = "gemma-3-12b-it"  # 2026년 기준 최신 경량 모델

if API_KEY:
    try:
        # [New] google-genai 최신 SDK 클라이언트 (v1)
        CLIENT = genai.Client(api_key=API_KEY)
        logger.info(f"✅ Gemini Client 초기화 성공 (Model: {MODEL_NAME})")
    except Exception as e:
        logger.critical(f"🔥 Gemini Client 초기화 실패: {e}")
else:
    logger.critical("🔥 [비상] GEMINI_API_KEY가 설정되지 않았습니다.")

async def generate_summary(content: str, image_urls: list = None) -> str:
    """
    AI 요약 생성 함수 (멀티모달 통합 처리)
    - 텍스트와 이미지를 동시에 고려하여 요약합니다.
    """
    if not CLIENT:
        return "AI 서비스를 사용할 수 없습니다. (API Key Missing)"

    max_retries = 3
    base_delay = 2

    # 1. 프롬프트 구성 (텍스트 + 이미지 공통)
    base_prompt = """
    역할: 대학생을 위한 공지사항 핵심 요약 비서
    요청: 제공된 공지사항 텍스트와(또는) 이미지를 종합적으로 분석해서 핵심 내용을 3줄 이내로 요약해.
    
    조건:
    1. 불필요한 인사말 생략.
    2. 명사형 종결어미 사용 (예: ~함, ~임).
    3. 신청 마감일,날짜, 장소, 대상, 문의처 등 중요 정보는 절대 누락하지 말 것.
    4. 텍스트와 이미지의 내용이 다를 경우, 이미지 내의 날짜나 장소 정보를 우선할 것.
    5. 마크다운 볼드체(**) 사용 금지.
    """

    # 분석할 텍스트가 있으면 추가
    if content:
        base_prompt += f"\n\n[공지 텍스트]\n{content[:4000]}"

    for attempt in range(max_retries):
        try:
            # Gemini에게 보낼 콘텐츠 리스트 구성
            contents_payload = []
            
            # (1) 이미지 처리: 첫 번째 이미지만 분석 (속도/비용 고려)
            if image_urls and len(image_urls) > 0:
                target_url = image_urls[0]
                logger.info(f"🖼️ [Gemini] 이미지 다운로드 시도: {target_url}")
                
                try:
                    async with httpx.AsyncClient(verify=False) as http_client:
                        img_resp = await http_client.get(target_url, timeout=10.0)
                        
                        if img_resp.status_code == 200:
                            image_bytes = img_resp.content
                            # 이미지 파트 추가
                            contents_payload.append(
                                types.Part.from_bytes(data=image_bytes, mime_type="image/jpeg")
                            )
                        else:
                            logger.warning(f"이미지 다운로드 실패: {img_resp.status_code}")
                except Exception as img_err:
                    logger.warning(f"이미지 처리 중 에러(무시하고 텍스트로 진행): {img_err}")

            # (2) 텍스트 프롬프트 추가
            contents_payload.append(base_prompt)

            # (3) 내용이 너무 부실한지 최종 체크
            # 이미지가 없는데 텍스트도 20자 미만이면 요약 불가
            has_image = len(contents_payload) > 1 # 프롬프트 외에 이미지가 포함되었는지 확인
            if not has_image and len(content or "") < 20:
                return "요약할 내용이 너무 적습니다."

            # (4) API 호출
            response = CLIENT.models.generate_content(
                model=MODEL_NAME,
                contents=contents_payload
            )
            
            return response.text.strip()

        except Exception as e:
            error_str = str(e)
            
            # Rate Limit (429) 처리
            if "429" in error_str or "RESOURCE_EXHAUSTED" in error_str:
                wait_time = base_delay * (2 ** attempt)
                logger.warning(f"⏳ [Gemini] 사용량 초과 (429). {wait_time}초 후 재시도...")
                await asyncio.sleep(wait_time)
                continue
            
            logger.error(f"❌ [Gemini] 요약 에러: {e}")
            return "일시적인 오류로 요약할 수 없습니다."

    return "현재 사용자가 많아 요약할 수 없습니다. 잠시 후 다시 시도해주세요."