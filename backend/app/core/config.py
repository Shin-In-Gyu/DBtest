BASE = "https://web.kangnam.ac.kr"
LIST_URL = f"{BASE}/menu/f19069e6134f8f8aa7f689a4a675e66f.do"

MENU_ID = LIST_URL.split("/menu/")[1].split(".do")[0]
INFO_URL = f"{BASE}/menu/board/info/{MENU_ID}.do"
