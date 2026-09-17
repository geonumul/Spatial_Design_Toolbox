# -*- coding: utf-8 -*-
"""과목 회독 사이트 빌드: work/<slug>/ -> subjects/<slug>/ (GitHub Pages 정적 사이트)

사용: python tools/build_site.py <slug> [--skip wb,w3]   (덜 된 정리 슬라이드 파일은 --skip 으로 뺀다)
     --no-home 을 붙이면 저장소 루트 index.html 의 과목 카드는 고치지 않는다

입력 (work/<slug>/)
  subject.json               과목 설정: 이름, 저장 키, 주차(weeks), 덱(decks), 회독 단계(passes), 모의고사 구성(mock)
  lesson/<덱>_*.json         회독 레슨 (tools/checkers/lesson_check.py)
  notes/slides_w*.json       정리 슬라이드. 기초 다지기는 slides_wb.json (tools/checkers/slide_check.py)
  bank/*.json                문제은행 JSON 배열 (tools/checkers/bank_check.py)
  walk/<덱>.json             슬라이드 부분씩 읽기 (tools/walk_build.py 가 만든다, 선택) -> 레슨 쪽마다 walk
  recall/<덱>.json           가리고 설명하기 (tools/recall_build.py 가 만든다, 선택) -> data/recall_<덱>.js
  pages/tips.html, exams.html  답안 팁, 기출 분석 (선택)
  pages/note.html, time.html   정리노트, 연표 (선택, 큰 페이지라 data/page_<이름>.js 로 따로 두고 열 때 읽음.
                               정리노트 항목과 주차 짝은 subject.json 의 noteSections)
  subjects/<slug>/img/<덱>/pNNN.jpg   tools/render_slides.py 가 만든 슬라이드 그림
  subjects/<slug>/pdf/<덱>_강의안.pdf  tools/compose_pdf.py 가 만든 강의안 PDF (있으면 링크)
출력
  subjects/<slug>/index.html, data/meta.js, terms.js, bank.js, pages.js, page_note.js, page_time.js, lesson_<덱>.js, notes_w<주차>.js
  저장소 루트 index.html 의 과목 카드 숫자
화면 코드는 engine/ (모든 과목 공통), 로그인은 assets/sync.js.
"""
import datetime, hashlib, html, json, pathlib, re, sys

sys.stdout.reconfigure(encoding="utf-8")
ROOT = pathlib.Path(__file__).resolve().parent.parent
ENGINE = ROOT / "engine"
BAD = ("—", "–", "·")
TYPES = ("mcq", "ox", "short", "essay", "calc")
DEF_PASSES = [{"n": 1, "t": "큰 그림", "d": ""}, {"n": 2, "t": "자세히", "d": ""}, {"n": 3, "t": "시험", "d": ""}]
# 과목별 가는 선 로고 (24x24, currentColor)
def _logo(inner):
    return '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' + inner + '</svg>'
LOGOS = {
    "iot-smart-home": _logo('<path d="M3.5 11.2L12 4.5l8.5 6.7"/><path d="M6 9.6V19.5h12V9.6"/><path d="M9.3 14.6a3.8 3.8 0 015.4 0"/><path d="M7.4 12.6a6.5 6.5 0 019.2 0"/><circle cx="12" cy="16.9" r=".7" fill="currentColor" stroke="none"/>'),
    "modern-space-design": _logo('<path d="M4 20h16"/><path d="M6 20v-8a6 6 0 0112 0v8"/><path d="M9.5 20v-7a2.5 2.5 0 015 0v7"/><path d="M4 8.5L12 4l8 4.5"/>'),
    "eco-architecture": _logo('<path d="M4 11.5L12 5l8 6.5"/><path d="M6.5 10v9.5h11V10"/><path d="M12 18.5c-2.6-.4-3.8-2.3-3.4-4.9 2.6-.2 4.6 1.2 4.9 3.6"/><path d="M12 18.5v-2.6"/>'),
    "food-nutrition": _logo('<path d="M4 12h16a8 8 0 01-16 0z"/><path d="M9 8.5c0-1.5 1-1.5 1-3M13 8.5c0-1.5 1-1.5 1-3"/><path d="M8 20.5h8"/>'),
    "interior-construction": _logo('<path d="M4.5 15.5L15.5 4.5l4 4-11 11z"/><path d="M8 12l1.6 1.6M10.5 9.5l1.6 1.6M13 7l1.6 1.6"/>'),
}
DEFAULT_LOGO = _logo('<path d="M4 5.5h6.5a2 2 0 012 2V20a2 2 0 00-2-2H4z"/><path d="M20 5.5h-5.5a2 2 0 00-2 2V20a2 2 0 012-2H20z"/>')

