# app/middleware/auth.py
"""
API 인증 미들웨어
관리자 엔드포인트를 보호합니다.
"""
import os
from fastapi import Header, HTTPException, status
from typing import Optional

def verify_admin_key(x_api_key: Optional[str] = Header(None)) -> str:
    """
    관리자 API 키를 검증합니다.
    
    사용법:
        @router.post("/admin/some-endpoint")
        async def admin_endpoint(api_key: str = Depends(verify_admin_key)):
            ...
    """
    admin_key = os.getenv("ADMIN_API_KEY")
    
    # 환경 변수가 설정되지 않았으면 경고 로그와 함께 접근 차단
    if not admin_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="관리자 API 키가 설정되지 않았습니다. 서버 관리자에게 문의하세요."
        )
    
    # API 키 검증
    if not x_api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="API 키가 필요합니다. X-API-Key 헤더를 포함해주세요."
        )
    
    if x_api_key != admin_key:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="유효하지 않은 API 키입니다."
        )
    
    return x_api_key


def verify_optional_admin_key(x_api_key: Optional[str] = Header(None)) -> bool:
    """
    선택적 관리자 인증 (통계 등 읽기 전용 엔드포인트용)
    인증되면 True, 아니면 False 반환 (에러 발생 안 함)
    """
    admin_key = os.getenv("ADMIN_API_KEY")
    if not admin_key:
        return False
    
    return x_api_key == admin_key
