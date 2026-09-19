# -*- coding: utf-8 -*-
"""강의안 PDF: 슬라이드마다 새 쪽에서 시작. 위에 원본 슬라이드(벡터), 아래에 떠먹여주는 강의안을 2단으로 흘려 쓴다.
강의가 길면 다음 쪽으로 이어지고, 슬라이드 그림은 쪼개지지 않는다.

사용: python tools/compose_pdf.py <slug> <덱> [--pages 1-5]
입력
  work/<slug>/subject.json              덱의 원본 PDF 경로
  subjects/<slug>/img/<덱>/pNNN.jpg      render_slides.py 가 만든 그림 (크롬 인쇄용, 인쇄 뒤 원본 벡터로 바꿈)
  work/<slug>/lecture/<덱>_*.md          강의안 (## p.N 제목 / ### 대본). 문법: work/_rules/강의안_작성규칙.md
출력: subjects/<slug>/pdf/<덱>_강의안.pdf   (--pages 를 주면 <덱>_강의안_미리보기.pdf)
마크업 변환은 tools/checkers/ko_compose2.py (인수인계 원본) 의 함수를 그대로 쓴다.
"""
import argparse, html, json, pathlib, subprocess, sys
import fitz

ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "tools" / "checkers"))
import ko_compose2 as K  # noqa: E402

sys.stdout.reconfigure(encoding="utf-8")
K.LABEL.update({"mining": "배경 지식", "bg": "배경 지식", "prof": "교수님 수업에서", "exam": "시험 포인트"})
CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
CSS = K.CSS + """
.sl1 { display: block; margin: 0 auto; border: 0.3pt solid #aab; box-sizing: border-box; }
.bx.bg { background: #f3edff; border-color: #7b61ff; }  .bx.bg .bl { color: #5b43d6; }
"""


def compose(slug, deck, pages=None):
    cfg = json.loads((ROOT / "work" / slug / "subject.json").read_text(encoding="utf-8"))
    d = cfg["decks"][deck]
    src = fitz.open((ROOT / d["pdf"]).resolve())   # pdf 는 저장소 기준 상대 경로
    lectures, titles = K.load_lectures(deck, ROOT / "work" / slug / "lecture")
    img = ROOT / "subjects" / slug / "img" / deck
    total = len(src)
    parts, order, missing = [], [], []
    for i in range(1, total + 1):
        if pages and i not in pages:
            continue
        r = src[i - 1].rect
        w = 186.0
        hmm = w * r.height / r.width
        if hmm > 125:
            hmm = 125.0
            w = hmm * r.width / r.height
        body = lectures.get(i, "")
        if not body.strip():
            missing.append(i)
        lt = K.mark_wide(K.blocks_html(body.splitlines())) if body.strip() else "<p class='nolect'>(강의안 없음)</p>"
        parts.append(f"""<section class="sp">
<div class="hd"><div>p.{i} {html.escape(titles.get(i, ''))}</div><span>{html.escape(d['title'])} | {i} / {total}</span></div>
<div class="slides"><img class="sl1" style="width:{w:.1f}mm;height:{hmm:.1f}mm" src="{(img / f'p{i:03d}.jpg').as_uri()}"></div>
<div class="lt">{lt}</div>
</section>""")
        order.append(i)
    doc_html = (f"<!doctype html><html lang='ko'><head><meta charset='utf-8'><title>{html.escape(d['title'])}</title>"
                f"<style>{CSS}</style>{K.FITJS}</head><body>{''.join(parts)}</body></html>")
    out = ROOT / "subjects" / slug / "pdf"
    out.mkdir(parents=True, exist_ok=True)
    hp = out / f"{deck}_compose_tmp.html"
    hp.write_text(doc_html, encoding="utf-8")
    pdf = out / (f"{deck}_강의안_미리보기.pdf" if pages else f"{deck}_강의안.pdf")
    subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--no-pdf-header-footer", "--virtual-time-budget=120000",
                    "--run-all-compositor-stages-before-draw", f"--print-to-pdf={pdf}", hp.as_uri()],
                   capture_output=True, timeout=3600)
    hp.unlink(missing_ok=True)
    # 크롬이 넣은 슬라이드 그림 자리에 원본 PDF 쪽을 벡터로 덮어쓴다 (확대해도 선명)
    doc = fitz.open(pdf)
    k = 0
    for page in doc:
        infos = [x for x in page.get_image_info(xrefs=True) if x["bbox"][2] - x["bbox"][0] > 300]
        if not infos or k >= len(order):
            continue
        info = max(infos, key=lambda x: x["bbox"][2] - x["bbox"][0])
        rect = fitz.Rect(info["bbox"])
        if info.get("xref"):
            try:
                page.delete_image(info["xref"])
            except Exception:
                pass
        page.show_pdf_page(rect, src, order[k] - 1, keep_proportion=False)
        k += 1
    tmp = pdf.with_suffix(".vec.pdf")
    doc.save(tmp, garbage=4, deflate=True)
    doc.close()
    tmp.replace(pdf)
    print(f"{deck}: {pdf}  쪽 {len(fitz.open(pdf))}, 슬라이드 {len(order)}, 벡터 {k}" + (f", 강의안 없는 쪽 {missing}" if missing else ""))


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("slug")
    ap.add_argument("deck")
    ap.add_argument("--pages")
    a = ap.parse_args()
    compose(a.slug, a.deck, K.parse_pages(a.pages) if a.pages else None)
