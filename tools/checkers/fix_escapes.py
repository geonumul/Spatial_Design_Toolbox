"""파이썬 일반 문자열로 쓰는 바람에 \v \b \a \f \t 가 제어 문자로 바뀐 TeX 명령을 되돌린다.
대상: 최종정리/_작업/강의안/*.md, _작업/html/note_w*.html, _작업/문제은행/*.json
사용: python fix_escapes.py        (고친 곳을 출력)
"""
import re, sys, json, pathlib
sys.stdout.reconfigure(encoding="utf-8")
W = pathlib.Path(__file__).resolve().parents[4] / "02_작업" / "그래프신경망" / "최종정리" / "_작업"   # checkers > tools > 저장소 > 03_사이트 > 프로젝트
CTRL = {"\x0b": "\\v", "\x08": "\\b", "\x07": "\\a", "\x0c": "\\f"}
# 탭은 정상 글자일 수도 있으니 TeX 명령 이름 앞일 때만
TAB_CMDS = r"(heta|ext|imes|au|ilde|op|riangle|frac|o\b|extbf|extrm)"

def fix_text(s):
    n = 0
    for ch, rep in CTRL.items():
        c = s.count(ch); n += c; s = s.replace(ch, rep)
    s, k = re.subn("\t" + TAB_CMDS, lambda m: "\\t" + m.group(1), s); n += k
    return s, n

def main():
    files = list((W / "강의안").glob("*.md")) + list((W / "html").glob("note_w*.html"))
    total = 0
    for f in files:
        s = f.read_text(encoding="utf-8")
        t, n = fix_text(s)
        if n:
            f.write_text(t, encoding="utf-8"); total += n
            print(f"{f.name}: {n}곳")
    for f in (W / "문제은행").glob("*.json"):
        raw = f.read_text(encoding="utf-8")
        data = json.loads(raw)
        cnt = 0
        def walk(o):
            nonlocal cnt
            if isinstance(o, str):
                t, n = fix_text(o); cnt += n; return t
            if isinstance(o, list):
                return [walk(x) for x in o]
            if isinstance(o, dict):
                return {k: walk(v) for k, v in o.items()}
            return o
        data = walk(data)
        if cnt:
            f.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8"); total += cnt
            print(f"{f.name}: {cnt}곳")
    print("합계", total)

if __name__ == "__main__":
    main()
