# -*- coding: utf-8 -*-
"""가리고 설명하기 데이터 만들기: 강의 슬라이드에서 가릴 말(1, 2, 3단계)과 소단원 목록을 뽑는다.

사용: python tools/recall_build.py <과목> [덱 ...] [--png 쪽,쪽] [--png-dir 폴더] [--ocr]
  과목: iot-smart-home, eco-architecture 또는 gnn
  --png 3,10,20   가린 칸을 슬라이드 그림 위에 그린 확인용 PNG 를 만든다 (빨강 1단계, 파랑 2단계, 초록 3단계)
  --png-dir 폴더  확인용 PNG 를 둘 곳 (없으면 recall/_check/)
  --ocr           글자 층이 없는 PDF 의 OCR 을 다시 한다 (없으면 캐시 사용)

입력
  원본 PDF 의 글자 위치 (PyMuPDF). 글자 층이 없는 PDF 는 Windows OCR (pip winrt-Windows.Media.Ocr) 결과를 캐시해서 쓴다.
  레슨 JSON 의 쪽 제목과 용어(terms), 용어사전, 문제은행과 기출 글에서 나온 횟수
  recall/<덱>_sections.json  소단원 (사람이 강의 목차와 쪽 제목을 읽고 쓴다):
                             [{"t": 큰 단원, "items": [{"t": 소단원 이름, "p": [첫 쪽, 끝 쪽]}]}]
출력
  recall/<덱>.json  {"deck", "pages": [{"p", "m": [[x, y, w, h, 단계, 말], ...]}], "sections": [...]}
  좌표는 쪽 너비, 높이에 대한 비율. 단계는 그 칸이 처음 가려지는 단계 (1단계 칸은 2, 3단계에도 가려짐)
  사이트 빌드(build_site.py)가 이 파일을 data/recall_<덱>.js 로 옮긴다.
"""
import asyncio, glob, io, json, math, pathlib, re, sys
from collections import Counter, defaultdict

import fitz

sys.stdout.reconfigure(encoding="utf-8")
ROOT = pathlib.Path(__file__).resolve().parent.parent
# 프로젝트 폴더: 저장소(03_사이트/Toolbox_Group_Study)에서 두 칸 위. GNN 작업 폴더와 GNN 홈페이지 저장소는 여기 기준 상대 경로
GNN = ROOT.parents[1] / "02_작업" / "그래프신경망"   # 번역/, 최종정리/_작업/
GNN_SITE = ROOT.parent / "Graph-Neural-Networks-Fall-2026"


def _pdf(p):
    """subject.json 의 pdf 는 저장소 기준 상대 경로 (절대 경로도 된다)"""
    return str((ROOT / p).resolve())


def _iot():
    w = ROOT / "work" / "iot-smart-home"
    cfg = json.loads((w / "subject.json").read_text(encoding="utf-8"))
    return {
        "name": "iot-smart-home",
        "decks": {k: _pdf(v["pdf"]) for k, v in cfg["decks"].items()},
        "lesson": str(w / "lesson" / "{deck}_*.json"),
        "glossary": [str(w / "rules" / "용어사전.json")],
        "corpus": [str(w / "bank" / "*.json"), str(w / "_src" / "exam_2026_3.txt")],
        "out": w / "recall",
        "img": ROOT / "subjects" / "iot-smart-home" / "img",
        "layout": "a4",
    }


def _gnn():
    work = GNN / "최종정리" / "_작업"
    return {
        "name": "gnn",
        # 사이트 그림은 한글 슬라이드라서 한글을 입힌 PDF 에서 글자 위치를 읽는다
        "decks": {d: str(GNN / "번역" / "img" / f"{d}_ko.pdf") for d in ("L1", "L2", "L3")},
        "lesson": str(work / "lesson" / "{deck}_*.json"),
        "glossary": [],
        "corpus": [str(work / "문제은행" / "*.json"), str(work / "기출_텍스트" / "*.txt")],
        "out": work / "recall",
        "img": GNN_SITE / "img",
        "layout": "wide",
    }


