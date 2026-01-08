from sqlalchemy import Column, Integer, String, Text, DateTime
from datetime import datetime
from .database import Base

class Notice(Base):
    __tablename__ = "notices"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    link = Column(String, unique=True, index=True)
    date = Column(String, index=True)
    content = Column(Text)  # 이제 여기에는 순수 본문 텍스트만 들어갑니다.
    
    # [NEW] 이미지와 파일을 별도로 저장할 컬럼 추가 (JSON 문자열로 저장)
    images = Column(Text, default="[]") 
    files = Column(Text, default="[]") 
    
    category = Column(String, index=True)
    author = Column(String, nullable=True)
    
    crawled_at = Column(DateTime, default=datetime.utcnow)