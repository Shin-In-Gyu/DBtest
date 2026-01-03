# detailUrl 기준으로 중복 제거(dedupe) 하는 함수.
def dedupe_by_url(items: list[dict]) -> list[dict]:
    # 지금까지 본 detailUrl들을 저장하는 집합(set)
    seen = set()
    out = []
    
    # items를 하나씩 돌면서 각 딕셔너리에서 detailUrl 값을 꺼냄
    for it in items:
        u = it["detailUrl"]
        if u in seen:
            continue
        seen.add(u)
        out.append(it)
    return out
