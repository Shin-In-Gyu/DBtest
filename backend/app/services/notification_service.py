import firebase_admin
from firebase_admin import credentials, messaging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from sqlalchemy.orm import selectinload
from app.database.models import Device, Keyword
from app.core.logger import get_logger
from collections import defaultdict
import os
import asyncio

logger = get_logger()

# ---------------------------------------------------------
# [초기화] 서버 시작 시 1회 실행
# ---------------------------------------------------------
def initialize_firebase():
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

initialize_firebase()

# ---------------------------------------------------------
# [헬퍼 함수] 유효하지 않은 토큰 DB 삭제
# ---------------------------------------------------------
async def remove_invalid_tokens(db: AsyncSession, tokens_to_remove: list):
    """전송 실패한 토큰(앱 삭제 등)을 DB에서 제거합니다."""
    if not tokens_to_remove:
        return
    try:
        # Device 모델에서 해당 토큰들을 찾아 삭제
        stmt = delete(Device).where(Device.token.in_(tokens_to_remove))
        await db.execute(stmt)
        await db.commit()
        logger.info(f"🗑️ 유효하지 않은 토큰 {len(tokens_to_remove)}개 삭제 완료")
    except Exception as e:
        logger.error(f"❌ 토큰 삭제 중 오류 발생: {e}")
        await db.rollback()

# app/services/notification_service.py
import firebase_admin
from firebase_admin import credentials, messaging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from sqlalchemy.orm import selectinload
from app.database.models import Device, Keyword, Notice # Notice 추가
from app.core.logger import get_logger
from collections import defaultdict
import os
import asyncio

logger = get_logger()

def initialize_firebase():
    if not firebase_admin._apps:
        key_path = os.getenv("FIREBASE_KEY_PATH", "serviceAccountKey.json")
        if os.path.exists(key_path):
            try:
                cred = credentials.Certificate(key_path)
                firebase_admin.initialize_app(cred)
                logger.info("🔥 Firebase Admin SDK 초기화 성공")
            except Exception as e:
                logger.error(f"❌ Firebase 초기화 에러: {e}")

async def remove_invalid_tokens(db: AsyncSession, tokens_to_remove: list):
    if not tokens_to_remove: return
    try:
        stmt = delete(Device).where(Device.token.in_(tokens_to_remove))
        await db.execute(stmt)
        await db.commit()
    except Exception as e:
        logger.error(f"❌ 토큰 삭제 에러: {e}")
        await db.rollback()

async def send_keyword_notifications(db: AsyncSession, new_notices: list):
    """
    [수정] DB의 is_notified 플래그를 활용한 실서비스용 알림 로직
    """
    if not new_notices or not firebase_admin._apps:
        return

    # 1. 알림이 아직 발송되지 않은 공지만 필터링
    unnotified_items = [n for n in new_notices if not getattr(n, 'is_notified', False)]
    if not unnotified_items:
        return

    # 2. 이번 공지들의 카테고리별 구독자 조회
    target_categories = {n.category for n in unnotified_items if n.category}
    try:
        stmt = (
            select(Keyword)
            .where(Keyword.word.in_(target_categories))
            .options(selectinload(Keyword.subscribed_devices))
        )
        result = await db.execute(stmt)
        active_keywords = result.scalars().all()
    except Exception as e:
        logger.error(f"❌ 구독 조회 실패: {e}")
        return

    category_subscribers = defaultdict(list)
    for kw_obj in active_keywords:
        for device in kw_obj.subscribed_devices:
            category_subscribers[kw_obj.word].append(device.token)

    # 3. 메시지 생성 및 중복 방지(intra-batch)
    messages_to_send = []
    sent_history = set() 

    for notice in unnotified_items:
        tokens = category_subscribers.get(notice.category, [])
        for token in tokens:
            if (token, notice.link) in sent_history: continue
            
            messages_to_send.append(messaging.Message(
                notification=messaging.Notification(
                    title=f"📢 [{notice.category}] 새 공지",
                    body=notice.title[:100],
                ),
                data={"url": str(notice.link), "id": str(notice.id)},
                token=token,
            ))
            sent_history.add((token, notice.link))
        
        # [중요] 알림 대상에 포함되었으므로 플래그 변경
        notice.is_notified = True

    # 4. 일괄 전송
    if messages_to_send:
        batch_size = 500
        loop = asyncio.get_running_loop()
        logger.info(f"🚀 알림 전송 시작: {len(messages_to_send)}건")

        for i in range(0, len(messages_to_send), batch_size):
            batch = messages_to_send[i:i + batch_size]
            try:
                response = await loop.run_in_executor(None, messaging.send_each, batch)
                if response.failure_count > 0:
                    invalids = [batch[idx].token for idx, r in enumerate(response.responses) 
                                if not r.success and r.exception.code in ['messaging/registration-token-not-registered', 'messaging/invalid-argument']]
                    await remove_invalid_tokens(db, invalids)
            except Exception as e:
                logger.error(f"❌ 전송 에러: {e}")
        
        # 5. 알림 상태 DB 저장
        try:
            await db.commit()
            logger.info("✅ 알림 발송 및 상태 업데이트 완료")
        except Exception as e:
            await db.rollback()
            logger.error(f"❌ 상태 저장 실패: {e}")