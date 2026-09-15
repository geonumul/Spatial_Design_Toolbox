# -*- coding: utf-8 -*-
"""회독 공부 빌드: content/<slug>/ 의 단원, 용어, 문항을 과목 페이지에 넣는다.

사용: python tools/build_study.py <slug>

content/<slug>/
  unit*.json          회독 단원 (docs/STUDY_FORMAT.md). part "0" 은 시험 대비 단원
  terms*.json         용어 (여러 파일이면 key 로 합침. 강의 단원 정의 우선, 한 곳이라도 exam 이면 exam)
  bank*.json          문항 (작업가이드 5-2 형식, src 선택)
  img/                img 블록 그림

처음 실행하면 페이지에 회독 공부, 용어 도감 탭을 만들고 정리노트, 암기 팁 탭 버튼을 뺀다.
다시 실행하면 표시(STUDY_*_START/END) 사이만 바꾼다. 기존 문항 id 는 md5(type|q) 앞 10자리라
질문 글자를 바꾸지 않는 한 오답노트가 유지된다.
"""
import base64, glob, hashlib, io, json, os, re, sys
from collections import Counter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TOOLS = os.path.join(ROOT, 'tools', 'study')
BAD = '·—–'
BLOCKS = {
    'say': ['h'], 'big': ['h'], 'story': ['items'], 'reveal': ['q', 'a'], 'blank': ['h'], 'cards': ['items'],
    'table': ['cols', 'rows'], 'steps': ['items'], 'order': ['q', 'items'], 'match': ['pairs'], 'pick': ['q', 'c', 'a'],
    'ox': ['q', 'a'], 'chart': ['bars'], 'svg': ['svg'], 'exam': ['h'], 'tip': ['h'], 'img': ['file'],
}
INTERACTIVE = {'reveal', 'blank', 'cards', 'steps', 'order', 'match', 'pick', 'ox'}


def rd(p):
    return io.open(p, encoding='utf-8').read()


def load_json(p):
    return json.loads(rd(p))


def unit_order(p):
    return 999 if p == '0' else int(p)


def strings(o):
    """블록 안의 모든 문자열 (svg 제외). JSON 문자열 전체에 정규식을 걸면 표의 [[ 가 섞인다."""
    if isinstance(o, str):
        yield o
    elif isinstance(o, list):
        for x in o:
            yield from strings(x)
    elif isinstance(o, dict):
        for k, x in o.items():
            if k not in ('svg', 'src', 'file'):
                yield from strings(x)


