# app/routers/test_router.py
"""
테스트 전용 라우터
프로덕션 환경에서는 환경 변수 ENABLE_TEST_ENDPOINTS=true로 설정해야만 활성화됩니다.
"""
import os
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.database import get_db
from app.services.notification_service import send_keyword_notifications
from app.middleware.auth import verify_admin_key

router = APIRouter(prefix="/test", tags=["Test"])

# 테스트 엔드포인트 활성화 여부 확인
def check_test_enabled():
    """테스트 엔드포인트가 활성화되어 있는지 확인"""
    enabled = os.getenv("ENABLE_TEST_ENDPOINTS", "false").lower() == "true"
    if not enabled:
        raise HTTPException(
            status_code=404,
            detail="테스트 엔드포인트는 비활성화되어 있습니다. ENABLE_TEST_ENDPOINTS=true로 설정하세요."
        )

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
    db: AsyncSession = Depends(get_db),
    api_key: str = Depends(verify_admin_key)
):
    """
    [관리자 전용] 테스트 알림 발송
    
    사용법: 
    - X-API-Key 헤더에 관리자 API 키 포함 필요
    - ENABLE_TEST_ENDPOINTS=true 환경 변수 설정 필요
    """
    check_test_enabled()
    
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