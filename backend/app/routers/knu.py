from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database.database import get_db
from app.database.models import Notice
from app.services import knu_notice_service

router = APIRouter()

@router.get("/notices")
async def read_notices(
    category: str = "all",
    q: Optional[str] = Query(None, description="검색어"),
    page: int = 1,
    db: Session = Depends(get_db)
):
    limit = 20
    skip = (page - 1) * limit
    
    results = knu_notice_service.search_notices_from_db(
        db, category, query=q, skip=skip, limit=limit
    )
    
    return results