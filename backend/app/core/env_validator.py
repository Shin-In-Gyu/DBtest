# app/core/env_validator.py
"""
환경 변수 검증 모듈
서버 시작 전 필수 환경 변수가 설정되어 있는지 확인합니다.
"""
import os
import sys
from pathlib import Path
from typing import List, Tuple
from app.core.logger import get_logger

logger = get_logger()

class EnvValidationError(Exception):
    """환경 변수 검증 실패 시 발생하는 예외"""
    pass

def validate_environment() -> None:
    """
    필수 환경 변수를 검증합니다.
    누락된 변수가 있으면 명확한 에러 메시지와 함께 종료합니다.
    """
    errors: List[str] = []
    warnings: List[str] = []
    
    # 1. 데이터베이스 URL 확인
    db_url = os.getenv("DB_URL")
    if not db_url:
        errors.append("❌ DB_URL: 데이터베이스 URL이 설정되지 않았습니다.")
    else:
        logger.info(f"✅ DB_URL: {db_url[:30]}...")
    
    # 2. Gemini API 키 확인
    gemini_key = os.getenv("GEMINI_API_KEY")
    if not gemini_key:
        warnings.append("⚠️  GEMINI_API_KEY: AI 요약 기능이 비활성화됩니다.")
    else:
        logger.info(f"✅ GEMINI_API_KEY: {gemini_key[:10]}..." + "*" * 10)
    
    # 3. Firebase 키 파일 확인
    firebase_path = os.getenv("FIREBASE_KEY_PATH")
    if firebase_path:
        full_path = Path(firebase_path)
        if not full_path.is_absolute():
            # 상대 경로면 backend 디렉토리 기준으로 해석
            base_dir = Path(__file__).resolve().parent.parent.parent
            full_path = base_dir / firebase_path
        
        if not full_path.exists():
            warnings.append(f"⚠️  FIREBASE_KEY_PATH: 파일을 찾을 수 없습니다 ({full_path}). 알림 기능이 비활성화됩니다.")
        else:
            logger.info(f"✅ FIREBASE_KEY_PATH: {full_path}")
    else:
        warnings.append("⚠️  FIREBASE_KEY_PATH: 푸시 알림 기능이 비활성화됩니다.")
    
    # 4. SSL 검증 설정 확인
    ssl_verify = os.getenv("SSL_VERIFY", "False")
    logger.info(f"ℹ️  SSL_VERIFY: {ssl_verify}")
    
    # 5. 관리자 API 키 확인
    admin_key = os.getenv("ADMIN_API_KEY")
    if not admin_key:
        warnings.append("⚠️  ADMIN_API_KEY: 관리자 엔드포인트가 보호되지 않습니다. 보안 위험!")
    else:
        logger.info(f"✅ ADMIN_API_KEY: 설정됨")
    
    # 6. CORS 설정 확인
    allowed_origins = os.getenv("ALLOWED_ORIGINS", "")
    if allowed_origins:
        origins = allowed_origins.split(",")
        logger.info(f"✅ ALLOWED_ORIGINS: {len(origins)}개 도메인 허용")
    else:
        warnings.append("⚠️  ALLOWED_ORIGINS: 모든 origin이 허용됩니다 (개발 모드). 프로덕션에서는 설정 필요!")
    
    # 결과 출력
    print("\n" + "="*60)
    print("🔍 환경 변수 검증 결과")
    print("="*60)
    
    if errors:
        print("\n❌ 오류 (서버 시작 불가):")
        for err in errors:
            print(f"  {err}")
    
    if warnings:
        print("\n⚠️  경고:")
        for warn in warnings:
            print(f"  {warn}")
    
    if not errors and not warnings:
        print("\n✅ 모든 환경 변수가 올바르게 설정되었습니다.")
    
    print("="*60 + "\n")
    
    # 에러가 있으면 서버 종료
    if errors:
        print("\n💡 해결 방법:")
        print("  1. .env.example 파일을 .env로 복사하세요")
        print("  2. .env 파일에서 필수 값들을 설정하세요")
        print("  3. 서버를 다시 시작하세요\n")
        raise EnvValidationError("환경 변수 검증 실패. 위 오류를 해결한 후 다시 시작하세요.")
    
    # 경고만 있으면 계속 진행 (로깅만)
    if warnings:
        logger.warning("환경 변수 경고가 있지만 서버를 시작합니다. 위 경고를 확인하세요.")