def _eco():
    w = ROOT / "work" / "eco-architecture"
    cfg = json.loads((w / "subject.json").read_text(encoding="utf-8"))
    return {
        "name": "eco-architecture",
        "decks": {k: _pdf(v["pdf"]) for k, v in cfg["decks"].items()},
        "lesson": str(w / "lesson" / "{deck}_*.json"),
        "glossary": [],
        # 레슨이 없어서 정리 슬라이드 단원 용어, 주차 용어집을 용어로 쓴다
        "glossary_units": [str(w / "notes" / "slides_w*.json"), str(w / "terms" / "*.json")],
        "corpus": [str(w / "bank" / "*.json")],
        "out": w / "recall",
        "img": ROOT / "subjects" / "eco-architecture" / "img",
        "layout": "a4",
        # PDF 글자 층의 인코딩이 깨져 있어서 (한글이 엉뚱한 글자로 나온다) 늘 OCR 을 쓴다
        "force_ocr": True,
        # 1주차 정리 슬라이드 단원이 다루는 쪽 (build_slides_w1.py 의 단원과 같이 고친다)
        "unit_pages": {"E1": {"w1-1": [1, 2], "w1-2": [3, 15], "w1-3": [16, 18], "w1-4": [19, 25], "w1-5": [26, 26],
                              "w1-6": [27, 28], "w1-7": [29, 30], "w1-8": [31, 41], "w1-9": [42, 45], "w1-10": [46, 46]}},
        # 슬라이드 그림과 _src/E1.txt 로 확인한 오독만
        "ocr_fix": [("진환경", "친환경"), ("센환경겐축", "친환경건축"), ("제계", "체계"), ("건죽", "건축"), ("초고증", "초고층"),
                    ("대제", "대체"), ("재택", "채택"), ("실전", "실천"), ("생물제간", "생물체간"), ("페기", "폐기"),
                    ("토양증", "토양층"), ("에코로듸", "에코로드'"), ("170/0", "17%"), ("재저리", "재처리"), ("파해", "파력,")],
        "ocr_word_fix": {"자이": "차이", "1자": "1차", "2자": "2차", "4자": "4차", "저음으로": "처음으로", "자제를": "자체를",
                         "자제도": "자체도", "전제": "전체", "급丈": "값"},
    }


PROFILES = {"iot-smart-home": _iot, "gnn": _gnn, "eco-architecture": _eco}

HANGUL = "가-힣"
JOSA = sorted("""은 는 이 가 을 를 의 에 에서 에게 에는 에서는 으로 로 으로는 로는 으로의 로의 와 과 와의 과의 도 만 까지 부터 보다 처럼 이나 나 이며 며
이고 고 이다 다 입니다 이란 란 라는 이라는 인 한 하는 하고 하여 해 해서 했다 된 되는 되어 됨 함 들 들은 들이 들을 들의 에도 에만 만의 이자 적 적인 적으로""".split(), key=len, reverse=True)
STOP = set("""것 수 등 및 또는 그리고 하지만 때 경우 위해 통해 대한 대해 같은 모든 각 다음 이상 이하 사이 가장 옳은 적절한 알맞은 설명 무엇 어떤 있는 없는 하는 한다 된다
다른 하나 들어 만든 때문 이미 직접 함께 사람 기반 원래 일반 완전 의미 기준 비슷 유사 종류 정리 교수 수도 이어 출발 단순 크기 방법 정보 개수
구조 연결 정의 핵심 한계 내용 목표 가능 추가 확인 목적 기본 없이 아니라 조건 적용 번호 국내 시간 수준 자기 다르 고정 제거 성질 이유 결과 사용 경우 과정
보기 문제 정답 해설 선택 고르시오 않은 틀린 맞는 이것 그것 우리 여기 지금 이번 오늘 먼저 다시 모두 서로 바로 매우 더 덜 가지 번째 부분 전체 예시 예 그림 표 쪽
the a an of and or to in for on with by is are be as at from that this it we our can not""".split())
UNIT = r"(?:GHz|MHz|kHz|Hz|dBm|dB|Mbps|kbps|Gbps|bps|mW|kW|W|V|mA|m|cm|mm|km|%|ms|lux|ppm|℃|°C|초|분|시간|문항|점|개|층|단계|가지|년|세대|비트|바이트|bit|byte|원|배|채널|대)"
JOSA_SET = set(JOSA)
MIN_H = {"a4": 0.017, "wide": 0.018}   # 가릴 글자의 최소 높이 (쪽 높이 비율)
NUM_RE = re.compile(r"(?<![\w.])(-?\d+(?:[.,]\d+)?\s?" + UNIT + r")(?![A-Za-z])")


