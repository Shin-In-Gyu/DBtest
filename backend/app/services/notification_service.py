# app/services/notification_service.py
import firebase_admin
from firebase_admin import credentials, messaging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.database.models import Device, Keyword
from app.core.logger import get_logger
from collections import defaultdict
import os

logger = get_logger()

# ---------------------------------------------------------
# [초기화] 서버 시작 시 1회 실행됨
# ---------------------------------------------------------
def initialize_firebase():
    """키 파일 유무를 확인하고 Firebase 앱을 초기화합니다."""
    if not firebase_admin._apps:
        key_path = os.getenv("FIREBASE_KEY_PATH", "serviceAccountKey.json")
        if os.path.exists(key_path):
            try:
                cred = credentials.Certificate(key_path)
                firebase_admin.initialize_app(cred)
                logger.info("🔥 Firebase Admin SDK 초기화 성공")
            except Exception as e:
                logger.error(f"❌ Firebase 초기화 에러: {e}")
        else:
            logger.warning(f"⚠️ 키 파일 없음({key_path}): 알림 기능은 스킵됩니다.")

# 모듈 로드 시 즉시 초기화 시도
initialize_firebase()

async def send_keyword_notifications(db: AsyncSession, new_notices: list):
    """
    [알림 발송 로직 - 관계형 DB 대응 수정]
    기존: Device.keywords (문자열) 검색 -> 에러 발생
    변경: Keyword 테이블 조회 -> 구독한 Device 목록(subscriptions) 가져오기
    """
    # 0. 데이터나 Firebase 앱이 없으면 중단
    if not new_notices or not firebase_admin._apps:
        return

    # 1. 구독자가 있는 모든 키워드 조회 (Eager Loading)
    # Keyword 테이블을 가져오면서, 그 키워드를 구독한 기기 목록(subscribed_devices)도 같이 로딩합니다.
    try:
        stmt = select(Keyword).options(selectinload(Keyword.subscribed_devices))
        result = await db.execute(stmt)
        all_keywords = result.scalars().all()
    except Exception as e:
        logger.error(f"❌ 키워드 정보 조회 실패: {e}")
        return

    if not all_keywords:
        return

    # 2. 역색인 생성 (Keyword -> Token List)
    # 예: { "장학": ["tokenA", "tokenB"], "취업": ["tokenC"] }
    keyword_map = defaultdict(list)
    
    for kw_obj in all_keywords:
        # 이 키워드를 구독한 기기가 하나라도 있다면
        if kw_obj.subscribed_devices:
            for device in kw_obj.subscribed_devices:
                keyword_map[kw_obj.word].append(device.token)

    # 3. 매칭 로직 (공지사항 -> 키워드 맵 조회)
    messages_by_token = {}

    for notice in new_notices:
        # notice 객체 호환성 처리 (dict or ORM object)
        notice_title = getattr(notice, 'title', None) or notice.get('title', '')
        notice_link = getattr(notice, 'link', None) or notice.get('link', '')
        notice_cat = getattr(notice, 'category', None) or notice.get('category', '')
        
        if not notice_title: continue

        for keyword, tokens in keyword_map.items():
            if keyword in notice_title:
                for token in tokens:
                    # 중복 발송 방지
                    if token not in messages_by_token:
                        try:
                            message = messaging.Message(
                                notification=messaging.Notification(
                                    title=f"키워드 알림: {keyword}",
                                    body=notice_title[:100], 
                                ),
                                data={
                                    "url": str(notice_link),
                                    "category": str(notice_cat)
                                },
                                token=token,
                            )
                            messages_by_token[token] = message
                        except Exception:
                            continue

    # 4. 일괄 전송 (Batch Send)
    messages_to_send = list(messages_by_token.values())
    
    if messages_to_send:
        try:
            batch_size = 500
            total_success = 0
            
            for i in range(0, len(messages_to_send), batch_size):
                batch = messages_to_send[i:i + batch_size]
                resp = messaging.send_each(batch)
                total_success += resp.success_count
                
            logger.info(f"🔔 [알림 전송] 대상: {len(messages_to_send)}명 (성공: {total_success})")
            
        except Exception as e:
            logger.error(f"❌ 알림 전송 실패: {e}")