# app/services/notification_service.py
import firebase_admin
from firebase_admin import credentials, messaging
from sqlalchemy.orm import Session
from app.database.models import Device
from app.core.logger import get_logger
from collections import defaultdict
import os

logger = get_logger()

# ---------------------------------------------------------
# [초기화] 서버 시작 시 1회 실행됨
# ---------------------------------------------------------
def initialize_firebase():
    """키 파일 유무를 확인하고 Firebase 앱을 초기화합니다."""
    # 이미 앱이 초기화되어 있으면 건너뜁니다.
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
    [최적화된 알림 발송 로직]
    기존: 사용자 수 x 공지사항 수 (느림)
    변경: 키워드 중심으로 사용자 토큰을 그룹화 (빠름) - 역색인(Inverted Index) 기법
    """
    if not new_notices or not firebase_admin._apps:
        return

    # 1. 키워드가 등록된 모든 사용자 조회
    # (실제 서비스에서는 사용자 수가 수십만 명이 되면 DB 쿼리 방식도 바꿔야 하지만, 
    #  대학생 수준 프로젝트나 수천 명 규모까지는 한 번에 가져와도 괜찮습니다.)
    devices = db.query(Device).filter(Device.keywords != None, Device.keywords != "").all()
    if not devices:
        return

    # 2. [핵심] 역색인 생성 (Keyword -> Token List)
    # 예: { "장학": ["tokenA", "tokenB"], "취업": ["tokenB", "tokenC"] }
    keyword_map = defaultdict(list)
    
    for device in devices:
        # 콤마로 구분된 키워드를 분리 (예: "장학,취업" -> ["장학", "취업"])
        user_keywords = [k.strip() for k in device.keywords.split(",") if k.strip()]
        for kw in user_keywords:
            keyword_map[kw].append(device.token)

    # 중복 발송 방지를 위해 '토큰'을 키로 하는 딕셔너리에 메시지를 담습니다.
    # 한 사용자가 "장학, 취업" 둘 다 구독했는데, 제목이 "취업 장학금"이라면 알림이 2개 가면 안 되니까요.
    messages_by_token = {}

    # 3. 매칭 로직 (공지사항 -> 키워드 맵 조회)
    for notice in new_notices:
        notice_title = notice['title']
        
        # 등록된 모든 '구독 키워드'들을 순회하며 제목에 있는지 확인
        # (사용자 수만큼 반복하는 게 아니라, '등록된 유니크 키워드 종류'만큼만 반복하므로 훨씬 빠름)
        for keyword, tokens in keyword_map.items():
            if keyword in notice_title:
                # 이 키워드를 구독한 모든 사람에게 보낼 메시지 생성
                for token in tokens:
                    # 이미 이 사람에게 보낼 메시지가 있다면(다른 키워드로 매칭됨), 덮어쓰거나 무시
                    # 여기서는 '첫 번째 매칭된 키워드' 기준으로 보냅니다.
                    if token not in messages_by_token:
                        try:
                            message = messaging.Message(
                                notification=messaging.Notification(
                                    title=f"키워드 알림: {keyword}",
                                    body=notice_title[:100], # 너무 긴 제목은 자름
                                ),
                                data={
                                    "url": str(notice['link']),
                                    "category": str(notice['category'])
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
            # Firebase는 한 번에 최대 500개까지만 배치를 지원하므로 쪼개서 보냅니다.
            batch_size = 500
            total_success = 0
            total_failure = 0
            
            for i in range(0, len(messages_to_send), batch_size):
                batch = messages_to_send[i:i + batch_size]
                resp = messaging.send_each(batch)
                total_success += resp.success_count
                total_failure += resp.failure_count
                
            logger.info(f"🚀 [알림 전송 결과] 대상: {len(messages_to_send)}명 (성공: {total_success}, 실패: {total_failure})")
            
        except Exception as e:
            logger.error(f"❌ 알림 전송 실패: {e}")