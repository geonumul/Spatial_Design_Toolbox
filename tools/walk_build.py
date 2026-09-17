# -*- coding: utf-8 -*-
"""슬라이드 부분씩 읽기 데이터 만들기: 글이 많은 강의 슬라이드를 한 번에 통째로 보여 주지 않고,
레슨의 look 박스(부분)마다 확대 그림을 잘라 두고 차례를 정한다.

사용: python tools/walk_build.py <과목> [덱 ...] [--sheet 폴더]
  --sheet 폴더   확인용 한눈 보기 그림 (부분 상자, 제목 칸, 설명이 없는 글 줄) 을 만든다

입력
  work/<과목>/subject.json 의 decks (원본 PDF)
  work/<과목>/lesson/<덱>_*.json  의 look 프레임 (boxes: x, y, w, h, say)
  work/<과목>/walk/fix.json      사람이 고친 것 (선택)
      {"<덱>": {"<쪽>": {"head": [x, y, w, h] 또는 null,       제목 칸을 직접 정하거나 없앤다
                         "lead": ["pass3:0", ...],             부분 읽기에 쓸 look 프레임 (기본: pass3 의 look 전부)
                         "extra": [{"b": [x, y, w, h], "say": "...", "at": 번호}      설명을 붙인 부분을 더한다 (at: 몇 번째 부분 뒤, 없으면 맨 끝)
                                    또는 {"ref": "pass2:0:3", "at": 번호}]}}}  다른 look 프레임의 상자를 그 설명과 함께 가져온다
  글자 위치: 글자 층이 있으면 PDF, 없으면 recall/_ocr/<덱>.json (tools/recall_build.py 가 만든 OCR 캐시)
출력
  work/<과목>/walk/<덱>.json
      {"deck", "pages": [{"p", "head": 부분 또는 null, "lead": [look 키], "looks": {look 키: [부분, ...]}, "extra": [부분]}]}
      부분 = {"b": 짚을 상자, "c": 잘라 보일 칸, "r": 그 칸의 가로/세로 픽셀 비, "img": 그림 경로}  좌표는 쪽 너비, 높이에 대한 비율
      look 키 = "pass<n>:<그 회독 안 순서>"
  subjects/<과목>/img/<덱>/walk/pNNN_*.jpg   부분 확대 그림 (쪽 너비 1800px 기준으로 자름)
사이트 빌드(build_site.py)가 이 파일을 읽어 레슨 쪽마다 walk 를 붙인다. say 글은 빌드 때 레슨에서 다시 읽으니,
look 박스 좌표를 고쳤을 때만 이 스크립트를 다시 돌리면 된다.
"""
import json, pathlib, sys

import fitz

sys.stdout.reconfigure(encoding="utf-8")
ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "tools"))
import recall_build as RB   # noqa: E402  글자 줄 읽기를 같이 쓴다

DENS = 1800          # 잘라 낼 때 쪽 너비 픽셀
AR = 841.92 / 595.32


def r3(v):
    return round(v, 4)


def crop_of(b, min_h=0.11):
    """짚을 상자 b 주위에 여백을 두고, 너무 작거나 너무 가늘지 않게 넓힌 칸"""
    x, y, w, h = b
    px, py = max(0.012, 0.05 * w), max(0.016, 0.05 * h)
    cx, cy = x + w / 2, y + h / 2
    cw, ch = max(w + 2 * px, 0.2), max(h + 2 * py, min_h)
    a = cw * AR / ch
    if a > 7 and min_h > 0.05:
        ch = cw * AR / 7
    elif a < 0.55:
        cw = ch * 0.55 / AR
    cw, ch = min(cw, 1), min(ch, 1)
    x0 = min(max(cx - cw / 2, 0), 1 - cw)
    y0 = min(max(cy - ch / 2, 0), 1 - ch)
    return [r3(x0), r3(y0), r3(cw), r3(ch)]


def slides_of(slug, deck):
    slides = {}
    for f in sorted((ROOT / "work" / slug / "lesson").glob(f"{deck}_*.json")):
        for s in json.loads(f.read_text(encoding="utf-8")).get("slides", []):
            old = slides.get(s["p"])
            if old is None or len(json.dumps(s, ensure_ascii=False)) > len(json.dumps(old, ensure_ascii=False)):
                slides[s["p"]] = s
    return slides


