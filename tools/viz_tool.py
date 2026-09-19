# -*- coding: utf-8 -*-
"""움직이는 개념 그림(kind "viz") 도구. 설명은 engine/viz/README.md

사용
  python tools/viz_tool.py list                    engine/viz/*.js 에 등록된 그림 이름
  python tools/viz_tool.py place <자리표.json>      정리 슬라이드에 그림(과 확인 퀴즈)을 끼워 넣는다
  python tools/viz_tool.py sync-gnn                engine/viz/viz.js, gnn.js, README.md 를 GNN 사이트(_작업/html/viz/)로 복사
  python tools/viz_tool.py check-gnn               두 곳 파일이 같은지만 본다
  python tools/viz_tool.py check-page <과목> <페이지>  pages/viz_<페이지>.json 이 그 페이지에 들어가는지 확인 (넣기는 build_site.py 가 빌드 때 함)

자리표(place) 모양
  {"places": [
    {"file": "slides_w2.json",        자리표 파일 기준 상대 경로
     "unit": "w2-4",                  단원 id
     "after": "두 처리 방식 나란히",    이 슬라이드 다음에 넣는다. head, q, big 글자가 이 문자열과 같거나 이것으로 시작하는 슬라이드 (단원 안에서 하나여야 함)
     "id": "iot-edge-cloud",          자리 이름 (넣은 프레임에 "vp" 로 남는다)
     "frames": [{"kind": "viz", ...}, {"kind": "check", ...}]}
  ]}
  다시 돌려도 같은 결과: 자리표에 나온 파일에서 "vp" 가 붙은 프레임을 먼저 지우고 새로 넣는다.
  정리 슬라이드 JSON 을 build_slides_*.py 로 다시 만들었으면 이 명령만 다시 돌리면 된다.
"""
import hashlib, json, pathlib, re, shutil, sys

sys.stdout.reconfigure(encoding="utf-8")
ROOT = pathlib.Path(__file__).resolve().parent.parent
VIZ = ROOT / "engine" / "viz"
GNN_VIZ = ROOT.parents[1] / "02_작업" / "그래프신경망" / "최종정리" / "_작업" / "html" / "viz"
GNN_FILES = ("viz.js", "gnn.js", "README.md")
BAD = ("\u2014", "\u2013", "\u00b7")


def registered():
    names = {}
    for f in sorted(VIZ.glob("*.js")):
        for m in re.finditer(r"V\.add\('([a-z0-9_]+\.[a-z0-9_]+)'", f.read_text(encoding="utf-8")):
            names[m.group(1)] = f.name
    return names


def load_json(path):
    raw = path.read_bytes().decode("utf-8")
    return json.loads(raw), ("\r\n" in raw), raw.endswith("\n")


def save_json(path, data, crlf, trailing):
    text = json.dumps(data, ensure_ascii=False, indent=1)
    if crlf:
        text = text.replace("\n", "\r\n")
    if trailing:
        text += "\r\n" if crlf else "\n"
    path.write_bytes(text.encode("utf-8"))


def label(s):
    return str(s.get("head") or s.get("q") or s.get("big") or "")


def place(spec_path):
    spec_path = pathlib.Path(spec_path).resolve()
    spec = json.loads(spec_path.read_text(encoding="utf-8"))
    names = registered()
    files = {}
    for p in spec["places"]:
        fp = (spec_path.parent / p["file"]).resolve()
        if fp not in files:
            data, crlf, trailing = load_json(fp)
            removed = 0
            for u in data["units"]:
                n0 = len(u["slides"])
                u["slides"] = [s for s in u["slides"] if "vp" not in s]
                removed += n0 - len(u["slides"])
            files[fp] = [data, crlf, trailing, removed, 0]
        data = files[fp][0]
        unit = next((u for u in data["units"] if u["id"] == p["unit"]), None)
        if unit is None:
            raise SystemExit(f"{fp.name}: 단원 {p['unit']} 없음")
        hits = [i for i, s in enumerate(unit["slides"]) if label(s) == p["after"]] or \
               [i for i, s in enumerate(unit["slides"]) if label(s).startswith(p["after"])]
        if len(hits) != 1:
            raise SystemExit(f"{fp.name} {p['unit']}: '{p['after']}' 슬라이드가 {len(hits)}개 (하나여야 함)")
        frames = []
        for f in p["frames"]:
            f = dict(f)
            if f.get("kind") == "viz" and f.get("viz") not in names:
                raise SystemExit(f"{p['id']}: 등록 안 된 그림 '{f.get('viz')}' (engine/viz/*.js 확인)")
            for s in json.dumps(f, ensure_ascii=False):
                if s in BAD:
                    raise SystemExit(f"{p['id']}: 금지 문자 {s!r}")
            f["vp"] = p["id"]
            frames.append(f)
        at = hits[0] + 1
        unit["slides"][at:at] = frames
        files[fp][4] += len(frames)
        print(f"  {fp.name} {p['unit']} #{at + 1} 앞에 {len(frames)}장: {p['id']} ({', '.join(x.get('viz') or x['kind'] for x in frames)})")
    for fp, (data, crlf, trailing, removed, added) in files.items():
        save_json(fp, data, crlf, trailing)
        print(f"{fp.name}: 지운 프레임 {removed}, 넣은 프레임 {added}")


