# app/schemas.py
from pydantic import BaseModel, HttpUrl
from typing import List, Optional, Any
from datetime import date as dateType, datetime

# [기본 뼈대] 공지사항의 공통 속성
class NoticeBase(BaseModel):
    title: str
    link: str
    date: Optional[dateType] = None
    category: str
    author: Optional[str] = None
    univ_views: int = 0
    app_views: int = 0

# [응답용] 목록 조회 시 나갈 데이터 (본문 제외, ID 포함)
class NoticeListResponse(NoticeBase):
    id: int
    
    class Config:
        # ORM(DB객체)를 Pydantic 모델로 변환 허용
        from_attributes = True 

# [응답용] 파일 정보 구조
class FileItem(BaseModel):
    name: str
    url: str

# [응답용] 상세 조회 시 나갈 데이터 (본문, 이미지, 파일 포함)
class NoticeDetailResponse(NoticeBase):
    id: int
    content: str
    images: List[str] = []
    files: List[FileItem] = []
    crawled_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# [요청용] 기기 등록 시 받을 데이터
class DeviceRegisterRequest(BaseModel):
    token: str
    keywords: Optional[str] = None