def looks_of(s):
    out = []
    for n in range(1, 7):
        for i, fr in enumerate(s.get(f"pass{n}", [])):
            if fr.get("kind") == "look" and fr.get("boxes"):
                out.append((f"pass{n}:{i}", fr))
    return out


def line_box(ln):
    cs = ln["cs"]
    return min(c[1] for c in cs), min(c[2] for c in cs), max(c[3] for c in cs), max(c[4] for c in cs)


def inside(pt, b, m=0.004):
    return b[0] - m <= pt[0] <= b[0] + b[2] + m and b[1] - m <= pt[1] <= b[1] + b[3] + m


def build(slug, deck, pdf, sheet_dir=None):
    work = ROOT / "work" / slug
    fixes = {}
    fx = work / "walk" / "fix.json"
    if fx.exists():
        fixes = json.loads(fx.read_text(encoding="utf-8")).get(deck, {})
    doc = fitz.open(pdf)
    has_text = sum(len(p.get_text("words")) for p in doc) > len(doc) * 3
    if has_text:
        raw = [RB.chars_from_pdf(p) for p in doc]
    else:
        cache = work / "recall" / "_ocr" / f"{deck}.json"
        if not cache.exists():
            print(f"  {deck}: OCR 캐시가 없어요. 먼저 python tools/recall_build.py {slug} {deck}")
            return
        raw = [RB.chars_from_ocr(pg) for pg in RB.ocr_pages(pdf, cache)]
    lines = [RB.classify(r, "a4") for r in raw]
    imgdir = ROOT / "subjects" / slug / "img" / deck / "walk"
    imgdir.mkdir(parents=True, exist_ok=True)
    for old in imgdir.glob("*.jpg"):
        old.unlink()
    slides = slides_of(slug, deck)
    pages, nparts, nimg, loose = [], 0, 0, []
    for p in sorted(slides):
        s, fix = slides[p], fixes.get(str(p), {})
        page = doc[p - 1]
        z = DENS / page.rect.width

        def part(b, name):
            nonlocal nimg
            c = crop_of(b, 0.05 if name == "h" else 0.11)
            clip = fitz.Rect(c[0] * page.rect.width, c[1] * page.rect.height, (c[0] + c[2]) * page.rect.width, (c[1] + c[3]) * page.rect.height)
            fn = f"p{p:03d}_{name}.jpg"
            page.get_pixmap(matrix=fitz.Matrix(z, z), clip=clip).save(imgdir / fn, jpg_quality=70)
            nimg += 1
            return {"b": [r3(v) for v in b], "c": c, "r": r3(c[2] * page.rect.width / (c[3] * page.rect.height)), "img": f"img/{deck}/walk/{fn}"}

        looks = looks_of(s)
        lead = fix.get("lead") or [k for k, _ in looks if k.startswith("pass3:")] or [k for k, _ in looks[:1]]
        rec = {"p": p, "head": None, "lead": lead, "looks": {}, "extra": []}
        for k, fr in looks:
            rec["looks"][k] = [part([bx["x"], bx["y"], bx["w"], bx["h"]], k.replace("pass", "").replace(":", "") + f"_{i + 1:02d}") for i, bx in enumerate(fr["boxes"])]
        boxes = [[bx["x"], bx["y"], bx["w"], bx["h"]] for k, fr in looks if k in lead for bx in fr["boxes"]]
        for i, e in enumerate(fix.get("extra", [])):
            if e.get("ref"):     # "pass2:0:3" 다른 look 프레임의 3번째 상자 (say 는 빌드 때 읽는다)
                k, j = e["ref"].rsplit(":", 1)
                bx = dict(looks)[k]["boxes"][int(j) - 1]
                q = part([bx["x"], bx["y"], bx["w"], bx["h"]], f"x{i + 1:02d}")
                q["ref"] = e["ref"]
            else:
                q = part(e["b"], f"x{i + 1:02d}")
                q["say"] = e.get("say", "")
            q["at"] = e.get("at", 99)
            rec["extra"].append(q)
            boxes.append(q["b"])
        top = min((b[1] for b in boxes), default=1)
        # 제목 칸: 맨 위 부분보다 위에 있고 어느 부분에도 안 들어간 글 줄 (머리글, 쪽 번호 줄은 뺀다)
        head, rest = [], []
        for ln in lines[p - 1]:
            if ln["zone"] == "skip":
                continue
            x0, y0, x1, y1 = line_box(ln)
            ctr = ((x0 + x1) / 2, (y0 + y1) / 2)
            if any(inside(ctr, b) for b in boxes):
                continue
            (head if ctr[1] < top else rest).append((x0, y0, x1, y1, ln["text"].strip()))
        if "head" in fix:
            if fix["head"]:
                rec["head"] = part(fix["head"], "h")
        elif head:
            x0 = min(h[0] for h in head) - 0.01; y0 = min(h[1] for h in head) - 0.01
            x1 = max(h[2] for h in head) + 0.01; y1 = max(h[3] for h in head) + 0.01
            y1 = min(y1, top - 0.002) if top < 1 else y1
            rec["head"] = part([max(x0, 0), max(y0, 0), min(x1, 1) - max(x0, 0), max(y1 - max(y0, 0), 0.02)], "h")
        long_rest = [r for r in rest if len(r[4]) >= 8]
        if long_rest:
            loose.append((p, [r[4][:40] for r in long_rest]))
        nparts += (1 if rec["head"] else 0) + len(boxes)
        pages.append(rec)
    out = work / "walk" / f"{deck}.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps({"deck": deck, "pages": pages}, ensure_ascii=False, indent=1), encoding="utf-8", newline="\n")
    size = sum(f.stat().st_size for f in imgdir.glob("*.jpg")) / 1e6
    print(f"  {deck}: {len(pages)}쪽, 부분 읽기 {nparts}개 (제목 칸 {sum(1 for x in pages if x['head'])}), 그림 {nimg}장 {size:.1f} MB")
    for p, t in loose:
        print(f"    p.{p} 설명 부분 밖 글 줄 {len(t)}: " + " / ".join(t[:4]))
    if sheet_dir:
        draw_sheet(slug, deck, pages, pathlib.Path(sheet_dir))


