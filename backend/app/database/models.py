from sqlalchemy import Column, Integer, String, Text, DateTime, Date
from datetime import datetime, timezone
from .database import Base

# --------------------------------------------------------------------------
# Notice 모델
# --------------------------------------------------------------------------
class Notice(Base):
    __tablename__ = "notices"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    link = Column(String, unique=True, index=True)
    
    # [Date Fix] String -> Date 타입으로 변경 (정렬 문제 해결)
    # 이제 DB에는 "2024-01-01" 같은 날짜 객체로 저장됩니다.
    date = Column(Date, index=True, nullable=True)
    
    content = Column(Text)
    images = Column(Text, default="[]") 
    files = Column(Text, default="[]") 
    
    category = Column(String, index=True)
    author = Column(String, nullable=True)

    # 조회수
    univ_views = Column(Integer, default=0)
    app_views = Column(Integer, default=0)
    
    crawled_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class Device(Base):
    __tablename__ = "devices"
    id = Column(Integer, primary_key=True, index=True)
    token = Column(String, unique=True, index=True) 
    keywords = Column(String, nullable=True) 
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))