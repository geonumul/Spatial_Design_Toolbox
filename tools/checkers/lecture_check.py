"""강의안(v2) 형식 검사.
사용: python lecture_check.py <강의안.md> [시작쪽 끝쪽]
검사: 쪽 누락/중복, ::: 블록 짝, SVG XML 문법과 id 접두어, 금지 문자(em dash, en dash, 가운뎃점), $ 짝, 분량.
"""
import sys, re
import xml.etree.ElementTree as ET
sys.stdout.reconfigure(encoding="utf-8")

BLOCKS = {"key", "repeat", "prof", "mining", "bg", "exam", "warn", "fig", "step"}
BAD = {"—": "em dash", "–": "en dash", "·": "가운뎃점", "‧": "가운뎃점", "・": "가운뎃점"}

def sections(text):
    out = []
    for m in re.finditer(r"^## p\.(\d+)[^\n]*\n(.*?)(?=^## p\.\d+|\Z)", text, re.S | re.M):
        out.append((int(m.group(1)), m.group(0)))
    return out

def check(path, lo=None, hi=None):
    text = open(path, encoding="utf-8").read()
    errs, warns = [], []
    for ch, name in BAD.items():
        n = text.count(ch)
        if n:
            lines = [i + 1 for i, l in enumerate(text.splitlines()) if ch in l][:8]
            errs.append(f"{name} {n}개 (줄 {lines})")
    secs = sections(text)
    nums = [n for n, _ in secs]
    dup = sorted({n for n in nums if nums.count(n) > 1})
    if dup:
        errs.append(f"중복 쪽 {dup}")
    if lo is not None:
        miss = [n for n in range(lo, hi + 1) if n not in nums]
        extra = [n for n in nums if n < lo or n > hi]
        if miss:
            errs.append(f"누락 쪽 {miss}")
        if extra:
            warns.append(f"범위 밖 쪽 {extra}")
    for n, sec in secs:
        if "### 대본" not in sec:
            errs.append(f"p.{n}: '### 대본' 없음")
        body = sec.split("### 대본", 1)[-1]
        # 코드 블록은 검사에서 뺀다
        body_nc = re.sub(r"```.*?```", "", body, flags=re.S)
        stack = []
        for i, line in enumerate(body_nc.splitlines()):
            s = line.strip()
            if s.startswith(":::"):
                name = s[3:].split(" ", 1)[0].strip()
                if name == "":
                    if not stack:
                        errs.append(f"p.{n}: 여는 블록 없이 ::: 닫힘")
                    else:
                        stack.pop()
                elif name in BLOCKS:
                    if stack:
                        errs.append(f"p.{n}: ':::{name}' 가 ':::{stack[-1]}' 안에 중첩됨 (중첩 금지)")
                    stack.append(name)
                else:
                    errs.append(f"p.{n}: 모르는 블록 ':::{name}'")
        if stack:
            errs.append(f"p.{n}: 닫히지 않은 블록 {stack}")
        for sm in re.finditer(r"<svg\b.*?</svg>", body_nc, re.S):
            svg = sm.group(0)
            try:
                ET.fromstring(svg)
            except ET.ParseError as e:
                errs.append(f"p.{n}: SVG 문법 오류 {e}")
            if "viewBox" not in svg:
                errs.append(f"p.{n}: SVG 에 viewBox 없음")
            for idm in re.finditer(r'\bid="([^"]+)"', svg):
                if not idm.group(1).startswith(f"p{n}_"):
                    errs.append(f"p.{n}: SVG id '{idm.group(1)}' 는 'p{n}_' 로 시작해야 함")
        if re.search(r"<svg\b", body_nc) and body_nc.count("<svg") != body_nc.count("</svg>"):
            errs.append(f"p.{n}: <svg> 짝 안 맞음")
        plain = re.sub(r"\$\$.*?\$\$", "", body_nc, flags=re.S)
        if plain.count("$") % 2:
            errs.append(f"p.{n}: 인라인 수식 $ 짝이 안 맞음")
        ko = len(re.findall(r"[가-힣]", re.sub(r"<svg\b.*?</svg>", "", body_nc, flags=re.S)))
        if ko < 150:
            warns.append(f"p.{n}: 한글 {ko}자 (표지, 목차, Q&A 가 아니면 너무 짧음)")
        if ":::key" not in body_nc and ko > 400:
            warns.append(f"p.{n}: :::key 없음")
        if ":::repeat" not in body_nc and ko > 400:
            warns.append(f"p.{n}: :::repeat 없음")
    total = len(re.findall(r"[가-힣]", text))
    svgs = len(re.findall(r"<svg\b", text))
    print(f"{path}: 쪽 {len(secs)}개, 한글 {total}자, SVG {svgs}개")
    for w in warns:
        print("  경고:", w)
    for e in errs:
        print("  오류:", e)
    print("  결과:", "통과" if not errs else f"오류 {len(errs)}건")
    return not errs

if __name__ == "__main__":
    a = sys.argv[1:]
    ok = check(a[0], int(a[1]), int(a[2])) if len(a) >= 3 else check(a[0])
    sys.exit(0 if ok else 1)
