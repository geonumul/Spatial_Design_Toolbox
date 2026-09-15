"""한영 PDF v2 (최종정리용).
슬라이드마다 새 쪽에서 시작: 머리글, 영어 슬라이드, 한글 슬라이드(세로로), 그 아래부터 강의안을 2단으로 흘려 쓴다.
강의가 길면 다음 쪽으로 이어지고, 슬라이드 그림은 절대 쪼개지지 않는다.
사용: python ko_compose2.py L2 [L3 ...]  [--pages 1-5] [--lect-dir 폴더] [--out 폴더]
입력: 번역/img/<tag>/pNNN.png(영어), 번역/img/<tag>_ko/pNNN.png(한글), 번역/img/<tag>_ko.pdf(벡터 한글),
      최종정리/_작업/강의안/<tag>_*.md (## p.N 제목 / ### 대본)
출력: 최종정리/<덱 이름>_한영.pdf
강의안 문법은 최종정리/_작업/강의안_작성규칙.md 5절.
"""
import sys, re, html, pathlib, subprocess, argparse
sys.stdout.reconfigure(encoding="utf-8")
import fitz

ROOT = pathlib.Path(r"D:\GRAPH_LECTURE_OJLEE\2026\번역")
FINAL = pathlib.Path(r"D:\GRAPH_LECTURE_OJLEE\2026\최종정리")
CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
NAMES = {"L0": "0-Orientation", "L1": "1-Introduction to Graphs", "L2": "2-Message Passing Mechanism & GNNs",
         "L3": "3-Expressivity of GNNs"}
TITLES = {"L0": "0. 오리엔테이션", "L1": "1. 그래프 입문", "L2": "2. 메시지 패싱과 GNN", "L3": "3. GNN의 표현력"}
LABEL = {"key": "핵심 한 줄", "repeat": "다시 한 번", "prof": "교수님 수업에서", "mining": "지난 학기 그래프 마이닝 복습",
         "exam": "시험 포인트", "warn": "헷갈리기 쉬운 점", "step": "직접 계산해 보기"}

