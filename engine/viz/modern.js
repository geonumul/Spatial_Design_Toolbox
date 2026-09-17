/* 움직이는 개념 그림: 근현대 공간디자인 묶음. 틀은 viz.js, 설명은 README.md
   연도와 이름은 work/modern-space-design/pages/note.html 과 time.html(연표 데이터)에서 가져왔다. */
(function () {
  'use strict';
  const V = window.SDTViz;
  if (!V) return;
  const u = V.u;
  const at = u.at, seg = u.seg;

  function tag(parent, x, y, w, h, label, small) {
    const g = u.el(parent, 'g');
    const r = u.el(g, 'rect', { x: x - w / 2, y: y - h / 2, width: w, height: h, rx: 7, class: 'vz-box' });
    const t = u.el(g, 'text', { x, y: y + (small ? -2 : 5), 'text-anchor': 'middle', class: 'vz-tb' }, label);
    const s = u.el(g, 'text', { x, y: y + 14, 'text-anchor': 'middle', class: 'vz-ts' }, small || '');
    return { g, r, t, s, x, y, w, h };
  }
  const boxCls = (b, c) => b.r.setAttribute('class', 'vz-box' + (c ? ' ' + c : ''));

  /* ---------- 1. 강의별로 채워지는 연표 (정리노트 0, time.html 흐름 데이터) ---------- */
  const FLOW = [
    [1, '철과 유리', 1851, 1900], [1, '미술공예운동', 1860, 1925], [1, '전원도시', 1898, 1905],
    [2, '시카고 학파', 1871, 1902], [2, '아르누보', 1890, 1910], [2, '아르데코', 1925, 1939],
    [3, '오토 바그너', 1895, 1911], [3, '빈 분리파', 1897, 1911], [3, '아돌프 로스', 1899, 1930],
    [4, '합리주의 선구', 1903, 1914], [4, '데 스테일', 1917, 1928], [4, '바우하우스', 1919, 1933],
    [5, '바이센호프, CIAM', 1920, 1930], [5, '국제주의', 1925, 1970],
    [6, '표현주의', 1911, 1931],
  ];
  const LCLS = ['', 'vz-k1', 'vz-k2', 'vz-k4', 'vz-k0', 'vz-k5', 'vz-k3'];
  V.add('modern.timeline', {
    title: '여섯 강의를 한 줄 연표로',
    w: 480, h: 400,
    dur: 1300,
    states: [
      { cap: '1850년부터 1940년까지 가로줄 하나에 놓아요. 강의 하나를 넘길 때마다 막대가 채워져요.' },
      { tag: '1강', cap: '기계에 반발한 미술공예운동(1860~), 철과 유리의 만국박람회(1851~), 하워드의 전원도시(1898).' },
      { tag: '2강', cap: '자연의 곡선으로 새 장식을 만든 아르누보(1890~1910), 철골 고층의 시카고 학파(1871~1902), 아르데코(1925~).' },
      { tag: '3강', cap: '빈 분리파(1897)와 바그너, 로스. 장식을 기하학으로 정리하다가 아예 없애요.' },
      { tag: '4강', cap: '기계로 좋은 물건을: 데 스테일(1917~1928), 바우하우스(1919~1933).' },
      { tag: '5강', cap: '모두의 집을 표준으로: 바이센호프(1927)와 CIAM, 그리고 국제주의 양식이 1970년 무렵까지 퍼져요.' },
      { tag: '6강', cap: '그 표준에 맞선 표현주의(1911~1931). 감정과 재료를 드러내요.' },
      { cap: '1~3강은 장식이 사라지는 이야기, 4~5강은 장식 없는 건축이 세계 표준이 되는 이야기, 6강은 그에 맞선 이야기예요.' },
    ],
    build(ctx) {
      const g = ctx.g = {};
      const X0 = 158, X1 = 466;
      g.x = y => X0 + (X1 - X0) * (Math.min(y, 1940) - 1850) / 90;
      for (let y = 1850; y <= 1940; y += 10) {
        u.el(ctx.svg, 'line', { x1: g.x(y), x2: g.x(y), y1: 16, y2: 366, class: 'vz-grid' });
        if ((y - 1850) % 30 === 0) u.el(ctx.svg, 'text', { x: g.x(y), y: 390, 'text-anchor': y === 1940 ? 'end' : 'middle', class: 'vz-tm' }, String(y));
      }
      g.rows = FLOW.map(([L, name, s0, e0], i) => {
        const y = 18 + i * 23;
        return {
          L, s0, e0, y,
          lab: u.el(ctx.svg, 'text', { x: 150, y: y + 14, 'text-anchor': 'end', class: 'vz-t' }, name),
          bar: u.el(ctx.svg, 'rect', { x: g.x(s0), y, height: 17, rx: 3, class: 'vz-bar ' + LCLS[L] }),
          more: u.el(ctx.svg, 'text', { x: X1 + 2, y: y + 14, class: 'vz-tb' }, e0 > 1940 ? '›' : ''),
        };
      });
      g.bands = [['장식이 사라짐', 1, 3], ['표준이 됨', 4, 5], ['맞섬', 6, 6]].map(([t, a, b]) => {
        const ys = g.rows.filter(r => r.L >= a && r.L <= b).map(r => r.y);
        const y0 = Math.min.apply(null, ys) - 3, y1 = Math.max.apply(null, ys) + 20;
        return { r: u.el(ctx.svg, 'rect', { x: 4, y: y0, width: 472, height: y1 - y0, rx: 6, class: 'vz-hl on' }), t: u.el(ctx.svg, 'text', { x: 10, y: y0 + 12, class: 'vz-ta' }, t) };
      });
    },
    draw(ctx, s, k) {
      const g = ctx.g;
      g.rows.forEach(r => {
        const p = r.L < s ? 1 : r.L === s ? seg(k, 0, 0.9) : (s === 7 ? 1 : 0);
        const w = (g.x(r.e0) - g.x(r.s0)) * p;
        u.set(r.bar, { width: Math.max(0, w) });
        u.op(r.bar, p > 0 ? 1 : 0);
        u.op(r.lab, p > 0 ? 1 : 0.28);
        r.lab.setAttribute('class', r.L === s ? 'vz-tb' : 'vz-t');
        u.op(r.more, p >= 1 ? 1 : 0);
      });
      g.bands.forEach(b => { const o = s === 7 ? seg(k, 0.2, 1) : 0; u.op(b.r, o); u.op(b.t, o); });
    },
  });

  /* ---------- 2. 영향 관계도 (1-6, 4-3, 4-4, 5-2) ---------- */
  V.add('modern.influence', {
    title: '누가 누구에게 이어졌나',
    w: 480, h: 320,
    dur: 1200,
    states: [
      { tag: '1860~', cap: '퓨진과 러스킨의 철학을 바탕으로 모리스가 미술공예운동을 이끌어요. 기계에 반발하고 손으로 만들어요.' },
      { tag: '1890~', cap: '미술공예운동은 아르누보에 큰 영향을 줘요. 독일판이 유겐트슈틸이에요. 자연의 곡선으로 새 장식을 만들어요.' },
      { tag: '1897~', cap: '빈 분리파는 장식을 기하학으로 정리하고, 로스는 1908년 "장식과 죄악"으로 장식을 없애자고 해요.' },
      { tag: '1914', cap: '독일공작연맹은 모리스의 이상을 본보기로 삼되 결론은 반대예요. 기계로 좋은 물건을 많이 만들자.' },
      { tag: '1919', cap: '바우하우스는 독일공작연맹의 이념을 이어받은 학교예요. 미술가와 공예가의 벽을 허물어요.' },
      { tag: '1927', cap: '독일공작연맹이 주최하고 미스가 이끈 바이센호프 주거단지. 국제주의 양식이 퍼지는 계기가 돼요.' },
      { tag: '1932', cap: '히치콕과 존슨이 "국제주의 양식"을 펴내요. 장식 없는 건축이 세계 표준이라는 이름을 얻어요.' },
    ],
    build(ctx) {
      const g = ctx.g = {};
      const N = g.N = {
        rus: tag(ctx.svg, 70, 60, 110, 44, '퓨진, 러스킨', '철학의 배경'),
        ac: tag(ctx.svg, 70, 160, 116, 44, '미술공예운동', '모리스 1860~'),
        an: tag(ctx.svg, 205, 60, 110, 44, '아르누보', '1890~1910'),
        jg: tag(ctx.svg, 345, 60, 110, 44, '유겐트슈틸', '독일 1896~'),
        vs: tag(ctx.svg, 205, 160, 110, 44, '빈 분리파, 로스', '1897~, 1908'),
        wb: tag(ctx.svg, 70, 265, 116, 44, '독일공작연맹', '쾰른 전시 1914'),
        bh: tag(ctx.svg, 205, 265, 110, 44, '바우하우스', '1919~1933'),
        ws: tag(ctx.svg, 345, 160, 110, 44, '바이센호프', '1927'),
        is: tag(ctx.svg, 345, 265, 116, 44, '국제주의 양식', '1932'),
      };
      const E = [['rus', 'ac', 0], ['ac', 'an', 1], ['an', 'jg', 1], ['an', 'vs', 2], ['ac', 'wb', 3], ['wb', 'bh', 4], ['wb', 'ws', 5], ['ws', 'is', 6], ['bh', 'is', 6]];
      g.E = E.map(([a, b, st]) => {
        const A = N[a], B = N[b];
        const pa = [A.x, A.y], pb = [B.x, B.y];
        const dx = pb[0] - pa[0], dy = pb[1] - pa[1];
        const cut = (P, sgn) => Math.abs(dx) * 22 > Math.abs(dy) * 58 ? [P[0] + sgn * Math.sign(dx) * 58, P[1] + sgn * dy * 58 / Math.abs(dx || 1)] : [P[0] + sgn * dx * 22 / Math.abs(dy || 1), P[1] + sgn * Math.sign(dy) * 22];
        return { a: cut(pa, 1), b: cut(pb, -1), st, ar: u.arrow(ctx.svg, st === 3 ? 'cr' : '') };
      });
      g.flip = u.el(ctx.svg, 'text', { x: 130, y: 218, 'text-anchor': 'middle', class: 'vz-tc' }, '기계를 받아들임');
      g.order = [['rus', 0], ['ac', 0], ['an', 1], ['jg', 1], ['vs', 2], ['wb', 3], ['bh', 4], ['ws', 5], ['is', 6]];
    },
    draw(ctx, s, k) {
      const g = ctx.g;
      g.order.forEach(([id, st]) => {
        const nd = g.N[id];
        const o = st < s ? 1 : st === s ? seg(k, 0.35, 0.8) : 0;
        u.op(nd.g, id === 'rus' || (id === 'ac' && s >= 0) ? 1 : o);
        boxCls(nd, st === s ? 'on' : st < s ? '' : '');
      });
      boxCls(g.N.ac, s === 0 ? 'on' : s === 3 ? 'am' : '');
      g.E.forEach(e => { u.setArrow(e.ar, e.a, e.b, e.st < s ? 1 : e.st === s ? seg(k, 0, 0.6) : 0); });
      u.op(g.flip, s === 3 ? seg(k, 0.5, 1) : s > 3 ? 0.6 : 0);
    },
  });

  /* ---------- 3. 바우하우스 14년 (4-4, 4-5) ---------- */
  V.add('modern.bauhaus', {
    title: '바우하우스 1919~1933',
    w: 480, h: 300,
    dur: 1200,
    states: [
      { tag: '1919', cap: '그로피우스가 바이마르에 세운 조형 학교예요. 독일공작연맹의 이념을 이어받았어요.' },
      { tag: '선언문', cap: '"미술가와 공예가 사이에 본질적인 차이란 존재하지 않는다." 모두 공예로 돌아가 새 장인의 길드를 만들자.' },
      { tag: '교육', cap: '화가 이텐의 입문과정에서 재료, 질감, 색을 먼저 익혀요. 그다음 공방에서 실습하고 형태를 완성해요.' },
      { tag: '1925~27', cap: '1925년 데사우로 옮기고, 1926년 유리 커튼월의 교사를 완성하고, 1927년 건축부서를 열어요.' },
      { tag: '학장', cap: '학장은 그로피우스, 1928년 한네스 마이어, 1930년 미스 반 데어 로에 순서예요.' },
      { tag: '1932~33', cap: '1932년 베를린으로 옮겼다가 1933년 영원히 문을 닫아요.' },
    ],
    build(ctx) {
      const g = ctx.g = {};
      const X0 = 30, X1 = 460;
      g.x = y => X0 + (X1 - X0) * (y - 1919) / 14;
      [1919, 1925, 1928, 1930, 1933].forEach(y => u.el(ctx.svg, 'text', { x: g.x(y), y: 20, 'text-anchor': 'middle', class: 'vz-ts' }, String(y)));
      g.city = [['바이마르', 1919, 1925, 'vz-k1'], ['데사우', 1925, 1932, 'vz-k2'], ['베를린', 1932, 1933, 'vz-k3']].map(([n, a, b, c]) => ({
        r: u.el(ctx.svg, 'rect', { x: g.x(a), y: 30, height: 30, rx: 4, class: 'vz-bar ' + c }), t: u.el(ctx.svg, 'text', { x: (g.x(a) + g.x(b)) / 2, y: 50, 'text-anchor': 'middle', class: 'vz-tb' }, n), a, b,
      }));
      g.dean = [['그로피우스', 1919, 1928], ['마이어', 1928, 1930], ['미스', 1930, 1933]].map(([n, a, b], i) => ({
        r: u.el(ctx.svg, 'rect', { x: g.x(a) + 1, y: 70, width: g.x(b) - g.x(a) - 2, height: 26, rx: 4, class: 'vz-box' }),
        t: u.el(ctx.svg, 'text', { x: (g.x(a) + g.x(b)) / 2, y: 88, 'text-anchor': 'middle', class: 'vz-tb' }, n),
      }));
      u.el(ctx.svg, 'text', { x: 4, y: 88, class: 'vz-ts' }, '');
      g.quote = u.el(ctx.svg, 'g');
      u.el(g.quote, 'rect', { x: 30, y: 112, width: 430, height: 60, rx: 8, class: 'vz-box on' });
      u.el(g.quote, 'text', { x: 245, y: 138, 'text-anchor': 'middle', class: 'vz-tb' }, '미술가와 공예가 사이에');
      u.el(g.quote, 'text', { x: 245, y: 160, 'text-anchor': 'middle', class: 'vz-tb' }, '본질적인 차이란 존재하지 않는다');
      g.edu = [['입문과정', '이텐: 재료, 질감, 색'], ['공방 실습', '공예적 실습'], ['형태 완성', '조형, 기술'], ['건축', '1927 건축부서']].map(([a, b], i) => tag(ctx.svg, 72 + i * 112, 212, 100, 48, a, b));
      g.eduA = [0, 1, 2].map(() => u.arrow(ctx.svg));
      g.ev = [['1926 교사 완성', 1926], ['1933 폐쇄', 1933]].map(([t, y]) => u.el(ctx.svg, 'text', { x: Math.min(456, g.x(y)), y: 282, 'text-anchor': y === 1933 ? 'end' : 'middle', class: y === 1933 ? 'vz-tc' : 'vz-ta' }, t));
      g.now = u.el(ctx.svg, 'line', { y1: 26, y2: 100, class: 'vz-e cr' });
    },
    draw(ctx, s, k) {
      const g = ctx.g;
      const yr = [1919, 1919, 1919, 1927, 1930, 1933][s];
      const prevYr = s > 0 ? [1919, 1919, 1919, 1927, 1930, 1933][s - 1] : 1919;
      const cur = u.lerp(prevYr, yr, seg(k, 0, 0.8));
      g.city.forEach(c => { const w = Math.max(0, Math.min(cur, c.b) - c.a); u.set(c.r, { width: g.x(c.a + w) - g.x(c.a) }); u.op(c.r, w > 0 || c.a === 1919 ? 1 : 0); u.op(c.t, cur > c.a + 0.3 || c.a === 1919 ? 1 : 0); });
      u.set(g.city[0].r, { width: Math.max(12, g.x(Math.min(cur, 1925)) - g.x(1919)) });
      u.set(g.now, { x1: g.x(Math.max(cur, 1919.15)), x2: g.x(Math.max(cur, 1919.15)) });
      g.dean.forEach((d, i) => { const o = i === 0 ? 1 : at(s, k, 4) > 0.5 ? 1 : 0; u.op(d.r, o); u.op(d.t, o); d.r.setAttribute('class', 'vz-box' + (s === 4 ? ' on' : '')); });
      const q = s === 1 ? seg(k, 0, 0.5) : 0;
      u.op(g.quote, q);
      const e = s === 2 ? k : s > 2 ? 1 : 0;
      g.edu.forEach((b, i) => { const o = seg(e, i * 0.22, i * 0.22 + 0.3); u.op(b.g, i === 3 ? (s >= 3 ? at(s, k, 3) : 0) : o); boxCls(b, (s === 2 && i < 3) || (s === 3 && i === 3) ? 'tl' : ''); });
      g.eduA.forEach((a, i) => u.setArrow(a, [122 + i * 112, 212], [134 + i * 112, 212], i === 2 ? at(s, k, 3) : seg(e, i * 0.22 + 0.2, i * 0.22 + 0.4)));
      u.op(g.ev[0], at(s, k, 3)); u.op(g.ev[1], at(s, k, 5));
    },
  });

  /* ---------- 4. 데 스테일: 선과 원색과 떠 있는 판 (4-7) ---------- */
  const RED = '#D9362B', BLUE = '#2450A8', YEL = '#F2C230', GRY = '#9A9CA8';
  V.add('modern.destijl', {
    title: '몬드리안 그림을 건물로',
    w: 480, h: 300,
    dur: 1300,
    states: [
      { tag: '1917', cap: '네덜란드 잡지 "데 스테일"에서 시작해요. 창단선언은 "자연과 대립하는 기계미학을 건축의 근본으로".' },
      { tag: '직선', cap: '가로선과 세로선만 써요. 곡선도, 비스듬한 선도 없어요.' },
      { tag: '색', cap: '빨강, 파랑, 노랑 세 원색과 흰색, 검정, 회색만 칠해요. 이 이론이 신조형주의예요.' },
      { tag: '면으로', cap: '3차원 덩어리를 2차원의 면으로 바꿔요. 판들이 떨어져 나와 가로세로로 떠 있어요.' },
      { tag: '1924', cap: '리트펠트의 슈뢰더 하우스. 위층 거실은 미닫이 판을 밀어 열고 닫아요.' },
      { tag: '1928', cap: '반 두스뷔르흐의 카페 로베뜨는 수평, 수직 위에 대각선을 더했어요.' },
    ],
    build(ctx) {
      const g = ctx.g = {};
      g.frame = u.el(ctx.svg, 'g');
      g.planes = [
        [120, 40, 120, 110, RED], [240, 40, 110, 60, '#fff'], [240, 100, 110, 50, YEL], [120, 150, 70, 110, BLUE], [190, 150, 160, 110, '#fff'], [350, 40, 20, 220, GRY],
      ].map(([x, y, w, h, c]) => { const r = u.el(g.frame, 'rect', { x, y, width: w, height: h }); r.style.fill = c; r.style.stroke = '#111'; r.style.strokeWidth = '0px'; return { r, x, y, w, h, c }; });
      g.lines = [[120, 150, 370, 150], [240, 40, 240, 150], [190, 150, 190, 260], [350, 40, 350, 260], [240, 100, 350, 100]].map(([a, b, c, d]) => { const l = u.el(g.frame, 'line', { x1: a, y1: b, x2: c, y2: d }); l.style.stroke = '#111'; l.style.strokeWidth = '6px'; return l; });
      g.border = u.el(g.frame, 'rect', { x: 120, y: 40, width: 250, height: 220, class: 'vz-e' });
      g.border.style.stroke = '#111'; g.border.style.strokeWidth = '6px';
      g.slider = u.el(ctx.svg, 'rect', { y: 60, width: 14, height: 90 });
      g.slider.style.fill = '#fff'; g.slider.style.stroke = '#111'; g.slider.style.strokeWidth = '2px';
      g.label = u.el(ctx.svg, 'text', { x: 245, y: 290, 'text-anchor': 'middle', class: 'vz-tb' }, '');
      g.side = u.el(ctx.svg, 'text', { x: 20, y: 30, class: 'vz-ts' }, '');
    },
    draw(ctx, s, k) {
      const g = ctx.g;
      const lineP = at(s, k, 1), colP = at(s, k, 2), sepP = at(s, k, 3), diag = at(s, k, 5);
      g.lines.forEach((l, i) => u.op(l, seg(lineP, i * 0.15, i * 0.15 + 0.35)));
      u.op(g.border, s === 0 ? 0.25 : Math.max(0.25, lineP));
      g.planes.forEach((p, i) => {
        const c = p.c === '#fff' ? 1 : seg(colP, i * 0.15, i * 0.15 + 0.4);
        p.r.style.fillOpacity = u.r(p.c === '#fff' ? 1 : c);
        const ox = (i % 2 ? 1 : -1) * 18 * sepP * (1 + (i % 3)), oy = (i % 3 - 1) * 16 * sepP;
        u.set(p.r, { x: p.x + ox, y: p.y + oy });
        p.r.style.strokeWidth = u.r(3 * sepP) + 'px';
      });
      g.lines.forEach(l => u.op(l, Math.min(1, lineP) * (1 - sepP * 0.8)));
      u.op(g.border, (s === 0 ? 0.25 : Math.max(0.25, lineP)) * (1 - sepP * 0.8));
      const open = s === 4 ? k : 0;
      u.set(g.slider, { x: 255 + 80 * open }); u.op(g.slider, s === 4 ? 1 : 0);
      const rot = 45 * diag;
      g.frame.setAttribute('transform', 'rotate(' + u.r(rot) + ' 245 150)');
      u.txt(g.label, ['데 스테일 잡지 1917', '수평선과 수직선', '3원색 + 흰색, 검정, 회색', '면이 떨어져 떠 있어요', '슈뢰더 하우스: 미닫이 판', '카페 로베뜨: 대각선'][s]);
      u.txt(g.side, s === 5 ? '45도 돌린 구성' : '');
    },
  });

  /* ---------- 5. 하워드의 전원도시 (1-4) ---------- */
  V.add('modern.gardencity', {
    title: '전원도시 다이어그램',
    w: 480, h: 300,
    dur: 1300,
    states: [
      { cap: '산업혁명 뒤 대도시는 사람이 몰려 빽빽해지고 집값이 올랐어요.' },
      { tag: '1898', cap: '하워드는 책 "내일"에서 새 도시를 제안해요. 가운데는 인구 5만 8천 명의 중심도시예요.' },
      { tag: '3만 2천 명', cap: '인구 3만 2천 명짜리 작은 전원도시 6개가 둥글게 둘러싸요. 위성도시가 아닌 자족도시예요.' },
      { tag: '연결', cap: '중심도시와 전원도시를 철도와 도로로 이어요. 합치면 58,000 + 6 × 32,000 = 25만 명이에요.' },
      { tag: '안을 보면', cap: '전원도시 한가운데 중앙공원이 있고, 거기서 도로가 방사형으로 뻗어요.' },
      { tag: '둘레', cap: '도넛 모양 가로수길을 따라 집과 정원이 들어서고, 바깥은 농지로 막아 더 커지지 못하게 해요.' },
      { tag: '1905', cap: '첫 전원도시 레치워스. 설계는 하워드가 아니라 언윈과 파커예요. 사람 길과 차 길을 나눴어요(보차분리).' },
    ],
    build(ctx) {
      const g = ctx.g = {};
      g.dense = Array.from({ length: 70 }, (_, i) => u.el(ctx.svg, 'rect', { x: 150 + (i * 37) % 180, y: 60 + (i * 53) % 180, width: 10, height: 10, class: 'vz-bar mu' }));
      g.center = u.el(ctx.svg, 'circle', { cx: 240, cy: 150, r: 40, class: 'vz-box on' });
      g.centerT = u.el(ctx.svg, 'text', { x: 240, y: 146, 'text-anchor': 'middle', class: 'vz-tb' }, '중심도시');
      g.centerP = u.el(ctx.svg, 'text', { x: 240, y: 164, 'text-anchor': 'middle', class: 'vz-ts' }, '58,000명');
      g.sat = [0, 1, 2, 3, 4, 5].map(i => {
        const a = -Math.PI / 2 + i * Math.PI / 3, x = 240 + 110 * Math.cos(a), y = 150 + 110 * Math.sin(a);
        const rail = u.el(ctx.svg, 'line', { x1: 240, y1: 150, x2: x, y2: y, class: 'vz-e' });
        const ring = i === 0 ? null : null;
        const c = u.el(ctx.svg, 'circle', { cx: x, cy: y, r: 28, class: 'vz-box tl' });
        const t = u.el(ctx.svg, 'text', { x, y: y + 5, 'text-anchor': 'middle', class: 'vz-ts' }, '32,000');
        return { rail, c, t, x, y, a, ring };
      });
      g.ringRail = u.el(ctx.svg, 'circle', { cx: 240, cy: 150, r: 110, class: 'vz-e' });
      // 확대한 전원도시
      g.zoom = u.el(ctx.svg, 'g');
      u.el(g.zoom, 'rect', { x: 0, y: 0, width: 480, height: 300, class: 'vz-area' });
      g.farm = u.el(g.zoom, 'circle', { cx: 240, cy: 150, r: 138, class: 'vz-box am' });
      g.farmT = u.el(g.zoom, 'text', { x: 240, y: 26, 'text-anchor': 'middle', class: 'vz-tb' }, '바깥은 농지');
      g.town = u.el(g.zoom, 'circle', { cx: 240, cy: 150, r: 110, class: 'vz-box' });
      g.roads = [0, 1, 2, 3, 4, 5].map(i => { const a = i * Math.PI / 3; return u.el(g.zoom, 'line', { x1: 240 + 22 * Math.cos(a), y1: 150 + 22 * Math.sin(a), x2: 240 + 110 * Math.cos(a), y2: 150 + 110 * Math.sin(a), class: 'vz-e' }); });
      g.park = u.el(g.zoom, 'circle', { cx: 240, cy: 150, r: 22, class: 'vz-box ok' });
      g.parkT = u.el(g.zoom, 'text', { x: 240, y: 155, 'text-anchor': 'middle', class: 'vz-ts' }, '공원');
      g.boul = u.el(g.zoom, 'circle', { cx: 240, cy: 150, r: 68, class: 'vz-e tl' });
      g.houses = Array.from({ length: 24 }, (_, i) => { const a = i * Math.PI / 12 + 0.13; return u.el(g.zoom, 'rect', { x: 240 + 84 * Math.cos(a) - 5, y: 150 + 84 * Math.sin(a) - 5, width: 10, height: 10, class: 'vz-bar am' }); });
      g.boulT = u.el(g.zoom, 'text', { x: 410, y: 150, class: 'vz-tt' }, '가로수길');
      g.letch = u.el(g.zoom, 'text', { x: 240, y: 294, 'text-anchor': 'middle', class: 'vz-ta' }, '레치워스 1905, 언윈과 파커');
    },
    draw(ctx, s, k) {
      const g = ctx.g;
      g.dense.forEach((d, i) => u.op(d, s === 0 ? 1 : s === 1 ? 1 - seg(k, 0, 0.5) : 0));
      const c = at(s, k, 1);
      u.op(g.center, c); u.op(g.centerT, c); u.op(g.centerP, c);
      const sp = at(s, k, 2);
      g.sat.forEach((st, i) => {
        const o = seg(sp, i * 0.12, i * 0.12 + 0.35);
        u.op(st.c, o); u.op(st.t, o);
        u.op(st.rail, at(s, k, 3));
        st.rail.setAttribute('class', 'vz-e' + (s === 3 ? ' on' : ''));
      });
      u.op(g.ringRail, at(s, k, 3));
      const z = at(s, k, 4);
      u.op(g.zoom, z);
      u.op(g.park, 1); u.op(g.parkT, 1);
      g.roads.forEach((r, i) => u.op(r, seg(z, 0.4 + i * 0.08, 0.6 + i * 0.08)));
      const ring = at(s, k, 5);
      u.op(g.boul, ring); u.op(g.boulT, ring);
      g.houses.forEach((h, i) => u.op(h, seg(ring, i / 30, i / 30 + 0.2)));
      u.op(g.farm, ring); u.op(g.farmT, ring);
      u.op(g.letch, at(s, k, 6));
    },
  });

  /* ---------- 6. 바이센호프 주거단지 번호와 건축가 (5-2) ---------- */
  const WS = [
    [1, 4, '미스 반 데어 로에', 'vz-k0'], [5, 9, '오우트', 'vz-k1'], [10, 10, '부르주아', 'vz-k8'], [11, 12, '슈네크', 'vz-k8'],
    [13, 15, '르 코르뷔지에, 잔느레', 'vz-k3'], [16, 17, '그로피우스', 'vz-k2'], [18, 18, '힐버자이머', 'vz-k8'], [19, 19, '브루노 타우트', 'vz-k8'],
    [20, 20, '푈치히', 'vz-k8'], [21, 22, '되커', 'vz-k8'], [23, 24, '막스 타우트', 'vz-k8'], [25, 25, '라딩', 'vz-k8'],
    [26, 27, '프랑크', 'vz-k8'], [28, 30, '마르트 스탐', 'vz-k8'], [31, 32, '베렌스', 'vz-k8'], [33, 33, '샤로운', 'vz-k8'],
  ];
  V.add('modern.weissenhof', {
    title: '바이센호프 1927, 번호마다 다른 건축가',
    w: 480, h: 300,
    dur: 1100,
    states: [
      { tag: '1927', cap: '슈투트가르트의 주택전시회예요. 독일공작연맹이 주최하고 미스 반 데어 로에가 이끌었어요.' },
      { tag: '1~4번', cap: '미스는 전체를 이끌고 4층 아파트를 지었어요.' },
      { tag: '5~9번', cap: '오우트는 연립주택을 지었어요.' },
      { tag: '13~15번', cap: '르 코르뷔지에와 잔느레는 필로티와 개방적인 평면을 보여 줬어요.' },
      { tag: '16~17번', cap: '그로피우스는 조립화의 가능성을 보여 줬어요.' },
      { tag: '모두', cap: '당시 근대건축가 대부분이 참여해 평지붕, 장식 없는 흰 벽, 자유로운 입면으로 지었어요. 국제주의 양식이 퍼진 계기예요.' },
    ],
    build(ctx) {
      const g = ctx.g = {};
      u.el(ctx.svg, 'text', { x: 240, y: 20, 'text-anchor': 'middle', class: 'vz-ts' }, '번호 순서를 보여 주는 개념도 (실제 배치는 정리노트 그림)');
      g.lots = [];
      for (let n = 1; n <= 33; n++) {
        const i = n - 1, row = Math.floor(i / 11), col = row % 2 ? 10 - (i % 11) : i % 11;
        const x = 26 + col * 40, y = 44 + row * 58;
        const grp = WS.find(w => n >= w[0] && n <= w[1]);
        const gg = u.el(ctx.svg, 'g');
        const r = u.el(gg, 'rect', { x, y, width: 34, height: n <= 4 ? 44 : 34, rx: 3, class: 'vz-bar mu' });
        u.el(gg, 'text', { x: x + 17, y: y + 22, 'text-anchor': 'middle', class: 'vz-tb' }, String(n));
        g.lots.push({ gg, r, n, grp });
      }
      g.path = u.el(ctx.svg, 'path', { d: 'M20 96 H460 M460 96 V154 M20 154 H460 M20 154 V212', class: 'vz-e' });
      g.name = u.el(ctx.svg, 'text', { x: 240, y: 250, 'text-anchor': 'middle', class: 'vz-tb' }, '');
      g.what = u.el(ctx.svg, 'text', { x: 240, y: 274, 'text-anchor': 'middle', class: 'vz-ta' }, '');
      g.roof = u.el(ctx.svg, 'text', { x: 240, y: 294, 'text-anchor': 'middle', class: 'vz-ts' }, '');
    },
    draw(ctx, s, k) {
      const g = ctx.g;
      const focus = [null, [1, 4], [5, 9], [13, 15], [16, 17], 'all'][s];
      g.lots.forEach(L => {
        let cls = 'vz-bar mu', o = 1;
        if (focus === 'all') cls = 'vz-bar ' + L.grp[3];
        else if (focus && L.n >= focus[0] && L.n <= focus[1]) cls = 'vz-bar ' + L.grp[3];
        else if (focus) o = 0.35;
        if (s === 0) o = seg(k === 1 ? 1 : k, 0, 1) >= 0 ? 1 : 1;
        L.r.setAttribute('class', cls);
        u.op(L.gg, focus && focus !== 'all' ? (cls === 'vz-bar mu' ? 0.35 : 1) : o);
      });
      const txt = [['독일공작연맹 주최, 슈투트가르트', '미스 반 데어 로에가 주도', ''], ['미스 반 데어 로에', '4층 아파트', ''], ['오우트', '연립주택', ''], ['르 코르뷔지에, 피에르 잔느레', '필로티, 개방적인 평면', ''], ['그로피우스', '조립화의 가능성', ''], ['타우트, 베렌스, 샤로운, 스탐 ...', '평지붕, 장식 없는 흰 벽', '국제주의 양식 확산의 계기']][s];
      const o = seg(k, 0.3, 1);
      u.txt(g.name, txt[0]); u.txt(g.what, txt[1]); u.txt(g.roof, txt[2]);
      [g.name, g.what, g.roof].forEach(t => u.op(t, s === 0 ? 1 : o));
    },
  });

  /* ---------- 7. 시카고: 두꺼운 벽과 철골 (2-7) ---------- */
  V.add('modern.chicago', {
    title: '벽이 받치나, 뼈대가 받치나',
    w: 480, h: 300,
    dur: 1300,
    states: [
      { tag: '1871', cap: '시카고 대화재로 상업지구 전부가 타요. 주철 골조(1850)와 엘리베이터(1864, 1867)가 있어 고층으로 다시 지어요.' },
      { tag: '조적조', cap: '벽돌 벽이 건물 무게를 받는 방식이에요. 높이 쌓을수록 아래층 벽이 두꺼워져야 해요.' },
      { tag: '1893', cap: '루트의 모나드녹 빌딩은 조적조라 1층 벽 두께가 1.8m 예요. 장식 없이 매스와 비례로만 말해요.' },
      { tag: '철골조', cap: '기둥과 보가 무게를 받고, 벽은 커튼처럼 걸기만 해요. 홈 인슈어런스 빌딩(제니, 1885)이 대표 초기작이에요.' },
      { tag: '1895', cap: '번햄의 리라이언스 빌딩(16층)은 외관에 강철 골조를 그대로 드러냈어요. 시카고 학파는 세 칸으로 나눈 시카고 창으로 큰 창을 냈어요.' },
      { tag: '설리번', cap: '설리번의 개런티 빌딩(1895)은 무거운 아래(base), 수직으로 높은 가운데(shaft), 설비가 드는 꼭대기(attic)로 3단 구성해요.' },
    ],
    build(ctx) {
      const g = ctx.g = {};
      u.el(ctx.svg, 'rect', { x: 0, y: 270, width: 480, height: 30, class: 'vz-area' });
      g.floors = 12; g.fh = 19;
      // 왼쪽 조적조
      g.mas = Array.from({ length: g.floors }, (_, i) => {
        const y = 270 - (i + 1) * g.fh;
        return { l: u.el(ctx.svg, 'rect', { y, height: g.fh, class: 'vz-wall' }), r: u.el(ctx.svg, 'rect', { y, height: g.fh, class: 'vz-wall' }), win: u.el(ctx.svg, 'rect', { y: y + 5, height: g.fh - 10, class: 'vz-box' }), i };
      });
      g.masT = u.el(ctx.svg, 'text', { x: 110, y: 290, 'text-anchor': 'middle', class: 'vz-tb' }, '조적조');
      g.dim = u.el(ctx.svg, 'text', { x: 186, y: 258, class: 'vz-tc' }, '1층 벽 1.8m');
      g.dimL = u.el(ctx.svg, 'path', { class: 'vz-axis' });
      // 오른쪽 철골조
      g.cols = [300, 350, 400, 450].map(x => u.el(ctx.svg, 'rect', { x: x - 3, width: 6, class: 'vz-bar' }));
      g.beams = Array.from({ length: g.floors }, (_, i) => u.el(ctx.svg, 'rect', { x: 297, y: 270 - (i + 1) * g.fh - 2, width: 156, height: 4, class: 'vz-bar' }));
      g.glass = Array.from({ length: g.floors * 3 }, (_, j) => { const i = Math.floor(j / 3), c = j % 3; return u.el(ctx.svg, 'rect', { x: 303 + c * 50, y: 270 - (i + 1) * g.fh + 3, width: 44, height: g.fh - 6, class: 'vz-box' }); });
      g.frT = u.el(ctx.svg, 'text', { x: 375, y: 290, 'text-anchor': 'middle', class: 'vz-tb' }, '철골조');
      g.tri = [['attic', 270 - 12 * g.fh + 10], ['shaft', 270 - 7 * g.fh], ['base', 270 - 1 * g.fh + 12]].map(([t, y]) => u.el(ctx.svg, 'text', { x: 470, y, 'text-anchor': 'end', class: 'vz-ta' }, t));
      g.fire = u.el(ctx.svg, 'text', { x: 240, y: 150, 'text-anchor': 'middle', class: 'vz-tc' }, '1871 대화재');
      g.fire.style.fontSize = '26px';
    },
    draw(ctx, s, k) {
      const g = ctx.g;
      u.op(g.fire, s === 0 ? 1 : 0);
      const build = at(s, k, 1);
      const nMas = g.floors * build;
      const thick = i => 8 + (g.floors - 1 - i) * 3.2;   // 아래층일수록 두꺼움 (그림 비례는 개념용)
      g.mas.forEach(m => {
        const on = m.i < nMas;
        const t = thick(m.i);
        u.set(m.l, { x: 40, width: t }); u.set(m.r, { x: 180 - t, width: t });
        u.set(m.win, { x: 40 + t + 8, width: Math.max(8, 140 - 2 * t - 16) });
        [m.l, m.r, m.win].forEach(x => u.op(x, on ? 1 : 0));
      });
      u.op(g.masT, build > 0 ? 1 : 0);
      const d = at(s, k, 2);
      u.op(g.dim, d);
      u.set(g.dimL, { d: 'M40 ' + (270 - g.fh / 2) + ' h' + u.r(thick(0)) });
      u.op(g.dimL, d);
      g.mas[0].l.setAttribute('class', s === 2 ? 'vz-bar cr' : 'vz-wall');
      const fr = at(s, k, 3);
      g.cols.forEach(c => { const hgt = g.floors * g.fh * fr; u.set(c, { y: 270 - hgt, height: hgt }); u.op(c, fr > 0 ? 1 : 0); });
      g.beams.forEach((b, i) => u.op(b, fr * g.floors > i + 0.5 ? 1 : 0));
      u.op(g.frT, fr > 0 ? 1 : 0);
      const gl = at(s, k, 4);
      g.glass.forEach((w, j) => { u.op(w, seg(gl, j / 40, j / 40 + 0.1)); w.setAttribute('class', 'vz-box' + (gl > 0 ? ' tl' : '')); });
      const tr = at(s, k, 5);
      g.tri.forEach((t, i) => u.op(t, seg(tr, i * 0.25, i * 0.25 + 0.4)));
    },
  });
})();