def draw_sheet(slug, deck, pages, outdir):
    from PIL import Image, ImageDraw, ImageFont
    outdir.mkdir(parents=True, exist_ok=True)
    font = ImageFont.truetype("C:/Windows/Fonts/malgunbd.ttf", 22)
    thumbs = []
    for rec in pages:
        im = Image.open(ROOT / "subjects" / slug / "img" / deck / f"p{rec['p']:03d}.jpg").convert("RGB")
        W, H = im.size
        dr = ImageDraw.Draw(im)
        seq = ([rec["head"]] if rec["head"] else []) + [q for k in rec["lead"] for q in rec["looks"].get(k, [])] + rec["extra"]
        for i, q in enumerate(seq):
            b, c = q["b"], q["c"]
            dr.rectangle([c[0] * W, c[1] * H, (c[0] + c[2]) * W, (c[1] + c[3]) * H], outline="#9bb", width=1)
            dr.rectangle([b[0] * W, b[1] * H, (b[0] + b[2]) * W, (b[1] + b[3]) * H], outline="#d11" if i or not rec["head"] else "#11d", width=3)
            dr.text((b[0] * W + 4, b[1] * H + 2), str(i), fill="#d11", font=font)
        im = im.resize((500, int(500 * H / W)))
        ImageDraw.Draw(im).text((6, 4), f"{deck} p{rec['p']}", fill="black", font=font)
        thumbs.append(im)
    for g in range(0, len(thumbs), 16):
        th = thumbs[0].size[1]
        sheet = Image.new("RGB", (500 * 4, th * 4), "white")
        for i, t in enumerate(thumbs[g:g + 16]):
            sheet.paste(t, ((i % 4) * 500, (i // 4) * th))
        sheet.save(outdir / f"walk_{deck}_{g // 16}.jpg", quality=78)


def main():
    argv = sys.argv[1:]
    if not argv:
        print(__doc__)
        sys.exit(1)
    slug = argv[0]
    sheet = argv[argv.index("--sheet") + 1] if "--sheet" in argv else None
    cfg = json.loads((ROOT / "work" / slug / "subject.json").read_text(encoding="utf-8"))
    decks = [a for a in argv[1:] if a in cfg.get("decks", {})] or list(cfg.get("decks", {}))
    print(f"부분 읽기: {slug}")
    for deck in decks:
        build(slug, deck, cfg["decks"][deck]["pdf"], sheet)


if __name__ == "__main__":
    main()