# ---------------------------------------------------------------- 쪽의 글자 읽기
BAD_CHARS = {0x2014: "-", 0x2013: "-", 0xB7: "."}   # 긴 줄표, 짧은 줄표, 가운뎃점은 파일에 남기지 않는다


def clean(t):
    return t.translate(BAD_CHARS)


def chars_from_pdf(page):
    """[(줄 글자들 [(c, x0, y0, x1, y1)], 글자 크기)]  좌표는 비율"""
    W, H = page.rect.width, page.rect.height
    out = []
    for b in page.get_text("rawdict")["blocks"]:
        if b["type"] != 0:
            continue
        for ln in b["lines"]:
            if abs(ln["dir"][1]) > 0.1:          # 세로 글자는 건너뜀
                continue
            cs, size = [], 0
            for sp in ln["spans"]:
                font = sp["font"]
                math_font = re.search(r"math|symbol|wingding", font, re.I)
                for ch in sp["chars"]:
                    x0, y0, x1, y1 = ch["bbox"]
                    h = y1 - y0
                    # 글자 상자는 줄 높이 전체라 위아래를 조금 줄인다
                    y0, y1 = y0 + h * 0.06, y1 - h * 0.04
                    c = ch["c"] if not math_font else "\u0000"
                    cs.append((c, x0 / W, y0 / H, x1 / W, y1 / H))
                size = max(size, sp["size"])
            if cs:
                out.append((cs, size))
    return out


_FONT = None


def char_weight(c):
    """OCR 단어 상자 안 글자 폭 비율. 슬라이드 글꼴(Pretendard)의 실제 글자 폭을 쓴다."""
    global _FONT
    if _FONT is None:
        f = GNN / "번역" / "_tools" / "fonts" / "Pretendard-Bold.ttf"
        _FONT = fitz.Font(fontfile=str(f)) if f.exists() else False
    if _FONT:
        w = _FONT.text_length(c, fontsize=1)
        if w > 0:
            return w
    return 0.9 if re.match(r"[가-힣]", c) else 0.55


def ocr_pages(pdf_path, cache):
    """글자 층이 없는 PDF: Windows OCR 로 단어 상자를 얻는다. 결과는 캐시 파일에 둔다."""
    if cache.exists():
        return json.loads(cache.read_text(encoding="utf-8"))
    from winrt.windows.globalization import Language
    from winrt.windows.graphics.imaging import BitmapPixelFormat, SoftwareBitmap
    from winrt.windows.media.ocr import OcrEngine
    from winrt.windows.storage.streams import DataWriter
    from PIL import Image
    eng = OcrEngine.try_create_from_language(Language("ko"))
    doc = fitz.open(pdf_path)
    pages = []

    async def one(pix):
        im = Image.open(io.BytesIO(pix.tobytes("png"))).convert("RGBA")
        r, g, b, a = im.split()
        dw = DataWriter()
        dw.write_bytes(Image.merge("RGBA", (b, g, r, a)).tobytes())
        bmp = SoftwareBitmap.create_copy_from_buffer(dw.detach_buffer(), BitmapPixelFormat.BGRA8, im.size[0], im.size[1])
        res = await eng.recognize_async(bmp)
        return [[[clean(w.text), w.bounding_rect.x, w.bounding_rect.y, w.bounding_rect.width, w.bounding_rect.height] for w in ln.words] for ln in res.lines]

    for page in doc:
        z = 2600 / page.rect.width
        pix = page.get_pixmap(matrix=fitz.Matrix(z, z), alpha=False)
        lines = asyncio.run(one(pix))
        pages.append({"w": pix.width, "h": pix.height, "lines": lines})
    cache.parent.mkdir(parents=True, exist_ok=True)
    cache.write_text(json.dumps(pages, ensure_ascii=False), encoding="utf-8")
    return pages