CSS = """
@page { size: A4; margin: 9mm 10mm 11mm 10mm;
  @bottom-right { content: counter(page); font-family: 'Pretendard', sans-serif; font-size: 7.5pt; color: #9aa3b5; } }
html, body { margin: 0; padding: 0; }
body { font-family: 'Pretendard', 'Malgun Gothic', sans-serif; color: #1d2130; font-size: 9.3pt; line-height: 1.66;
       word-break: keep-all; overflow-wrap: break-word; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.sp { break-before: page; }
.sp:first-child { break-before: auto; }
.hd { display: flex; justify-content: space-between; align-items: baseline; font-size: 9.5pt; font-weight: 700; color: #1f3a6e;
      border-bottom: 0.6pt solid #1f3a6e; padding-bottom: 1mm; margin-bottom: 1.8mm; break-after: avoid; }
.hd span { font-weight: 400; color: #8a93a6; font-size: 8pt; }
.slides { break-inside: avoid; display: flex; flex-direction: column; align-items: center; gap: 1.6mm; }
.sl { width: 152mm; height: 85.5mm; display: block; border: 0.3pt solid #aab; box-sizing: border-box; }
.lt { column-count: 2; column-gap: 6.5mm; column-rule: 0.3pt solid #dfe4ee; margin-top: 3.2mm; }
.lt > :first-child { margin-top: 0; }
.lt p { margin: 0 0 0.62em 0; orphans: 2; widows: 2; }
.lt h4 { font-size: 9.9pt; color: #1f3a6e; margin: 0.95em 0 0.35em 0; break-after: avoid; line-height: 1.4; }
.lt h4::before { content: ""; display: inline-block; width: 1.2mm; height: 3.2mm; background: #1f3a6e; margin-right: 1.6mm;
                 vertical-align: -0.5mm; border-radius: 0.3mm; }
.lt b { color: #16336b; }
.lt ul, .lt ol { margin: 0.1em 0 0.7em 0; padding-left: 1.25em; }
.lt li { margin: 0 0 0.28em 0; }
.lt code { background: #eef0f5; padding: 0 0.22em; border-radius: 2px; font-family: Consolas, monospace; font-size: 0.93em; word-break: break-all; }
.lt pre { background: #f3f5f9; border: 0.3pt solid #dde2ec; padding: 0.45em 0.6em; font-family: Consolas, monospace; font-size: 8.1pt;
          line-height: 1.42; white-space: pre-wrap; word-break: break-all; border-radius: 1.5mm; margin: 0.2em 0 0.75em 0; break-inside: avoid; }
.dm { margin: 0.35em 0 0.7em 0; overflow: hidden; break-inside: avoid; }
.dm .katex-display { margin: 0; }
.lt .katex { font-size: 1.04em; }
.lt p .katex, .lt li .katex, .lt td .katex { white-space: normal; }
.tw { overflow: hidden; margin: 0.25em 0 0.8em 0; break-inside: avoid; }
.lt table { border-collapse: collapse; width: 100%; font-size: 8.5pt; line-height: 1.45; }
.lt th, .lt td { border: 0.3pt solid #c6cedd; padding: 0.28em 0.45em; text-align: left; vertical-align: top; }
.lt th { background: #eef2f9; font-weight: 700; color: #1f3a6e; }
.bx { break-inside: avoid; border-radius: 1.6mm; padding: 1.9mm 2.6mm 1.7mm 2.6mm; margin: 0.35em 0 0.85em 0; border-left: 1.1mm solid; }
.bx .bl { font-weight: 800; font-size: 8.1pt; margin-bottom: 0.3em; letter-spacing: 0.01em; }
.bx > :last-child { margin-bottom: 0; }
.bx p { margin-bottom: 0.45em; }
.bx.key { background: #eaf0ff; border-color: #3f56c9; }  .bx.key .bl { color: #3f56c9; }
.bx.key p { font-weight: 600; color: #1b2a66; font-size: 9.7pt; }
.bx.repeat { background: #e9f7ef; border-color: #2e9e62; }  .bx.repeat .bl { color: #23804e; }
.bx.prof { background: #fff4e6; border-color: #e08a1e; }  .bx.prof .bl { color: #b86a0c; }
.bx.mining { background: #f3edff; border-color: #7b61ff; }  .bx.mining .bl { color: #5b43d6; }
.bx.exam { background: #fdecee; border-color: #d64a5b; }  .bx.exam .bl { color: #b53445; }
.bx.warn { background: #fff9db; border-color: #d9b400; }  .bx.warn .bl { color: #8f7500; }
.bx.step { background: #f2f4f8; border-color: #6b7a99; }  .bx.step .bl { color: #4a5874; }
figure.fig { break-inside: avoid; margin: 0.45em 0 0.9em 0; padding: 1.6mm 1.6mm 1.2mm 1.6mm; border: 0.3pt solid #dfe4ee; border-radius: 1.6mm; background: #fff; }
figure.fig svg { width: 100%; height: auto; display: block; }
figure.fig figcaption { font-size: 7.9pt; color: #4f5870; margin-top: 1mm; line-height: 1.45; text-align: center; }
figure.fig.wide { column-span: all; padding: 1.6mm 14mm 1.2mm 14mm; }
figure.fig.wide svg { max-height: 70mm; }
.nolect { color: #b53445; }
"""

