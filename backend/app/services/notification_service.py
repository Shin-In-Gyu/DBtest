import firebase_admin
from firebase_admin import credentials, messaging
from sqlalchemy.orm import Session
from app.database.models import Device
from app.core.logger import get_logger
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

async def send_keyword_notifications(db: Session, new_notices: list[dict]):
    """
    새로 등록된 공지사항(new_notices) 중, 사용자가 구독한 '키워드'가 있는지 확인하여
    해당되는 사용자에게만 푸시 알림을 발송합니다.
    """
    if not new_notices or not firebase_admin._apps:
        return

    # 1. 키워드가 등록된 사용자만 조회 (최적화)
    devices = db.query(Device).filter(Device.keywords != None, Device.keywords != "").all()
    if not devices:
        return

    messages_to_send = []
    
    # 2. 매칭 로직 (단순 포함 여부 확인)
    for device in devices:
        # "장학, 취업" -> ["장학", "취업"]
        user_keywords = [k.strip() for k in device.keywords.split(",") if k.strip()]
        if not user_keywords: continue

        for notice in new_notices:
            # 제목에 키워드가 포함되어 있는지 검사 (첫 번째 매칭되는 키워드 발견 시 중단)
            matched = next((kw for kw in user_keywords if kw in notice['title']), None)
            
            if matched:
                try:
                    # FCM 메시지 객체 생성
                    message = messaging.Message(
                        notification=messaging.Notification(
                            title=f"키워드 알림: {matched}",
                            body=notice['title'][:100], # 너무 긴 제목은 자름
                        ),
                        data={
                            "url": str(notice['link']),
                            "category": str(notice['category'])
                        },
                        token=device.token,
                    )
                    messages_to_send.append(message)
                except Exception:
                    # 잘못된 토큰 등은 무시하고 계속 진행
                    continue

    # 3. 일괄 전송 (Batch Send)
    if messages_to_send:
        try:
            resp = messaging.send_each(messages_to_send)
            logger.info(f"🚀 [알림 전송 결과] 성공: {resp.success_count}, 실패: {resp.failure_count}")
        except Exception as e:
            logger.error(f"❌ 알림 전송 실패: {e}")