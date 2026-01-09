# app/services/notification_service.py
import firebase_admin
from firebase_admin import credentials, messaging
from sqlalchemy.orm import Session
from app.database.models import Device
from app.core.logger import get_logger
import os

logger = get_logger()

# Firebase 초기화 (키 파일 확인)
try:
    if not firebase_admin._apps:
        key_path = "serviceAccountKey.json"
        if os.path.exists(key_path):
            cred = credentials.Certificate(key_path)
            firebase_admin.initialize_app(cred)
            logger.info("🔥 Firebase Admin SDK 초기화 성공")
        else:
            logger.warning("⚠️ 키 파일 없음 (알림 기능 비활성화)")
except Exception as e:
    logger.error(f"❌ Firebase 초기화 실패: {e}")

async def send_keyword_notifications(db: Session, new_notices: list[dict]):
    """
    새 공지사항(new_notices)과 사용자의 키워드를 매칭하여 푸시를 보냅니다.
    """
    if not new_notices or not firebase_admin._apps:
        return

    logger.info(f"🔔 키워드 매칭 시작 (새 공지 {len(new_notices)}개)")
    
    # 키워드 등록한 사용자만 조회
    devices = db.query(Device).filter(Device.keywords.isnot(None)).all()
    messages_to_send = []

    for device in devices:
        if not device.keywords: continue
        user_keywords = [k.strip() for k in device.keywords.split(",") if k.strip()]
        
        for notice in new_notices:
            # 키워드 매칭 검사
            matched = next((kw for kw in user_keywords if kw in notice['title']), None)
            
            if matched:
                try:
                    # 알림 메시지 생성
                    message = messaging.Message(
                        notification=messaging.Notification(
                            title=f"키워드 알림 [{matched}]",
                            body=notice['title'],
                        ),
                        data={"url": notice['link'], "category": notice['category']},
                        token=device.token,
                    )
                    messages_to_send.append(message)
                except Exception:
                    continue

    # 일괄 전송
    if messages_to_send:
        try:
            resp = messaging.send_each(messages_to_send)
            logger.info(f"🚀 [알림 전송] 성공: {resp.success_count}, 실패: {resp.failure_count}")
        except Exception as e:
            logger.error(f"❌ 전송 실패: {e}")
    else:
        logger.info("🔕 매칭된 키워드 없음")