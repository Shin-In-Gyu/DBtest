from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# SQLite 파일 경로 (프로젝트 루트에 생성됨)
SQLALCHEMY_DATABASE_URL = "sqlite:///./knoti.db"

# connect_args는 SQLite 전용 (쓰레드 체크 비활성화)
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Dependency Injection용 함수
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()