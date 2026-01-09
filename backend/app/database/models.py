from sqlalchemy import Column, Integer, String, Text, DateTime, Date
from datetime import datetime, timezone
from .database import Base

class Notice(Base):
    """
    공지사항 테이블
    - 학교 홈페이지의 게시글 정보를 저장합니다.
    """
    __tablename__ = "notices"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    link = Column(String, unique=True, index=True) # 중복 수집 방지를 위한 Unique Key
    date = Column(Date, index=True, nullable=True) # 작성일
    
    content = Column(Text) # 본문 HTML 혹은 텍스트
    
    # [참고] SQLite 등 일부 DB는 JSON 타입을 지원하지 않으므로 Text로 저장합니다.
    # 추후 PostgreSQL로 마이그레이션 시 JSONB 타입 사용을 권장합니다.
    images = Column(Text, default="[]") 
    files = Column(Text, default="[]") 
    
    category = Column(String, index=True) # 학사, 장학, 취업 등
    author = Column(String, nullable=True)

    # 조회수 로직 분리 (학교 원래 조회수 vs 우리 앱 내 클릭 수)
    univ_views = Column(Integer, default=0)
    app_views = Column(Integer, default=0)
    
    crawled_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class Device(Base):
    """
    사용자 기기 테이블
    - FCM 토큰과 구독 키워드를 저장합니다.
    """
    __tablename__ = "devices"
    
    id = Column(Integer, primary_key=True, index=True)
    token = Column(String, unique=True, index=True) # 기기 고유 토큰
    keywords = Column(String, nullable=True)        # 예: "장학,컴공"
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))