def chars_from_ocr(pg):
    """OCR 단어 상자를 글자 상자로 나눈다 (글자 폭 비율로 근사)"""
    W, H = pg["w"], pg["h"]
    out = []
    for words in pg["lines"]:
        if not words:
            continue
        words = sorted(words, key=lambda w: w[1])
        cs, size = [], 0
        for k, (t, x, y, w, h) in enumerate(words):
            t = clean(t)
            t = re.sub(r"(?<![A-Za-z])Al(?=[@\s가-힣]|$)", "AI", t)   # OCR 이 I 를 l 로 읽는 경우
            if k:
                px = words[k - 1][1] + words[k - 1][3]
                cs.append((" ", px / W, y / H, x / W, (y + h) / H))
            tot = sum(char_weight(c) for c in t) or 1
            cx = x
            padv = h * 0.14
            for c in t:
                cw = w * char_weight(c) / tot
                cs.append((c, cx / W, (y - padv) / H, (cx + cw) / W, (y + h + padv) / H))
                cx += cw
            size = max(size, h / H)
        out.append((cs, size * 595))   # 글자 크기를 A4 높이 pt 로 대충 맞춘다
    return out


def classify(lines, layout):
    """줄마다 영역: skip(머리글, 쪽 번호, 참고문헌), title, body"""
    res = []
    for cs, size in lines:
        text = "".join(c[0] for c in cs).strip()
        cy = sum((c[2] + c[4]) / 2 for c in cs) / len(cs)
        zone = "body"
        if not text or not re.search(r"[0-9A-Za-z가-힣]", text):
            zone = "skip"
        elif layout == "a4":
            if cy < 0.105 or cy > 0.965:
                zone = "skip"
            elif cy < 0.18 and size >= 15:
                zone = "title"
            elif re.fullmatch(r"\d+\s*/\s*\d+", text):
                zone = "skip"
        else:
            if cy < 0.09:
                zone = "skip" if re.fullmatch(r"\d+", text) else "title"
            elif size <= 11.5 or re.match(r"참고문헌|출처|Source|http", text) or "http" in text:
                zone = "skip"
            elif cy > 0.95:
                zone = "skip"
        res.append({"cs": cs, "text": "".join(c[0] for c in cs), "zone": zone, "size": size})
    return res


# ---------------------------------------------------------------- 용어
def load_json_glob(pattern):
    out = []
    for f in sorted(glob.glob(pattern)):
        try:
            out.append((f, json.loads(pathlib.Path(f).read_text(encoding="utf-8"))))
        except Exception:
            pass
    return out


def forms_of(entry):
    ko, en = (entry.get("ko") or "").strip(), (entry.get("en") or "").strip()
    fs = set()
    for s in (ko, en):
        if not s:
            continue
        fs.add(s)
        m = re.match(r"^(.*?)\s*\(([^()]+)\)\s*$", s)     # 앞말(괄호말)
        if m:
            fs.update([m.group(1).strip(), m.group(2).strip()])
        m = re.match(r"^L\d\s+(.+)$", s)                    # "L1 전기 및 인프라 계층"
        if m:
            fs.add(m.group(1))
        if "/" in s and len(s) < 40:
            fs.update(x.strip() for x in s.split("/"))
    good = set()
    for f in fs:
        f = f.strip()
        if len(f) < 2 or re.fullmatch(r"[\d\W_]+", f):
            continue
        if re.fullmatch(r"[가-힣]", f):
            continue
        good.add(f)
        if " " in f and re.search(r"[가-힣]", f):
            good.add(f.replace(" ", ""))
    return good


def form_regex(f):
    if re.search(r"[가-힣]", f):
        body = r"\s?".join(re.escape(c) for c in f.replace(" ", ""))
        return re.compile(r"(?<![가-힣A-Za-z0-9])" + body)
    body = "".join(r"[\s\-]?" if c in " -" else re.escape(c) for c in f)
    flags = re.I if (len(f) >= 5 or " " in f) and not re.fullmatch(r"[A-Z0-9\-]+", f) else 0
    return re.compile(r"(?<![A-Za-z0-9])" + body + r"(?![A-Za-z0-9]|\.[A-Za-z0-9])", flags)


