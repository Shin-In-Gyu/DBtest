# app/schemas.py
from pydantic import BaseModel, HttpUrl, computed_field
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
    name: str
    url: str

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
    token: str
    keywords: Optional[str] = None

# [New] [요청용] 스크랩 토글(저장/취소) 요청 시 받을 데이터
class ScrapRequest(BaseModel):
    token: str # 누가 스크랩을 눌렀는지 식별하기 위해 토큰을 받습니다.

# app/schemas.py 에 추가

class KeywordSubscriptionRequest(BaseModel):
    token: str  # 기기 식별용 FCM 토큰
    categories: List[str]  # 사용자가 선택한 카테고리 리스트 (예: ["academic", "scholar"])