def _div_end(text, start):
    """start 에서 열린 <div ...> 가 닫히는 위치(</div> 뒤)"""
    depth, i = 0, start
    for m in re.finditer(r"<(/?)div\b[^>]*>", text[start:]):
        depth += -1 if m.group(1) else 1
        if depth == 0:
            return start + m.end()
    raise ValueError("div 가 닫히지 않음")


def inject_page(text, spec_path, names=None):
    """페이지 HTML(정리노트, 답안 팁)에 자리표(pages/viz_<페이지>.json)대로 <div class="vz-embed"> 를 넣은 새 HTML 과 넣은 개수.
    자리 "where": "start"(h2 바로 뒤), "afterEasy"(쉬운 설명 상자 뒤, 기본), "end"(항목 끝)"""
    import html as _html
    spec = json.loads(pathlib.Path(spec_path).read_text(encoding="utf-8"))
    names = registered() if names is None else names
    groups = {}
    for pl in spec["places"]:
        f = dict(pl["frame"])
        if f.get("viz") not in names:
            raise SystemExit(f"{pl['id']}: 등록 안 된 그림 '{f.get('viz')}'")
        raw = json.dumps(f, ensure_ascii=False)
        for ch in BAD:
            if ch in raw:
                raise SystemExit(f"{pl['id']}: 금지 문자 {ch!r}")
        c = f.get("check")
        if c and not (isinstance(c.get("a"), int) and 0 <= c["a"] < len(c.get("choices", [])) and c.get("q") and c.get("why")):
            raise SystemExit(f"{pl['id']}: check 모양 (q, choices, a, why)")
        key = (pl["section"], pl.get("where", "afterEasy"))
        groups.setdefault(key, []).append('<div class="vz-embed" data-vp="' + _html.escape(pl["id"]) + '" data-frame="' + _html.escape(raw, quote=True) + '"></div>')
    n = 0
    for (sid, where), blocks in groups.items():
        m = re.search(r'<section id="' + re.escape(sid) + r'">', text)
        if not m:
            raise SystemExit(f"{spec_path}: 항목 {sid} 없음")
        s0 = m.end()
        s1 = text.index("</section>", s0)
        if where == "start":
            h = text.find("</h2>", s0, s1)
            at = h + 5 if h >= 0 else s0
        elif where == "end":
            at = s1
        else:
            e = text.find('<div class="easy">', s0, s1)
            if e < 0:
                raise SystemExit(f"{spec_path}: {sid} 에 쉬운 설명 상자 없음 (where 를 start 나 end 로)")
            at = _div_end(text, e)
        block = "\n" + "\n".join(blocks) + "\n"
        text = text[:at] + block + text[at:]
        n += len(blocks)
    return text, n


def sha(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()[:12]


def check_gnn(copy):
    ok = True
    GNN_VIZ.mkdir(parents=True, exist_ok=True)
    for name in GNN_FILES:
        src, dst = VIZ / name, GNN_VIZ / name
        if copy:
            shutil.copyfile(src, dst)
        same = dst.exists() and sha(src) == sha(dst)
        ok = ok and same
        print(f"  {name}: {'같음' if same else '다름'} {sha(src)}")
    print("GNN viz:", "같음" if ok else "다름, python tools/viz_tool.py sync-gnn")
    return ok


def main():
    if len(sys.argv) < 2:
        print(__doc__); return
    cmd = sys.argv[1]
    if cmd == "list":
        for n, f in registered().items():
            print(f"  {n}  ({f})")
    elif cmd == "place":
        place(sys.argv[2])
    elif cmd == "sync-gnn":
        check_gnn(True)
    elif cmd == "check-page":
        W = ROOT / "work" / sys.argv[2]
        src = (W / "pages" / f"{sys.argv[3]}.html").read_text(encoding="utf-8")
        out, n = inject_page(src, W / "pages" / f"viz_{sys.argv[3]}.json")
        print(f"{sys.argv[2]} {sys.argv[3]}: 그림 {n}개 들어감, {len(src)} -> {len(out)} 글자")
    elif cmd == "check-gnn":
        sys.exit(0 if check_gnn(False) else 1)
    else:
        print(__doc__)


if __name__ == "__main__":
    main()
