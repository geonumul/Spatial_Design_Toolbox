# -*- coding: utf-8 -*-
"""그래프 신경망(GNN) 사이트를 과목 하나로 가져오기
원본: D:/GRAPH_LECTURE_OJLEE/2026/최종정리/홈페이지 (GNN 빌드 결과, python build_site.py 로 만든 것)
출력: subjects/gnn/ (index.html, assets, data, img, practice) + 홈 index.html 의 GNN 카드 숫자
사용: python tools/import_gnn.py
"""
import json, pathlib, re, shutil, sys

sys.stdout.reconfigure(encoding="utf-8")
ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = pathlib.Path(r"D:/GRAPH_LECTURE_OJLEE/2026/최종정리/홈페이지")
DST = ROOT / "subjects" / "gnn"
HREF = "subjects/gnn/index.html"


def load_js(path, name):
    t = path.read_text(encoding="utf-8")
    m = re.search(r"window\." + name + r"=(.*);\s*$", t, re.S)
    return json.loads(m.group(1))


def main():
    if not (SRC / "index.html").exists():
        raise SystemExit(f"GNN 빌드 결과가 없어요: {SRC}")
    DST.mkdir(parents=True, exist_ok=True)
    for name in ("assets", "data", "img", "practice"):
        s, d = SRC / name, DST / name
        if not s.exists():
            continue
        if d.exists():
            shutil.rmtree(d)
        shutil.copytree(s, d)
    page = (SRC / "index.html").read_text(encoding="utf-8")
    # 과목 목록(허브)으로 돌아가는 탭
    page = page.replace('<a class="brand" href="#/"',
                        '<a class="hubback" href="../../index.html" aria-label="전체 과목으로">전체 과목</a>\n    <a class="brand" href="#/"', 1)
    (DST / "index.html").write_text(page, encoding="utf-8")
    # Colab 링크가 이 저장소(github.io 로 쓰는 곳)의 노트북을 열게
    mj = DST / "data" / "meta.js"
    mj.write_text(mj.read_text(encoding="utf-8").replace('"repo":"geonumul/Graph-Neural-Networks-Fall-2026"', '"repo":"geonumul/Spatial_Design_Toolbox"'), encoding="utf-8")
    aj = DST / "assets" / "app.js"
    aj.write_text(aj.read_text(encoding="utf-8").replace("'/blob/main/practice/'", "'/blob/main/subjects/gnn/practice/'"), encoding="utf-8")

    meta = load_js(SRC / "data" / "meta.js", "GNN_META")
    bank = load_js(SRC / "data" / "bank.js", "GNN_BANK")
    types = {k: 0 for k in ("mcq", "ox", "short", "essay", "calc")}
    for q in bank:
        if q.get("unit") != "용어" and q.get("type") in types:
            types[q["type"]] += 1
    count = sum(types.values())
    pass_total = sum(sum(1 for n in d.get("frames", []) if n) for d in meta.get("decks", {}).values())
    unit_total = sum(len(v) for v in meta.get("units", {}).values())
    practice = sum(p.get("n", 0) for p in meta.get("practice", []))

    idx = ROOT / "index.html"
    h = idx.read_text(encoding="utf-8")
    a = h.index("/*SUBJECTS_START*/") + len("/*SUBJECTS_START*/")
    b = h.index("/*SUBJECTS_END*/")
    subs = json.loads(h[a:b])
    ent = next((x for x in subs if x.get("href") == HREF), None)
    if ent is None:
        ent = {"href": HREF}
        subs.insert(0, ent)
    ent.update({
        "name": "그래프 신경망 (GNN)",
        "sub": "Graph Neural Networks, 2026 가을",
        "desc": "기초 다지기와 코딩 기초부터, 슬라이드를 보며 1~4회독, 정리 슬라이드, 직접 짜 보는 코딩 실습, 기출 스타일 문제까지.",
        "key": "gnn2026_site_v1",
        "count": count, "types": types, "units": unit_total,
        "features": ["회독 레슨", "정리 슬라이드", f"코딩 실습 {practice}개", "필기"],
        "ready": True, "passTotal": pass_total, "unitTotal": unit_total, "engine": 2,
    })
    for i, s in enumerate(subs, 1):
        s["no"] = f"{i:02d}"
    h = h[:a] + json.dumps(subs, ensure_ascii=False, indent=1) + h[b:]
    idx.write_text(h, encoding="utf-8")
    size = sum(f.stat().st_size for f in DST.rglob("*") if f.is_file())
    print(f"GNN 가져옴: 문항 {count}, 회독 {pass_total}, 정리 단원 {unit_total}, 실습 {practice}, {size / 1e6:.1f} MB")


if __name__ == "__main__":
    main()
