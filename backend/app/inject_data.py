# inject_data.py
import sqlite3
import os
#알람 전송  확인용 테스트 py파일
# DB 파일 경로 (knoti.db가 있는 위치)
DB_PATH = "../knoti.db"

def inject_data():
    # DB 파일이 있는지 확인
    if not os.path.exists(DB_PATH):
        print(f"❌ 오류: '{DB_PATH}' 파일을 찾을 수 없습니다.")
        print("👉 서버(main.py)를 최소 한 번은 실행해야 DB 파일이 생성됩니다.")
        return

    # SQLite 연결
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    print("🚀 가짜 데이터 주입을 시작합니다...")

    try:
        # 1. 가짜 기기(폰) 등록 (토큰: TEST_TOKEN_12345)
        # INSERT OR IGNORE: 이미 있으면 에러 안 내고 무시함
        cursor.execute("""
            INSERT OR IGNORE INTO devices (token, created_at) 
            VALUES ('TEST_TOKEN_12345', datetime('now'))
        """)
        
        # 2. '장학' 키워드 등록
        cursor.execute("""
            INSERT OR IGNORE INTO keywords (word) 
            VALUES ('장학')
        """)
        
        # 방금 넣은(혹은 이미 있던) ID 값 가져오기
        cursor.execute("SELECT id FROM devices WHERE token = 'TEST_TOKEN_12345'")
        device_row = cursor.fetchone()
        
        cursor.execute("SELECT id FROM keywords WHERE word = '장학'")
        keyword_row = cursor.fetchone()

        if device_row and keyword_row:
            device_id = device_row[0]
            keyword_id = keyword_row[0]

            # 3. 구독 관계 연결 (중복 방지)
            cursor.execute("""
                INSERT OR IGNORE INTO device_keywords (device_id, keyword_id)
                VALUES (?, ?)
            """, (device_id, keyword_id))
            
            conn.commit()
            print("✅ 성공! 데이터를 무사히 넣었습니다.")
            print(f"   - Device ID: {device_id} (토큰: TEST_TOKEN_12345)")
            print(f"   - Keyword ID: {keyword_id} (키워드: 장학)")
            print("👉 이제 서버를 켜고 테스트 버튼을 눌러보세요!")
        else:
            print("❌ ID 조회 실패. 데이터가 제대로 들어가지 않았습니다.")

    except Exception as e:
        print(f"🔥 에러 발생: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    inject_data()