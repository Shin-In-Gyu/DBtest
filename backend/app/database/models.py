from sqlalchemy import Column, Integer, String, Text, DateTime
from datetime import datetime
from .database import Base

class Notice(Base):
    __tablename__ = "notices"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    link = Column(String, unique=True, index=True) # 중복 방지 키
    content = Column(Text) # 본문 (검색용)
    category = Column(String, index=True)
    author = Column(String, nullable=True)
    date = Column(String, nullable=True)
    crawled_at = Column(DateTime, default=datetime.utcnow)