LAZY_PAGES = {"note": "정리노트", "time": "연표"}   # pages/<이름>.html -> data/page_<이름>.js, 메뉴 이름
META_KEYS = ("name", "brand", "key", "eyebrow", "intro", "pathLabel", "examLabel", "examsDesc", "tipsDesc", "mockDesc", "bgLabel", "sentLabel", "mock", "pet")


def js_assign(name, key, obj):
    body = json.dumps(obj, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
    if key is None:
        return f"window.{name}={body};\n"
    return f"window.{name}=window.{name}||{{}};window.{name}[{json.dumps(key)}]={body};\n"


def write(path, text):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8", newline="\n")


def load(path):
    return json.loads(path.read_text(encoding="utf-8"))


def attach_walk(src, ordered, deck):
    """tools/walk_build.py 가 만든 부분 읽기 (work/<slug>/walk/<덱>.json).
    쪽마다 walk (제목 칸, 부분 차례와 설명) 를 붙이고, look 상자에 확대 그림을 붙인다.
    부분 읽기로 옮긴 look 프레임은 {"kind": "look", "walked": 1} 로 비워 둔다 (필기 키가 순서로 정해져서 자리는 남긴다)."""
    if not src.exists():
        return 0
    pages = {x["p"]: x for x in load(src).get("pages", [])}
    n = 0
    for s in ordered:
        w = pages.get(s["p"])
        if not w:
            continue
        looks = {}
        for k in range(1, 7):
            for i, fr in enumerate(s.get(f"pass{k}", [])):
                if fr.get("kind") == "look" and fr.get("boxes"):
                    looks[f"pass{k}:{i}"] = fr
        bad = [key for key, parts in w.get("looks", {}).items()
               if key not in looks or len(looks[key]["boxes"]) != len(parts)
               or any(max(abs(bx[a] - q["b"][j]) for j, a in enumerate("xywh")) > 0.002 for bx, q in zip(looks[key]["boxes"], parts))]
        if bad or any(key not in looks for key in w.get("lead", [])):
            print(f"  [부분 읽기 건너뜀] {deck} p.{s['p']} {bad}: look 상자가 바뀌었어요. python tools/walk_build.py 를 다시 돌려요")
            continue
        for key, parts in w.get("looks", {}).items():
            for bx, q in zip(looks[key]["boxes"], parts):
                bx["c"], bx["r"], bx["img"] = q["c"], q["r"], q["img"]
        seq = []
        for key in w.get("lead", []):
            seq += [{"b": [bx["x"], bx["y"], bx["w"], bx["h"]], "c": bx["c"], "r": bx["r"], "img": bx["img"], "say": bx["say"]} for bx in looks[key]["boxes"]]
        for q in w.get("extra", []):
            say = q.get("say", "")
            if q.get("ref"):
                key, j = q["ref"].rsplit(":", 1)
                say = looks[key]["boxes"][int(j) - 1]["say"]
            seq.insert(min(q.get("at", 99), len(seq)), {"b": q["b"], "c": q["c"], "r": q["r"], "img": q["img"], "say": say})
        if not seq:
            continue
        for key in w.get("lead", []):
            pk, i = key.split(":")
            s[pk][int(i)] = {"kind": "look", "walked": 1}
        s["walk"] = {"head": {k: w["head"][k] for k in ("b", "c", "r", "img")} if w.get("head") else None, "parts": seq}
        n += 1
    return n


def pack_recall(src, out, name, deck):
    """가리고 설명하기 데이터를 사이트용 data/recall_<덱>.js 로. 메타에 넣을 요약을 돌려준다."""
    if not src.exists():
        if out.exists():
            out.unlink()
        return None
    r = load(src)
    pages = [[m[:6] for m in pg["m"]] for pg in r["pages"]]
    n = [sum(1 for pg in pages for m in pg if m[4] <= lv) for lv in (1, 2, 3)]
    secs = sum(len(c["items"]) for c in r.get("sections", []))
    write(out, js_assign(name, deck, {"deck": deck, "ar": r.get("ar", 1.414), "pages": pages, "sections": r.get("sections", [])}))
    print(f"  가리고 설명하기 {deck}: 칸 {n}, 소단원 {secs}")
    return {"n": n, "secs": secs}


def tid(s):
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")[:40] or hashlib.md5(s.encode()).hexdigest()[:8]


def main(slug, skip, home=True):
    W, SITE = ROOT / "work" / slug, ROOT / "subjects" / slug
    cfg = load(W / "subject.json")
    ver = datetime.datetime.now().strftime("%Y%m%d%H%M")
    weeks = cfg["weeks"]
    wids = [w["id"] for w in weeks]
    meta = {k: cfg[k] for k in META_KEYS if k in cfg}
    meta.update(ver=ver, weeks=weeks, decks={}, units={}, prereq=cfg.get("prereq", {}), passes=cfg.get("passes") or DEF_PASSES, deckWeek={})
    terms = {w: [] for w in wids}

    def add_term(week, t):
        if not isinstance(t, dict):
            return
        ko, en, say = (t.get("ko") or "").strip(), (t.get("en") or "").strip(), (t.get("say") or "").strip()
        if not (ko or en) or not say:
            return
        key = (en or ko).lower()
        for x in terms[week]:
            if (x["en"] or x["ko"]).lower() == key:
                if not x.get("more") and t.get("more"):
                    x["more"] = t["more"].strip()
                return
        item = {"ko": ko, "en": en, "say": say}
        if (t.get("more") or "").strip():
            item["more"] = t["more"].strip()
        terms[week].append(item)

    # 1) 회독 레슨
    for deck, d in cfg.get("decks", {}).items():
        week = d["week"]
        meta["deckWeek"][deck] = week
        total = d.get("total") or len(list((SITE / "img" / deck).glob("p*.jpg")))
        slides, gloss = {}, []
        for f in sorted((W / "lesson").glob(f"{deck}_*.json")):
            try:
                dd = load(f)
            except Exception as e:
                print(f"  [건너뜀] {f.name}: {e}")
                continue
            for s in dd.get("slides", []):
                old = slides.get(s["p"])
                if old is None or len(json.dumps(s, ensure_ascii=False)) > len(json.dumps(old, ensure_ascii=False)):
                    slides[s["p"]] = s
            gloss += dd.get("glossary", [])
        for g in gloss:
            add_term(week, g)
        ordered = [slides[p] for p in sorted(slides)]
        walks = attach_walk(W / "walk" / f"{deck}.json", ordered, deck)   # 1-1) 부분 읽기 (tools/walk_build.py)
        frames = [0] * 6
        for s in ordered:
            for n in range(6):
                if s.get(f"pass{n + 1}"):
                    frames[n] += 1 + len([f for f in s[f"pass{n + 1}"] if not f.get("walked")])
        for n in range(6):
            if frames[n]:
                frames[n] += 1
        warm = sum(2 for s in ordered if s.get("terms"))
        warm = warm + 1 if warm else 0   # 0회독 용어 먼저: 쪽마다 슬라이드 그림 + 용어 카드, 끝 장면
        pdf = SITE / "pdf" / f"{deck}_강의안.pdf"
        meta["decks"][deck] = {"title": d["title"], "total": total, "have": len(ordered), "frames": frames, "warm": warm,
                               "pdf": f"pdf/{deck}_강의안.pdf" if pdf.exists() else ""}
        out = SITE / "data" / f"lesson_{deck}.js"
        if ordered:
            write(out, js_assign("SDT_LESSONS", deck, {"deck": deck, "slides": ordered}))
        elif out.exists():
            out.unlink()
        print(f"  레슨 {deck}: {len(ordered)}/{total}장, 장면 {frames}" + (f", 부분 읽기 {walks}쪽" if walks else "") + (", PDF 있음" if pdf.exists() else ""))
        # 1-2) 가리고 설명하기 (tools/recall_build.py 가 만든 work/<slug>/recall/<덱>.json)
        rinfo = pack_recall(W / "recall" / f"{deck}.json", SITE / "data" / f"recall_{deck}.js", "SDT_RECALL", deck)
        if rinfo:
            meta["decks"][deck]["recall"] = rinfo

    # 2) 정리 슬라이드, 기초 다지기
    for f in sorted((W / "notes").glob("slides_w*.json")):
        m = re.fullmatch(r"slides_w(\w+?)\.json", f.name)
        if not m:
            continue
        out = SITE / "data" / f"notes_w{m.group(1)}.js"
        if "w" + m.group(1) in skip:
            print(f"  [건너뜀] {f.name}: --skip")
            if out.exists():
                out.unlink()
            continue
        try:
            d = load(f)
        except Exception as e:
            print(f"  [건너뜀] {f.name}: {e}")
            continue
        week = str(d.get("week") or m.group(1))
        if week not in terms:
            print(f"  [건너뜀] {f.name}: 모르는 주차 {week}")
            continue
        for u in d.get("units", []):
            for t in u.get("terms", []):
                add_term(week, t)
        meta["units"][week] = [{"id": u["id"], "title": u["title"], "goal": u.get("goal", ""), "n": len(u.get("slides", [])),
                                "terms": [(t.get("ko") or t.get("en")) for t in u.get("terms", []) if isinstance(t, dict) and (t.get("ko") or t.get("en"))]}
                               for u in d.get("units", [])]
        write(out, js_assign("SDT_NOTES", week, d))
        print(f"  정리 슬라이드 {week}: 단원 {len(d.get('units', []))}개")

    # 3) 문제은행 + 용어 퀴즈
    bank, seen = [], set()
    for f in sorted((W / "bank").glob("*.json")):
        try:
            arr = load(f)
        except Exception as e:
            print(f"  [건너뜀] {f.name}: {e}")
            continue
        if not isinstance(arr, list):
            print(f"  [건너뜀] {f.name}: 배열이 아님")
            continue
        for q in arr:
            if not q.get("id"):
                q["id"] = hashlib.md5((q["type"] + "|" + q["q"]).encode()).hexdigest()[:10]
            q.setdefault("level", "basic")
            if q["id"] in seen:
                raise SystemExit(f"중복 id {q['id']} ({f.name})")
            if q.get("part") not in wids:
                print(f"  경고: {f.name} {q['id']} part={q.get('part')} 는 주차 목록에 없음")
            seen.add(q["id"])
            bank.append(q)
    nterm = 0
    for week, lst in terms.items():
        if len(lst) < 4:
            continue
        n = len(lst)
        full = lambda t: (t["ko"] or t["en"]) + (f"({t['en']})" if t["en"] and t["ko"] else "")
        for i, t in enumerate(lst):
            others = [lst[(i + k) % n] for k in (1, 2, 3)]
            base = f"term-w{week}-{tid(t['en'] or t['ko'])}"
            if base + "-a" in seen:
                continue
            says = [t["say"]] + [o["say"] for o in others]
            names = [full(t)] + [full(o) for o in others]
            if len(set(says)) == 4:
                bank.append({"id": base + "-a", "type": "mcq", "part": week, "level": "basic", "unit": "용어",
                             "q": f"**{full(t)}** 의 뜻으로 알맞은 것은?", "c": says, "a": 0, "e": f"{full(t)}: {t['say']}"})
                nterm += 1
            if len(set(names)) == 4:
                bank.append({"id": base + "-b", "type": "mcq", "part": week, "level": "basic", "unit": "용어",
                             "q": f"'{t['say']}' 을 뜻하는 용어는?", "c": names, "a": 0, "e": f"{t['say']} = {full(t)}"})
                nterm += 1
            seen.update({base + "-a", base + "-b"})
    write(SITE / "data" / "bank.js", js_assign("SDT_BANK", None, bank))
    write(SITE / "data" / "terms.js", js_assign("SDT_TERMS", None, terms))
    write(SITE / "data" / "meta.js", js_assign("SDT_META", None, meta))
    real = [q for q in bank if q.get("unit") != "용어"]
    cnt = {t: sum(1 for q in real if q["type"] == t) for t in TYPES}
    print(f"  문제 {len(real)}개 {cnt} (용어 퀴즈 {nterm}개), 용어 " + ", ".join(f"{w} {len(v)}" for w, v in terms.items()))

    # 4) 정적 페이지
    pages = {}
    for name in ("tips", "exams"):
        p = W / "pages" / f"{name}.html"
        if p.exists():
            pages[name] = p.read_text(encoding="utf-8")
    write(SITE / "data" / "pages.js", js_assign("SDT_PAGES", None, pages))
    # 4-1) 큰 정적 페이지 (정리노트, 연표): 그 화면을 열 때만 읽는다
    lazy = []
    for name in LAZY_PAGES:
        p, out = W / "pages" / f"{name}.html", SITE / "data" / f"page_{name}.js"
        if p.exists():
            text = p.read_text(encoding="utf-8")
            write(out, js_assign("SDT_PAGES_LAZY", name, text))
            lazy.append(name)
            if name == "note":
                titles = {m.group(1): html.unescape(re.sub(r"<[^>]+>", "", m.group(2))).strip()
                          for m in re.finditer(r'<section id="(s\d+)">\s*<h2>(.*?)</h2>', text, re.S)}
                meta["noteTitles"] = titles
                meta["noteSections"] = {w: [s for s in lst if s in titles] for w, lst in (cfg.get("noteSections") or {}).items()}
                print(f"  정리노트: 항목 {len(titles)}개, {len(text) / 1e6:.1f} MB")
            else:
                print(f"  {name} 페이지: {len(text) / 1e3:.0f} KB")
        elif out.exists():
            out.unlink()
    if lazy:
        meta["lazyPages"] = lazy
    write(SITE / "data" / "meta.js", js_assign("SDT_META", None, meta))

    # 5) 껍데기
    nav = ['<a class="tab" data-nav="home" href="#/">홈</a>']
    for name, label in LAZY_PAGES.items():
        if name in lazy:
            nav.append(f'<a class="tab" data-nav="p{name}" href="#/{name}">{label}</a>')
    nav +=[f'<a class="tab" data-nav="w{w["id"]}" href="#/week/{w["id"]}">{html.escape(w["short"])}</a>' for w in weeks]
    nav += ['<a class="tab" data-nav="quiz" href="#/quiz">문제</a>',
            '<a class="tab" data-nav="wrong" href="#/wrong">오답노트 <span id="wrongBadge" class="badge"></span></a>']
    if "exams" in pages:
        nav.append('<a class="tab" data-nav="exams" href="#/exams">기출 분석</a>')
    if "tips" in pages:
        nav.append('<a class="tab" data-nav="tips" href="#/tips">답안 팁</a>')
    nav.append('<a class="tab" data-nav="set" href="#/settings">설정</a>')
    name = cfg["name"]
    page = ((ENGINE / "index.html").read_text(encoding="utf-8")
            .replace("__VER__", ver).replace("__TITLE__", html.escape(name + " 회독 스터디"))
            .replace("__BRAND__", html.escape(cfg.get("brand") or name))
            .replace("__LOGO__", "" if slug in ("eco-architecture", "modern-space-design") else LOGOS.get(slug, DEFAULT_LOGO))
            .replace("__DESC__", html.escape(name + ": 강의 회독, 정리 슬라이드, 용어 카드, 문제은행"))
            .replace("__NAV__", "\n".join("      " + x for x in nav)))
    write(SITE / "index.html", page)

    # 6) 검사
    for p in list((SITE / "data").glob("*.js")) + [SITE / "index.html"]:
        t = p.read_text(encoding="utf-8")
        bad = {c: t.count(c) for c in BAD if c in t}
        if bad:
            print(f"  경고: {p.name} 금지 문자 {bad}")

    # 7) 홈 카드
    if home:
        update_home(slug, cfg, meta, real, cnt)
    else:
        print("  --no-home: 홈 index.html 과목 카드는 건드리지 않음")
    size = sum(f.stat().st_size for f in SITE.rglob("*") if f.is_file())
    print(f"완료 subjects/{slug}  버전 {ver}, {size / 1e6:.1f} MB")


def update_home(slug, cfg, meta, real, cnt):
    idx = ROOT / "index.html"
    h = idx.read_text(encoding="utf-8")
    a = h.index("/*SUBJECTS_START*/") + len("/*SUBJECTS_START*/")
    b = h.index("/*SUBJECTS_END*/")
    subs = json.loads(h[a:b])
    ent = next((x for x in subs if x.get("href") == f"subjects/{slug}/index.html"), None)
    if not ent:
        print("  경고: 홈 SUBJECTS 에 이 과목이 없음")
        return
    decks = meta["decks"].values()
    have = sum(d["have"] for d in decks)
    pass_total = sum(sum(1 for n in d["frames"] if n) for d in decks)
    units_b = len(meta["units"].get("b", []))
    units_o = sum(len(v) for k, v in meta["units"].items() if k != "b")
    exam = sum(1 for q in real if str(q.get("src", "")).startswith("기출"))
    feats = []
    if have:
        feats.append(f"강의 회독 {have}장")
    if units_o:
        feats.append(f"정리 슬라이드 {units_o}단원")
    if units_b:
        feats.append(f"기초 다지기 {units_b}단원")
    if any(d.get("pdf") for d in decks):
        feats.append("강의안 PDF")
    if exam:
        feats.append(f"기출 {exam}문항")
    ent.update(count=len(real), types=cnt, features=feats, passTotal=pass_total, unitTotal=units_b + units_o,
               key=cfg["key"], ready=bool(real or have), engine=2)
    h = h[:a] + json.dumps(subs, ensure_ascii=False, indent=1) + h[b:]
    idx.write_text(h, encoding="utf-8", newline="\n")


if __name__ == "__main__":
    args = sys.argv[1:]
    if not args:
        print(__doc__)
        sys.exit(1)
    sk = set()
    if "--skip" in args:
        sk = set(args[args.index("--skip") + 1].split(","))
    main(args[0], sk, home="--no-home" not in args)
