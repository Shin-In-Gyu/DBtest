# app/schemas.py
from pydantic import BaseModel, HttpUrl, computed_field, Field, field_validator
from typing import List, Optional, Any
from datetime import date as dateType, datetime

# [기본 뼈대] 공지사항의 공통 속성
class NoticeBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=500, description="공지사항 제목")
    link: str = Field(..., min_length=1, max_length=1000, description="공지사항 링크")
    date: Optional[dateType] = None
    category: str = Field(..., min_length=1, max_length=50, description="카테고리")
    author: Optional[str] = Field(None, max_length=100, description="작성자")
    univ_views: int = Field(default=0, ge=0, description="대학 조회수")
    app_views: int = Field(default=0, ge=0, description="앱 조회수")
    is_pinned: bool = False
    
    @computed_field
    @property
    def views(self) -> int:
        """총 조회수 (univ_views + app_views)"""
        return (self.univ_views or 0) + (self.app_views or 0)

# [응답용] 목록 조회 시 나갈 데이터 (본문 제외, ID 포함)
class NoticeListResponse(NoticeBase):
    id: int
    # [New] 내가 스크랩한 글인지 표시 (프론트엔드에서 ★ 색칠용)
    is_scraped: bool = False 
    
    class Config:
        # ORM(DB객체)를 Pydantic 모델로 변환 허용
        from_attributes = True 

# [응답용] 파일 정보 구조
class FileItem(BaseModel):
    name: str = Field(..., min_length=1, max_length=500)
    url: str = Field(..., min_length=1, max_length=1000)

# [응답용] 상세 조회 시 나갈 데이터 (본문, 이미지, 파일 포함)
class NoticeDetailResponse(NoticeBase):
    id: int
    content: str
    images: List[str] = []
    files: List[FileItem] = []
    crawled_at: Optional[datetime] = None
    # [New] 상세 화면에서도 스크랩 여부를 알아야 하므로 추가
    is_scraped: bool = False
    summary: Optional[str] = None # [New] 요약본 필드 추가(Null 일 수 있음)
    
    class Config:
        from_attributes = True

# [요청용] 기기 등록 시 받을 데이터
class DeviceRegisterRequest(BaseModel):
    token: str = Field(..., min_length=10, max_length=500, description="FCM 토큰")
    keywords: Optional[str] = Field(None, max_length=500)
    
    @field_validator('token')
    @classmethod
    def validate_token(cls, v: str) -> str:
        """토큰 검증: 공백 제거 및 길이 확인"""
        v = v.strip()
        if not v:
            raise ValueError("토큰은 비어있을 수 없습니다")
        # strip() 후 길이 재검증 (Pydantic v2에서 Field 제약이 재적용되지 않음)
        if len(v) < 10:
            raise ValueError(f"토큰은 최소 10자 이상이어야 합니다 (현재: {len(v)}자)")
        if len(v) > 500:
            raise ValueError(f"토큰은 최대 500자 이하여야 합니다 (현재: {len(v)}자)")
        return v

# [New] [요청용] 스크랩 토글(저장/취소) 요청 시 받을 데이터
class ScrapRequest(BaseModel):
    token: str = Field(..., min_length=10, max_length=500, description="기기 식별 토큰")
    
    @field_validator('token')
    @classmethod
    def validate_token(cls, v: str) -> str:
        """토큰 검증"""
        v = v.strip()
        if not v:
            raise ValueError("토큰은 비어있을 수 없습니다")
        # strip() 후 길이 재검증 (Pydantic v2에서 Field 제약이 재적용되지 않음)
        if len(v) < 10:
            raise ValueError(f"토큰은 최소 10자 이상이어야 합니다 (현재: {len(v)}자)")
        if len(v) > 500:
            raise ValueError(f"토큰은 최대 500자 이하여야 합니다 (현재: {len(v)}자)")
        return v

# [요청용] 키워드 구독 설정
class KeywordSubscriptionRequest(BaseModel):
    token: str = Field(..., min_length=10, max_length=500, description="기기 식별용 FCM 토큰")
    categories: List[str] = Field(default=[], description="구독할 카테고리 리스트 (최대 50개)")
    
    @field_validator('token')
    @classmethod
    def validate_token(cls, v: str) -> str:
        """토큰 검증"""
        v = v.strip()
        if not v:
            raise ValueError("토큰은 비어있을 수 없습니다")
        # strip() 후 길이 재검증 (Pydantic v2에서 Field 제약이 재적용되지 않음)
        if len(v) < 10:
            raise ValueError(f"토큰은 최소 10자 이상이어야 합니다 (현재: {len(v)}자)")
        if len(v) > 500:
            raise ValueError(f"토큰은 최대 500자 이하여야 합니다 (현재: {len(v)}자)")
        return v
    
    @field_validator('categories')
    @classmethod
    def validate_categories(cls, v: List[str]) -> List[str]:
        """카테고리 검증: 각 항목이 유효한지 확인"""
        if not v:
            return []
        
        # 카테고리 개수 제한
        if len(v) > 50:
            raise ValueError(f"카테고리는 최대 50개까지만 허용됩니다 (현재: {len(v)}개)")
        
        # 중복 제거 및 공백 제거
        cleaned = list(set(cat.strip() for cat in v if cat.strip()))
        
        # 각 카테고리 이름 길이 제한
        for cat in cleaned:
            if len(cat) > 50:
                raise ValueError(f"카테고리 이름이 너무 깁니다: {cat[:20]}...")
        
        return cleaned