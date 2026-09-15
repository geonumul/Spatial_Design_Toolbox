"""회독 레슨 JSON 검사. 사용: python lesson_check.py L2_001-018.json 1 18"""
import sys, json, re
import xml.etree.ElementTree as ET
sys.stdout.reconfigure(encoding="utf-8")

BAD = {"—": "em dash", "–": "en dash", "·": "가운뎃점", "・": "가운뎃점"}
CTRL = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f]")
EMOJI = re.compile("[\U0001F300-\U0001FAFF☀-➿]")
SVG_CLASSES = {"n", "n2", "n3", "n4", "e", "e2", "arrow", "t", "tb", "tm", "tl", "box", "box2", "hl"}
REQ = {
    "title": ["big", "sub"], "goal": ["items"], "points": ["head", "items"], "analogy": ["head", "scene", "map"],
    "formula": ["head", "tex", "parts", "whole"], "steps": ["head", "steps", "answer"],
    "figure": ["head", "svg", "caption", "builds"], "compare": ["head", "cols", "rows"],
    "english": ["head", "en", "ko"], "check": ["q", "choices", "a", "why"], "warn": ["head", "items"], "recap": ["items"],
    "say": ["lines"], "look": ["head", "boxes"], "prof": ["when", "lines"], "mining": ["src", "lines"], "bg": ["src", "lines"],
    "exam": ["src", "q", "qko", "solve", "answer"], "code": ["head", "file", "code", "lines"], "pyterm": ["name", "say", "example"],
}
PASS_KINDS = {
    "pass1": {"say", "analogy", "figure", "points", "title", "goal", "recap", "compare"},
}

def strings(o, skip=("svg", "code", "example", "out", "tex", "sym")):
    if isinstance(o, str):
        yield o
    elif isinstance(o, list):
        for x in o:
            yield from strings(x, skip)
    elif isinstance(o, dict):
        for k, v in o.items():
            if k not in skip:
                yield from strings(v, skip)

def check_svg(where, s, errs):
    try:
        root = ET.fromstring(s.get("svg", ""))
    except ET.ParseError as e:
        errs.append(f"{where}: SVG 오류 {e}"); return
    if "viewBox" not in root.attrib:
        errs.append(f"{where}: viewBox 없음")
    maxb = 0
    for el in root.iter():
        a = el.attrib
        for bad in ("id", "style", "stroke-width", "font-family"):
            if bad in a:
                errs.append(f"{where}: SVG '{bad}' 속성 금지")
        for ca in ("fill", "stroke"):
            if ca in a and a[ca] != "none":
                errs.append(f"{where}: SVG {ca} 색 속성 금지 (클래스로)")
        for c in a.get("class", "").split():
            m = re.fullmatch(r"b(\d)", c)
            if m:
                maxb = max(maxb, int(m.group(1)))
            elif c not in SVG_CLASSES:
                errs.append(f"{where}: 모르는 SVG 클래스 '{c}'")
    b = s.get("builds", 0)
    if maxb != b and not (maxb == 0 and b == 1):
        errs.append(f"{where}: builds={b} 인데 b 최대 {maxb}")

def check_frame(where, s, errs, warns):
    k = s.get("kind")
    if k not in REQ:
        errs.append(f"{where}: 모르는 kind {k}"); return
    for f in REQ[k]:
        if s.get(f) in (None, "", []):
            errs.append(f"{where}: '{f}' 없음")
    for t in strings(s):
        if CTRL.search(t):
            errs.append(f"{where}: 제어 문자 (raw string?) {t[:40]!r}")
        if EMOJI.search(t):
            errs.append(f"{where}: 이모지")
        if t.count("$") % 2:
            errs.append(f"{where}: $ 짝 안 맞음: {t[:40]}")
        if len(re.sub(r"\$[^$]*\$", "X", t)) > 140:
            warns.append(f"{where}: 긴 줄 {len(t)}자")
    for f in ("code", "example", "tex"):
        if CTRL.search(s.get(f, "") or ""):
            errs.append(f"{where}: '{f}' 에 제어 문자")
    if k == "figure":
        check_svg(where, s, errs)
    elif k == "check":
        if not (isinstance(s.get("a"), int) and 0 <= s["a"] < len(s.get("choices", []))):
            errs.append(f"{where}: 정답 인덱스")
    elif k == "look":
        for b in s.get("boxes", []):
            try:
                ok = all(0 <= float(b[c]) <= 1 for c in ("x", "y", "w", "h")) and b["x"] + b["w"] <= 1.02 and b["y"] + b["h"] <= 1.02 and b.get("say")
            except Exception:
                ok = False
            if not ok:
                errs.append(f"{where}: look 박스 형식/범위 {b}")
    elif k == "code":
        n = len(s.get("code", "").split("\n"))
        for ln in s.get("lines", []):
            if not (isinstance(ln.get("from"), int) and isinstance(ln.get("to"), int) and 1 <= ln["from"] <= ln["to"] <= n and ln.get("say")):
                errs.append(f"{where}: code lines 범위 {ln} (코드 {n}줄)")
    elif k == "analogy":
        if not all(isinstance(p, list) and len(p) == 2 for p in s.get("map", [])):
            errs.append(f"{where}: map 형식")
    elif k == "formula":
        if not all(isinstance(p, dict) and p.get("sym") and p.get("say") for p in s.get("parts", [])):
            errs.append(f"{where}: parts 형식")
    elif k == "compare":
        nc = len(s.get("cols", []))
        for r in s.get("rows", []):
            if len(r) != nc:
                errs.append(f"{where}: 행 칸 수 != 열 수")
    elif k in ("say", "prof", "mining", "bg"):
        if len(s.get("lines", [])) > 5:
            warns.append(f"{where}: lines {len(s['lines'])}줄 (4줄 이내 권장)")