def main(slug):
    C = os.path.join(ROOT, 'content', slug)
    P = os.path.join(ROOT, 'subjects', slug, 'index.html')
    problems = []

    # ---------- 용어 ----------
    terms = {}
    for f in sorted(glob.glob(os.path.join(C, 'terms*.json'))):
        for t in load_json(f):
            k = t['key']
            old = terms.get(k)
            if old is None:
                terms[k] = t
            else:
                exam = old.get('exam') or t.get('exam')
                if unit_order(str(t.get('unit', '0'))) < unit_order(str(old.get('unit', '0'))):
                    terms[k] = t
                terms[k]['exam'] = bool(exam)
                for r in ('r1', 'r2', 'r3', 'en'):
                    if not terms[k].get(r) and (old.get(r) or t.get(r)):
                        terms[k][r] = old.get(r) or t.get(r)
    term_list = sorted(terms.values(), key=lambda t: (unit_order(str(t.get('unit', '0'))), t['key']))

    # ---------- 단원 ----------
    units = [load_json(f) for f in glob.glob(os.path.join(C, 'unit*.json'))]
    units.sort(key=lambda u: unit_order(u['part']))
    ids = set()
    missing_terms = Counter()
    for u in units:
        for l in u['lessons']:
            assert l['id'] not in ids, '레슨 id 중복 ' + l['id']
            ids.add(l['id'])
            for r in ('r1', 'r2', 'r3'):
                blocks = l.get(r) or []
                if not blocks:
                    problems.append('%s %s 비어 있음' % (l['id'], r))
                for b in blocks:
                    t = b.get('t')
                    if t not in BLOCKS:
                        problems.append('%s %s 모르는 블록 %s' % (l['id'], r, t)); continue
                    for need in BLOCKS[t]:
                        if need not in b:
                            problems.append('%s %s %s 에 %s 없음' % (l['id'], r, t, need))
                    if t == 'pick':
                        assert len(b['c']) == 4 and 0 <= b['a'] < 4, (l['id'], b['q'])
                    if t == 'ox':
                        assert isinstance(b['a'], bool), (l['id'], b['q'])
                    if t == 'svg':
                        sv = b['svg']
                        assert sv.lstrip().startswith('<svg') and '<script' not in sv.lower() and not re.search(r'\son\w+=', sv), l['id']
                        for sp in re.findall(r'data-spot="([^"]+)"', sv):
                            if sp not in (b.get('spots') or {}):
                                problems.append('%s svg spot %s 설명 없음' % (l['id'], sp))
                    if t == 'img':
                        fp = os.path.join(C, b['file'].replace('/', os.sep))
                        if not os.path.exists(fp):
                            problems.append('%s 그림 없음 %s' % (l['id'], b['file'])); b['src'] = ''
                        else:
                            b['src'] = 'data:image/jpeg;base64,' + base64.b64encode(open(fp, 'rb').read()).decode()
                        del b['file']
                    for txt in strings(b):
                        for k in re.findall(r'\[\[(.+?)\]\]', txt):
                            if k not in terms:
                                missing_terms[k] += 1
    if missing_terms:
        problems.append('사전에 없는 용어 %d개: %s' % (len(missing_terms), ', '.join(list(missing_terms)[:30])))

    # ---------- 문항 ----------
    bank, seen = [], set()
    dup = 0
    for f in sorted(glob.glob(os.path.join(C, 'bank*.json'))):
        for q in load_json(f):
            assert q['type'] in ('mcq', 'short', 'ox', 'essay') and q.get('q') and isinstance(q.get('part'), str), (f, q)
            if q['type'] == 'mcq': assert len(q['c']) == 4 and isinstance(q['a'], int) and 0 <= q['a'] < 4, (f, q['q'])
            if q['type'] == 'short': assert isinstance(q['a'], list) and q['a'], (f, q['q'])
            if q['type'] == 'ox': assert isinstance(q['a'], bool), (f, q['q'])
            if q['type'] == 'essay': assert q.get('points'), (f, q['q'])
            key = (q['type'], q['q'])
            if key in seen:
                dup += 1; continue
            seen.add(key)
            q['id'] = hashlib.md5((q['type'] + '|' + q['q']).encode()).hexdigest()[:10]
            bank.append(q)
    parts = []
    for u in units:
        if u['part'] == '0':
            continue
        parts.append({'id': u['part'], 'name': '%s단원 %s' % (u['part'], u['title']), 'short': '%s단원' % u['part'], 'scope': '중간'})
    if any(q['part'] == '0' for q in bank):
        parts.append({'id': '0', 'name': '지능형홈관리사 기출, 예상', 'short': '기출', 'scope': '시험 대비'})

    # ---------- 문장부호 ----------
    data_js = 'var STUDY = %s;\nvar TERMS = %s;\n' % (json.dumps(units, ensure_ascii=False), json.dumps(term_list, ensure_ascii=False))
    for name, txt in (('study', data_js), ('bank', json.dumps(bank, ensure_ascii=False))):
        n = sum(txt.count(ch) for ch in BAD)
        if n:
            problems.append('%s 금지 문장부호 %d개' % (name, n))
    data_js = data_js.replace('</', '<\\/')

    # ---------- 페이지에 넣기 ----------
    s = rd(P)
    subject = re.search(r'<i></i>([^<]+)</div>', s).group(1)

    def one(old, new):
        nonlocal s
        assert s.count(old) == 1, (s.count(old), old[:80])
        s = s.replace(old, new, 1)

    def put(start, end, content, anchor_before):
        nonlocal s
        block = start + content + end
        if start in s:
            i = s.index(start); j = s.index(end, i) + len(end)
            s = s[:i] + block + s[j:]
        else:
            one(anchor_before, block + anchor_before)

    put('/*STUDY_CSS_START*/', '/*STUDY_CSS_END*/', '\n' + rd(os.path.join(TOOLS, 'study.css')), '</style>')
    html = rd(os.path.join(TOOLS, 'study.html')).replace('{{SUBJECT}}', subject)
    put('<!--STUDY_HTML_START-->', '<!--STUDY_HTML_END-->', '\n' + html, '<section id="quiz" class="panel')
    put('/*STUDY_DATA_START*/', '/*STUDY_DATA_END*/', '\n' + data_js, '\n/* ---------- 계정 동기화')
    put('/*STUDY_JS_START*/', '/*STUDY_JS_END*/', '\n' + rd(os.path.join(TOOLS, 'study.js')), '\n/* ---------- 계정 동기화')

    if 'data-tab="study"' not in s:
        one('<button class="tab on" data-tab="quiz">문제풀기</button>',
            '<button class="tab on" data-tab="study">회독 공부</button>\n<button class="tab" data-tab="dex">용어 도감</button>\n<button class="tab" data-tab="quiz">문제풀기</button>')
        one('<section id="quiz" class="panel on">', '<section id="quiz" class="panel">')
        s = s.replace('<button class="tab" data-tab="note">정리노트</button>\n', '')
        s = s.replace('<button class="tab" data-tab="tips">암기 팁</button>\n', '')
        one('if(id==="wrong") renderWrong();', 'if(id==="wrong") renderWrong();\n  if(typeof studyTab==="function") studyTab(id);')
        one('  if($("#wrong").classList.contains("on")) renderWrong();\n}',
            '  if($("#wrong").classList.contains("on")) renderWrong();\n  if(typeof studyRefresh==="function") studyRefresh();\n}')
        one('data-mode="src">기출, 강조 문제</button>', 'data-mode="src">기출, 예상 문제</button>')

    s = re.sub(r'var PARTS = \[.*?\];', lambda m: 'var PARTS = ' + json.dumps(parts, ensure_ascii=False) + ';', s, count=1, flags=re.S)
    s = re.sub(r'var BANK = \[.*?\];\n', lambda m: 'var BANK = ' + json.dumps(bank, ensure_ascii=False) + ';\n', s, count=1, flags=re.S)
    s = re.sub(r'<p>총 <b id="heroCount">\d+</b>문항\.[^<]*</p>',
               lambda m: '<p>총 <b id="heroCount">%d</b>문항. 틀린 문제는 오답노트에 자동으로 쌓입니다.</p>' % len(bank), s, count=1)

    io.open(P, 'w', encoding='utf-8', newline='\n').write(s)
    lessons = sum(len(u['lessons']) for u in units)
    print('%s: %d MB, 단원 %d, 레슨 %d, 용어 %d, 문항 %d %s, 중복 문항 건너뜀 %d' % (
        slug, len(s.encode()) // 1000000, len(units), lessons, len(term_list), len(bank),
        dict(Counter(q['type'] for q in bank)), dup))
    if problems:
        print('확인 필요 %d건' % len(problems))
        for p in problems[:60]:
            print(' -', p)


if __name__ == '__main__':
    if len(sys.argv) != 2:
        print(__doc__); sys.exit(1)
    main(sys.argv[1])
