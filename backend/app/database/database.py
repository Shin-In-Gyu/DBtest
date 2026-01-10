# app/database/database.py
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

# .env 파일의 내용을 불러옵니다.
load_dotenv()

# --------------------------------------------------------------------------
# [DB 연결 설정]
# 1. 현재는 SQLite를 사용합니다. (파일로 저장되므로 간편함)
# 2. 나중에 PostgreSQL로 바꾸려면 .env 파일에서 DB_URL을 수정하면 됩니다.
#    예: postgresql://user:password@localhost:5432/dbname
# --------------------------------------------------------------------------
SQLALCHEMY_DATABASE_URL = os.getenv("DB_URL", "sqlite:///./knoti.db")

# SQLite는 한 번에 하나의 쓰레드만 접근하는 게 기본이라, 
# 여러 요청을 처리하기 위해 check_same_thread 옵션을 끕니다.
# PostgreSQL을 쓸 때는 connect_args가 필요 없습니다.
connect_args = {"check_same_thread": False} if "sqlite" in SQLALCHEMY_DATABASE_URL else {}

# 엔진 생성 (DB와의 실제 연결 고리)
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args=connect_args)

# 세션 생성기 (DB에 쿼리를 날릴 때마다 만드는 '세션'의 공장)
# autocommit=False: 실수로 저장되는 것을 막기 위해 수동으로 commit()을 해야 저장됨
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 모든 모델(테이블)들이 상속받을 기본 클래스
Base = declarative_base()

def get_db():
    """
    FastAPI의 의존성 주입(Dependency Injection)을 위한 함수입니다.
    API 요청이 들어올 때 DB 세션을 열고, 처리가 끝나면 자동으로 닫아줍니다.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()