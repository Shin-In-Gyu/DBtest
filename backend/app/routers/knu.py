from fastapi import APIRouter, Query
from app.services.knu_notice_service import get_notice_list, get_notice_detail
from app.utils.security import ensure_allowed_url

router = APIRouter()

@router.get("/notices")
async def list_notices(searchMenuSeq: int = 0):
    return await get_notice_list(searchMenuSeq)

@router.get("/notice")
async def notice_detail(url: str = Query(..., description="detailUrl을 그대로 넣기")):
    url = ensure_allowed_url(url)
    return await get_notice_detail(url)