def josa_ok(s, a, b):
    """한글로 끝나는 말 뒤에 한글이 붙으면 조사일 때만 인정 (안전하게, 자율주행 같은 것은 뺀다)"""
    if not re.match(r"[가-힣]", s[b - 1:b]):
        return True
    m = re.match(r"[가-힣]+", s[b:])
    return not m or m.group(0) in JOSA_SET


VERBAL = tuple("는 은 다 고 게 지 며 서 면 던 된 될 할 한 하 해 여 요 죠 니 까 도록".split())


def strip_josa(w):
    w = re.sub(r"^[\W_]+|[\W_]+$", "", w)
    if re.fullmatch(r"[가-힣]+", w):
        for j in JOSA:
            if w.endswith(j) and len(w) - len(j) >= 2:
                return w[: -len(j)]
    return w


class Corpus:
    def __init__(self, patterns):
        parts = []
        for pat in patterns:
            for f in sorted(glob.glob(pat)):
                t = pathlib.Path(f).read_text(encoding="utf-8", errors="ignore")
                if f.endswith(".json"):
                    try:
                        arr = json.loads(t)
                        t = "\n".join(" ".join(str(q.get(k, "")) for k in ("q", "c", "e", "a", "model", "keys")) for q in arr if isinstance(q, dict))
                    except Exception:
                        pass
                parts.append(t)
        self.text = "\n".join(parts)
        self.low = self.text.lower()
        self.cache = {}

    def word_freq(self, s):
        """한글 낱말이 다른 글자에 붙지 않고(뒤에 조사나 빈칸) 나온 횟수. OCR 이 줄 끝에서 자른 조각(프라이버 등)을 거른다"""
        key = "w|" + s
        if key not in self.cache:
            if re.fullmatch(r"[가-힣]+", s):
                j = "|".join(sorted(JOSA, key=len, reverse=True))
                self.cache[key] = len(re.findall(r"(?<![가-힣])" + re.escape(s) + r"(?=[^가-힣]|(?:" + j + r")(?![가-힣]))", self.text))
            else:
                self.cache[key] = self.freq(s)
        return self.cache[key]

    def freq(self, s):
        if s in self.cache:
            return self.cache[s]
        if re.search(r"[가-힣]", s):
            n = len(re.findall(re.escape(s.replace(" ", "")), self.text.replace(" ", ""))) if " " in s else self.text.count(s)
        else:
            n = len(re.findall(r"(?<![a-z0-9])" + re.escape(s.lower()) + r"(?![a-z0-9])", self.low))
        self.cache[s] = n
        return n


# ---------------------------------------------------------------- 고르기
def find_candidates(lines, gloss_pats, page_terms, corpus):
    """[(key, kind, [(line_i, a, b)])]  a..b 는 줄 글자 번호"""
    taken = [set() for _ in lines]
    occ = defaultdict(list)
    kinds = {}
    for li, ln in enumerate(lines):
        if ln["zone"] == "skip":
            continue
        s = ln["text"]
        hits = []
        for key, pat, flen in gloss_pats:
            for m in pat.finditer(s):
                hits.append((m.end() - m.start(), m.start(), m.end(), key))
        hits = [h for h in hits if josa_ok(s, h[1], h[2])]
        hits.sort(key=lambda h: (-h[0], h[1]))
        for _, a, b, key in hits:
            if any(i in taken[li] for i in range(a, b)) or "\u0000" in s[a:b]:
                continue
            taken[li].update(range(a, b))
            occ[key].append((li, a, b))
            kinds[key] = "g"
        for m in NUM_RE.finditer(s):
            a, b = m.start(1), m.end(1)
            if any(i in taken[li] for i in range(a, b)):
                continue
            key = "#" + re.sub(r"\s", "", m.group(1))
            taken[li].update(range(a, b))
            occ[key].append((li, a, b))
            kinds[key] = "n"
    for li, ln in enumerate(lines):
        if ln["zone"] == "skip":
            continue
        s = ln["text"]
        for m in re.finditer(r"\S+", s):
            raw = m.group(0)
            stem = strip_josa(raw)
            if not stem or stem.lower() in STOP:
                continue
            if not (re.fullmatch(r"[가-힣]{2,8}", stem) or re.fullmatch(r"[A-Za-z][A-Za-z0-9\-+@]{2,20}", stem)):
                continue
            if re.fullmatch(r"[가-힣]+", stem) and (stem.endswith(VERBAL) or (len(stem) == 2 and stem[-1] in "이가을를은는의에도로")):
                continue
            a = m.start() + raw.find(stem)
            b = a + len(stem)
            if a < m.start() or any(i in taken[li] for i in range(a, b)):
                continue
            key = "w:" + stem.lower()
            occ[key].append((li, a, b))
            kinds[key] = "w"
    return occ, kinds


