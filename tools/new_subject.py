# -*- coding: utf-8 -*-
"""빈 과목 페이지 만들기.

근현대공간디자인 페이지(엔진 원본)에서 문항, 정리노트, 암기 팁, 연표 데이터를 비우고
과목 이름과 저장 키만 바꾼 문제은행 파일을 subjects/<slug>/index.html 로 만든다.
엔진 코드(채점, 오답노트, 목차 모드 등)는 그대로 복사된다.

사용: python tools/new_subject.py <slug> "<과목명>" <저장키>
예:   python tools/new_subject.py iot-smart-home "IoT 스마트홈" sdt_iot_v1

저장 키는 과목마다 달라야 한다(같은 사이트 안에서 기록이 섞이지 않게).
이미 파일이 있으면 덮어쓰지 않는다(--force 로 강제).
"""
import io, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENGINE = os.path.join(ROOT, 'subjects', 'modern-space-design', 'index.html')


def one(s, old, new):
    assert s.count(old) == 1, (s.count(old), old[:80])
    return s.replace(old, new, 1)


def sub1(s, pattern, new, flags=0):
    out, n = re.subn(pattern, lambda m: new, s, count=1, flags=flags)
    assert n == 1, pattern
    return out


def build(name, key):
    s = io.open(ENGINE, encoding='utf-8').read()

    # 머리
    s = sub1(s, r'<title>.*?</title>', '<title>%s 문제은행</title>' % name)
    s = sub1(s, r'<i></i>[^<]*</div>', '<i></i>%s</div>' % name)
    s = one(s, '<button class="tab" data-tab="time">연표</button>\n', '')
    s = sub1(s, r'<p>총 <b id="heroCount">\d+</b>문항\.[^<]*</p>',
             '<p>총 <b id="heroCount">0</b>문항. 강의자료가 들어오는 대로 문제가 채워집니다.</p>')

    # 암기 팁
    i = s.find('<section id="tips" class="panel">')
    j = s.find('<section id="note" class="panel">', i)
    assert 0 <= i < j
    tips = ('<section id="tips" class="panel"><div class="wrap" style="padding-top:40px">\n'
            '<h1 class="part" style="margin-top:0;border:0;padding:0;font-size:30px">쉽게 외우는 팁</h1>\n'
            '<p class="lead" style="margin-top:-4px">정확한 문장은 정리노트에 있고, 여기는 머리에 박히게 하는 용도입니다.</p>\n'
            '<div class="card"><div class="empty"><b>아직 암기 팁이 없습니다</b>정리노트가 채워지면 큰 그림, 헷갈리는 짝, 답안 뼈대 카드가 이 자리에 들어옵니다.</div></div>\n'
            '</div></section>\n\n')
    s = s[:i] + tips + s[j:]

    # 정리노트: 보기 모드 바와 onlybar 는 원본 마크업을 그대로 쓰고, 섹션은 s0 안내 하나만
    head = '<section id="note" class="panel">'
    i = s.find(head)
    t = s.find('<div id="toc">', i)
    o = s.find('<div class="onlybar">', t)
    oe = s.find('</div>\n', o) + len('</div>\n')
    k = s.find('<!-- ===== [노트 추가 지점]', oe)
    assert 0 <= i < t < o < oe < k
    notebar = s[i + len(head):t]
    onlybar = s[o:oe]
    note = (head + notebar
            + '<div id="toc"><span class="lbl">목차</span><button class="tocbtn" data-go="s0">0. 과목 안내</button></div>\n'
            + onlybar
            + '<section id="s0">\n<h2>0. 과목 안내</h2>\n'
            + '<div class="empty"><b>아직 정리노트가 없습니다</b>강의자료(PDF, PPT, 캡처)가 들어오면 단원별 원문 정리와 쉬운 설명이 이 자리에 채워집니다.</div>\n'
            + '</section>\n\n')
    s = s[:i] + note + s[k:]
    s = sub1(s, r'<!-- ===== \[노트 추가 지점\].*?===== -->',
             '<!-- ===== [노트 추가 지점] 정리노트 섹션은 이 줄 바로 앞에 <h1 class="part"> 와 <section id="s1"> 형식으로 추가. 목차 버튼(#toc)도 함께 추가 ===== -->')

    # 연표 원본 표
    s, n = re.subn(r"(<table class='tl'>.*?<tbody>).*?(</tbody>)", lambda m: m.group(1) + m.group(2), s, count=1, flags=re.S)
    assert n == 1

    # 연표 분류 색 (근현대 전용 8색)
    s = sub1(s, r'\.c-배경\{[^\n]*\n', '/* 연표 분류 색: .c-분류명(공백 제거){--c:#파스텔} 형태로 한 줄에 이어 쓴다 */\n')

    # 데이터
    s = sub1(s, r'var PARTS = \[.*?\];', 'var PARTS = [];', re.S)
    s = sub1(s, r'var BANK = \[.*?\];\n', 'var BANK = [];\n', re.S)
    s = re.sub(r'(/\*[^*\n]*\*/\n)?BANK = BANK\.concat\(\[\{.*?\}\]\);\n', '', s, flags=re.S)
    s = sub1(s, r'\[문제 추가 지점\].*?=====', '[문제 추가 지점] 새 문제는 이 줄 아래에 BANK = BANK.concat([...]) 로 추가 =====')
    s = sub1(s, r'var TIMELINE = \[.*?\];\n', 'var TIMELINE = [];\n', re.S)
    s = sub1(s, r'var FLOW = \[.*?\];\n', 'var FLOW = [];\n', re.S)
    s = sub1(s, r'var KEYYEARS = \{.*?\};\n', 'var KEYYEARS = {};\n', re.S)
    s = sub1(s, r'var CATS = \[.*?\];\n', 'var CATS = [];\n', re.S)

    # 저장 키, 백업 파일명
    s = sub1(s, r'var KEY="[^"]*";', 'var KEY="%s";' % key)
    s = sub1(s, r'a\.download="[^"]*"', 'a.download="오답노트_백업_%s.json"' % name.replace(' ', ''))

    # 근현대 전용 예시 문구 정리
    s = s.replace('"part":"4","unit":"4-1 하이테크"', '"part":"1","unit":"1-1 단원명"')
    s = s.replace('"part":"4","unit":"4-2 게리"', '"part":"1","unit":"1-2 단원명"')
    s = s.replace('{"id":"4","name":"4부 하이테크와 해체주의","short":"4부","scope":"기말"}',
                  '{"id":"1","name":"1부 범위 이름","short":"1부","scope":"중간"}')
    s = s.replace('기말 범위를 추가하려면', '범위를 추가하려면')
    s = s.replace('새 범위(기말 등)의 문제를', '문제를')
    s = re.sub(r'   - 기말 예시\(내용 추가 예정\)[^\n]*\n[^\n]*\n', '', s)

    assert 'archhist' not in s and 'data:image' not in s
    return s


def main():
    args = [a for a in sys.argv[1:] if a != '--force']
    if len(args) != 3:
        print(__doc__)
        sys.exit(1)
    slug, name, key = args
    assert re.match(r'^[a-z0-9-]+$', slug), 'slug 는 영소문자, 숫자, 하이픈만'
    out = os.path.join(ROOT, 'subjects', slug, 'index.html')
    if os.path.exists(out) and '--force' not in sys.argv:
        print('이미 있음:', out)
        sys.exit(1)
    html = build(name, key)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    io.open(out, 'w', encoding='utf-8', newline='\n').write(html)
    print('만듦', out, len(html))


if __name__ == '__main__':
    main()
