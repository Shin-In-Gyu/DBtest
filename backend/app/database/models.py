# app/database/models.py
import json
from sqlalchemy import Column, Integer, String, Text, DateTime, Date, ForeignKey, Table, Index, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.types import TypeDecorator
from datetime import datetime, timezone
from .database import Base

# [유틸리티] JSON 타입 처리기 (SQLite 호환용)
# 원래: 없음 (그냥 Text로 저장하고 뷰에서 json.loads 함)
# 변경: TypeDecorator 사용
# 이유: DB에 넣을 땐 자동으로 문자열로, 꺼낼 땐 자동으로 리스트로 변환해주기 위함
class JSONEncodedDict(TypeDecorator):
    impl = Text
    def process_bind_param(self, value, dialect):
        if value is None: return "[]"
        return json.dumps(value, ensure_ascii=False)

    def process_result_value(self, value, dialect):
        if not value: return []
        try: return json.loads(value)
        except: return []

# [New] N:M 관계 테이블 (기기 <-> 키워드)
# 설명: "1번 기기가 5번 키워드(장학)를 구독함" 같은 정보를 저장
device_keywords = Table(
    'device_keywords',
    Base.metadata,
    Column('device_id', Integer, ForeignKey('devices.id', ondelete="CASCADE"), primary_key=True),
    Column('keyword_id', Integer, ForeignKey('keywords.id', ondelete="CASCADE"), primary_key=True)
)

class Notice(Base):
    __tablename__ = "notices"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    
    # [변경 1] unique=True 제거! (이제 같은 링크가 여러 카테고리에 존재 가능)
    link = Column(String, index=True) 
    
    date = Column(Date, nullable=True)
    content = Column(Text)
    
    images = Column(JSONEncodedDict, default=[])
    files = Column(JSONEncodedDict, default=[])
    
    category = Column(String, index=True)
    author = Column(String, nullable=True)
    
    univ_views = Column(Integer, default=0)
    app_views = Column(Integer, default=0)
    
    crawled_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    summary = Column(Text, nullable=True)

    # [변경 2] (링크 + 카테고리) 조합이 유일해야 함을 명시
    # 예: (linkA, univ) O, (linkA, academic) O, (linkA, univ) X (중복)
    __table_args__ = (
        Index('idx_category_date', 'category', 'date'),
        UniqueConstraint('link', 'category', name='uix_link_category'),
    )

class Keyword(Base):
    """[New] 키워드 마스터 테이블 (예: id=1, word='장학')"""
    __tablename__ = "keywords"
    
    id = Column(Integer, primary_key=True, index=True)
    word = Column(String, unique=True, index=True) # 중복 방지

    # 역참조: 이 키워드를 구독 중인 기기들 찾기
    subscribed_devices = relationship(
        "Device",
        secondary=device_keywords,
        back_populates="subscriptions"
    )

class Device(Base):
    __tablename__ = "devices"
    
    id = Column(Integer, primary_key=True, index=True)
    token = Column(String, unique=True, index=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # [변경] keywords 컬럼(String) 삭제 -> subscriptions 관계(List)로 대체
    # 이유: "장학" 검색 시 LIKE %장학% 보다 훨씬 빠르고 정확함
    subscriptions = relationship(
        "Keyword",
        secondary=device_keywords,
        back_populates="subscribed_devices"
    )

class Scrap(Base):
    __tablename__ = "scraps"
    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(Integer, ForeignKey("devices.id", ondelete="CASCADE"), index=True)
    notice_id = Column(Integer, ForeignKey("notices.id", ondelete="CASCADE"), index=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))