def plan_page(lines, occ, kinds, key_score):
    body_words = sum(len(re.findall(r"[0-9A-Za-z가-힣]+", ln["text"])) for ln in lines if ln["zone"] == "body")
    if body_words < 5:
        return {}, body_words
    b1 = max(1, min(4, round(body_words / 10)))
    budgets = {1: b1, 2: 2 * b1, 3: 3 * b1}
    ranked = sorted(occ, key=lambda k: (-key_score(k), len(occ[k])))
    level, used, count = {}, set(), 0
    for lv in (1, 2, 3):
        for key in ranked:
            if key in level:
                continue
            sc = key_score(key)
            if lv == 1 and (kinds[key] == "w" or sc < 6.0):
                continue
            if lv == 2 and (kinds[key] == "w" or sc < 3.5):
                continue
            if sc < 2.0:
                continue
            body = [o for o in occ[key] if lines[o[0]]["zone"] == "body"]
            if not body:
                continue
            n = len(body)
            if n > 4:
                continue
            if count + n > budgets[lv] + (1 if count < budgets[lv] else 0):
                continue
            level[key] = lv
            count += n
            if count >= budgets[lv]:
                break
    return level, body_words


def build_deck(prof, deck, args, corpus, gloss_entries):
    pdf = prof["decks"][deck]
    doc = fitz.open(pdf)
    # 레슨
    slides = {}
    for f, d in load_json_glob(prof["lesson"].format(deck=deck)):
        for s in d.get("slides", []):
            slides[s["p"]] = s
    # 레슨이 없는 과목: 정리 슬라이드 단원 용어를 그 단원이 다루는 쪽의 용어로 쓴다 (profile "unit_pages": {단원 id: [첫 쪽, 끝 쪽]})
    upages = prof.get("unit_pages", {}).get(deck, {})
    if upages:
        for pat in prof.get("glossary_units", []):
            for f, d in load_json_glob(pat):
                for u in (d.get("units", []) if isinstance(d, dict) else []):
                    if u.get("id") not in upages:
                        continue
                    a, b = upages[u["id"]]
                    keys = [(t.get("en") or t.get("ko") or "").strip().lower() for t in u.get("terms", []) if isinstance(t, dict)]
                    for p in range(a, b + 1):
                        s = slides.setdefault(p, {})
                        s["terms"] = list(s.get("terms", [])) + [k for k in keys if k]
    # 용어 사전: 키(en 또는 ko 소문자) -> 모양들
    keyforms = defaultdict(set)
    for g in gloss_entries:
        key = (g.get("en") or g.get("ko") or "").strip().lower()
        if key:
            keyforms[key] |= forms_of(g)
    exam_keys = {(g.get("en") or g.get("ko") or "").strip().lower() for g in gloss_entries if g.get("exam")}
    pats = []
    for key, fs in keyforms.items():
        for f in fs:
            pats.append(("g:" + key, form_regex(f), len(f)))
    # 쪽 글자
    has_text = not prof.get("force_ocr") and sum(len(p.get_text("words")) for p in doc) > len(doc) * 3
    if has_text:
        raw = [chars_from_pdf(p) for p in doc]
    else:
        cache = prof["out"] / "_ocr" / f"{deck}.json"
        if args.get("ocr") and cache.exists():
            cache.unlink()
        ocr = ocr_pages(pdf, cache)
        fix, word_fix = prof.get("ocr_fix", []), prof.get("ocr_word_fix", {})
        for pg in ocr:                              # 과목별로 확인한 OCR 오독 고치기 (캐시는 그대로 둔다)
            for ln in pg["lines"]:
                for w in ln:
                    w[0] = word_fix.get(w[0], w[0])
                    for a, b in fix:
                        w[0] = w[0].replace(a, b)
        raw = [chars_from_ocr(pg) for pg in ocr]
    pages = [classify(r, prof["layout"]) for r in raw]
    N = len(pages)
    cands = [find_candidates(pg, pats, slides.get(i + 1, {}).get("terms", []), corpus) for i, pg in enumerate(pages)]
    df = Counter()
    for occ, _ in cands:
        df.update(occ.keys())
    out_pages, stats = [], Counter()
    for i, pg in enumerate(pages):
        p = i + 1
        occ, kinds = cands[i]
        s = slides.get(p, {})
        lterms = {str(t).lower() for t in s.get("terms", [])}
        title = s.get("title", "")
        title_text = " ".join(ln["text"] for ln in pg if ln["zone"] == "title") + " " + title

        def key_score(key, occ=occ, kinds=kinds, lterms=lterms, title_text=title_text):
            kind = kinds[key]
            if kind == "g":
                k = key[2:]
                forms = keyforms[k]
                f = max(corpus.freq(x) for x in forms) if forms else 0
                mine = k in lterms
                sc = 3.0 + (4.0 if mine else 0) + (1.0 if k in exam_keys else 0) + min(2.0, math.log1p(f) * 0.6)
                if any(x.replace(" ", "") in title_text.replace(" ", "") for x in forms):
                    sc += 1.0
                if df[key] / N > 0.4 and not mine:
                    return 0
            elif kind == "n":
                f = corpus.freq(key[1:])
                sc = 3.0 + min(2.0, math.log1p(f))
            else:
                f = corpus.word_freq(key[2:])
                if f < 4 or f > 90:
                    return 0
                sc = min(3.0, 1.2 + math.log1p(f) * 0.4)
                if key[2:] in title_text.lower():
                    sc += 0.5
            share = df[key] / N
            if share > 0.35:
                sc *= 0.55
            elif share > 0.2:
                sc *= 0.8
            return sc

        level, nw = plan_page(pg, occ, kinds, key_score)
        masks = []
        for key, lv in level.items():
            for li, a, b in occ[key]:
                ln = pg[li]
                if ln["zone"] == "title" and kinds[key] == "g":
                    use = 3                        # 제목 안의 용어는 3단계에서만 가린다
                elif ln["zone"] == "body":
                    use = lv
                else:
                    continue
                cs = ln["cs"][a:b]
                while cs and cs[-1][0].isspace():
                    cs = cs[:-1]
                if not cs or max(c[4] - c[2] for c in cs) < MIN_H[prof["layout"]]:
                    continue                       # 너무 작은 글자(그림 속 작은 이름표)는 누르기 어려워 가리지 않는다
                x0 = min(c[1] for c in cs) - 0.003
                x1 = max(c[3] for c in cs) + 0.003
                y0 = min(c[2] for c in cs) - 0.002
                y1 = max(c[4] for c in cs) + 0.002
                x0, y0 = max(0, x0), max(0, y0)
                x1, y1 = min(1, x1), min(1, y1)
                text = clean("".join(c[0] for c in cs)).strip()
                masks.append([round(x0, 4), round(y0, 4), round(x1 - x0, 4), round(y1 - y0, 4), use, text])
        masks.sort(key=lambda m: (m[4], round(m[1], 2), m[0]))
        for m in masks:
            for lv in (1, 2, 3):
                if m[4] <= lv:
                    stats[lv] += 1
        out_pages.append({"p": p, "m": masks})
    sec_file = prof["out"] / f"{deck}_sections.json"
    sections = json.loads(sec_file.read_text(encoding="utf-8")) if sec_file.exists() else []
    check_sections(deck, sections, N)
    r0 = doc[0].rect
    res = {"deck": deck, "total": N, "ar": round(r0.width / r0.height, 4), "pages": out_pages, "sections": sections}
    prof["out"].mkdir(parents=True, exist_ok=True)
    (prof["out"] / f"{deck}.json").write_text(json.dumps(res, ensure_ascii=False, indent=0), encoding="utf-8")
    content = sum(1 for pg in out_pages if pg["m"])
    nsub = sum(len(c["items"]) for c in sections)
    print(f"  {deck}: {N}쪽 (가린 칸 있는 쪽 {content}), 칸 1단계 {stats[1]}, 2단계 {stats[2]}, 3단계 {stats[3]}, 큰 단원 {len(sections)}, 소단원 {nsub}"
          + ("" if has_text else " (OCR)"))
    if args.get("png"):
        draw_check(prof, deck, res, args["png"], args.get("png_dir"))
    return res


