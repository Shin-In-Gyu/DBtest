<<<<<<< HEAD
# app/routers/test_router.py
=======
>>>>>>> cb5eb5060c66961934542b7071e0afead11e5e4c
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.database import get_db
from app.services.notification_service import send_keyword_notifications

router = APIRouter(prefix="/test", tags=["Test"])
<<<<<<< HEAD

# [수정] 알림 서비스에서 요구하는 id와 is_notified 속성 추가
class DummyNotice:
    def __init__(self, notice_id, title, category, link):
        self.id = notice_id  # [추가] 고유 ID
        self.title = title
        self.category = category
        self.link = link
        self.is_notified = False # [추가] 알림 전송 여부 플래그
=======
#테스트 라우러
# 알림 서비스가 객체 속성(.title)과 딕셔너리(.get) 방식을 모두 지원하도록 만든 더미 클래스
class DummyNotice:
    def __init__(self, title, category, link):
        self.title = title
        self.category = category
        self.link = link
>>>>>>> cb5eb5060c66961934542b7071e0afead11e5e4c
    
    def get(self, key, default=None):
        return getattr(self, key, default)

@router.post("/trigger-notification")
async def test_notification(
<<<<<<< HEAD
    category: str = "scholar",
=======
    category: str = "scholar",  # 테스트할 카테고리 (앱에서 구독한 것)
>>>>>>> cb5eb5060c66961934542b7071e0afead11e5e4c
    title: str = "[테스트] 2026학년도 1학기 장학금 신청 안내",
    db: AsyncSession = Depends(get_db)
):
    """
    이 버튼을 누르면 강제로 알림을 발송합니다.
<<<<<<< HEAD
    """
    # [수정] id(가짜로 999)를 포함하여 객체 생성
    dummy_notice = DummyNotice(
        notice_id=999, 
=======
    전제조건: DB에 해당 카테고리를 구독한 내 토큰이 있어야 함.
    """
    # 가짜 공지 데이터 생성
    dummy_notice = DummyNotice(
>>>>>>> cb5eb5060c66961934542b7071e0afead11e5e4c
        title=title, 
        category=category, 
        link="https://www.google.com"
    )
    
<<<<<<< HEAD
    # 알림 발송 서비스 호출
=======
    # 알림 발송 서비스 강제 호출
>>>>>>> cb5eb5060c66961934542b7071e0afead11e5e4c
    await send_keyword_notifications(db, [dummy_notice])
    
    return {"message": f"'{category}' 카테고리로 알림 전송을 시도했습니다. 로그를 확인하세요."}