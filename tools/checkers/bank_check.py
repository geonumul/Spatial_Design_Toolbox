"""문제은행 JSON 검사. 사용: python bank_check.py <w2_basic.json> [...]"""
import sys, json, re
import xml.etree.ElementTree as ET
from collections import Counter
sys.stdout.reconfigure(encoding="utf-8")

BAD = {"—": "em dash", "–": "en dash", "·": "가운뎃점", "・": "가운뎃점"}
MIN = {"basic": {"mcq": 20, "ox": 20, "short": 15, "calc": 10, "essay": 10},
       "hard": {"mcq": 12, "ox": 12, "short": 8, "calc": 10, "essay": 8}}

def strings(o):
    if isinstance(o, str):
        yield o
    elif isinstance(o, list):
        for x in o:
            yield from strings(x)
    elif isinstance(o, dict):
        for v in o.values():
            yield from strings(v)

def check(path):
    errs, warns = [], []
    try:
        bank = json.load(open(path, encoding="utf-8"))
    except Exception as e:
        print(path, "JSON 오류", e); return False
    if not isinstance(bank, list):
        print(path, "배열이 아님"); return False
    ids = Counter(q.get("id") for q in bank)
    for k, v in ids.items():
        if v > 1 or not k:
            errs.append(f"id 중복/없음: {k}")
    qs = Counter((q.get("type"), q.get("q")) for q in bank)
    for k, v in qs.items():
        if v > 1:
            errs.append(f"질문 중복: {k[1][:40]}")
    for q in bank:
        qid = q.get("id", "?")
        t = q.get("type")
        for f in ("type", "part", "level", "unit", "q"):
            if not q.get(f):
                errs.append(f"{qid}: '{f}' 없음")
        if q.get("level") not in ("basic", "hard"):
            errs.append(f"{qid}: level 값 {q.get('level')}")
        if not isinstance(q.get("part"), str):
            errs.append(f"{qid}: part 는 문자열")
        s_all = json.dumps(q, ensure_ascii=False)
        for ch, name in BAD.items():
            if ch in s_all:
                errs.append(f"{qid}: {name} 사용")
        for s in strings(q):
            if s.count("$") % 2:
                errs.append(f"{qid}: $ 짝 안 맞음: {s[:50]}")
                break
        if t == "mcq":
            c = q.get("c")
            if not (isinstance(c, list) and len(c) == 4 and isinstance(q.get("a"), int) and 0 <= q["a"] < 4):
                errs.append(f"{qid}: mcq 는 보기 4개와 정답 인덱스 0~3")
            elif len(set(c)) < 4:
                errs.append(f"{qid}: 보기 중복")
            if not q.get("e"):
                warns.append(f"{qid}: 해설 없음")
        elif t == "ox":
            if not isinstance(q.get("a"), bool):
                errs.append(f"{qid}: ox 정답은 true/false")
            if not q.get("e"):
                warns.append(f"{qid}: 해설 없음")
        elif t == "short":
            if not (isinstance(q.get("a"), list) and q["a"]):
                errs.append(f"{qid}: short 정답은 배열")
            elif q.get("num"):
                try:
                    float(q["a"][0])
                except Exception:
                    errs.append(f"{qid}: num 인데 첫 답이 숫자가 아님")
        elif t == "calc":
            b = q.get("blanks")
            if not (isinstance(b, list) and b):
                errs.append(f"{qid}: blanks 없음")
            else:
                for x in b:
                    if not isinstance(x.get("ans"), (int, float)) or not x.get("label"):
                        errs.append(f"{qid}: blank 형식 {x}")
            if not (isinstance(q.get("steps"), list) and len(q["steps"]) >= 3):
                errs.append(f"{qid}: steps 3개 이상")
            if not q.get("qko"):
                warns.append(f"{qid}: qko 없음")
            if not q.get("model"):
                warns.append(f"{qid}: model 없음")
        elif t == "essay":
            for f in ("answer",):
                if not q.get(f):
                    errs.append(f"{qid}: essay '{f}' 없음")
            p = q.get("points")
            if not (isinstance(p, list) and len(p) >= 4):
                errs.append(f"{qid}: points 4개 이상")
            if not q.get("model"):
                warns.append(f"{qid}: model 없음")
        else:
            errs.append(f"{qid}: 모르는 type {t}")
        fig = q.get("fig")
        if fig:
            try:
                ET.fromstring(fig)
            except ET.ParseError as e:
                errs.append(f"{qid}: SVG 오류 {e}")
            if 'id="' in fig:
                errs.append(f"{qid}: SVG 안에 id 속성 금지")
            if "viewBox" not in fig:
                errs.append(f"{qid}: SVG viewBox 없음")
    cnt = Counter(q.get("type") for q in bank)
    lv = Counter(q.get("level") for q in bank)
    level = lv.most_common(1)[0][0] if lv else "basic"
    for t, n in (MIN.get(level, {}).items() if STRICT else []):
        if cnt.get(t, 0) < n:
            errs.append(f"{t} {cnt.get(t, 0)}개 < 최소 {n}")
    units = Counter(q.get("unit") for q in bank)
    models = Counter(q.get("model") for q in bank if q.get("type") in ("calc", "essay"))
    print(f"{path}: {len(bank)}문항 {dict(cnt)} level={dict(lv)}")
    print("  단원:", dict(units))
    print("  모델(calc+essay):", dict(models))
    for w in warns[:30]:
        print("  경고:", w)
    for e in errs:
        print("  오류:", e)
    print("  결과:", "통과" if not errs else f"오류 {len(errs)}건")
    return not errs

STRICT = "--min" in sys.argv

if __name__ == "__main__":
    ok = all([check(p) for p in sys.argv[1:] if not p.startswith("--")])
    sys.exit(0 if ok else 1)
