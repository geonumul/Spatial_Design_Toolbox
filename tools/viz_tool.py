# -*- coding: utf-8 -*-
"""움직이는 개념 그림(kind "viz") 도구. 설명은 engine/viz/README.md

사용
  python tools/viz_tool.py list                    engine/viz/*.js 에 등록된 그림 이름
  python tools/viz_tool.py place <자리표.json>      정리 슬라이드에 그림(과 확인 퀴즈)을 끼워 넣는다
  python tools/viz_tool.py sync-gnn                engine/viz/viz.js, gnn.js, README.md 를 GNN 사이트(_작업/html/viz/)로 복사
  python tools/viz_tool.py check-gnn               두 곳 파일이 같은지만 본다

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
GNN_VIZ = pathlib.Path(r"D:/GRAPH_LECTURE_OJLEE/2026/최종정리/_작업/html/viz")
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
    elif cmd == "check-gnn":
        sys.exit(0 if check_gnn(False) else 1)
    else:
        print(__doc__)


if __name__ == "__main__":
    main()
