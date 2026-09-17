# -*- coding: utf-8 -*-
"""브라우저로 PDF 저장할 때 찍힌 인쇄 머리글, 바닥글(날짜, 제목, 파일 경로, 쪽 번호)을 흰색으로 지운다.
사용: python tools/clean_print_marks.py <폴더> [<폴더> ...]   (pNNN.png, pNNN.jpg 전부)
위 5%, 아래 5% 띠에만 글자가 있고 그 안쪽 띠(5~7%, 93~95%)가 비어 있을 때만 지운다(본문 보호)."""
import sys, pathlib
import fitz

def ink(pix, y0, y1):
    n = pix.n; w = pix.width; s = pix.samples; dark = 0
    for y in range(max(0, y0), min(pix.height, y1), 2):
        row = y * w * n
        for x in range(0, w, 3):
            i = row + x * n
            if s[i] < 170 and s[i + 1] < 170 and s[i + 2] < 170:
                dark += 1
    return dark

def clean(path):
    pix = fitz.Pixmap(str(path))
    if pix.alpha:
        pix = fitz.Pixmap(pix, 0)
    H, W = pix.height, pix.width
    top, bot = int(H * 0.05), int(H * 0.95)
    changed = False
    if ink(pix, 0, top) and not ink(pix, top, int(H * 0.07)):
        pix.set_rect(fitz.IRect(0, 0, W, top), (255, 255, 255)); changed = True
    if ink(pix, bot, H) and not ink(pix, int(H * 0.93), bot):
        pix.set_rect(fitz.IRect(0, bot, W, H), (255, 255, 255)); changed = True
    if changed:
        if path.suffix.lower() == ".jpg":
            pix.save(str(path), jpg_quality=82)
        else:
            pix.save(str(path))
    return changed

if __name__ == "__main__":
    n = c = 0
    for d in sys.argv[1:]:
        for p in sorted(pathlib.Path(d).rglob("p[0-9][0-9][0-9].*")):
            if p.suffix.lower() in (".png", ".jpg"):
                n += 1; c += clean(p)
    print(f"그림 {n}장 중 {c}장 정리")