def main(path, lo, hi):
    errs, warns = [], []
    raw = open(path, encoding="utf-8").read()
    for ch, name in BAD.items():
        if ch in raw:
            errs.append(f"{name} {raw.count(ch)}개")
    try:
        d = json.loads(raw)
    except Exception as e:
        print(path, "JSON 오류", e); return False
    slides = d.get("slides", [])
    ps = [s.get("p") for s in slides]
    miss = [p for p in range(lo, hi + 1) if p not in ps]
    if miss:
        errs.append(f"누락 쪽 {miss}")
    if len(ps) != len(set(ps)):
        errs.append("중복 쪽")
    gl = d.get("glossary", [])
    if not gl:
        errs.append("glossary 없음")
    counts = {"pass1": 0, "pass2": 0, "pass3": 0, "pass4": 0, "pass5": 0, "pass6": 0}
    for s in slides:
        p = s.get("p")
        if not s.get("title"):
            errs.append(f"p.{p}: title 없음")
        if not s.get("pass1"):
            errs.append(f"p.{p}: pass1 비어 있음")
        if not s.get("terms") and len(" ".join(strings(s.get("pass2", [])))) > 200:
            warns.append(f"p.{p}: terms 비어 있음 (0회독 용어 먼저에 안 나옴)")
        for pk in counts:
            fr = s.get(pk, [])
            if not isinstance(fr, list):
                errs.append(f"p.{p} {pk}: 배열 아님"); continue
            counts[pk] += len(fr)
            for i, f in enumerate(fr):
                where = f"p.{p} {pk}#{i + 1} {f.get('kind')}"
                check_frame(where, f, errs, warns)
                if pk in PASS_KINDS and f.get("kind") not in PASS_KINDS[pk]:
                    warns.append(f"{where}: {pk} 에 어울리지 않는 종류")
        if len(s.get("pass1", [])) > 4:
            warns.append(f"p.{p}: pass1 {len(s['pass1'])}프레임 (1~3 권장)")
    body = " ".join(strings(slides)).lower()
    for g in gl:
        if not (isinstance(g, dict) and (g.get("en") or g.get("ko")) and g.get("say")):
            errs.append(f"glossary 형식 {g}"); continue
        name = g.get("ko") or g.get("en")
        c = max(body.count((g.get("en") or "\x00").lower()), body.count((g.get("ko") or "\x00").lower()))
        if c < 3:
            warns.append(f"용어 '{name}' {c}번 (3번 이상)")
    print(f"{path}: 쪽 {len(slides)}개, 프레임 1회독 {counts['pass1']} / 2회독 {counts['pass2']} / 3회독 {counts['pass3']} / 4회독 {counts['pass4']} / 5회독 {counts['pass5']} / 6회독 {counts['pass6']}, 용어 {len(gl)}개")
    for w in warns[:30]:
        print("  경고:", w)
    for e in errs[:60]:
        print("  오류:", e)
    print("  결과:", "통과" if not errs else f"오류 {len(errs)}건")
    return not errs

if __name__ == "__main__":
    a = sys.argv[1:]
    sys.exit(0 if main(a[0], int(a[1]), int(a[2])) else 1)