FITJS = r"""
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css">
<script src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/contrib/auto-render.min.js"></script>
<script>
document.addEventListener("DOMContentLoaded", function () {
  var lts = document.querySelectorAll(".lt");
  if (window.renderMathInElement) {
    lts.forEach(function (el) {
      renderMathInElement(el, {delimiters: [{left: "$$", right: "$$", display: true}, {left: "$", right: "$", display: false}],
                               throwOnError: false, strict: false, ignoredTags: ["script", "noscript", "style", "textarea", "pre", "code", "svg"]});
    });
  }
  // 단 너비보다 넓은 수식, 표, 코드는 글자를 줄여서 맞춘다
  function shrink(el, min) {
    for (var k = 0; k < 6; k++) {
      if (el.scrollWidth <= el.clientWidth + 1) return;
      var cur = parseFloat(el.dataset.fs || "100");
      var next = Math.max(min, Math.floor(cur * el.clientWidth / el.scrollWidth) - 1);
      if (next >= cur) return;
      el.dataset.fs = next; el.style.fontSize = next + "%";
    }
  }
  document.querySelectorAll(".dm").forEach(function (el) { shrink(el, 45); });
  document.querySelectorAll(".tw").forEach(function (el) { shrink(el, 55); });
  document.querySelectorAll(".lt pre").forEach(function (el) { shrink(el, 60); });
});
</script>
"""

def split_cells(row):
    """| a | $|x|$ | 를 칸으로 나눈다. 수식 안의 | 는 칸 구분이 아니다."""
    s = row.strip()
    if s.startswith("|"):
        s = s[1:]
    if s.endswith("|") and not s.endswith("\\|"):
        s = s[:-1]
    cells, buf, in_math, i = [], "", False, 0
    while i < len(s):
        c = s[i]
        if c == "\\" and i + 1 < len(s):
            buf += s[i:i + 2]; i += 2; continue
        if c == "$":
            in_math = not in_math
        if c == "|" and not in_math:
            cells.append(buf.strip()); buf = ""
        else:
            buf += c
        i += 1
    cells.append(buf.strip())
    return cells

def inline(t):
    codes, maths = [], []
    t = re.sub(r"`([^`]+?)`", lambda m: (codes.append(m.group(1)), f"\x01{len(codes) - 1}\x01")[1], t)
    t = re.sub(r"\$\$.+?\$\$|\$[^$\n]+?\$", lambda m: (maths.append(m.group(0)), f"\x00{len(maths) - 1}\x00")[1], t)
    t = html.escape(t, quote=False)
    t = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", t)
    t = re.sub(r"\x00(\d+)\x00", lambda m: html.escape(maths[int(m.group(1))], quote=False), t)
    t = re.sub(r"\x01(\d+)\x01", lambda m: f"<code>{html.escape(codes[int(m.group(1))], quote=False)}</code>", t)
    return t

def table_html(rows):
    body = [split_cells(r) for r in rows]
    body = [c for c in body if not all(re.fullmatch(r":?-{2,}:?", x.replace(" ", "")) for x in c if x)]
    if not body:
        return ""
    head, rest = body[0], body[1:]
    h = "<div class='tw'><table><thead><tr>" + "".join(f"<th>{inline(c)}</th>" for c in head) + "</tr></thead><tbody>"
    for r in rest:
        h += "<tr>" + "".join(f"<td>{inline(c)}</td>" for c in r) + "</tr>"
    return h + "</tbody></table></div>"

def svg_clean(svg):
    svg = re.sub(r"<script\b.*?</script>", "", svg, flags=re.S)
    m = re.match(r"(<svg\b[^>]*>)", svg, re.S)
    if m:
        tag = re.sub(r'\s(width|height)="[^"]*"', "", m.group(1))
        svg = tag + svg[m.end():]
    return svg

def svg_width(svg):
    m = re.search(r'viewBox="\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)', svg)
    return float(m.group(1)) if m else 0

def box_html(name, arg, lines):
    if name == "fig":
        inner = blocks_html(lines)
        cap = f"<figcaption>{inline(arg)}</figcaption>" if arg else ""
        return f"<figure class='fig'>{inner}{cap}</figure>"
    label = LABEL.get(name, name)
    return f"<div class='bx {html.escape(name)}'><div class='bl'>{label}</div>{blocks_html(lines)}</div>"

