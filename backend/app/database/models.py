# app/database/models.py
from sqlalchemy import Column, Integer, String, Text, DateTime, Date
from datetime import datetime, timezone
from .database import Base

# 공지사항 테이블
class Notice(Base):
    __tablename__ = "notices"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    link = Column(String, unique=True, index=True) # 링크 중복 방지
    date = Column(Date, index=True, nullable=True) # 날짜 타입 정규화
    
    content = Column(Text)
    # 리스트 데이터는 JSON 문자열로 저장
    images = Column(Text, default="[]") 
    files = Column(Text, default="[]") 
    
    category = Column(String, index=True)
    author = Column(String, nullable=True)

    # 조회수 구분 (학교 홈페이지 vs 앱 내 클릭)
    univ_views = Column(Integer, default=0)
    app_views = Column(Integer, default=0)
    
    crawled_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

# 기기 및 키워드 테이블
class Device(Base):
    __tablename__ = "devices"
    id = Column(Integer, primary_key=True, index=True)
    token = Column(String, unique=True, index=True) # FCM 토큰
    keywords = Column(String, nullable=True)        # 콤마로 구분된 키워드
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))