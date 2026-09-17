/* 움직이는 개념 그림: 그래프 신경망(GNN) 묶음. 틀은 viz.js, 설명은 README.md
   숫자는 정리 슬라이드 손계산 예제에서 가져왔다 (단원 id 는 각 그림 머리 주석). */
(function () {
  'use strict';
  const V = window.SDTViz;
  if (!V) return;
  const u = V.u;
  const at = u.at, seg = u.seg, num = u.num;

  /* 그래프 한 벌: 선 먼저, 노드 나중 */
  function graph(parent, pos, edges, r, label) {
    const ge = u.el(parent, 'g'), gn = u.el(parent, 'g');
    const E = {}, N = {};
    edges.forEach(([a, b]) => { E[a + '-' + b] = u.el(ge, 'line', { class: 'vz-e', x1: pos[a][0], y1: pos[a][1], x2: pos[b][0], y2: pos[b][1] }); });
    Object.keys(pos).forEach(id => { N[id] = u.node(gn, pos[id][0], pos[id][1], r, label ? label(id) : id); });
    return { E, N, ge, gn, edge: (a, b) => E[a + '-' + b] || E[b + '-' + a] };
  }
  const nodeCls = (nd, c) => { nd.g.setAttribute('class', 'vz-node' + (c ? ' ' + c : '')); };

  /* ---------- 1. 그래프와 인접행렬 (wb-1, w1-1) ---------- */
  V.add('gnn.adj', {
    title: '엣지를 그을 때마다 인접행렬 칸이 켜져요',
    w: 480, h: 300,
    states: [
      { cap: '노드 4개가 있고 엣지는 아직 없어요. 표 A 의 칸은 모두 0 이에요.' },
      { cap: '엣지 1-2 를 그으면 1행 2열 칸과 2행 1열 칸, 두 칸이 1 이 돼요.' },
      { cap: '엣지 1-3: 1행 3열 칸과 3행 1열 칸이 1 이 돼요.' },
      { cap: '엣지 2-3: 2행 3열 칸과 3행 2열 칸이 1 이 돼요.' },
      { cap: '엣지 3-4: 3행 4열 칸과 4행 3열 칸. 대각선을 따라 접으면 양쪽 숫자가 같아요.' },
      { cap: '가로줄을 더하면 차수예요. 3행은 1 + 1 + 0 + 1 = 3, 노드 3 의 친구가 3명이에요.' },
    ],
    build(ctx) {
      const g = ctx.g = {};
      const pos = { 1: [60, 80], 2: [200, 80], 3: [130, 180], 4: [130, 262] };
      g.pos = pos;
      g.edges = [[1, 2], [1, 3], [2, 3], [3, 4]];
      const ge = u.el(ctx.svg, 'g');
      g.lines = g.edges.map(() => u.el(ge, 'line', { class: 'vz-e' }));
      const gn = u.el(ctx.svg, 'g');
      g.nodes = {}; Object.keys(pos).forEach(id => { g.nodes[id] = u.node(gn, pos[id][0], pos[id][1], 20, id); });
      const x0 = 262, y0 = 62, c = 40;
      g.x0 = x0; g.y0 = y0; g.c = c;
      u.el(ctx.svg, 'text', { x: x0 + 2 * c, y: 26, 'text-anchor': 'middle', class: 'vz-tb' }, '인접행렬 A');
      u.el(ctx.svg, 'text', { x: x0 + 4 * c + 26, y: 52, 'text-anchor': 'middle', class: 'vz-ts' }, '차수');
      g.cells = {}; g.degs = [];
      for (let i = 1; i <= 4; i++) {
        u.el(ctx.svg, 'text', { x: x0 + (i - 0.5) * c, y: y0 - 10, 'text-anchor': 'middle', class: 'vz-ts' }, String(i));
        u.el(ctx.svg, 'text', { x: x0 - 12, y: y0 + (i - 0.5) * c + 5, 'text-anchor': 'middle', class: 'vz-ts' }, String(i));
        for (let j = 1; j <= 4; j++) {
          const r = u.el(ctx.svg, 'rect', { x: x0 + (j - 1) * c + 2, y: y0 + (i - 1) * c + 2, width: c - 4, height: c - 4, rx: 4, class: 'vz-box' });
          const t = u.el(ctx.svg, 'text', { x: x0 + (j - 0.5) * c, y: y0 + (i - 0.5) * c + 6, 'text-anchor': 'middle', class: 'vz-tb' }, '0');
          g.cells[i + ',' + j] = { r, t };
        }
        g.degs.push(u.el(ctx.svg, 'text', { x: x0 + 4 * c + 26, y: y0 + (i - 0.5) * c + 6, 'text-anchor': 'middle', class: 'vz-ta' }, ''));
      }
      g.rowhl = u.el(ctx.svg, 'rect', { x: x0 - 2, y: y0 + 2 * c - 2, width: 4 * c + 50, height: c + 4, rx: 6, class: 'vz-hl' });
    },
    draw(ctx, s, k) {
      const g = ctx.g;
      const val = {};
      g.edges.forEach(([a, b], j) => {
        const p = at(s, k, j + 1);
        const [pa, pb] = u.shrink(g.pos[a], g.pos[b], 20, 20);
        u.draw(g.lines[j], pa, pb, seg(p, 0, 0.6));
        g.lines[j].setAttribute('class', 'vz-e' + (s === j + 1 ? ' on' : ''));
        const on = p >= 0.6 ? 1 : 0;
        val[a + ',' + b] = on; val[b + ',' + a] = on;
        if (s === j + 1) { val.cur = [a + ',' + b, b + ',' + a]; }
      });
      Object.keys(g.cells).forEach(key => {
        const c = g.cells[key], v = val[key] || 0;
        u.txt(c.t, v);
        const cur = val.cur && val.cur.indexOf(key) >= 0 && k >= 0.6;
        c.r.setAttribute('class', 'vz-box' + (cur ? ' on' : v ? ' tl' : ''));
      });
      const d5 = at(s, k, 5);
      const deg = [2, 2, 3, 1];
      g.degs.forEach((t, i) => { u.txt(t, deg[i]); u.op(t, seg(d5, 0.2, 1)); });
      u.op(g.rowhl, seg(d5, 0, 0.5));
      Object.keys(g.nodes).forEach(id => {
        const inCur = s >= 1 && s <= 4 && g.edges[s - 1].indexOf(+id) >= 0;
        nodeCls(g.nodes[id], inCur ? 'on' : (s === 5 && id === '3') ? 'tl' : '');
      });
    },
  });

  /* ---------- 2. 랜덤워크 (w1-7) ---------- */
  V.add('gnn.walk', {
    title: '랜덤워크 한 번 따라가기',
    w: 480, h: 300,
    dur: 1000,
    states: [
      { cap: 's 에서 출발해요. 이웃이 2명이라 어느 쪽이든 1/2 확률이에요.' },
      { cap: '5 로 왔어요. 이웃이 3명이라 다음 칸은 각각 1/3 이에요.' },
      { cap: '8 로 왔어요. 이웃이 4명이라 각각 1/4 이에요.' },
      { cap: '9 로 왔어요. 이웃은 8, 11, 7 이에요.' },
      { cap: '다시 8 로 돌아왔어요. 랜덤워크는 되돌아가도 돼요.' },
      { cap: '11 에서 멈춰요. 걸은 순서 s, 5, 8, 9, 8, 11 이 문장 하나가 돼요.' },
      { cap: '윈도 1 이면 가운데 9 의 주변은 바로 앞뒤인 8 과 8 이에요. 이 쌍의 좌표를 가깝게 배워요.' },
    ],
    build(ctx) {
      const g = ctx.g = {};
      const pos = g.pos = { s: [50, 115], 5: [140, 50], 3: [135, 185], 8: [240, 115], 9: [340, 45], 11: [345, 185], 7: [440, 115] };
      g.edges = [['s', '5'], ['s', '3'], ['5', '3'], ['5', '8'], ['3', '8'], ['8', '9'], ['8', '11'], ['9', '11'], ['9', '7'], ['11', '7']];
      g.walk = ['s', '5', '8', '9', '8', '11'];
      g.nb = {}; g.edges.forEach(([a, b]) => { (g.nb[a] = g.nb[a] || []).push(b); (g.nb[b] = g.nb[b] || []).push(a); });
      g.G = graph(ctx.svg, pos, g.edges, 20);
      g.prob = {};
      g.edges.forEach(([a, b]) => [[a, b], [b, a]].forEach(([x, y]) => {
        const p = u.pt(pos[x], pos[y], 0.55);
        g.prob[x + '>' + y] = u.el(ctx.svg, 'text', { x: p[0], y: p[1] - 7, 'text-anchor': 'middle', class: 'vz-ta' }, '');
      }));
      g.tok = u.el(ctx.svg, 'circle', { r: 8, class: 'vz-dot cr' });
      u.el(ctx.svg, 'text', { x: 16, y: 252, class: 'vz-ts' }, '워크 = 문장');
      g.words = g.walk.map((w, i) => {
        const x = 110 + i * 60;
        const r = u.el(ctx.svg, 'rect', { x: x - 24, y: 232, width: 48, height: 32, rx: 6, class: 'vz-box' });
        const t = u.el(ctx.svg, 'text', { x, y: 254, 'text-anchor': 'middle', class: 'vz-tb' }, w);
        return { r, t };
      });
      g.ctx = u.el(ctx.svg, 'text', { x: 290, y: 290, 'text-anchor': 'middle', class: 'vz-tt' }, '9 의 주변: 8, 8');
    },
    draw(ctx, s, k) {
      const g = ctx.g, pos = g.pos;
      const i = Math.min(s, 5);
      const cur = g.walk[i];
      const move = s >= 1 && s <= 5 ? seg(k, 0, 0.7) : 1;
      const from = s >= 1 && s <= 5 ? g.walk[s - 1] : cur;
      const p = u.pt(pos[from], pos[cur], move);
      u.set(g.tok, { cx: p[0], cy: p[1] - 26 });
      const used = {};
      for (let j = 1; j <= i; j++) { if (j < s || (j === s && move >= 1) || s > 5) used[[g.walk[j - 1], g.walk[j]].sort().join('|')] = 1; }
      g.edges.forEach(([a, b]) => { const key = [a, b].sort().join('|'); g.G.edge(a, b).setAttribute('class', 'vz-e' + (used[key] ? ' on' : '')); });
      Object.keys(g.G.N).forEach(id => nodeCls(g.G.N[id], id === cur && s <= 5 ? 'on' : (s === 6 && id === '9') ? 'on' : ''));
      const show = s <= 5 ? (s === 0 ? 1 : seg(k, 0.7, 1)) : 0;
      Object.keys(g.prob).forEach(key => {
        const [x] = key.split('>');
        const on = x === cur && s < 5;
        u.txt(g.prob[key], on ? '1/' + g.nb[x].length : '');
        u.op(g.prob[key], on ? show : 0);
      });
      g.words.forEach((w, j) => {
        const vis = j === 0 ? 1 : at(s, k, j) >= 0.7 ? 1 : seg(at(s, k, j), 0.5, 0.7);
        u.op(w.r, vis); u.op(w.t, vis);
        const c = s === 6 ? (j === 3 ? ' on' : (j === 2 || j === 4) ? ' tl' : '') : '';
        w.r.setAttribute('class', 'vz-box' + c);
      });
      u.op(g.ctx, at(s, k, 6));
    },
  });

  /* ---------- 3. node2vec 다음 걸음 확률 (w1-8) ---------- */
  function n2v(p, q) {
    const sc = [1 / p, 1, 1 / q, 1 / q], sum = sc.reduce((a, b) => a + b, 0);
    return { sc, sum, pr: sc.map(x => x / sum) };
  }
  V.add('gnn.node2vec', {
    title: 'node2vec 의 p 와 q',
    w: 480, h: 300,
    params: { p: 0.2, q: 0.6 },
    capsDependOn: true,
    controls: [
      { key: 'p', type: 'range', label: 'p (되돌아가기)', min: 0.2, max: 4, step: 0.1, fmt: v => num(v, 1) },
      { key: 'q', type: 'range', label: 'q (멀리 나가기)', min: 0.2, max: 4, step: 0.1, fmt: v => num(v, 1) },
    ],
    states(P) {
      const r = n2v(P.p, P.q), pr = r.pr;
      const back = pr[0], out = pr[2] + pr[3];
      const verdict = back >= out && back >= pr[1] ? '되돌아가기 확률이 가장 커서 BFS 같은 워크예요. 가까운 곳을 맴돌아요.'
        : out > back && out >= pr[1] ? 'x2 와 x3 을 합친 ' + num(out) + ' 가 커서 DFS 같은 워크예요. 멀리 나가요.' : '가까운 x1 쪽이 커서 고르게 퍼져요.';
      return [
        { cap: '워커가 t 에서 v 로 막 왔어요. 다음 칸은 v 의 이웃 t, x1, x2, x3 가운데 하나예요.' },
        { cap: '직전 노드 t 에서 거리를 재요. t 자신은 0, x1 은 1, x2 와 x3 은 2 예요.' },
        { cap: '점수: 거리 0 은 1/p = ' + num(r.sc[0]) + ', 거리 1 은 1, 거리 2 는 1/q = ' + num(r.sc[2]) + ' 이에요.' },
        { cap: '점수 합 ' + num(r.sum) + ' 로 나누면 확률: t ' + num(pr[0], 3) + ', x1 ' + num(pr[1], 3) + ', x2 와 x3 각각 ' + num(pr[2], 3) + ' 이에요.' },
        { cap: verdict + ' 아래 막대로 p, q 를 바꿔 보세요.' },
      ];
    },
    build(ctx) {
      const g = ctx.g = {};
      const pos = g.pos = { t: [40, 160], v: [140, 160], x1: [90, 62], x2: [200, 80], x3: [200, 232] };
      g.G = graph(ctx.svg, pos, [['t', 'v'], ['t', 'x1'], ['v', 'x1'], ['v', 'x2'], ['v', 'x3']], 20, id => id);
      g.arr = u.arrow(ctx.svg, 'cr');
      g.dist = {}; g.score = {};
      const off = { t: [0, 40], x1: [0, -46], x2: [58, -8], x3: [58, -8] };
      ['t', 'x1', 'x2', 'x3'].forEach(id => {
        g.dist[id] = u.el(ctx.svg, 'text', { x: pos[id][0] + off[id][0], y: pos[id][1] + off[id][1], 'text-anchor': 'middle', class: 'vz-ts' }, '');
        g.score[id] = u.el(ctx.svg, 'text', { x: pos[id][0] + off[id][0], y: pos[id][1] + off[id][1] + 17, 'text-anchor': 'middle', class: 'vz-ta' }, '');
      });
      u.el(ctx.svg, 'text', { x: 300, y: 36, class: 'vz-tb' }, '다음 걸음 확률');
      g.bars = ['t', 'x1', 'x2', 'x3'].map((id, i) => {
        const y = 62 + i * 52;
        u.el(ctx.svg, 'text', { x: 300, y: y + 18, class: 'vz-tb' }, id);
        u.el(ctx.svg, 'rect', { x: 330, y: y + 2, width: 140, height: 22, rx: 3, class: 'vz-area' });
        const b = u.el(ctx.svg, 'rect', { x: 330, y: y + 2, width: 0, height: 22, rx: 3, class: 'vz-bar' + (i === 0 ? ' cr' : i === 1 ? '' : ' tl') });
        const t = u.el(ctx.svg, 'text', { x: 334, y: y + 42, class: 'vz-ts' }, '');
        return { b, t };
      });
    },
    draw(ctx, s, k) {
      const g = ctx.g, pos = g.pos, P = ctx.p;
      const r = n2v(P.p, P.q);
      const [a, b] = u.shrink(pos.t, pos.v, 22, 22);
      u.setArrow(g.arr, a, b, 1);
      const d = { t: 0, x1: 1, x2: 2, x3: 2 };
      const sc = { t: r.sc[0], x1: 1, x2: r.sc[2], x3: r.sc[3] };
      ['t', 'x1', 'x2', 'x3'].forEach(id => {
        u.txt(g.dist[id], '거리 ' + d[id]); u.op(g.dist[id], at(s, k, 1));
        u.txt(g.score[id], '점수 ' + num(sc[id])); u.op(g.score[id], at(s, k, 2));
      });
      const grow = seg(at(s, k, 3), 0, 1);
      g.bars.forEach((x, i) => {
        u.set(x.b, { width: 140 * r.pr[i] * grow });
        u.txt(x.t, num(r.pr[i], 3)); u.op(x.t, at(s, k, 3));
      });
      const pr = r.pr, back = pr[0], out = pr[2] + pr[3];
      const hi = at(s, k, 4) > 0.5;
      nodeCls(g.G.N.v, 'on');
      nodeCls(g.G.N.t, hi && back >= out && back >= pr[1] ? 'cr' : '');
      nodeCls(g.G.N.x1, hi && pr[1] > back && pr[1] > out ? 'am' : '');
      const far = hi && out > back && out >= pr[1];
      nodeCls(g.G.N.x2, far ? 'tl' : ''); nodeCls(g.G.N.x3, far ? 'tl' : '');
    },
  });

  /* ---------- 4. 메시지 패싱 한 층 (w2-4) ---------- */
  const AGG = { sum: ['합', xs => xs.reduce((a, b) => a + b, 0)], mean: ['평균', xs => xs.reduce((a, b) => a + b, 0) / xs.length], max: ['최대', xs => Math.max.apply(null, xs)] };
  const aggExpr = (a, xs) => a === 'sum' ? xs.join(' + ') : a === 'mean' ? '(' + xs.join(' + ') + ') ÷ ' + xs.length : 'max(' + xs.join(', ') + ')';
  V.add('gnn.mp', {
    title: '메시지, 집계, 갱신',
    w: 480, h: 300,
    params: { agg: 'mean' },
    capsDependOn: true,
    controls: [{ key: 'agg', type: 'choice', label: '모으는 방법', options: [['sum', '합'], ['mean', '평균'], ['max', '최대']] }],
    states(P) {
      const m = AGG[P.agg][1]([2, 4, 6]), nv = m / 2;
      return [
        { cap: '처음 값: 가운데 노드 1 은 0, 이웃 2, 3, 4 는 2, 4, 6 이에요.' },
        { tag: '메시지', cap: '이웃 셋이 자기 값을 쪽지로 노드 1 에 보내요.' },
        { tag: '집계', cap: AGG[P.agg][0] + '으로 모아요: ' + aggExpr(P.agg, [2, 4, 6]) + ' = ' + num(m) + '.' },
        { tag: '갱신', cap: '(내 값 + 모은 값) ÷ 2 = (0 + ' + num(m) + ') ÷ 2 = ' + num(nv) + '. 노드 1 의 새 값이에요.' },
        { tag: '동시에', cap: '이웃들도 같은 층에서 함께 해요. 노드 1 의 옛 값 0 을 받아 (2 + 0) ÷ 2 = 1, 그리고 2, 3 이 돼요.' },
        { cap: '한 층 뒤: (0, 2, 4, 6) 이 (' + num(nv) + ', 1, 2, 3) 이 됐어요. 층을 또 쌓으면 새 값으로 한 번 더 돌아요.' },
      ];
    },
    build(ctx) {
      const g = ctx.g = {};
      const pos = g.pos = { 1: [150, 160], 2: [150, 48], 3: [55, 250], 4: [245, 250] };
      g.G = graph(ctx.svg, pos, [[1, 2], [1, 3], [1, 4]], 26, () => '');
      g.lab = {};
      Object.keys(pos).forEach(id => { g.lab[id] = u.el(ctx.svg, 'text', { x: pos[id][0] + (id === '1' ? -44 : 0), y: pos[id][1] + (id === '1' ? -30 : id === '2' ? 0 : 45), 'text-anchor': 'middle', class: 'vz-ts' }, '노드 ' + id); });
      g.lab['2'].setAttribute('x', 205); g.lab['2'].setAttribute('y', 52);
      g.dots = ['2', '3', '4'].map(id => {
        const gg = u.el(ctx.svg, 'g');
        return { g: gg, c: u.el(gg, 'circle', { r: 13, class: 'vz-dot am' }), t: u.el(gg, 'text', { 'text-anchor': 'middle', class: 'vz-tb' }, ''), id };
      });
      g.back = ['2', '3', '4'].map(id => {
        const gg = u.el(ctx.svg, 'g');
        return { g: gg, c: u.el(gg, 'circle', { r: 11, class: 'vz-dot tl' }), t: u.el(gg, 'text', { 'text-anchor': 'middle', class: 'vz-tb' }, '0'), id };
      });
      const px = 292;
      g.box = u.el(ctx.svg, 'rect', { x: px - 8, y: 18, width: 190, height: 272, rx: 8, class: 'vz-box' });
      g.lines = [0, 1, 2, 3, 4, 5, 6, 7].map(i => u.el(ctx.svg, 'text', { x: px, y: 42 + i * 33 + (i % 2 ? -6 : 0), class: i % 2 ? 'vz-tb' : 'vz-ts' }, ''));
    },
    draw(ctx, s, k) {
      const g = ctx.g, pos = g.pos, P = ctx.p;
      const m = AGG[P.agg][1]([2, 4, 6]), nv = m / 2;
      const x0 = { 1: 0, 2: 2, 3: 4, 4: 6 }, x1 = { 1: nv, 2: 1, 3: 2, 4: 3 };
      const agg = [pos[1][0] + 60, pos[1][1]];
      g.dots.forEach(d => {
        let p = pos[d.id], o = 0;
        if (s === 1) { p = u.pt(pos[d.id], pos[1], seg(k, 0, 0.9)); o = 1; }
        else if (s === 2) { p = u.pt(pos[1], agg, seg(k, 0, 0.45)); o = 1 - seg(k, 0.55, 0.8); }
        if (s === 1 || s === 2) { const off = { 2: -10, 3: 0, 4: 10 }[d.id]; p = [p[0] + off * (s === 2 ? 1 - seg(k, 0, 0.45) : seg(k, 0.6, 1)), p[1]]; }
        u.set(d.c, { cx: p[0], cy: p[1] }); u.set(d.t, { x: p[0], y: p[1] + 5 }); u.txt(d.t, x0[d.id]); u.op(d.g, o);
      });
      g.back.forEach(d => {
        let o = 0, p = pos[1];
        if (s === 4) { p = u.pt(pos[1], pos[d.id], seg(k, 0, 0.6)); o = 1 - seg(k, 0.65, 0.85); }
        u.set(d.c, { cx: p[0], cy: p[1] }); u.set(d.t, { x: p[0], y: p[1] + 5 }); u.op(d.g, o);
      });
      Object.keys(pos).forEach(id => {
        const upd = id === '1' ? at(s, k, 3) : at(s, k, 4);
        const val = upd >= 0.6 ? x1[id] : x0[id];
        u.txt(g.G.N[id].t, num(val));
        const hot = id === '1' ? (s >= 1 && s <= 3) : s === 4;
        nodeCls(g.G.N[id], hot ? (id === '1' ? 'on' : 'tl') : s === 5 ? 'am' : '');
      });
      ['1-2', '1-3', '1-4'].forEach(e => g.G.E[e].setAttribute('class', 'vz-e' + (s === 1 || s === 4 ? ' on' : '')));
      const L = [
        ['쪽지', '2, 4, 6', 1],
        ['집계 (' + AGG[P.agg][0] + ')', aggExpr(P.agg, [2, 4, 6]) + ' = ' + num(m), 2],
        ['갱신 (노드 1)', '(0 + ' + num(m) + ') ÷ 2 = ' + num(nv), 3],
      ];
      L.push(s === 5 ? ['한 층 뒤', '(' + num(nv) + ', 1, 2, 3)', 5] : ['이웃 갱신', '(2 + 0) ÷ 2 = 1, 그리고 2, 3', 4]);
      for (let i = 0; i < 4; i++) {
        u.txt(g.lines[2 * i], L[i][0]); u.txt(g.lines[2 * i + 1], L[i][1]);
        const o = at(s, k, L[i][2]);
        u.op(g.lines[2 * i], o); u.op(g.lines[2 * i + 1], o);
      }
      g.box.setAttribute('class', 'vz-box' + (s === 5 ? ' ok' : ''));
    },
  });

  /* ---------- 5. 층을 쌓으면 넓어지는 수용 영역 (w2-5) ---------- */
  V.add('gnn.receptive', {
    title: '층 하나가 홉 하나',
    w: 480, h: 300,
    dur: 1300,
    states: [
      { cap: '0층: 노드 A 는 자기 입력값만 알아요. 보이는 범위는 A 하나예요.' },
      { cap: '1층: 이웃 B, C, D 가 쪽지를 보내요. 1홉 안의 노드까지 보여요.' },
      { cap: '2층: 이웃의 이웃 E, F 의 값이 C 를 거쳐 A 에 닿아요. 2홉까지예요.' },
      { cap: '층 하나가 홉 하나예요. 가라테 클럽 노드 0 은 1층에 17명, 2층에 26명, 3층에 34명 전원을 봐요.' },
      { cap: '층을 많이 쌓으면 모든 노드가 거의 같은 노드들을 보게 돼요. 값이 비슷해지는 과평활화(Over-smoothing)로 이어져요.' },
    ],
    build(ctx) {
      const g = ctx.g = {};
      const pos = g.pos = { A: [50, 150], B: [95, 55], C: [145, 150], D: [70, 250], E: [215, 80], F: [215, 225] };
      g.hop = { A: 0, B: 1, C: 1, D: 1, E: 2, F: 2 };
      g.G = graph(ctx.svg, pos, [['A', 'B'], ['A', 'C'], ['A', 'D'], ['B', 'C'], ['C', 'E'], ['C', 'F'], ['E', 'F']], 20);
      g.msg1 = ['B', 'C', 'D'].map(id => ({ id, c: u.el(ctx.svg, 'circle', { r: 7, class: 'vz-dot tl' }) }));
      g.msg2 = ['E', 'F'].map(id => ({ id, c: u.el(ctx.svg, 'circle', { r: 7, class: 'vz-dot am' }) }));
      u.el(ctx.svg, 'line', { x1: 250, y1: 18, x2: 250, y2: 290, class: 'vz-grid' });
      const T = u.el(ctx.svg, 'g');
      g.tree = T;
      const lv = [[['A', 364]], [['B', 282], ['C', 370], ['D', 452]], [['A', 266, 0], ['C', 296, 0], ['A', 328, 1], ['B', 356, 1], ['E', 384, 1], ['F', 412, 1], ['A', 452, 2]]];
      const ys = [48, 140, 232];
      g.lvl = [];
      ['2층', '1층', '0층'].forEach((t, i) => u.el(T, 'text', { x: 262, y: ys[i] - 26, class: 'vz-ts' }, t));
      g.tedges = [[], [], []];
      lv[1].forEach(([id, x]) => { const l = u.el(T, 'line', { x1: 364, y1: ys[0] + 14, x2: x, y2: ys[1] - 14, class: 'vz-e' }); g.tedges[1].push(l); });
      lv[2].forEach(([id, x, par]) => { const l = u.el(T, 'line', { x1: lv[1][par][1], y1: ys[1] + 14, x2: x, y2: ys[2] - 11, class: 'vz-e' }); g.tedges[2].push(l); });
      lv.forEach((row, i) => { g.lvl.push(row.map(([id, x]) => u.node(T, x, ys[i], i === 2 ? 12 : 16, id))); });
      g.lvl[2].forEach(nd => { nd.t.setAttribute('class', 'vz-nt vz-ts'); nd.t.setAttribute('y', ys[2] + 4.5); });
      g.bars = [17, 26, 34].map((n, i) => {
        const y = 70 + i * 62;
        const l = u.el(ctx.svg, 'text', { x: 262, y: y + 17, class: 'vz-tb' }, (i + 1) + '층');
        const bg = u.el(ctx.svg, 'rect', { x: 300, y, width: 170, height: 24, rx: 3, class: 'vz-area' });
        const b = u.el(ctx.svg, 'rect', { x: 300, y, width: 0, height: 24, rx: 3, class: 'vz-bar' + (i === 2 ? ' cr' : '') });
        const t = u.el(ctx.svg, 'text', { x: 300, y: y + 44, class: 'vz-ts' }, n + ' / 34명');
        return { l, bg, b, t, n };
      });
      g.barTitle = u.el(ctx.svg, 'text', { x: 262, y: 40, class: 'vz-tb' }, '가라테 클럽 노드 0 이 보는 범위');
    },
    draw(ctx, s, k) {
      const g = ctx.g, pos = g.pos;
      const reach = s >= 2 ? 2 : s === 1 ? 1 : 0;
      Object.keys(pos).forEach(id => {
        const h = g.hop[id];
        const vis = h === 0 || (h === 1 && at(s, k, 1) > 0.5) || (h === 2 && at(s, k, 2) > 0.5);
        nodeCls(g.G.N[id], vis ? (h === 0 ? 'on' : h === 1 ? 'tl' : 'am') : (s >= 3 ? '' : 'dim'));
      });
      Object.keys(g.G.E).forEach(key => {
        const [a, b] = key.split('-');
        const hmax = Math.max(g.hop[a], g.hop[b]);
        const on = (hmax <= 1 && s >= 1 && reach >= 1 && (a === 'A' || b === 'A')) || (hmax === 2 && s >= 2 && (a === 'C' || b === 'C'));
        g.G.E[key].setAttribute('class', 'vz-e' + (on ? ' on' : ''));
      });
      g.msg1.forEach(m => { const o = s === 1 ? 1 - seg(k, 0.85, 1) : 0; const p = u.pt(pos[m.id], pos.A, seg(k, 0, 0.85)); u.set(m.c, { cx: p[0], cy: p[1] }); u.op(m.c, o); });
      g.msg2.forEach(m => {
        const o = s === 2 ? 1 - seg(k, 0.9, 1) : 0;
        const p = u.along([pos[m.id], pos.C, pos.A], seg(k, 0, 0.9));
        u.set(m.c, { cx: p[0], cy: p[1] }); u.op(m.c, o);
      });
      const tv = s >= 3 ? 1 - seg(at(s, k, 3), 0, 0.4) : 1;
      u.op(g.tree, tv);
      g.lvl[0].forEach(nd => nodeCls(nd, 'on'));
      g.lvl[1].forEach(nd => { u.op(nd.g, at(s, k, 1)); nodeCls(nd, 'tl'); });
      g.tedges[1].forEach(l => u.op(l, at(s, k, 1)));
      g.lvl[2].forEach(nd => { u.op(nd.g, at(s, k, 2)); nodeCls(nd, 'am'); });
      g.tedges[2].forEach(l => u.op(l, at(s, k, 2)));
      const bv = s >= 3 ? seg(at(s, k, 3), 0.35, 1) : 0;
      u.op(g.barTitle, bv);
      g.bars.forEach((b, i) => {
        [b.l, b.bg, b.t].forEach(x => u.op(x, bv));
        u.op(b.b, bv);
        u.set(b.b, { width: 170 * b.n / 34 * seg(bv, 0.2 + i * 0.25, 0.45 + i * 0.25) });
        b.b.setAttribute('class', 'vz-bar' + (s === 4 ? ' cr' : i === 2 ? ' cr' : ''));
      });
    },
  });

  /* ---------- 6. GCN 대칭 정규화 (w2-8) ---------- */
  V.add('gnn.gcnnorm', {
    title: 'D^-1/2 (A + I) D^-1/2 를 숫자로',
    w: 480, h: 300,
    states: [
      { cap: '경로 그래프 1-2-3 의 인접행렬 A 예요. 노드 2 만 친구가 둘이에요.' },
      { cap: 'A + I: 나 자신에게도 선을 그어요. 자기 루프라서 대각선 칸이 1 이 돼요.' },
      { cap: '가로줄을 더하면 차수 d = (2, 3, 2) 예요. 자기 루프까지 세요.' },
      { cap: '선 칸은 두 차수를 곱해 제곱근으로 나눠요. 1 ÷ √(2 × 3) ≈ 0.41.' },
      { cap: '대각선 칸은 1 ÷ d: 0.5, 0.33, 0.5. 이렇게 만든 표가 정규화 인접행렬 Â 예요.' },
      { cap: '노드 1 에만 값 1 을 넣고 한 층 돌리면 (0.5, 0.41, 0) 이에요. 친구가 많은 노드 2 는 나눠서 받아요.' },
    ],
    build(ctx) {
      const g = ctx.g = {};
      const pos = g.pos = { 1: [45, 165], 2: [140, 165], 3: [235, 165] };
      g.loops = {}; g.loopT = {}; g.deg = {}; g.val = {};
      Object.keys(pos).forEach(id => {
        g.loops[id] = u.el(ctx.svg, 'circle', { cx: pos[id][0], cy: pos[id][1] - 34, r: 15, class: 'vz-e on' });
        g.loopT[id] = u.el(ctx.svg, 'text', { x: pos[id][0], y: pos[id][1] - 58, 'text-anchor': 'middle', class: 'vz-ta' }, '');
        g.deg[id] = u.el(ctx.svg, 'text', { x: pos[id][0], y: pos[id][1] + 46, 'text-anchor': 'middle', class: 'vz-tm' }, '');
        g.val[id] = u.el(ctx.svg, 'text', { x: pos[id][0], y: pos[id][1] + 88, 'text-anchor': 'middle', class: 'vz-tb' }, '');
      });
      g.G = graph(ctx.svg, pos, [[1, 2], [2, 3]], 20);
      g.eT = [u.el(ctx.svg, 'text', { x: 92, y: 152, 'text-anchor': 'middle', class: 'vz-ta' }, ''), u.el(ctx.svg, 'text', { x: 188, y: 152, 'text-anchor': 'middle', class: 'vz-ta' }, '')];
      g.flow = [u.el(ctx.svg, 'circle', { r: 8, class: 'vz-dot cr' }), u.el(ctx.svg, 'circle', { r: 8, class: 'vz-dot cr' })];
      const x0 = 290, y0 = 78, c = 52;
      g.title = u.el(ctx.svg, 'text', { x: x0 + 1.5 * c, y: 30, 'text-anchor': 'middle', class: 'vz-tb' }, '');
      g.cells = {};
      for (let i = 1; i <= 3; i++) {
        u.el(ctx.svg, 'text', { x: x0 + (i - 0.5) * c, y: y0 - 10, 'text-anchor': 'middle', class: 'vz-ts' }, String(i));
        u.el(ctx.svg, 'text', { x: x0 - 12, y: y0 + (i - 0.5) * c + 5, 'text-anchor': 'middle', class: 'vz-ts' }, String(i));
        for (let j = 1; j <= 3; j++) {
          const r = u.el(ctx.svg, 'rect', { x: x0 + (j - 1) * c + 2, y: y0 + (i - 1) * c + 2, width: c - 4, height: c - 4, rx: 4, class: 'vz-box' });
          const t = u.el(ctx.svg, 'text', { x: x0 + (j - 0.5) * c, y: y0 + (i - 0.5) * c + 6, 'text-anchor': 'middle', class: 'vz-tb' }, '');
          g.cells[i + ',' + j] = { r, t };
        }
      }
      g.dcol = [1, 2, 3].map(i => u.el(ctx.svg, 'text', { x: x0 + 3 * c + 16, y: y0 + (i - 0.5) * c + 6, 'text-anchor': 'middle', class: 'vz-ta' }, ''));
      g.dh = u.el(ctx.svg, 'text', { x: x0 + 3 * c + 16, y: y0 - 10, 'text-anchor': 'middle', class: 'vz-ts' }, 'd');
    },
    draw(ctx, s, k) {
      const g = ctx.g, pos = g.pos;
      const d = { 1: 2, 2: 3, 3: 2 };
      const A = (i, j) => Math.abs(i - j) === 1 ? 1 : 0;
      const pl = at(s, k, 1), pd = at(s, k, 2), pe = at(s, k, 3), pg = at(s, k, 4), px = at(s, k, 5);
      u.txt(g.title, s === 0 ? 'A' : s <= 2 ? 'A + I' : s === 3 ? '선 칸 정규화' : 'Â');
      Object.keys(g.cells).forEach(key => {
        const [i, j] = key.split(',').map(Number), c = g.cells[key];
        let v, cls = '';
        if (i === j) {
          v = pg >= 0.5 ? num(1 / d[i]) : pl >= 0.5 ? '1' : '0';
          if ((s === 1 && pl >= 0.5) || (s === 4 && pg >= 0.5)) cls = ' on';
        } else if (A(i, j)) {
          v = pe >= 0.5 ? num(1 / Math.sqrt(d[i] * d[j])) : '1';
          if (s === 3 && pe >= 0.5) cls = ' on';
        } else v = '0';
        if (s === 2 && pd > 0.3 && (i === j || A(i, j))) cls = ' tl';
        if (s === 5 && j === 1) cls = ' am';
        u.txt(c.t, v); c.r.setAttribute('class', 'vz-box' + cls);
      });
      g.dcol.forEach((t, i) => { u.txt(t, d[i + 1]); u.op(t, s >= 2 ? pd : 0); });
      u.op(g.dh, s >= 2 ? pd : 0);
      Object.keys(pos).forEach(id => {
        u.op(g.loops[id], seg(pl, 0, 0.7));
        u.txt(g.loopT[id], num(1 / d[id])); u.op(g.loopT[id], pg);
        u.txt(g.deg[id], 'd = ' + d[id]); u.op(g.deg[id], pd);
        const before = id === '1' ? 1 : 0, after = { 1: 0.5, 2: 0.41, 3: 0 }[id];
        u.txt(g.val[id], px >= 0.75 ? before + ' → ' + after : 'x = ' + before); u.op(g.val[id], seg(px, 0, 0.3));
        nodeCls(g.G.N[id], s === 5 ? (id === '1' ? 'cr' : id === '2' ? 'am' : '') : s === 2 && id === '2' ? 'tl' : '');
      });
      g.eT.forEach(t => { u.txt(t, '0.41'); u.op(t, pe); });
      const fl = [[pos[1], [pos[1][0], pos[1][1] - 34]], [pos[1], pos[2]]];
      g.flow.forEach((c, i) => {
        const p = u.pt(fl[i][0], fl[i][1], seg(px, 0.2, 0.75));
        u.set(c, { cx: p[0], cy: p[1] }); u.op(c, s === 5 ? 1 - seg(px, 0.75, 0.95) : 0);
      });
    },
  });

  /* ---------- 7. 과평활화 (w2-5 의 수용 영역 뒤, L2 p.31 기출) ---------- */
  function smooth() {
    const n = 8;
    const E = [[0, 1], [0, 2], [1, 3], [2, 3], [0, 3], [4, 5], [4, 6], [5, 7], [6, 7], [4, 7], [3, 4]];
    const nb = Array.from({ length: n }, (_, i) => [i]);
    E.forEach(([a, b]) => { nb[a].push(b); nb[b].push(a); });
    const H = [[1, 0.9, 0.8, 1, 0, 0.1, 0.2, 0]];
    for (let L = 1; L <= 30; L++) { const h = H[L - 1]; H.push(nb.map(list => list.reduce((s, j) => s + h[j], 0) / list.length)); }
    return { E, H };
  }
  const SM = smooth();
  const spread = h => Math.max.apply(null, h) - Math.min.apply(null, h);
  function smoothAt(L) { const a = Math.floor(L), b = Math.min(30, a + 1), t = L - a; return SM.H[a].map((x, i) => x + (SM.H[b][i] - x) * t); }
  const mix = (v) => { const A = [159, 227, 213], B = [255, 179, 189]; return 'rgb(' + A.map((x, i) => Math.round(B[i] + (x - B[i]) * v)).join(',') + ')'; };
  V.add('gnn.oversmooth', {
    title: '층을 쌓을수록 비슷해지는 값',
    w: 480, h: 300,
    dur: 1400,
    params: { L: 0 },
    controls: [{ key: 'L', type: 'range', label: '층 수', min: 0, max: 30, step: 1, fmt: v => v + '층' }],
    states: [
      { set: { L: 0 }, cap: '0층: 왼쪽 무리는 1 근처, 오른쪽 무리는 0 근처예요. 두 무리가 한눈에 갈려요.' },
      { set: { L: 1 }, cap: '1층: 나와 이웃의 평균으로 값을 바꿔요. 다리로 이어진 두 노드가 먼저 섞여요.' },
      { set: { L: 2 }, cap: '2층: 섞인 값이 무리 안쪽으로 번져요.' },
      { set: { L: 4 }, cap: '4층: 두 무리의 차이가 눈에 띄게 줄었어요.' },
      { set: { L: 8 }, cap: '8층: 오른쪽 그래프의 차이 선이 바닥으로 내려가요.' },
      { set: { L: 30 }, cap: '30층: 모든 노드가 거의 같은 값이에요. 노드끼리 구별이 안 되는 과평활화(Over-smoothing)예요.' },
    ],
    build(ctx) {
      const g = ctx.g = {};
      g.pos = [[40, 60], [120, 42], [38, 150], [118, 138], [160, 195], [236, 178], [168, 270], [244, 258]];
      const ge = u.el(ctx.svg, 'g');
      SM.E.forEach(([a, b]) => u.el(ge, 'line', { x1: g.pos[a][0], y1: g.pos[a][1], x2: g.pos[b][0], y2: g.pos[b][1], class: 'vz-e' + (a === 3 && b === 4 ? ' on' : '') }));
      g.nodes = g.pos.map(p => u.node(ctx.svg, p[0], p[1], 21, ''));
      g.nodes.forEach(nd => { nd.t.setAttribute('class', 'vz-nt vz-ts'); nd.t.style.fill = '#17182C'; });
      const X0 = 300, X1 = 468, Y0 = 60, Y1 = 230;
      g.ch = { X0, X1, Y0, Y1 };
      u.el(ctx.svg, 'text', { x: X0 - 14, y: 34, class: 'vz-tb' }, '값의 차이 (최대 - 최소)');
      u.el(ctx.svg, 'path', { d: 'M' + X0 + ' ' + Y0 + ' V' + Y1 + ' H' + X1, class: 'vz-axis' });
      u.el(ctx.svg, 'text', { x: X0, y: Y1 + 20, 'text-anchor': 'middle', class: 'vz-ts' }, '0');
      u.el(ctx.svg, 'text', { x: X1, y: Y1 + 20, 'text-anchor': 'middle', class: 'vz-ts' }, '30층');
      u.el(ctx.svg, 'text', { x: X0 - 8, y: Y0 + 5, 'text-anchor': 'end', class: 'vz-ts' }, '1');
      const pts = SM.H.map((h, L) => [X0 + (X1 - X0) * L / 30, Y1 - (Y1 - Y0) * spread(h)]);
      u.el(ctx.svg, 'path', { d: 'M' + pts.map(p => u.r(p[0]) + ' ' + u.r(p[1])).join(' L'), class: 'vz-curve' });
      g.mark = u.el(ctx.svg, 'circle', { r: 8, class: 'vz-dot cr' });
      g.mt = u.el(ctx.svg, 'text', { x: X0 + 70, y: Y1 + 52, 'text-anchor': 'middle', class: 'vz-tb' }, '');
    },
    draw(ctx, s, k) {
      const g = ctx.g, P = ctx.p;
      let L = P.L;
      if (s > 0 && k < 1) {
        const prevL = [0, 1, 2, 4, 8, 30][s - 1];
        L = u.lerp(prevL, P.L, u.ease(k));
      }
      const h = smoothAt(L);
      g.nodes.forEach((nd, i) => { nd.c.style.fill = mix(h[i]); u.txt(nd.t, num(h[i])); });
      const c = g.ch, sp = spread(h);
      u.set(g.mark, { cx: c.X0 + (c.X1 - c.X0) * L / 30, cy: c.Y1 - (c.Y1 - c.Y0) * sp });
      u.txt(g.mt, Math.round(L) + '층, 차이 ' + num(sp));
    },
  });

  /* ---------- 8. WL 색 정제 (w3-7, w3-10) ---------- */
  const WL = {
    p48: {
      caps: ['라운드 0: 모든 노드가 같은 색 1 이에요. 두 그래프 모두 노드 6개, 엣지 7개라 개수로는 못 가려요.',
        '라운드 1: (내 색, 친구 색 봉투)마다 새 번호를 줘요. 색 번호가 친구 수를 다시 적은 셈이라 색별 개수가 같아요.',
        '라운드 2: 친구들의 새 색까지 보면 G1 은 {7:2, 8:1, 11:2, 12:1}, G2 는 여섯 색이 하나씩이에요.',
        '색별 개수가 달라졌어요. 그래서 두 그래프는 동형이 아니에요.'],
      g: [
        { pos: { A: [80, 40], B: [30, 120], C: [150, 95], D: [95, 150], E: [205, 40], F: [205, 150] }, E: [['A', 'B'], ['A', 'C'], ['A', 'D'], ['B', 'D'], ['C', 'D'], ['C', 'E'], ['C', 'F']],
          col: [{ A: 1, B: 1, C: 1, D: 1, E: 1, F: 1 }, { A: 4, B: 3, C: 5, D: 4, E: 2, F: 2 }, { A: 11, B: 8, C: 12, D: 11, E: 7, F: 7 }], sig: ['', 'C: 1,{1,1,1,1} → 5', 'C: 5,{2,2,4,4} → 12'] },
        { pos: { A: [25, 95], B: [85, 35], C: [85, 150], D: [155, 90], E: [165, 160], F: [210, 40] }, E: [['A', 'B'], ['A', 'C'], ['B', 'C'], ['B', 'D'], ['C', 'D'], ['C', 'E'], ['D', 'F']],
          col: [{ A: 1, B: 1, C: 1, D: 1, E: 1, F: 1 }, { A: 3, B: 4, C: 5, D: 4, E: 2, F: 2 }, { A: 9, B: 11, C: 13, D: 10, E: 7, F: 6 }], sig: ['', 'C: 1,{1,1,1,1} → 5', 'C: 5,{2,3,4,4} → 13'] },
      ],
      differ: 2,
    },
    c6: {
      caps: ['라운드 0: 왼쪽은 삼각형 둘, 오른쪽은 육각형 하나예요. 노드 6개, 엣지 6개로 개수가 같아요.',
        '라운드 1: 모든 노드가 친구 2명이라 다 같이 색 2 가 돼요.',
        '라운드 2: 친구 색도 모두 2 라서 또 다 같이 색 3 이에요.',
        '라운드를 더 돌려도 계속 같아요. 삼각형이 있고 없고의 차이를 1-WL 은 못 봐요.'],
      g: [
        { pos: { A: [45, 45], B: [15, 110], C: [80, 110], D: [150, 60], E: [120, 125], F: [185, 125] }, E: [['A', 'B'], ['B', 'C'], ['A', 'C'], ['D', 'E'], ['E', 'F'], ['D', 'F']],
          col: [{ A: 1, B: 1, C: 1, D: 1, E: 1, F: 1 }, { A: 2, B: 2, C: 2, D: 2, E: 2, F: 2 }, { A: 3, B: 3, C: 3, D: 3, E: 3, F: 3 }], sig: ['', 'A: 1,{1,1} → 2', 'A: 2,{2,2} → 3'] },
        { pos: { A: [110, 25], B: [180, 60], C: [180, 130], D: [110, 165], E: [40, 130], F: [40, 60] }, E: [['A', 'B'], ['B', 'C'], ['C', 'D'], ['D', 'E'], ['E', 'F'], ['F', 'A']],
          col: [{ A: 1, B: 1, C: 1, D: 1, E: 1, F: 1 }, { A: 2, B: 2, C: 2, D: 2, E: 2, F: 2 }, { A: 3, B: 3, C: 3, D: 3, E: 3, F: 3 }], sig: ['', 'A: 1,{1,1} → 2', 'A: 2,{2,2} → 3'] },
      ],
      differ: 0,
    },
  };
  const histo = col => { const h = {}; Object.values(col).forEach(c => { h[c] = (h[c] || 0) + 1; }); return Object.keys(h).map(Number).sort((a, b) => a - b).map(c => [c, h[c]]); };
  V.add('gnn.wl', {
    title: 'WL 색 정제',
    w: 480, h: 340,
    dur: 1300,
    params: { pair: 'p48' },
    capsDependOn: true,
    controls: [{ key: 'pair', type: 'choice', label: '예제', options: [['p48', 'p.48 두 그래프'], ['c6', '삼각형 둘 대 육각형']] }],
    states: P => WL[P.pair].caps.map(c => ({ cap: c })),
    build(ctx) {
      const g = ctx.g = { sets: {} };
      u.el(ctx.svg, 'text', { x: 120, y: 18, 'text-anchor': 'middle', class: 'vz-tb' }, 'G1');
      u.el(ctx.svg, 'text', { x: 360, y: 18, 'text-anchor': 'middle', class: 'vz-tb' }, 'G2');
      u.el(ctx.svg, 'line', { x1: 240, y1: 12, x2: 240, y2: 336, class: 'vz-grid' });
      Object.keys(WL).forEach(key => {
        const root = u.el(ctx.svg, 'g');
        g.sets[key] = { root, gs: WL[key].g.map((G, gi) => {
          const ox = gi === 0 ? 10 : 250, oy = 26;
          const pos = {}; Object.keys(G.pos).forEach(id => { pos[id] = [G.pos[id][0] + ox, G.pos[id][1] + oy]; });
          const gr = graph(root, pos, G.E, 17, () => '');
          const sig = u.el(root, 'text', { x: ox + 110, y: 222, 'text-anchor': 'middle', class: 'vz-tm' }, '');
          const bars = [0, 1, 2, 3, 4, 5].map(i => ({
            r: u.el(root, 'rect', { x: ox + 12 + i * 36, width: 26, rx: 3, class: 'vz-bar' }),
            n: u.el(root, 'text', { x: ox + 25 + i * 36, 'text-anchor': 'middle', class: 'vz-ts' }, ''),
            c: u.el(root, 'text', { x: ox + 25 + i * 36, y: 334, 'text-anchor': 'middle', class: 'vz-ts' }, ''),
          }));
          return { G, gr, sig, bars };
        }) };
      });
      g.verdict = u.el(ctx.svg, 'text', { x: 240, y: 264, 'text-anchor': 'middle', class: 'vz-tb' }, '');
      g.vbg = u.el(ctx.svg, 'rect', { x: 206, y: 246, width: 68, height: 26, rx: 5, class: 'vz-box' });
      ctx.svg.appendChild(g.verdict);
    },
    draw(ctx, s, k) {
      const g = ctx.g, P = ctx.p;
      Object.keys(g.sets).forEach(key => {
        const on = key === P.pair;
        u.op(g.sets[key].root, on ? 1 : 0);
        if (!on) return;
        const round = Math.min(s, 2);
        const shown = s >= 1 && s <= 2 && k < 0.5 ? round - 1 : round;
        g.sets[key].gs.forEach(x => {
          const col = x.G.col[shown];
          Object.keys(x.gr.N).forEach(id => {
            const c = col[id];
            x.gr.N[id].g.setAttribute('class', 'vz-node vz-k' + ((c - 1) % 10));
            u.txt(x.gr.N[id].t, c);
          });
          const sigOn = s === 1 || s === 2;
          u.txt(x.sig, sigOn ? x.G.sig[s] : '');
          u.op(x.sig, sigOn ? seg(k, 0, 0.25) : 0);
          const hs = histo(col), grow = s >= 1 && s <= 2 ? seg(k, 0.5, 1) : 1;
          x.bars.forEach((b, i) => {
            const e = hs[i];
            const hgt = e ? e[1] * 15 * grow : 0;
            u.set(b.r, { y: 318 - hgt, height: hgt });
            b.r.setAttribute('class', 'vz-bar' + (e ? ' vz-k' + ((e[0] - 1) % 10) : ''));
            u.txt(b.n, e ? e[1] : ''); u.set(b.n, { y: 314 - hgt });
            u.txt(b.c, e ? e[0] : '');
            [b.r, b.n, b.c].forEach(z => u.op(z, e ? 1 : 0));
          });
        });
      });
      const W = WL[P.pair];
      const round = Math.min(s, 2), settled = !(s >= 1 && s <= 2 && k < 0.95);
      const differ = W.differ && round >= W.differ && settled;
      u.txt(g.verdict, differ ? '달라요' : '같아요');
      g.vbg.setAttribute('class', 'vz-box' + (differ ? ' cr' : ' ok'));
      const vo = settled ? 1 : 0;
      u.op(g.verdict, vo); u.op(g.vbg, vo);
    },
  });

  /* ---------- 9. 합, 평균, 최대 봉투 (w3-5, wb-10) ---------- */
  V.add('gnn.gin', {
    title: '같은 봉투, 세 가지 요약',
    w: 480, h: 300,
    states: [
      { cap: '쪽지 a 에는 1, b 에는 3 이 적혀 있어요. 봉투 세 개에 나눠 담아요.' },
      { cap: '봉투 속 쪽지는 {a, b}, {a, a, b, b}, {a, b, b} 예요. 셋은 서로 다른 멀티셋이에요.' },
      { tag: '합', cap: '4, 8, 7. 셋이 다 달라요. 몇 장인지까지 남아서예요.' },
      { tag: '평균', cap: '2, 2, 2.33. 앞의 두 봉투가 같아져요. 비율만 남고 장 수는 사라져요.' },
      { tag: '최대', cap: '3, 3, 3. 셋 다 같아요. 무엇이 들어 있는지만 남아요.' },
      { cap: '구별하는 힘은 합 > 평균 > 최대 순서예요. 그래서 GIN 은 이웃을 합으로 모아요.' },
    ],
    build(ctx) {
      const g = ctx.g = {};
      g.env = [['a', 'b'], ['a', 'a', 'b', 'b'], ['a', 'b', 'b']];
      g.cx = [170, 290, 410];
      g.chips = [];
      g.env.forEach((items, e) => {
        u.el(ctx.svg, 'rect', { x: g.cx[e] - 55, y: 30, width: 110, height: 88, rx: 8, class: 'vz-box' });
        u.el(ctx.svg, 'text', { x: g.cx[e], y: 22, 'text-anchor': 'middle', class: 'vz-ts' }, '봉투 ' + (e + 1));
        items.forEach((it, i) => {
          const col = i % 2, row = Math.floor(i / 2);
          const tx = g.cx[e] - 22 + col * 44, ty = 55 + row * 40;
          const gg = u.el(ctx.svg, 'g');
          const c = u.el(gg, 'circle', { r: 16, class: 'vz-dot ' + (it === 'a' ? 'tl' : 'cr') });
          const t = u.el(gg, 'text', { 'text-anchor': 'middle', class: 'vz-tb' }, it === 'a' ? '1' : '3');
          t.style.fill = '#fff';
          g.chips.push({ gg, c, t, tx, ty, e, i });
        });
      });
      g.rows = ['합', '평균', '최대'].map((name, r) => {
        const y = 160 + r * 48;
        const box = u.el(ctx.svg, 'rect', { x: 12, y: y - 26, width: 458, height: 40, rx: 6, class: 'vz-box' });
        const lab = u.el(ctx.svg, 'text', { x: 26, y: y - 3, class: 'vz-tb' }, name);
        const vals = g.cx.map(x => u.el(ctx.svg, 'text', { x, y, 'text-anchor': 'middle', class: 'vz-tb' }, ''));
        const same = u.el(ctx.svg, 'text', { x: 26, y: y + 13, class: 'vz-tc' }, '');
        same.style.fontSize = '12px';
        return { box, lab, vals, same, y };
      });
      g.rank = u.el(ctx.svg, 'text', { x: 240, y: 294, 'text-anchor': 'middle', class: 'vz-ta' }, '합 > 평균 > 최대');
    },
    draw(ctx, s, k) {
      const g = ctx.g;
      g.chips.forEach(ch => {
        const drop = at(s, k, 1);
        const d = seg(drop, ch.e * 0.2 + ch.i * 0.04, ch.e * 0.2 + ch.i * 0.04 + 0.45);
        const y = u.lerp(-20, ch.ty, d);
        u.set(ch.c, { cx: ch.tx, cy: y }); u.set(ch.t, { x: ch.tx, y: y + 6 }); u.op(ch.gg, s === 0 ? 0 : seg(drop, ch.e * 0.2, ch.e * 0.2 + 0.1));
      });
      const V3 = [['4', '8', '7'], ['2', '2', '2.33'], ['3', '3', '3']];
      const SAME = ['다 달라요', '1, 2 같음', '셋 다 같음'];
      g.rows.forEach((r, i) => {
        const p = at(s, k, i + 2);
        r.vals.forEach((t, j) => { u.txt(t, V3[i][j]); u.op(t, seg(p, j * 0.2, j * 0.2 + 0.3)); });
        u.txt(r.same, SAME[i]); u.op(r.same, seg(p, 0.7, 1));
        r.same.setAttribute('class', i === 0 ? 'vz-tok' : 'vz-tc');
        const hot = s === i + 2 || (s === 5 && i === 0);
        r.box.setAttribute('class', 'vz-box' + (hot ? (i === 0 ? ' ok' : ' cr') : ''));
        u.op(r.lab, s >= i + 2 ? 1 : 0.45);
      });
      u.op(g.rank, at(s, k, 5));
    },
  });

  /* ---------- 10. 학습 루프: 예측, 손실, 기울기, 고치기 (wb-8, wc-11) ---------- */
  function trainSeq(lr) {
    const out = [];
    let w = 1;
    for (let i = 0; i < 8; i++) {
      const pred = 2 * w, loss = (pred - 6) * (pred - 6), grad = 2 * (pred - 6) * 2, nw = w - lr * grad;
      out.push({ w, pred, loss, grad, nw });
      w = nw;
    }
    return out;
  }
  V.add('gnn.train', {
    title: '학습 루프 한 바퀴',
    w: 480, h: 300,
    dur: 1200,
    params: { lr: 0.1 },
    capsDependOn: true,
    controls: [{ key: 'lr', type: 'choice', label: '학습률', options: [[0.01, '0.01'], [0.1, '0.1'], [0.5, '0.5']] }],
    states(P) {
      const q = trainSeq(P.lr), a = q[0], b = q[1];
      const up = b.loss > a.loss;
      return [
        { cap: '처음 w = 1 이에요. 입력 x = 2, 정답 y = 6, 학습률 ' + P.lr + ' 로 시작해요.' },
        { tag: '예측', cap: 'w × x = 1 × 2 = 2. 모델이 2 라고 답했어요.' },
        { tag: '손실', cap: '(2 - 6) 의 제곱 = 16. 정답과 멀수록 손실이 커요.' },
        { tag: '기울기', cap: '2 × (2 - 6) × 2 = -16. 음수라서 w 를 키우면 손실이 줄어요.' },
        { tag: '고치기', cap: 'w = 1 - ' + P.lr + ' × (-16) = ' + num(a.nw) + '. 손실은 ' + num(b.loss) + (up ? ', 오히려 커졌어요. 걸음이 너무 커서 반대편으로 튕겼어요.' : ' 로 줄었어요.') },
        { tag: '두 바퀴째', cap: '예측 ' + num(b.pred) + ', 손실 ' + num(b.loss) + ', 기울기 ' + num(b.grad) + ', 새 w = ' + num(b.nw) + '.' },
        { cap: up ? '학습률이 크면 바닥을 건너뛰며 점점 멀어져요. 걸음 크기를 줄여야 해요.' : '네 단계를 계속 돌면 w 가 바닥 3 에 다가가요. 이 반복이 학습 루프예요.' },
      ];
    },
    build(ctx) {
      const g = ctx.g = {};
      const B = g.B = [['예측', 120, 58], ['손실', 200, 150], ['기울기', 120, 242], ['고치기', 40, 150]];
      g.cyc = u.el(ctx.svg, 'path', { d: 'M120 88 L178 128 M190 176 L140 222 M100 222 L52 176 M60 128 L100 88', class: 'vz-e' });
      g.boxes = B.map(([name, x, y]) => {
        const r = u.el(ctx.svg, 'rect', { x: x - 38, y: y - 24, width: 76, height: 48, rx: 8, class: 'vz-box' });
        u.el(ctx.svg, 'text', { x, y: y - 4, 'text-anchor': 'middle', class: 'vz-tb' }, name);
        const v = u.el(ctx.svg, 'text', { x, y: y + 16, 'text-anchor': 'middle', class: 'vz-ts' }, '');
        return { r, v };
      });
      g.dot = u.el(ctx.svg, 'circle', { r: 7, class: 'vz-dot cr' });
      g.wT = u.el(ctx.svg, 'text', { x: 120, y: 156, 'text-anchor': 'middle', class: 'vz-ta' }, '');
      const X0 = 262, X1 = 470, Y0 = 30, Y1 = 250, wmin = -1, wmax = 9.5, Lmax = 150;
      g.sx = w => X0 + (X1 - X0) * (w - wmin) / (wmax - wmin);
      g.sy = L => Y1 - (Y1 - Y0) * Math.min(L, Lmax) / Lmax;
      u.el(ctx.svg, 'path', { d: 'M' + X0 + ' ' + Y0 + ' V' + Y1 + ' H' + X1, class: 'vz-axis' });
      const pts = []; for (let w = wmin; w <= wmax + 1e-9; w += 0.1) { const L = (2 * w - 6) * (2 * w - 6); if (L <= Lmax) pts.push([g.sx(w), g.sy(L)]); }
      u.el(ctx.svg, 'path', { d: 'M' + pts.map(p => u.r(p[0]) + ' ' + u.r(p[1])).join(' L'), class: 'vz-curve mu' });
      u.el(ctx.svg, 'text', { x: X1, y: Y1 + 18, 'text-anchor': 'end', class: 'vz-ts' }, 'w');
      u.el(ctx.svg, 'text', { x: X0 + 6, y: Y0 + 4, class: 'vz-ts' }, '손실');
      u.el(ctx.svg, 'text', { x: g.sx(3), y: Y1 + 18, 'text-anchor': 'middle', class: 'vz-ts' }, '3');
      g.tan = u.el(ctx.svg, 'line', { class: 'vz-e cr' });
      g.trail = [0, 1, 2, 3, 4, 5, 6].map(() => u.el(ctx.svg, 'circle', { r: 3.5, class: 'vz-dot am' }));
      g.ball = u.el(ctx.svg, 'circle', { r: 9, class: 'vz-dot cr' });
      g.out = u.el(ctx.svg, 'text', { x: 366, y: 290, 'text-anchor': 'middle', class: 'vz-tb' }, '');
    },
    draw(ctx, s, k) {
      const g = ctx.g, q = trainSeq(ctx.p.lr);
      const hot = s >= 1 && s <= 4 ? s - 1 : s === 5 ? Math.min(3, Math.floor(k * 4)) : -1;
      g.boxes.forEach((b, i) => b.r.setAttribute('class', 'vz-box' + (i === hot ? (i === 3 ? ' tl' : ' on') : '')));
      const it = s >= 5 ? 1 : 0, a = q[it];
      const vals = [num(a.pred), num(a.loss), num(a.grad), num(a.nw)];
      const shownUpTo = s === 5 ? Math.floor(k * 4) : s >= 6 ? 3 : s - 1;
      g.boxes.forEach((b, i) => { u.txt(b.v, i <= shownUpTo ? vals[i] : ''); });
      const cy = [[120, 88], [178, 128], [190, 176], [140, 222], [100, 222], [52, 176], [60, 128], [100, 88]];
      let dp = null;
      if (s >= 1 && s <= 4) { const i0 = s - 1; dp = u.pt(cy[(2 * i0 + 6) % 8], cy[(2 * i0 + 7) % 8], seg(k, 0, 0.5)); }
      if (s === 5) dp = u.along(cy.concat([cy[0]]), k);
      u.set(g.dot, { cx: (dp || cy[0])[0], cy: (dp || cy[0])[1] }); u.op(g.dot, dp ? 1 : 0);
      let w = q[0].w;
      if (s === 4) w = u.lerp(q[0].w, q[0].nw, seg(k, 0.3, 1));
      else if (s === 5) w = u.lerp(q[1].w, q[1].nw, seg(k, 0.75, 1));
      else if (s >= 6) { const t = k * 5, i = Math.min(4, Math.floor(t)); w = s > 6 ? q[6].w : u.lerp(q[i + 1].w, q[i + 1].nw, u.ease(t - i)); }
      const wc = u.clamp(w, -1, 9.5), L = (2 * w - 6) * (2 * w - 6);
      u.set(g.ball, { cx: g.sx(wc), cy: g.sy(L) });
      u.txt(g.wT, 'w = ' + num(w));
      const tanOn = s === 3 ? seg(k, 0.2, 0.7) : 0;
      const w0 = q[0].w, L0 = q[0].loss, gr = q[0].grad;
      const pA = [g.sx(w0 - 0.9), g.sy(Math.max(0, L0 - gr * 0.9))], pB = [g.sx(w0 + 0.9), g.sy(Math.max(0, L0 + gr * 0.9))];
      u.set(g.tan, { x1: pA[0], y1: pA[1], x2: pB[0], y2: pB[1] }); u.op(g.tan, tanOn);
      const visited = s >= 6 ? 6 : s >= 5 ? 2 : s >= 4 ? 1 : 0;
      g.trail.forEach((c, i) => {
        const on = i < visited && (s < 6 || i <= Math.floor(k * 5) + 1);
        const ww = u.clamp(q[i].w, -1, 9.5);
        u.set(c, { cx: g.sx(ww), cy: g.sy((2 * q[i].w - 6) * (2 * q[i].w - 6)) }); u.op(c, on ? 1 : 0);
      });
      u.txt(g.out, 'w = ' + num(w) + ', 손실 ' + num(L) + (w < -1 || w > 9.5 ? ' (그림 밖)' : ''));
    },
  });
})();
