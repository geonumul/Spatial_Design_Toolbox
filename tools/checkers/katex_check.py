"""KaTeX 로 실제 렌더링해 보고 실패하는 수식을 찾는다 (Chrome headless).
사용: python katex_check.py [--bank] [--notes] [--lect L2]
결과: 실패한 수식과 위치를 출력.
"""
import sys, re, json, html, pathlib, subprocess, argparse
sys.stdout.reconfigure(encoding="utf-8")
FINAL = pathlib.Path(__file__).resolve().parents[4] / "02_작업" / "그래프신경망" / "최종정리"   # checkers > tools > 저장소 > 03_사이트 > 프로젝트
CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
MATH = re.compile(r"\$\$(.+?)\$\$|\$([^$\n]+?)\$", re.S)

def strings(o, path=""):
    if isinstance(o, str):
        yield path, o
    elif isinstance(o, list):
        for i, x in enumerate(o):
            yield from strings(x, f"{path}[{i}]")
    elif isinstance(o, dict):
        for k, v in o.items():
            yield from strings(v, f"{path}.{k}")

def collect(a):
    items = []
    if a.bank:
        for f in sorted((FINAL / "_작업" / "문제은행").glob("w*_*.json")):
            for q in json.loads(f.read_text(encoding="utf-8")):
                for p, s in strings(q):
                    if p.endswith(".fig"):
                        continue
                    for m in MATH.finditer(s):
                        items.append((f"{f.name}:{q['id']}{p}", m.group(1) or m.group(2), bool(m.group(1))))
    if a.notes:
        for f in sorted((FINAL / "_작업" / "html").glob("note_w*.html")):
            t = re.sub(r"<svg\b.*?</svg>", "", f.read_text(encoding="utf-8"), flags=re.S)
            t = html.unescape(re.sub(r"<[^>]+>", " ", t))
            for m in MATH.finditer(t):
                items.append((f.name, m.group(1) or m.group(2), bool(m.group(1))))
    for tag in a.lect or []:
        for f in sorted((FINAL / "_작업" / "강의안").glob(f"{tag}_*.md")):
            text = f.read_text(encoding="utf-8")
            text = re.sub(r"```.*?```", "", text, flags=re.S)
            text = re.sub(r"<svg\b.*?</svg>", "", text, flags=re.S)
            text = re.sub(r"`[^`\n]+`", "", text)
            for sec in re.finditer(r"^## p\.(\d+).*?(?=^## p\.|\Z)", text, re.S | re.M):
                for m in MATH.finditer(sec.group(0)):
                    items.append((f"{f.name} p.{sec.group(1)}", m.group(1) or m.group(2), bool(m.group(1))))
    return items

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--bank", action="store_true")
    ap.add_argument("--notes", action="store_true")
    ap.add_argument("--lect", nargs="*")
    a = ap.parse_args()
    items = collect(a)
    page = """<!doctype html><meta charset="utf-8">
<script src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js"></script>
<body><pre id="out">NOT RUN</pre><script>
var items = %s; var bad = [];
if (!window.katex) { document.getElementById("out").textContent = "KATEX NOT LOADED"; }
else {
  items.forEach(function (it) {
    try { katex.renderToString(it[1], {displayMode: it[2], throwOnError: true, strict: false}); }
    catch (e) { bad.push(it[0] + "  ::  " + it[1].slice(0, 120) + "  ::  " + String(e.message).slice(0, 160)); }
  });
  document.getElementById("out").textContent = "CHECKED " + items.length + "\\nBAD " + bad.length + "\\n" + bad.join("\\n");
}
</script>""" % json.dumps(items, ensure_ascii=False).replace("</", "<\\/")
    tmp = pathlib.Path(__file__).parent / "_katex_check.html"
    tmp.write_text(page, encoding="utf-8")
    r = subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--virtual-time-budget=20000", "--dump-dom", tmp.as_uri()],
                       capture_output=True, timeout=300)
    out = r.stdout.decode("utf-8", "replace")
    m = re.search(r'<pre id="out">(.*?)</pre>', out, re.S)
    print(html.unescape(m.group(1)) if m else out[:2000])
    tmp.unlink(missing_ok=True)

if __name__ == "__main__":
    main()
