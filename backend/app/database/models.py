# app/database/models.py
import json
from sqlalchemy import Integer, String, Text, DateTime, Date, ForeignKey, Table, Index, UniqueConstraint, Column, Boolean
from sqlalchemy.orm import relationship, Mapped, mapped_column
from sqlalchemy.types import TypeDecorator
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

# [M:N 관계 테이블] 기기-키워드 구독 관계
device_keywords = Table(
    'device_keywords',
    Base.metadata,
    Column('device_id', Integer, ForeignKey('devices.id', ondelete="CASCADE"), primary_key=True),
    Column('keyword_id', Integer, ForeignKey('keywords.id', ondelete="CASCADE"), primary_key=True)
)

# ============================================================
# Notice (공지사항)
# ============================================================
class Notice(Base):
    __tablename__ = "notices"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String, index=True)
    link: Mapped[str] = mapped_column(String, index=True) 
    date: Mapped[Optional[DateType]] = mapped_column(Date, nullable=True)
    content: Mapped[str] = mapped_column(Text)
    
    images: Mapped[List[str]] = mapped_column(JSONEncodedDict, default=[])
    files: Mapped[List[Dict[str, Any]]] = mapped_column(JSONEncodedDict, default=[])
    
    category: Mapped[str] = mapped_column(String, index=True)
    author: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    
    univ_views: Mapped[int] = mapped_column(Integer, default=0)
    app_views: Mapped[int] = mapped_column(Integer, default=0)
    
    # [알림 발송 여부]
    is_notified: Mapped[bool] = mapped_column(Boolean, default=False, index=True)

    # [크롤링 시간]
    crawled_at: Mapped[datetime] = mapped_column(
        DateTime, 
        default=lambda: datetime.now(timezone.utc),
        index=True  # 인덱스 추가
    )
    
    # [AI 요약]
    summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # [복합 인덱스 및 제약조건]
    __table_args__ = (
        Index('idx_category_date', 'category', 'date'),
        Index('idx_crawled_at', 'crawled_at'),  # 날짜 정렬용
        UniqueConstraint('link', 'category', name='uix_link_category'),
    )

# ============================================================
# Keyword (알림 키워드/카테고리)
# ============================================================
class Keyword(Base):
    __tablename__ = "keywords"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    word: Mapped[str] = mapped_column(String, unique=True, index=True)

    subscribed_devices: Mapped[List["Device"]] = relationship(
        "Device",
        secondary=device_keywords,
        back_populates="subscriptions"
    )

# ============================================================
# Device (사용자 기기)
# ============================================================
class Device(Base):
    __tablename__ = "devices"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    token: Mapped[str] = mapped_column(String, unique=True, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, 
        default=lambda: datetime.now(timezone.utc)
    )

    subscriptions: Mapped[List["Keyword"]] = relationship(
        "Keyword",
        secondary=device_keywords,
        back_populates="subscribed_devices"
    )

# ============================================================
# Scrap (스크랩/북마크)
# ============================================================
class Scrap(Base):
    __tablename__ = "scraps"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    device_id: Mapped[int] = mapped_column(
        Integer, 
        ForeignKey("devices.id", ondelete="CASCADE"), 
        index=True
    )
    notice_id: Mapped[int] = mapped_column(
        Integer, 
        ForeignKey("notices.id", ondelete="CASCADE"), 
        index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, 
        default=lambda: datetime.now(timezone.utc),
        index=True  # 정렬용 인덱스
    )
    
    # [복합 인덱스] - 같은 공지를 여러 번 스크랩하지 못하도록
    __table_args__ = (
        UniqueConstraint('device_id', 'notice_id', name='uix_device_notice'),
    )

# ============================================================
# [선택사항] 알림 발송 이력 (중복 방지용)
# ============================================================
class NotificationHistory(Base):
    __tablename__ = "notification_history"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    device_id: Mapped[int] = mapped_column(
        Integer, 
        ForeignKey("devices.id", ondelete="CASCADE"),
        index=True
    )
    notice_id: Mapped[int] = mapped_column(
        Integer, 
        ForeignKey("notices.id", ondelete="CASCADE"),
        index=True
    )
    sent_at: Mapped[datetime] = mapped_column(
        DateTime, 
        default=lambda: datetime.now(timezone.utc)
    )
    
    __table_args__ = (
        UniqueConstraint('device_id', 'notice_id', name='uix_notification_device_notice'),
        Index('idx_sent_at', 'sent_at'),
    )

# ============================================================
# [선택사항] 크롤링 실패 로그
# ============================================================
class CrawlFailureLog(Base):
    __tablename__ = "crawl_failures"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    url: Mapped[str] = mapped_column(String, index=True)
    category: Mapped[str] = mapped_column(String, index=True)
    error_message: Mapped[str] = mapped_column(Text)
    retry_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, 
        default=lambda: datetime.now(timezone.utc),
        index=True
    )
    last_retry_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime, 
        nullable=True
    )