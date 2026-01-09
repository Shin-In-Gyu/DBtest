# app/core/logger.py
import logging
import os
from logging.handlers import RotatingFileHandler

LOG_DIR = "logs"
if not os.path.exists(LOG_DIR):
    os.makedirs(LOG_DIR)

logger = logging.getLogger("KNOTI_BACKEND")
logger.setLevel(logging.INFO)

formatter = logging.Formatter(
    '[%(asctime)s] %(levelname)s : %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)

# 파일 핸들러 (10MB 단위, 최대 5개 백업)
file_handler = RotatingFileHandler(
    os.path.join(LOG_DIR, "service.log"),
    maxBytes=10*1024*1024, backupCount=5, encoding="utf-8"
)
file_handler.setFormatter(formatter)

# 콘솔 핸들러
stream_handler = logging.StreamHandler()
stream_handler.setFormatter(formatter)

if not logger.handlers:
    logger.addHandler(file_handler)
    logger.addHandler(stream_handler)

def get_logger():
    return logger