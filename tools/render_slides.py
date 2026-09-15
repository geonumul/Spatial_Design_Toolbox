# -*- coding: utf-8 -*-
"""슬라이드 PDF 를 그림으로 뽑는다.
  사이트용: subjects/<slug>/img/<덱>/pNNN.jpg  (가로 1000px, JPEG 품질 72)  회독 레슨, 필기 노트에 쓰임
  작성용:   work/<slug>/_src/png/<덱>/pNNN.png  (가로 1400px)  에이전트가 슬라이드를 직접 볼 때, look 박스 좌표 잡을 때
사용: python tools/render_slides.py <slug> [덱 ...]
덱 목록과 원본 PDF 경로는 work/<slug>/subject.json 의 decks.
"""
import json, pathlib, sys
import fitz

sys.stdout.reconfigure(encoding="utf-8")
ROOT = pathlib.Path(__file__).resolve().parent.parent


def main(slug, only):
    cfg = json.loads((ROOT / "work" / slug / "subject.json").read_text(encoding="utf-8"))
    for deck, d in cfg.get("decks", {}).items():
        if only and deck not in only:
            continue
        doc = fitz.open(d["pdf"])
        site = ROOT / "subjects" / slug / "img" / deck
        png = ROOT / "work" / slug / "_src" / "png" / deck
        site.mkdir(parents=True, exist_ok=True)
        png.mkdir(parents=True, exist_ok=True)
        for i, page in enumerate(doc, 1):
            z = 1000 / page.rect.width
            page.get_pixmap(matrix=fitz.Matrix(z, z)).save(site / f"p{i:03d}.jpg", jpg_quality=72)
            z2 = 1400 / page.rect.width
            page.get_pixmap(matrix=fitz.Matrix(z2, z2)).save(png / f"p{i:03d}.png")
        size = sum(f.stat().st_size for f in site.glob("*.jpg")) / 1e6
        print(f"{deck}: {len(doc)}쪽, 사이트 그림 {size:.1f} MB, 작성용 PNG {png}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__); sys.exit(1)
    main(sys.argv[1], set(sys.argv[2:]))
