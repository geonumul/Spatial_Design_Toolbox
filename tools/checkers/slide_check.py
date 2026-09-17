"""정리노트 슬라이드 JSON 검사. 사용: python slide_check.py slides_w2.json"""
import sys, json, re
import xml.etree.ElementTree as ET
sys.stdout.reconfigure(encoding="utf-8")

BAD = {"—": "em dash", "–": "en dash", "·": "가운뎃점", "・": "가운뎃점"}
CTRL = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f]")
SVG_CLASSES = {"n", "n2", "n3", "n4", "e", "e2", "arrow", "t", "tb", "tm", "tl", "box", "box2", "hl"}
REQ = {
    "title": ["big", "sub"], "goal": ["items"], "points": ["head", "items"], "analogy": ["head", "scene", "map"],
    "formula": ["head", "tex", "parts", "whole"], "steps": ["head", "steps", "answer"],
    "figure": ["head", "svg", "caption", "builds"], "compare": ["head", "cols", "rows"],
    "english": ["head", "en", "ko"], "check": ["q", "choices", "a", "why"], "viz": ["viz", "head"], "warn": ["head", "items"], "recap": ["items"],
}
EMOJI = re.compile("[\U0001F300-\U0001FAFF☀-➿]")

def strings(o):
    if isinstance(o, str):
        yield o
    elif isinstance(o, list):
        for x in o:
            yield from strings(x)
    elif isinstance(o, dict):
        for k, v in o.items():
            if k != "svg":
                yield from strings(v)

def viz_names(path):
    """움직이는 그림 등록 이름: JSON 파일 위쪽 폴더에서 engine/viz/*.js 나 viz/*.js 를 찾는다 (README.md 참고)"""
    import pathlib
    for d in pathlib.Path(path).resolve().parents:
        for cand in (d / "engine" / "viz", d / "viz"):
            if (cand / "viz.js").exists():
                names = set()
                for f in cand.glob("*.js"):
                    names.update(re.findall(r"V\.add\('([a-z0-9_]+\.[a-z0-9_]+)'", f.read_text(encoding="utf-8")))
                return names
    return None