def check_sections(deck, sections, N):
    seen = []
    for c in sections:
        for it in c.get("items", []):
            a, b = it["p"]
            if not (1 <= a <= b <= N):
                raise SystemExit(f"{deck} 소단원 쪽 범위가 이상해요: {it}")
            seen.append((a, b))
    seen.sort()
    for (a0, b0), (a1, b1) in zip(seen, seen[1:]):
        if a1 != b0 + 1:
            print(f"  경고: {deck} 소단원 사이 빈 쪽이나 겹침 {b0} -> {a1}")
    if seen and (seen[0][0] != 1 or seen[-1][1] != N):
        print(f"  경고: {deck} 소단원이 1쪽부터 {N}쪽까지 다 덮지 않아요")


def draw_check(prof, deck, res, pages, outdir=None):
    from PIL import Image, ImageDraw
    outdir = outdir or prof["out"] / "_check"
    outdir.mkdir(parents=True, exist_ok=True)
    colors = {1: (220, 40, 40, 150), 2: (40, 120, 220, 130), 3: (30, 160, 80, 120)}
    for p in pages:
        if p > res["total"]:
            continue
        im = Image.open(prof["img"] / deck / f"p{p:03d}.jpg").convert("RGBA")
        ov = Image.new("RGBA", im.size, (0, 0, 0, 0))
        dr = ImageDraw.Draw(ov)
        W, H = im.size
        for x, y, w, h, lv, t in res["pages"][p - 1]["m"]:
            dr.rounded_rectangle([x * W, y * H, (x + w) * W, (y + h) * H], radius=4, fill=colors[lv], outline=colors[lv][:3] + (255,))
        Image.alpha_composite(im, ov).convert("RGB").save(outdir / f"{deck}_p{p:03d}.png")
    print(f"  확인 그림: {outdir}")


