import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

# [Env] .env 파일 로드
load_dotenv()

# [Env] 환경변수에서 가져오기 (없으면 기본값 사용)
SQLALCHEMY_DATABASE_URL = os.getenv("DB_URL", "sqlite:///./knoti.db")

# connect_args는 SQLite 전용 (쓰레드 체크 비활성화)
connect_args = {"check_same_thread": False} if "sqlite" in SQLALCHEMY_DATABASE_URL else {}

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args=connect_args
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()