def blocks_html(lines):
    out, para, i = [], [], 0
    def flush():
        if para:
            out.append("<p>" + "<br>".join(inline(l) for l in para) + "</p>")
            para.clear()
    while i < len(lines):
        s = lines[i].strip()
        if not s:
            flush(); i += 1; continue
        if s.startswith("```"):
            flush(); j = i + 1; buf = []
            while j < len(lines) and not lines[j].strip().startswith("```"):
                buf.append(lines[j]); j += 1
            out.append(f"<pre>{html.escape(chr(10).join(buf))}</pre>"); i = j + 1; continue
        if s.startswith(":::"):
            flush()
            head = s[3:].strip()
            if not head:
                i += 1; continue
            name, _, arg = head.partition(" ")
            j = i + 1; buf = []
            while j < len(lines) and lines[j].strip() != ":::":
                buf.append(lines[j]); j += 1
            out.append(box_html(name, arg.strip(), buf)); i = j + 1; continue
        if s.startswith("<svg"):
            flush(); j = i; buf = []
            while j < len(lines):
                buf.append(lines[j])
                if "</svg>" in lines[j]:
                    break
                j += 1
            out.append(svg_clean("\n".join(buf))); i = j + 1; continue
        if s.startswith("$$"):
            flush(); buf = [s]; j = i
            if not (len(s) >= 4 and s.endswith("$$")):
                j = i + 1
                while j < len(lines):
                    buf.append(lines[j].strip())
                    if lines[j].strip().endswith("$$"):
                        break
                    j += 1
            out.append(f"<div class='dm'>{html.escape(chr(10).join(buf), quote=False)}</div>"); i = j + 1; continue
        if s.startswith("#### ") or s.startswith("### ") and not s.startswith("### 대본"):
            flush(); out.append(f"<h4>{inline(s.lstrip('#').strip())}</h4>"); i += 1; continue
        if s.startswith("|"):
            flush(); rows = []; j = i
            while j < len(lines) and lines[j].strip().startswith("|"):
                rows.append(lines[j]); j += 1
            out.append(table_html(rows)); i = j; continue
        if re.match(r"[-*] ", s):
            flush(); items = []; j = i
            while j < len(lines) and re.match(r"\s*[-*] ", lines[j]):
                items.append(re.sub(r"^\s*[-*] ", "", lines[j]).strip()); j += 1
            out.append("<ul>" + "".join(f"<li>{inline(x)}</li>" for x in items) + "</ul>"); i = j; continue
        m = re.match(r"(\d+)[.)] ", s)
        if m:
            flush(); items = []; j = i
            while j < len(lines) and re.match(r"\s*\d+[.)] ", lines[j]):
                items.append(re.sub(r"^\s*\d+[.)] ", "", lines[j]).strip()); j += 1
            out.append(f"<ol start='{m.group(1)}'>" + "".join(f"<li>{inline(x)}</li>" for x in items) + "</ol>"); i = j; continue
        para.append(s); i += 1
    flush()
    return "".join(out)

def mark_wide(h):
    """가로로 넓은 그림(viewBox 너비 480 이상이고 가로세로비 2.2 이상)은 두 단을 가로질러 크게 둔다"""
    def rep(m):
        fig = m.group(0)
        vb = re.search(r'viewBox="\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)', fig)
        if vb and float(vb.group(1)) >= 480 and float(vb.group(1)) / max(float(vb.group(2)), 1) >= 2.2:
            return fig.replace("<figure class='fig'>", "<figure class='fig wide'>", 1)
        return fig
    return re.sub(r"<figure class='fig'>.*?</figure>", rep, h, flags=re.S)

def load_lectures(tag, lect_dir):
    out, titles = {}, {}
    for f in sorted(pathlib.Path(lect_dir).glob(f"{tag}_*.md")):
        text = f.read_text(encoding="utf-8")
        for m in re.finditer(r"^## p\.(\d+)[ \t]*([^\n]*)\n(.*?)(?=^## p\.\d+|\Z)", text, re.S | re.M):
            n = int(m.group(1)); body = m.group(3)
            body = body.split("### 대본", 1)[1] if "### 대본" in body else body
            if len(body) > len(out.get(n, "")):
                out[n] = body; titles[n] = m.group(2).strip()
    return out, titles

