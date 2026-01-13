# app/database/models.py
import json
from sqlalchemy import Integer, String, Text, DateTime, Date, ForeignKey, Table, Index, UniqueConstraint, Column, Boolean
from sqlalchemy.orm import relationship, Mapped, mapped_column
from sqlalchemy.types import TypeDecorator
# [수정] date 필드명과 충돌 방지를 위해 alias(별칭) 사용
from datetime import datetime, date as DateType, timezone 
from typing import List, Optional, Dict, Any
from .database import Base

# [유틸리티] JSON 타입 처리기
class JSONEncodedDict(TypeDecorator):
    impl = Text
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is None: return "[]"
        return json.dumps(value, ensure_ascii=False)

    def process_result_value(self, value, dialect):
        if not value: return []
        try: return json.loads(value)
        except: return []

# [수정] Table 정의 내에서는 mapped_column 대신 기존 Column 사용
# Pylance 오류: "MappedColumn[Any]" cannot be assigned to parameter "args" of type "SchemaItem" 해결
device_keywords = Table(
    'device_keywords',
    Base.metadata,
    Column('device_id', Integer, ForeignKey('devices.id', ondelete="CASCADE"), primary_key=True),
    Column('keyword_id', Integer, ForeignKey('keywords.id', ondelete="CASCADE"), primary_key=True)
)

class Notice(Base):
    __tablename__ = "notices"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String, index=True)
    
    link: Mapped[str] = mapped_column(String, index=True) 
    
    # [수정] 타입 힌트 충돌 해결 (date -> DateType)
    # Pylance 오류: Type of "date" could not be determined because it refers to itself 해결
    date: Mapped[Optional[DateType]] = mapped_column(Date, nullable=True)
    
    content: Mapped[str] = mapped_column(Text)
    
    images: Mapped[List[str]] = mapped_column(JSONEncodedDict, default=[])
    files: Mapped[List[Dict[str, Any]]] = mapped_column(JSONEncodedDict, default=[])
    
    category: Mapped[str] = mapped_column(String, index=True)
    author: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    
    univ_views: Mapped[int] = mapped_column(Integer, default=0)
    app_views: Mapped[int] = mapped_column(Integer, default=0)
    # [보완] 알림 발송 여부 플래그 추가
    is_notified: Mapped[bool] = mapped_column(Boolean, default=False, index=True)

    crawled_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    __table_args__ = (
        Index('idx_category_date', 'category', 'date'),
        UniqueConstraint('link', 'category', name='uix_link_category'),
    )

class Keyword(Base):
    __tablename__ = "keywords"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    word: Mapped[str] = mapped_column(String, unique=True, index=True)

    subscribed_devices: Mapped[List["Device"]] = relationship(
        "Device",
        secondary=device_keywords,
        back_populates="subscriptions"
    )

class Device(Base):
    __tablename__ = "devices"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    token: Mapped[str] = mapped_column(String, unique=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))

    subscriptions: Mapped[List["Keyword"]] = relationship(
        "Keyword",
        secondary=device_keywords,
        back_populates="subscribed_devices"
    )

class Scrap(Base):
    __tablename__ = "scraps"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    device_id: Mapped[int] = mapped_column(Integer, ForeignKey("devices.id", ondelete="CASCADE"), index=True)
    notice_id: Mapped[int] = mapped_column(Integer, ForeignKey("notices.id", ondelete="CASCADE"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))