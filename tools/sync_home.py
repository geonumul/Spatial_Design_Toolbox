# -*- coding: utf-8 -*-
"""홈(index.html) 과목 카드의 숫자를 과목 파일에서 다시 읽어 갱신한다.

과목 파일에 문항, 정리노트, 팁, 연표를 넣은 뒤 실행:
    python tools/sync_home.py

index.html 의 SUBJECTS 배열(/*SUBJECTS_START*/ ~ /*SUBJECTS_END*/) 중
count, types, units, features, ready 만 덮어쓴다. 이름과 설명은 손으로 고친다.
"""
import io, json, os, re
from collections import Counter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INDEX = os.path.join(ROOT, 'index.html')
START, END = '/*SUBJECTS_START*/', '/*SUBJECTS_END*/'


def load_bank(s):
    bank = json.loads(re.search(r'var BANK = (\[.*?\]);\n', s, re.S).group(1))
    for m in re.finditer(r'BANK = BANK\.concat\((\[.*?\])\);', s, re.S):
        try:
            bank += json.loads(m.group(1))
        except ValueError:
            pass  # 주석 안의 예시 문구
    return bank


def scan(path):
    s = io.open(path, encoding='utf-8').read()
    bank = load_bank(s)
    c = Counter(q['type'] for q in bank)
    units = len(re.findall(r'<section id="s[1-9]\d*">', re.sub(r'<!--.*?-->', '', s, flags=re.S)))
    i = s.find('<section id="tips"')
    tips = s[i:s.find('<section id="note"', i)].count('<div class="card"><h3')
    tl = json.loads(re.search(r'var TIMELINE = (\[.*?\]);\n', s, re.S).group(1))
    has_time_tab = 'data-tab="time"' in s
    feats = []
    if units:
        feats.append('정리노트 %d단원' % units)
    if tips:
        feats.append('암기 팁')
    if tl and has_time_tab:
        feats.append('연표')
    return {
        'count': len(bank),
        'types': {k: c.get(k, 0) for k in ('mcq', 'short', 'ox', 'essay')},
        'units': units,
        'features': feats,
        'ready': len(bank) > 0,
    }


def main():
    h = io.open(INDEX, encoding='utf-8').read()
    i = h.index(START) + len(START)
    j = h.index(END)
    subjects = json.loads(h[i:j])
    for sub in subjects:
        path = os.path.join(ROOT, sub['href'].replace('/', os.sep))
        sub.update(scan(path))
        print('%-28s %4d문항 %s' % (sub['href'], sub['count'], ', '.join(sub['features']) or '-'))
    body = json.dumps(subjects, ensure_ascii=False, indent=1)
    h = h[:i] + body + h[j:]
    io.open(INDEX, 'w', encoding='utf-8', newline='\n').write(h)


if __name__ == '__main__':
    main()