def main(path):
    errs, warns = [], []
    raw = open(path, encoding="utf-8").read()
    for ch, name in BAD.items():
        if ch in raw:
            errs.append(f"{name} {raw.count(ch)}개")
    try:
        d = json.loads(raw)
    except Exception as e:
        print(path, "JSON 오류", e); return False
    units = d.get("units", [])
    if not (6 <= len(units) <= 12):
        warns.append(f"단원 {len(units)}개 (8~10 권장)")
    ids = set(); nslides = 0; nsvg = 0
    for u in units:
        uid = u.get("id", "?")
        if uid in ids:
            errs.append(f"단원 id 중복 {uid}")
        ids.add(uid)
        for f in ("id", "title", "goal", "slides"):
            if not u.get(f):
                errs.append(f"{uid}: '{f}' 없음")
        sl = u.get("slides", [])
        nslides += len(sl)
        terms = u.get("terms", [])
        if not (4 <= len(terms) <= 12):
            errs.append(f"{uid}: terms {len(terms)}개 (4~10)")
        body = " ".join(strings(sl)).lower()
        for t in terms:
            if not (isinstance(t, dict) and (t.get("en") or t.get("ko")) and t.get("say")):
                errs.append(f"{uid}: terms 형식 {t}"); continue
            c = max(body.count((t.get("en") or "\x00").lower()), body.count((t.get("ko") or "\x00").lower()))
            if c < 3:
                errs.append(f"{uid}: 용어 '{t.get('ko') or t.get('en')}' 가 슬라이드 글에 {c}번 (3번 이상)")
        kinds = [s.get("kind") for s in sl]
        if not (8 <= len(sl) <= 22):
            warns.append(f"{uid}: 슬라이드 {len(sl)}장 (10~18 권장)")
        if kinds[:1] != ["title"]:
            errs.append(f"{uid}: 첫 슬라이드는 title")
        if kinds[-1:] != ["recap"]:
            errs.append(f"{uid}: 마지막 슬라이드는 recap")
        for need in ("goal", "analogy", "figure", "check"):
            if need not in kinds:
                errs.append(f"{uid}: {need} 슬라이드 없음")
        for i, s in enumerate(sl):
            where = f"{uid} #{i + 1} {s.get('kind')}"
            k = s.get("kind")
            if k not in REQ:
                errs.append(f"{where}: 모르는 kind"); continue
            if k == "viz":
                reg = viz_names(path)
                if reg is None:
                    errs.append(f"{where}: engine/viz/viz.js 를 못 찾음")
                elif s.get("viz") not in reg:
                    errs.append(f"{where}: 등록 안 된 그림 '{s.get('viz')}'")
                for key in ("params", "caps"):
                    if key in s and not isinstance(s[key], dict if key == "params" else list):
                        errs.append(f"{where}: {key} 모양")
            for f in REQ[k]:
                if s.get(f) in (None, "", []):
                    errs.append(f"{where}: '{f}' 없음")
            for t in strings(s):
                if CTRL.search(t):
                    errs.append(f"{where}: 제어 문자 (raw string 안 씀?) {t[:40]!r}")
                if EMOJI.search(t):
                    errs.append(f"{where}: 이모지")
                if k != "formula" and len(re.sub(r"\$[^$]*\$", "X", t)) > 110:
                    warns.append(f"{where}: 긴 문장 {len(t)}자: {t[:30]}")
            if k not in ("formula",):
                for t in strings(s):
                    if t.count("$") % 2:
                        errs.append(f"{where}: $ 짝 안 맞음: {t[:40]}")
            if k in ("points", "goal", "warn", "recap") and not (1 <= len(s.get("items", [])) <= 6):
                errs.append(f"{where}: items 개수")
            if k == "check":
                if not (isinstance(s.get("a"), int) and 0 <= s["a"] < len(s.get("choices", []))):
                    errs.append(f"{where}: 정답 인덱스")
            if k == "analogy" and not all(isinstance(p, list) and len(p) == 2 for p in s.get("map", [])):
                errs.append(f"{where}: map 은 [비유, 개념] 쌍 목록")
            if k == "formula" and not all(isinstance(p, dict) and p.get("sym") and p.get("say") for p in s.get("parts", [])):
                errs.append(f"{where}: parts 형식")
            if k == "compare":
                nc = len(s.get("cols", []))
                for r in s.get("rows", []):
                    if len(r) != nc:
                        errs.append(f"{where}: 행 칸 수 {len(r)} != 열 {nc}")
            if k == "figure":
                nsvg += 1
                svg = s.get("svg", "")
                try:
                    root = ET.fromstring(svg)
                except ET.ParseError as e:
                    errs.append(f"{where}: SVG 오류 {e}"); continue
                if "viewBox" not in root.attrib:
                    errs.append(f"{where}: viewBox 없음")
                maxb = 0
                for el in root.iter():
                    a = el.attrib
                    for bad in ("id", "style", "stroke-width", "font-family"):
                        if bad in a:
                            errs.append(f"{where}: SVG '{bad}' 속성 금지")
                    for ca in ("fill", "stroke"):
                        if ca in a and a[ca] not in ("none",):
                            errs.append(f"{where}: SVG {ca}=\"{a[ca]}\" 금지 (클래스로)")
                    for c in a.get("class", "").split():
                        m = re.fullmatch(r"b(\d)", c)
                        if m:
                            maxb = max(maxb, int(m.group(1)))
                        elif c not in SVG_CLASSES:
                            errs.append(f"{where}: 모르는 SVG 클래스 '{c}'")
                if maxb != s.get("builds", 0) and not (maxb == 0 and s.get("builds") == 1):
                    errs.append(f"{where}: builds={s.get('builds')} 인데 b 최대 {maxb}")
    print(f"{path}: 단원 {len(units)}개, 슬라이드 {nslides}장, 그림 {nsvg}개")
    for w in warns[:25]:
        print("  경고:", w)
    for e in errs[:60]:
        print("  오류:", e)
    print("  결과:", "통과" if not errs else f"오류 {len(errs)}건")
    return not errs

if __name__ == "__main__":
    sys.exit(0 if all(main(p) for p in sys.argv[1:]) else 1)
