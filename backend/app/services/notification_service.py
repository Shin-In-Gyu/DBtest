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

# ---------------------------------------------------------
# [메인] 카테고리 기반 알림 전송 (실서비스용)
# ---------------------------------------------------------
async def send_keyword_notifications(db: AsyncSession, new_notices: list):
    """
    [카테고리 구독 알림]
    사용자가 구독한 카테고리(예: '장학', '학사')에 해당하는
    새 공지사항이 있을 경우 알림을 발송합니다.
    """
    # 0. 데이터나 Firebase 앱이 없으면 중단
    if not new_notices or not firebase_admin._apps:
        return

    # 1. 이번에 새로 뜬 공지들의 카테고리 목록 추출
    target_categories = set()
    for notice in new_notices:
        cat = getattr(notice, 'category', None) or notice.get('category', '')
        if cat:
            target_categories.add(cat)

    if not target_categories:
        return

    # 2. 해당 카테고리를 구독 중인 기기 정보 조회 (Eager Loading)
    try:
        stmt = (
            select(Keyword)
            .where(Keyword.word.in_(target_categories))
            .options(selectinload(Keyword.subscribed_devices))
        )
        result = await db.execute(stmt)
        active_keywords = result.scalars().all()
    except Exception as e:
        logger.error(f"❌ 구독 정보 조회 실패: {e}")
        return

    if not active_keywords:
        return

    # 3. 카테고리별 구독자 매핑 (Category -> [Token List])
    category_subscribers = defaultdict(list)
    for kw_obj in active_keywords:
        if kw_obj.subscribed_devices:
            for device in kw_obj.subscribed_devices:
                category_subscribers[kw_obj.word].append(device.token)

    # 4. 알림 메시지 생성
    messages_to_send = []
    sent_history = set() # (토큰, 공지링크) 조합 기록 -> 중복 발송 방지

    for notice in new_notices:
        n_title = getattr(notice, 'title', '')
        n_link = getattr(notice, 'link', '')
        n_category = getattr(notice, 'category', '')

        if not n_title or not n_category:
            continue
        
        # 해당 카테고리 구독자 토큰 리스트
        subscriber_tokens = category_subscribers.get(n_category, [])

        for token in subscriber_tokens:
            # 중복 체크: 이미 이 토큰으로 이 공지를 보냈는지 확인
            unique_key = (token, n_link)
            if unique_key in sent_history:
                continue

            try:
                message = messaging.Message(
                    notification=messaging.Notification(
                        title=f"📢 {n_category} 알림",
                        body=n_title[:100], # 너무 길면 자름
                    ),
                    data={
                        "url": str(n_link),
                        "category": str(n_category)
                    },
                    token=token,
                )
                messages_to_send.append(message)
                sent_history.add(unique_key)
            except Exception:
                continue

    # 5. 비동기 일괄 전송 (Batch Send)
    if messages_to_send:
        batch_size = 500
        loop = asyncio.get_running_loop()
        
        logger.info(f"🚀 알림 전송 시작: 대상 {len(messages_to_send)}건")

        for i in range(0, len(messages_to_send), batch_size):
            batch = messages_to_send[i:i + batch_size]
            
            try:
                # 동기 함수인 send_each를 별도 스레드에서 실행 (서버 멈춤 방지)
                response = await loop.run_in_executor(None, messaging.send_each, batch)
                
                # 실패한 토큰 정리 로직
                if response.failure_count > 0:
                    tokens_to_delete = []
                    for idx, resp in enumerate(response.responses):
                        if not resp.success:
                            # 앱 삭제(UNREGISTERED) or 토큰 오류(INVALID_ARGUMENT)
                            err_code = resp.exception.code
                            if err_code in ['messaging/registration-token-not-registered', 'messaging/invalid-argument']:
                                failed_token = batch[idx].token
                                tokens_to_delete.append(failed_token)
                    
                    # DB에서 죽은 토큰 삭제
                    if tokens_to_delete:
                        await remove_invalid_tokens(db, tokens_to_delete)

            except Exception as e:
                logger.error(f"❌ 배치 전송 중 에러: {e}")

        logger.info("✅ 알림 전송 로직 완료")