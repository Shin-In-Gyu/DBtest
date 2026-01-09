# test_fcm.py
import asyncio
from sqlalchemy.orm import Session
from app.database.database import SessionLocal, engine, Base
from app.database.models import Device
from app.services.notification_service import send_keyword_notifications
from app.core.logger import get_logger

# 로거 가져오기
logger = get_logger()

# DB 테이블이 없으면 생성
Base.metadata.create_all(bind=engine)

def create_test_device(db: Session):
    """테스트용 가짜 디바이스를 DB에 심습니다."""
    # 이미 있는지 확인
    test_token = "TEST_FAKE_TOKEN_12345"
    existing = db.query(Device).filter(Device.token == test_token).first()
    
    if not existing:
        print("➕ 테스트용 디바이스(키워드: 장학) 추가 중...")
        new_device = Device(
            token=test_token,
            keywords="장학,취업" # 이 키워드로 테스트할 예정
        )
        db.add(new_device)
        db.commit()
        print("✅ 테스트 디바이스 저장 완료!")
    else:
        print("ℹ️ 이미 테스트 디바이스가 존재합니다.")

async def run_test():
    db = SessionLocal()
    try:
        # 1. 가짜 사용자(토큰) 만들기
        create_test_device(db)
        
        # 2. 가상의 '새 공지사항' 데이터 만들기 (크롤링 되었다고 가정)
        fake_new_notices = [
            {
                "title": "[장학] 2024학년도 1학기 국가장학금 신청 안내",
                "link": "https://web.kangnam.ac.kr/test_link_1",
                "category": "scholar"
            },
            {
                "title": "도서관 이용 안내 (키워드 없음)",
                "link": "https://web.kangnam.ac.kr/test_link_2",
                "category": "univ"
            }
        ]
        
        print("\n🚀 [테스트 시작] 키워드 알림 발송 시도...")
        print("   - 예상 결과: '[장학]' 키워드가 매칭되어 Firebase로 전송을 시도해야 함")
        print("   - 주의: 토큰이 가짜이므로 Firebase에서 '유효하지 않은 토큰' 에러가 떠야 정상입니다.")
        print("-" * 60)
        
        # 3. 알림 함수 강제 실행
        await send_keyword_notifications(db, fake_new_notices)
        
        print("-" * 60)
        print("🏁 [테스트 종료] 위 로그를 확인하세요.")

    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(run_test())