# app/routers/test_router.py
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.database import get_db
from app.services.notification_service import send_keyword_notifications

router = APIRouter(prefix="/test", tags=["Test"])

# [수정] 알림 서비스에서 요구하는 id와 is_notified 속성 추가
class DummyNotice:
    def __init__(self, notice_id, title, category, link):
        self.id = notice_id  # [추가] 고유 ID
        self.title = title
        self.category = category
        self.link = link
        self.is_notified = False # [추가] 알림 전송 여부 플래그
    
    def get(self, key, default=None):
        return getattr(self, key, default)

@router.post("/trigger-notification")
async def test_notification(
    category: str = "scholar",
    title: str = "[테스트] 2026학년도 1학기 장학금 신청 안내",
    db: AsyncSession = Depends(get_db)
):
    """
    이 버튼을 누르면 강제로 알림을 발송합니다.
    """
    # [수정] id(가짜로 999)를 포함하여 객체 생성
    dummy_notice = DummyNotice(
        notice_id=999, 
        title=title, 
        category=category, 
        link="https://www.google.com"
    )
    
    # 알림 발송 서비스 호출
    await send_keyword_notifications(db, [dummy_notice])
    
    return {"message": f"'{category}' 카테고리로 알림 전송을 시도했습니다. 로그를 확인하세요."}