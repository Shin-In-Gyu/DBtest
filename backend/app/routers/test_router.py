from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.database import get_db
from app.services.notification_service import send_keyword_notifications

router = APIRouter(prefix="/test", tags=["Test"])
#테스트 라우러
# 알림 서비스가 객체 속성(.title)과 딕셔너리(.get) 방식을 모두 지원하도록 만든 더미 클래스
class DummyNotice:
    def __init__(self, title, category, link):
        self.title = title
        self.category = category
        self.link = link
    
    def get(self, key, default=None):
        return getattr(self, key, default)

@router.post("/trigger-notification")
async def test_notification(
    category: str = "scholar",  # 테스트할 카테고리 (앱에서 구독한 것)
    title: str = "[테스트] 2026학년도 1학기 장학금 신청 안내",
    db: AsyncSession = Depends(get_db)
):
    """
    이 버튼을 누르면 강제로 알림을 발송합니다.
    전제조건: DB에 해당 카테고리를 구독한 내 토큰이 있어야 함.
    """
    # 가짜 공지 데이터 생성
    dummy_notice = DummyNotice(
        title=title, 
        category=category, 
        link="https://www.google.com"
    )
    
    # 알림 발송 서비스 강제 호출
    await send_keyword_notifications(db, [dummy_notice])
    
    return {"message": f"'{category}' 카테고리로 알림 전송을 시도했습니다. 로그를 확인하세요."}