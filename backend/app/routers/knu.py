from fastapi import APIRouter, Query
from app.services.knu_notice_service import get_notice_list, get_notice_detail
from app.utils.security import ensure_allowed_url

router = APIRouter()

@router.get("/notices")
async def list_notices(
    category: str = Query(
        "univ", 
        description="공지사항 카테고리 키 (예: univ, academic, computer, ai, social_work 등. 전체 리스트는 notices.json 참조)"
    )
):
    """
    지정된 카테고리의 공지사항 목록을 가져옵니다.
    """
    return await get_notice_list(category)

@router.get("/notice")
async def notice_detail(
    url: str = Query(..., description="목록에서 받아온 detailUrl을 그대로 입력")
):
    """
    공지사항의 상세 내용(본문, 첨부파일 등)을 가져옵니다.
    """
    # 보안을 위해 허용된 도메인(web, sae, ace 등)인지 검증
    url = ensure_allowed_url(url)
    return await get_notice_detail(url)