def vectorize(tag, pdf_path, order):
    """Chrome 이 넣은 슬라이드 PNG 자리에 원본 벡터 페이지를 덮어쓴다. order = 문서에 실린 슬라이드 번호 순서."""
    en_path = ROOT.parent / "강의자료" / f"{NAMES[tag]}.pdf"
    ko_path = ROOT / "img" / f"{tag}_ko.pdf"
    if not ko_path.exists():
        print(f"  [vectorize] {ko_path.name} 없음: 그림 그대로"); return
    src_en, src_ko = fitz.open(en_path), fitz.open(ko_path)
    doc = fitz.open(pdf_path)
    k = 0
    for page in doc:
        infos = sorted([d for d in page.get_image_info(xrefs=True) if d["bbox"][2] - d["bbox"][0] > 300],
                       key=lambda d: d["bbox"][1])
        if len(infos) < 2 or k >= len(order):
            continue
        n = order[k] - 1
        for info, src in zip(infos[:2], (src_en, src_ko)):
            r = fitz.Rect(info["bbox"])
            if info.get("xref"):
                try:
                    page.delete_image(info["xref"])
                except Exception:
                    pass
            page.show_pdf_page(r, src, n, keep_proportion=False)
        k += 1
    tmp = pdf_path.with_suffix(".vec.pdf")
    doc.save(tmp, garbage=4, deflate=True)
    doc.close(); src_en.close(); src_ko.close()
    tmp.replace(pdf_path)
    print(f"  [vectorize] {k}/{len(order)} slides -> vector")

def compose(tag, pages=None, lect_dir=None, out_dir=None):
    lect_dir = lect_dir or (FINAL / "_작업" / "강의안")
    out_dir = pathlib.Path(out_dir or FINAL)
    lectures, titles = load_lectures(tag, lect_dir)
    en = sorted((ROOT / "img" / tag).glob("p*.png"))
    total = len(en)
    order, parts, missing = [], [], []
    for i, p in enumerate(en, 1):
        if pages and i not in pages:
            continue
        ko = ROOT / "img" / f"{tag}_ko" / p.name
        body = lectures.get(i, "")
        if not body.strip():
            missing.append(i)
        lt = mark_wide(blocks_html(body.splitlines())) if body.strip() else "<p class='nolect'>(강의안 없음)</p>"
        title = html.escape(titles.get(i, ""))
        parts.append(f"""<section class="sp">
<div class="hd"><div>p.{i} {title}</div><span>{TITLES[tag]} | {i} / {total}</span></div>
<div class="slides"><img class="sl" src="{p.as_uri()}"><img class="sl" src="{ko.as_uri()}"></div>
<div class="lt">{lt}</div>
</section>""")
        order.append(i)
    page = (f"<!doctype html><html lang='ko'><head><meta charset='utf-8'><title>{NAMES[tag]}</title>"
            f"<style>{CSS}</style>{FITJS}</head><body>{''.join(parts)}</body></html>")
    out_dir.mkdir(parents=True, exist_ok=True)
    hp = out_dir / f"{NAMES[tag]}_한영.html"
    hp.write_text(page, encoding="utf-8")
    pdf = out_dir / f"{NAMES[tag]}_한영.pdf"
    subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--no-pdf-header-footer", "--virtual-time-budget=120000",
                    "--run-all-compositor-stages-before-draw", f"--print-to-pdf={pdf}", hp.as_uri()],
                   capture_output=True, timeout=3600)
    hp.unlink(missing_ok=True)
    vectorize(tag, pdf, order)
    cnt = len(fitz.open(pdf))
    print(f"{tag}: {pdf}  pages={cnt} slides={len(order)}" + (f"  강의안 없는 쪽: {missing}" if missing else ""))

def parse_pages(s):
    out = set()
    for part in s.split(","):
        a, _, b = part.partition("-")
        out.update(range(int(a), int(b or a) + 1))
    return out

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("tags", nargs="+")
    ap.add_argument("--pages")
    ap.add_argument("--lect-dir")
    ap.add_argument("--out")
    a = ap.parse_args()
    for t in a.tags:
        compose(t, parse_pages(a.pages) if a.pages else None, a.lect_dir, a.out)