def main():
    argv = sys.argv[1:]
    if not argv or argv[0] not in PROFILES:
        print(__doc__)
        sys.exit(1)
    prof = PROFILES[argv[0]]()
    args = {"ocr": "--ocr" in argv, "png": None}
    if "--png" in argv:
        args["png"] = [int(x) for x in argv[argv.index("--png") + 1].split(",")]
    if "--png-dir" in argv:
        args["png_dir"] = pathlib.Path(argv[argv.index("--png-dir") + 1])
    decks = [a for a in argv[1:] if a in prof["decks"]] or list(prof["decks"])
    corpus = Corpus(prof["corpus"])
    base_gloss = []
    for g in prof["glossary"]:
        base_gloss += json.loads(pathlib.Path(g).read_text(encoding="utf-8"))
    for pat in prof.get("glossary_units", []):      # 정리 슬라이드 {"units": [{"terms"}]} 또는 용어집 [{ko, en}] / {"terms": [...]}
        for f, d in load_json_glob(pat):
            if isinstance(d, dict) and "units" in d:
                base_gloss += [t for u in d["units"] for t in u.get("terms", []) if isinstance(t, dict)]
            else:
                base_gloss += [t for t in (d if isinstance(d, list) else d.get("terms", [])) if isinstance(t, dict)]
    for deck in prof["decks"]:                      # 모든 덱 레슨의 용어도 같이 쓴다
        for f, d in load_json_glob(prof["lesson"].format(deck=deck)):
            base_gloss += [g for g in d.get("glossary", []) if isinstance(g, dict)]
    print(f"가리고 설명하기: {prof['name']}, 문제와 기출 글 {len(corpus.text) / 1e3:.0f}천 자")
    for deck in decks:
        build_deck(prof, deck, args, corpus, list(base_gloss))


if __name__ == "__main__":
    main()
