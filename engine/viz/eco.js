/* 움직이는 개념 그림: 친환경건축(건축환경) 묶음. 틀은 viz.js, 설명은 README.md
   숫자는 기초 다지기 정리 슬라이드(wb-1 ~ wb-10) 손계산에서 가져왔다. 강의에 없는 숫자는 캡션에 '가정'이라고 적는다. */
(function () {
  'use strict';
  const V = window.SDTViz;
  if (!V) return;
  const u = V.u;
  const at = u.at, seg = u.seg, num = u.num;

  function tag(parent, x, y, w, h, label, small) {
    const g = u.el(parent, 'g');
    const r = u.el(g, 'rect', { x: x - w / 2, y: y - h / 2, width: w, height: h, rx: 8, class: 'vz-box' });
    const t = u.el(g, 'text', { x, y: y + (small != null ? -2 : 5.5), 'text-anchor': 'middle', class: 'vz-tb' }, label);
    const s = u.el(g, 'text', { x, y: y + 15, 'text-anchor': 'middle', class: 'vz-ts' }, small || '');
    return { g, r, t, s };
  }
  const boxCls = (b, c) => b.r.setAttribute('class', 'vz-box' + (c ? ' ' + c : ''));
  /* 0~1 을 파랑(차가움)에서 빨강(따뜻함)으로 */
  const warm = v => { v = u.clamp(v, 0, 1); const A = [120, 170, 235], B = [235, 95, 80]; return 'rgb(' + A.map((a, i) => Math.round(a + (B[i] - a) * v)).join(',') + ')'; };
  const txtLines = (parent, x, y, n, dy, cls) => Array.from({ length: n }, (_, i) => u.el(parent, 'text', { x, y: y + i * dy, class: cls || 'vz-tb' }, ''));

  /* ---------- 1. 열이 옮겨 가는 세 가지 길 (wb-1) ---------- */
  V.add('eco.heat3', {
    title: '전도, 대류, 복사',
    w: 480, h: 300,
    live: true,
    dur: 1200,
    states: [
      { cap: '겨울, 실내 20℃ 실외 -5℃. 온도차 20 - (-5) = 25℃ 만큼 열이 벽을 지나 밖으로 새요.' },
      { tag: '전도', cap: '맞닿은 물체 사이로 직접 전해져요. 냄비 손잡이가 뜨거워지는 길이에요.' },
      { tag: '대류', cap: '공기나 물이 움직이며 열을 옮겨요. 난방기 주변 공기가 빙글 돌아요.' },
      { tag: '복사', cap: '매개체 없이 전자기파로 와요. 햇볕이나 난로 앞이 따뜻한 까닭이에요.' },
      { tag: '단열', cap: '단열재는 작은 기포에 공기를 가둬요. 공기가 못 움직이고 열전도율도 아주 작아 열이 잘 못 지나가요.' },
    ],
    build(ctx) {
      const g = ctx.g = {};
      // 위: 벽 단면
      u.el(ctx.svg, 'rect', { x: 10, y: 10, width: 200, height: 92, rx: 6, class: 'vz-area' });
      g.inT = u.el(ctx.svg, 'text', { x: 24, y: 34, class: 'vz-tb' }, '실내 20℃');
      u.el(ctx.svg, 'text', { x: 470, y: 34, 'text-anchor': 'end', class: 'vz-tb' }, '실외 -5℃');
      g.wall = u.el(ctx.svg, 'rect', { x: 215, y: 10, width: 50, height: 92, class: 'vz-wall' });
      g.heatDots = [0, 1, 2, 3, 4].map(i => u.el(ctx.svg, 'circle', { r: 5, class: 'vz-dot cr' }));
      g.dT = u.el(ctx.svg, 'text', { x: 330, y: 80, 'text-anchor': 'middle', class: 'vz-tc' }, '온도차 25℃');
      // 아래: 세 칸
      g.panels = ['전도', '대류', '복사'].map((t, i) => {
        const x = 10 + i * 157;
        return { r: u.el(ctx.svg, 'rect', { x, y: 116, width: 148, height: 176, rx: 8, class: 'vz-box' }), t: u.el(ctx.svg, 'text', { x: x + 74, y: 138, 'text-anchor': 'middle', class: 'vz-tb' }, t), x };
      });
      // 전도: 불 위의 막대
      const cx = 10;
      u.el(ctx.svg, 'path', { d: 'M' + (cx + 22) + ' 250 q8 -22 16 0 q8 -18 16 0', class: 'vz-curve cr' });
      g.rod = [0, 1, 2, 3, 4, 5, 6, 7].map(i => u.el(ctx.svg, 'rect', { x: cx + 30 + i * 13, y: 222, width: 13, height: 10 }));
      u.el(ctx.svg, 'text', { x: cx + 74, y: 280, 'text-anchor': 'middle', class: 'vz-ts' }, '맞닿아서 직접');
      // 대류: 방과 도는 공기
      const vx = 167;
      u.el(ctx.svg, 'rect', { x: vx + 14, y: 150, width: 120, height: 100, class: 'vz-e' });
      u.el(ctx.svg, 'rect', { x: vx + 20, y: 232, width: 30, height: 14, rx: 2, class: 'vz-bar cr' });
      g.air = [0, 1, 2, 3, 4, 5].map(() => u.el(ctx.svg, 'circle', { r: 5, class: 'vz-dot' }));
      u.el(ctx.svg, 'text', { x: vx + 74, y: 280, 'text-anchor': 'middle', class: 'vz-ts' }, '공기가 흘러서');
      // 복사: 해와 파동
      const rx = 324;
      g.sun = u.el(ctx.svg, 'circle', { cx: rx + 34, cy: 182, r: 18, class: 'vz-dot am' });
      g.rays = [0, 1, 2].map(() => u.el(ctx.svg, 'path', { class: 'vz-curve cr' }));
      u.el(ctx.svg, 'rect', { x: rx + 112, y: 150, width: 12, height: 100, class: 'vz-wall' });
      u.el(ctx.svg, 'text', { x: rx + 74, y: 280, 'text-anchor': 'middle', class: 'vz-ts' }, '전자기파로');
      // 단열재 기포
      g.foam = u.el(ctx.svg, 'g');
      u.el(g.foam, 'rect', { x: 215, y: 10, width: 50, height: 92, class: 'vz-box am' });
      for (let i = 0; i < 12; i++) u.el(g.foam, 'circle', { cx: 225 + (i % 3) * 15, cy: 22 + Math.floor(i / 3) * 22, r: 6, class: 'vz-e' });
    },
    draw(ctx, s, k) {
      const g = ctx.g, t = ctx.t || 0;
      const insul = at(s, k, 4);
      g.heatDots.forEach((d, i) => {
        const ph = ((t * 0.35 + i / 5) % 1);
        const x = 150 + ph * 290, slow = insul > 0.5 ? 0.35 : 1;
        u.set(d, { cx: 150 + ((t * 0.35 * slow + i / 5) % 1) * 290, cy: 60 + (i % 2) * 18 });
        u.op(d, (x > 200 && x < 470 ? 1 : 0.5) * (insul > 0.5 ? 0.5 : 1));
      });
      u.op(g.foam, insul);
      g.panels.forEach((p, i) => p.r.setAttribute('class', 'vz-box' + (s === i + 1 ? ' on' : '')));
      const cond = s === 1 ? k : s > 1 ? 1 : 0;
      g.rod.forEach((r, i) => { r.style.fill = warm(u.clamp(cond * 1.6 - i * 0.18, 0, 1)); });
      const conv = at(s, k, 2);
      g.air.forEach((d, i) => {
        const a = (i / 6 + (conv > 0 ? t * 0.25 : 0)) * Math.PI * 2;
        u.set(d, { cx: 241 + 44 * Math.cos(a), cy: 200 + 34 * Math.sin(a) });
        d.style.fill = warm(0.5 + 0.5 * Math.sin(a));
        u.op(d, 0.3 + 0.7 * conv);
      });
      const rad = at(s, k, 3);
      g.rays.forEach((p, i) => {
        const y = 170 + i * 12, L = 60 * rad;
        let d = '';
        for (let x = 0; x <= L; x += 3) d += (d ? ' L' : 'M') + u.r(376 + x) + ' ' + u.r(y + 4 * Math.sin(x / 5 - t * 6));
        u.set(p, { d: d || 'M376 ' + y }); u.op(p, rad > 0.02 ? 1 : 0);
      });
      u.op(g.dT, s === 0 ? 1 : 0.6);
    },
  });

  /* ---------- 2. 단열재 두께와 R, U, 열손실 (wb-2) ---------- */
  const LAM = 0.04, AREA = 20, DT = 25;
  V.add('eco.uvalue', {
    title: '두께가 두 배면 U값은 절반',
    w: 480, h: 300,
    live: true,
    params: { d: 0.1 },
    controls: [{ key: 'd', type: 'range', label: '단열재 두께', min: 0.05, max: 0.3, step: 0.05, fmt: v => num(v, 2) + ' m' }],
    states: [
      { set: { d: 0.1 }, cap: '단열재 두께 0.1 m, 열전도율 0.04 W/mK 예요. 표면 열전달저항은 빼고 봐요.' },
      { set: { d: 0.1 }, tag: 'R', cap: 'R = 두께 ÷ 열전도율 = 0.1 ÷ 0.04 = 2.5 m²K/W. 열이 지나가기 어려운 정도예요.' },
      { set: { d: 0.1 }, tag: 'U', cap: 'U = 1 ÷ R = 1 ÷ 2.5 = 0.4 W/m²K. 작을수록 열이 덜 새요.' },
      { set: { d: 0.1 }, tag: 'Q', cap: '벽 20 m², 온도차 25℃: Q = 0.4 × 20 × 25 = 200 W 가 새요.' },
      { set: { d: 0.2 }, cap: '두께를 0.2 m 로 두 배: R = 5, U = 0.2, Q = 100 W. 새는 열이 절반이에요.' },
    ],
    build(ctx) {
      const g = ctx.g = {};
      u.el(ctx.svg, 'rect', { x: 10, y: 20, width: 90, height: 230, rx: 6, class: 'vz-area' });
      u.el(ctx.svg, 'text', { x: 55, y: 44, 'text-anchor': 'middle', class: 'vz-tb' }, '실내');
      u.el(ctx.svg, 'text', { x: 55, y: 64, 'text-anchor': 'middle', class: 'vz-ts' }, '20℃');
      g.conc = u.el(ctx.svg, 'rect', { x: 100, y: 20, width: 30, height: 230, class: 'vz-wall' });
      g.ins = u.el(ctx.svg, 'rect', { x: 130, y: 20, height: 230, class: 'vz-box am' });
      g.insT = u.el(ctx.svg, 'text', { y: 140, 'text-anchor': 'middle', class: 'vz-tb' }, '');
      g.outx = u.el(ctx.svg, 'text', { y: 44, 'text-anchor': 'middle', class: 'vz-tb' }, '실외');
      g.outt = u.el(ctx.svg, 'text', { y: 64, 'text-anchor': 'middle', class: 'vz-ts' }, '-5℃');
      g.arrows = [0, 1, 2, 3, 4, 5].map(() => u.arrow(ctx.svg, 'cr'));
      g.dim = u.el(ctx.svg, 'text', { y: 272, 'text-anchor': 'middle', class: 'vz-ta' }, '');
      u.el(ctx.svg, 'rect', { x: 318, y: 20, width: 154, height: 230, rx: 8, class: 'vz-box' });
      g.lines = txtLines(ctx.svg, 330, 50, 8, 26, 'vz-tb');
      g.lines.forEach((l, i) => l.setAttribute('class', i % 2 ? 'vz-tb' : 'vz-ts'));
      g.qbar = u.el(ctx.svg, 'rect', { x: 330, y: 262, height: 16, rx: 3, class: 'vz-bar cr' });
      u.el(ctx.svg, 'text', { x: 330, y: 294, class: 'vz-ts' }, '새는 열 (200 W 기준 막대)');
    },
    draw(ctx, s, k) {
      const g = ctx.g, t = ctx.t || 0;
      let d = ctx.p.d;
      if (s === 4 && k < 1) d = u.lerp(0.1, 0.2, u.ease(k));
      const R = d / LAM, U = 1 / R, Q = U * AREA * DT;
      const wpx = 30 + d * 400;
      u.set(g.ins, { width: wpx });
      u.set(g.insT, { x: 130 + wpx / 2 }); u.txt(g.insT, num(d, 2) + ' m');
      const ox = 130 + wpx;
      u.set(g.outx, { x: Math.min(300, ox + 30) }); u.set(g.outt, { x: Math.min(300, ox + 30) });
      u.set(g.dim, { x: 130 + wpx / 2 }); u.txt(g.dim, '두께 ' + num(d, 2) + ' m');
      const nArr = Math.max(1, Math.round(Q / 40));
      g.arrows.forEach((a, i) => {
        const on = i < nArr;
        const ph = (t * 0.5 + i * 0.17) % 1;
        const y = 90 + i * 26;
        u.setArrow(a, [60, y], [60 + (ox + 40 - 60) * (0.3 + 0.7 * ph), y], 1);
        u.op(a.g, on ? 1 : 0);
      });
      const L = [
        ['R = ' + num(d, 2) + ' ÷ 0.04', '= ' + num(R, 2) + ' m²K/W', 1],
        ['U = 1 ÷ R', '= ' + num(U, 3) + ' W/m²K', 2],
        ['Q = U × 20 × 25', '= ' + num(Q, 1) + ' W', 3],
        ['두께 두 배면', 'U 와 Q 가 절반', 4],
      ];
      L.forEach((x, i) => {
        u.txt(g.lines[2 * i], x[0]); u.txt(g.lines[2 * i + 1], x[1]);
        const o = at(s, k, x[2]);
        u.op(g.lines[2 * i], o); u.op(g.lines[2 * i + 1], o);
      });
      u.set(g.qbar, { width: 140 * Math.min(1.5, Q / 200) * at(s, k, 3) });
    },
  });

  /* ---------- 3. 열용량과 시간 지연 (wb-3) ---------- */
  const W24 = 2 * Math.PI / 24;
  const room = (tau, hr) => { const amp = 10 / Math.sqrt(1 + Math.pow(W24 * tau, 2)), ph = Math.atan(W24 * tau); return 20 + amp * Math.sin(W24 * (hr - 9) - ph); };
  V.add('eco.lag', {
    title: '뚝배기 건물: 늦게, 작게',
    w: 480, h: 300,
    dur: 1500,
    params: { tau: 8 },
    controls: [{ key: 'tau', type: 'range', label: '열용량 (뚝배기 정도)', min: 1, max: 12, step: 1, fmt: v => v <= 3 ? '작음' : v <= 7 ? '중간' : '큼' }],
    capsDependOn: true,
    states(P) {
      const lag = Math.atan(W24 * P.tau) / W24, amp = 10 / Math.sqrt(1 + Math.pow(W24 * P.tau, 2));
      return [
        { cap: '하루 동안 바깥 기온이 10℃ 에서 30℃ 사이로 오르내려요. 가장 더운 때는 오후 3시예요.' },
        { tag: '열용량 작음', cap: '가벼운 건물은 바깥을 바로 따라가요. 실내도 크게 흔들려요.' },
        { tag: '열용량 큼', cap: '뚝배기 건물은 실내가 ±' + num(amp, 1) + '℃ 만 흔들리고, 가장 더운 때가 약 ' + num(lag, 1) + '시간 늦게 와요. 이게 시간 지연이에요.' },
        { tag: '손계산', cap: '같은 210 kJ 를 넣으면 열용량 42 kJ/K 는 5℃, 21 kJ/K 는 10℃ 올라요. 열용량이 두 배면 온도 변화는 절반이에요.' },
      ];
    },
    build(ctx) {
      const g = ctx.g = {};
      const X0 = 50, X1 = 300, Y0 = 30, Y1 = 230;
      g.sx = h => X0 + (X1 - X0) * h / 24; g.sy = T => Y1 - (Y1 - Y0) * (T - 8) / 24;
      u.el(ctx.svg, 'path', { d: 'M' + X0 + ' ' + Y0 + ' V' + Y1 + ' H' + X1, class: 'vz-axis' });
      [0, 6, 12, 18, 24].forEach(h => u.el(ctx.svg, 'text', { x: g.sx(h), y: Y1 + 18, 'text-anchor': 'middle', class: 'vz-ts' }, h + '시'));
      [10, 20, 30].forEach(T => { u.el(ctx.svg, 'text', { x: X0 - 8, y: g.sy(T) + 4, 'text-anchor': 'end', class: 'vz-ts' }, T + '℃'); u.el(ctx.svg, 'line', { x1: X0, x2: X1, y1: g.sy(T), y2: g.sy(T), class: 'vz-grid' }); });
      g.out = u.el(ctx.svg, 'path', { class: 'vz-curve cr' });
      g.light = u.el(ctx.svg, 'path', { class: 'vz-curve mu' });
      g.heavy = u.el(ctx.svg, 'path', { class: 'vz-curve tl' });
      g.pk = [u.el(ctx.svg, 'circle', { r: 5, class: 'vz-dot cr' }), u.el(ctx.svg, 'circle', { r: 5, class: 'vz-dot tl' })];
      g.lagLine = u.el(ctx.svg, 'path', { class: 'vz-axis' });
      g.lagT = u.el(ctx.svg, 'text', { 'text-anchor': 'middle', class: 'vz-ta' }, '');
      g.leg = [['바깥', 'vz-tc', 36], ['가벼운 건물', 'vz-tm', 56], ['뚝배기 건물', 'vz-tt', 76]].map(([t, c, y]) => u.el(ctx.svg, 'text', { x: 316, y, class: c }, t));
      // 오른쪽: 두 그릇
      g.pots = [42, 21].map((C, i) => {
        const x = 340 + i * 72;
        const gg = u.el(ctx.svg, 'g');
        u.el(gg, 'rect', { x, y: 150, width: 56, height: 80, rx: 8, class: 'vz-box' });
        const fill = u.el(gg, 'rect', { x: x + 4, width: 48, rx: 4 });
        const t = u.el(gg, 'text', { x: x + 28, y: 250, 'text-anchor': 'middle', class: 'vz-ts' }, C + ' kJ/K');
        const v = u.el(gg, 'text', { x: x + 28, y: 140, 'text-anchor': 'middle', class: 'vz-tb' }, '');
        return { gg, fill, t, v, x, C };
      });
      g.potT = u.el(ctx.svg, 'text', { x: 404, y: 276, 'text-anchor': 'middle', class: 'vz-ts' }, '둘 다 210 kJ');
    },
    draw(ctx, s, k) {
      const g = ctx.g, P = ctx.p;
      const path = (f, upto) => { let d = ''; for (let h = 0; h <= 24 * upto + 1e-9; h += 0.25) d += (d ? ' L' : 'M') + u.r(g.sx(h)) + ' ' + u.r(g.sy(f(h))); return d || 'M' + g.sx(0) + ' ' + g.sy(f(0)); };
      const out = h => 20 + 10 * Math.sin(W24 * (h - 9));
      const p0 = s === 0 ? k : 1, p1 = at(s, k, 1), p2 = at(s, k, 2);
      u.set(g.out, { d: path(out, p0) });
      u.set(g.light, { d: path(h => room(1.2, h), p1) }); u.op(g.light, p1 > 0 ? 1 : 0);
      u.set(g.heavy, { d: path(h => room(P.tau, h), p2) }); u.op(g.heavy, p2 > 0 ? 1 : 0);
      const lag = Math.atan(W24 * P.tau) / W24;
      const hp = 15 + lag;
      u.set(g.pk[0], { cx: g.sx(15), cy: g.sy(30) });
      u.set(g.pk[1], { cx: g.sx(Math.min(24, hp)), cy: g.sy(room(P.tau, hp)) });
      u.op(g.pk[0], p0 >= 0.99 ? 1 : 0); u.op(g.pk[1], p2 >= 0.99 && hp <= 24 ? 1 : 0);
      const ly = 44;
      u.set(g.lagLine, { d: 'M' + u.r(g.sx(15)) + ' ' + ly + ' H' + u.r(g.sx(Math.min(24, hp))) });
      u.set(g.lagT, { x: (g.sx(15) + g.sx(Math.min(24, hp))) / 2, y: ly - 6 }); u.txt(g.lagT, num(lag, 1) + '시간 늦게');
      const lo = s === 2 ? seg(k, 0.7, 1) : s > 2 ? 1 : 0;
      u.op(g.lagLine, lo); u.op(g.lagT, lo);
      g.leg.forEach((t, i) => u.op(t, [p0 > 0 ? 1 : 0, p1 > 0 ? 1 : 0, p2 > 0 ? 1 : 0][i]));
      const pv = at(s, k, 3);
      g.pots.forEach(pt => {
        const rise = 210 / pt.C * seg(pv, 0.1, 1);
        const hgt = 6 + rise * 6;
        u.set(pt.fill, { y: 226 - hgt, height: hgt }); pt.fill.style.fill = warm(rise / 10);
        u.txt(pt.v, '+' + num(rise, 1) + '℃');
        u.op(pt.gg, pv > 0 ? 1 : 0);
      });
      u.op(g.potT, pv);
    },
  });

  /* ---------- 4. 이슬점과 결로 (wb-4, wb-5) ---------- */
  const dew = (T, RH) => { const a = 17.62, b = 243.12, y = Math.log(RH / 100) + a * T / (b + T); return b * y / (a - y); };
  V.add('eco.dew', {
    title: '이슬점 선 아래면 물이 맺혀요',
    w: 480, h: 300,
    params: { T: 20, RH: 60 },
    controls: [
      { key: 'T', type: 'range', label: '실내 온도', min: 14, max: 28, step: 1, fmt: v => v + '℃' },
      { key: 'RH', type: 'range', label: '상대습도', min: 30, max: 90, step: 5, fmt: v => v + '%' },
    ],
    states: [
      { set: { T: 20, RH: 60 }, cap: '실내 20℃, 상대습도 60% 공기는 약 12℃ 까지 식으면 물방울이 맺혀요. 이 온도가 이슬점이에요.' },
      { set: { T: 20, RH: 60 }, tag: '창 유리 8℃', cap: '8℃ 는 이슬점 12℃ 보다 4℃ 낮아요. 표면에 물이 맺혀요(표면 결로).' },
      { set: { T: 20, RH: 60 }, tag: '벽 표면 16℃', cap: '16℃ 는 이슬점보다 4℃ 높아요. 맺히지 않아요.' },
      { set: { T: 20, RH: 40 }, tag: '환기', cap: '환기로 습도를 40% 로 낮추면 이슬점이 약 6℃. 창 유리도 괜찮아져요.' },
      { set: { T: 20, RH: 80 }, tag: '습한 날', cap: '습도 80% 면 이슬점이 약 16.4℃. 16℃ 벽 표면에도 물이 맺혀요.' },
    ],
    build(ctx) {
      const g = ctx.g = {};
      const Y0 = 30, Y1 = 270;
      g.sy = T => Y1 - (Y1 - Y0) * T / 30;
      u.el(ctx.svg, 'line', { x1: 70, x2: 70, y1: Y0, y2: Y1, class: 'vz-axis' });
      [0, 10, 20, 30].forEach(T => u.el(ctx.svg, 'text', { x: 60, y: g.sy(T) + 4, 'text-anchor': 'end', class: 'vz-ts' }, T + '℃'));
      g.air = u.el(ctx.svg, 'circle', { cx: 70, r: 7, class: 'vz-dot cr' });
      g.airT = u.el(ctx.svg, 'text', { x: 84, class: 'vz-tc' }, '');
      g.dewL = u.el(ctx.svg, 'line', { x1: 70, x2: 470, class: 'vz-e tl' });
      g.dewT = u.el(ctx.svg, 'text', { x: 466, 'text-anchor': 'end', class: 'vz-tt' }, '');
      g.drop = u.el(ctx.svg, 'line', { x1: 70, x2: 70, class: 'vz-e' });
      g.surf = [['창 유리', 8, 170], ['벽 표면', 16, 320]].map(([name, T, x]) => {
        const r = u.el(ctx.svg, 'rect', { x: x - 34, width: 68, height: 16, rx: 3, class: 'vz-box' });
        const t = u.el(ctx.svg, 'text', { x, 'text-anchor': 'middle', class: 'vz-tb' }, name + ' ' + T + '℃');
        const drops = [0, 1, 2, 3].map(i => u.el(ctx.svg, 'path', { class: 'vz-bar tl' }));
        const v = u.el(ctx.svg, 'text', { x, 'text-anchor': 'middle', class: 'vz-tok' }, '');
        return { r, t, drops, v, T, x };
      });
    },
    draw(ctx, s, k) {
      const g = ctx.g, P = ctx.p;
      let RH = P.RH;
      if (k < 1 && s >= 3) RH = u.lerp([60, 60, 60, 60, 40][s - 1] || 60, P.RH, u.ease(k));
      const Td = dew(P.T, RH);
      u.set(g.air, { cy: g.sy(P.T) }); u.set(g.airT, { y: g.sy(P.T) + 5 }); u.txt(g.airT, '실내 공기 ' + P.T + '℃, ' + Math.round(RH) + '%');
      const dk = s === 0 ? k : 1;
      const yT = g.sy(P.T), yd = g.sy(Td);
      u.set(g.drop, { y1: yT, y2: u.lerp(yT, yd, dk) });
      u.set(g.dewL, { y1: yd, y2: yd }); u.op(g.dewL, seg(dk, 0.6, 1));
      u.set(g.dewT, { y: yd - 6 }); u.txt(g.dewT, '이슬점 ' + num(Td, 1) + '℃'); u.op(g.dewT, seg(dk, 0.6, 1));
      g.surf.forEach((sf, i) => {
        const y = g.sy(sf.T);
        u.set(sf.r, { y: y - 8 }); u.set(sf.t, { y: y + 26 });
        const shown = i === 0 ? at(s, k, 1) : at(s, k, 2);
        const wet = sf.T < Td;
        sf.r.setAttribute('class', 'vz-box' + (shown > 0.5 ? (wet ? ' tl' : ' ok') : ''));
        sf.drops.forEach((dp, j) => {
          const dx = sf.x - 24 + j * 16, dy = y - 12 - (j % 2) * 4;
          u.set(dp, { d: 'M' + dx + ' ' + (dy - 8) + ' q-5 7 0 10 q5 -3 0 -10' });
          u.op(dp, wet && shown > 0.5 ? 1 : 0);
        });
        u.set(sf.v, { x: sf.x - 42, y: y + 5 }); sf.v.setAttribute('text-anchor', 'end');
        u.txt(sf.v, wet ? '결로' : '괜찮음'); sf.v.setAttribute('class', wet ? 'vz-tt' : 'vz-tok');
        u.op(sf.v, shown > 0.5 ? 1 : 0); u.op(sf.t, shown > 0 ? 1 : 0.4); u.op(sf.r, shown > 0 ? 1 : 0.4);
      });
    },
  });

  /* ---------- 5. 열교와 표면 온도 (wb-4) ---------- */
  const RSI = 0.11;
  const surfT = U => 20 - DT * RSI * U;
  V.add('eco.bridge', {
    title: '지퍼 틈으로 새는 열',
    w: 480, h: 300,
    live: true,
    params: { mode: 'in' },
    controls: [{ key: 'mode', type: 'choice', label: '단열 위치', options: [['in', '내단열'], ['ext', '외단열']] }],
    capsDependOn: true,
    states(P) {
      const ext = P.mode === 'ext';
      return [
        { cap: ext ? '외단열 벽이에요. 단열재가 바깥을 한 겹으로 감싸요.' : '내단열 벽이에요. 단열재가 방 안쪽에 붙어 있다가 바닥 슬래브 앞에서 끊겨요.' },
        { tag: '열교', cap: ext ? '끊긴 곳이 없어 열이 고르게 조금씩만 새요.' : '열이 단열이 끊긴 슬래브 쪽으로 몰려 새요. 이게 열교예요.' },
        { tag: '표면 온도', cap: ext ? '안쪽 표면이 어디나 약 ' + num(surfT(0.4), 1) + '℃ 예요.' : '보통 벽 안쪽 표면은 약 ' + num(surfT(0.4), 1) + '℃, 열교 부위는 약 ' + num(surfT(3), 1) + '℃ 로 차가워요.' },
        { tag: '결로', cap: ext ? '이슬점 12℃ 보다 높아 물이 맺히지 않아요.' : '열교 부위가 실내 이슬점 12℃ 보다 낮아 물이 맺히고 곰팡이가 생기기 쉬워요.' },
        { set: { mode: 'ext' }, tag: '해결', cap: '외단열로 끊김 없이 감싸면 열교 부위도 약 ' + num(surfT(0.4), 1) + '℃ 가 돼요.' },
      ];
    },
    build(ctx) {
      const g = ctx.g = {};
      u.el(ctx.svg, 'text', { x: 60, y: 24, 'text-anchor': 'middle', class: 'vz-tb' }, '실내 20℃');
      u.el(ctx.svg, 'text', { x: 420, y: 24, 'text-anchor': 'middle', class: 'vz-tb' }, '실외 -5℃');
      g.wallUp = u.el(ctx.svg, 'rect', { x: 240, y: 36, width: 40, height: 104, class: 'vz-wall' });
      g.slab = u.el(ctx.svg, 'rect', { x: 20, y: 140, width: 260, height: 34, class: 'vz-wall' });
      g.wallDn = u.el(ctx.svg, 'rect', { x: 240, y: 174, width: 40, height: 100, class: 'vz-wall' });
      g.inUp = u.el(ctx.svg, 'rect', { x: 216, y: 36, width: 24, height: 104, class: 'vz-box am' });
      g.inDn = u.el(ctx.svg, 'rect', { x: 216, y: 174, width: 24, height: 100, class: 'vz-box am' });
      g.ext = u.el(ctx.svg, 'rect', { x: 280, y: 36, width: 26, height: 238, class: 'vz-box am' });
      g.flow = [0, 1, 2, 3, 4, 5].map(() => u.el(ctx.svg, 'circle', { r: 5, class: 'vz-dot cr' }));
      g.tNorm = u.el(ctx.svg, 'text', { x: 150, y: 90, 'text-anchor': 'middle', class: 'vz-tb' }, '');
      g.tBr = u.el(ctx.svg, 'text', { x: 150, y: 200, 'text-anchor': 'middle', class: 'vz-tb' }, '');
      g.brMark = u.el(ctx.svg, 'rect', { x: 196, y: 132, width: 50, height: 50, rx: 6, class: 'vz-hl' });
      g.drops = [0, 1, 2].map(() => u.el(ctx.svg, 'path', { class: 'vz-bar tl' }));
      g.mold = u.el(ctx.svg, 'text', { x: 150, y: 240, 'text-anchor': 'middle', class: 'vz-tc' }, '');
      u.el(ctx.svg, 'text', { x: 470, y: 290, 'text-anchor': 'end', class: 'vz-ts' }, '실내 쪽 표면 온도');
    },
    draw(ctx, s, k) {
      const g = ctx.g, t = ctx.t || 0;
      let extOn = ctx.p.mode === 'ext' ? 1 : 0;
      if (s === 4 && k < 1) extOn = u.ease(k);
      u.op(g.inUp, 1 - extOn); u.op(g.inDn, 1 - extOn); u.op(g.ext, extOn);
      const fl = at(s, k, 1);
      g.flow.forEach((c, i) => {
        const ph = (t * 0.4 + i / 6) % 1;
        const bridgeFlow = extOn < 0.5 && i < 4;
        const y = bridgeFlow ? 150 + (i % 3) * 8 : 60 + i * 34;
        u.set(c, { cx: 170 + ph * (bridgeFlow ? 280 : 140) * (extOn > 0.5 ? 0.6 : 1), cy: y });
        u.op(c, fl * (extOn > 0.5 ? 0.35 : 1));
      });
      const tv = at(s, k, 2);
      const tb = extOn > 0.5 ? surfT(0.4) : surfT(3);
      u.txt(g.tNorm, '보통 벽 ' + num(surfT(0.4), 1) + '℃'); u.op(g.tNorm, tv);
      u.txt(g.tBr, '슬래브 앞 ' + num(tb, 1) + '℃'); u.op(g.tBr, tv);
      g.tBr.setAttribute('class', tb < 12 ? 'vz-tc' : 'vz-tok');
      u.op(g.brMark, extOn > 0.5 ? 0 : seg(fl, 0.3, 1));
      const wet = at(s, k, 3) > 0.5 && tb < 12;
      g.drops.forEach((d, i) => { const x = 206 + i * 12, y = 186 + (i % 2) * 6; u.set(d, { d: 'M' + x + ' ' + y + ' q-5 7 0 10 q5 -3 0 -10' }); u.op(d, wet ? 1 : 0); });
      u.txt(g.mold, wet ? '12℃ 보다 낮음: 결로, 곰팡이' : ''); u.op(g.mold, wet ? 1 : 0);
    },
  });

  /* ---------- 6. 환기횟수 (wb-7) ---------- */
  V.add('eco.vent', {
    title: '한 시간에 방 공기가 몇 번 바뀔까',
    w: 480, h: 300,
    dur: 2200,
    params: { n: 5 },
    controls: [{ key: 'n', type: 'range', label: '재실자 수', min: 1, max: 10, step: 1, fmt: v => v + '명' }],
    capsDependOn: true,
    states(P) {
      const q = 24 * P.n, N = q / 60;
      return [
        { set: { n: 5 }, cap: '실의용적 60 m³ 방에 5명이 있어요. 한 사람에게 새 공기가 24 m³/h 필요해요.' },
        { set: { n: 5 }, tag: '필요환기량', cap: '방 전체에 필요한 공기: 24 × 5 = 120 m³/h 예요.' },
        { set: { n: 5 }, tag: '환기횟수', cap: '120 ÷ 60 = 2. 한 시간에 방 공기 60 m³ 가 두 번 바뀌어요. 답은 2회/h.' },
        { set: { n: 10 }, tag: '사람이 늘면', cap: '10명이면 24 × 10 = 240, 240 ÷ 60 = 4회/h. 막대로 사람 수를 바꿔 봐요.' },
      ];
    },
    build(ctx) {
      const g = ctx.g = {};
      u.el(ctx.svg, 'rect', { x: 20, y: 40, width: 260, height: 180, rx: 4, class: 'vz-e' });
      u.el(ctx.svg, 'text', { x: 150, y: 30, 'text-anchor': 'middle', class: 'vz-tb' }, '실의용적 60 m³');
      g.air = Array.from({ length: 48 }, (_, i) => u.el(ctx.svg, 'circle', { cx: 36 + (i % 12) * 20.5, cy: 58 + Math.floor(i / 12) * 26, r: 5 }));
      g.people = Array.from({ length: 10 }, (_, i) => {
        const gg = u.el(ctx.svg, 'g');
        const x = 40 + i * 24;
        u.el(gg, 'circle', { cx: x, cy: 170, r: 7, class: 'vz-dot am' });
        u.el(gg, 'rect', { x: x - 7, y: 180, width: 14, height: 26, rx: 5, class: 'vz-bar am' });
        return gg;
      });
      g.inA = u.arrow(ctx.svg, 'tl'); g.outA = u.arrow(ctx.svg, 'mu');
      u.el(ctx.svg, 'rect', { x: 300, y: 40, width: 172, height: 180, rx: 8, class: 'vz-box' });
      g.lines = txtLines(ctx.svg, 312, 68, 6, 28);
      g.lines.forEach((l, i) => l.setAttribute('class', i % 2 ? 'vz-tb' : 'vz-ts'));
      g.clock = u.el(ctx.svg, 'circle', { cx: 60, cy: 262, r: 24, class: 'vz-e' });
      g.hand = u.el(ctx.svg, 'line', { x1: 60, y1: 262, class: 'vz-e cr' });
      g.clockT = u.el(ctx.svg, 'text', { x: 96, y: 268, class: 'vz-tb' }, '');
    },
    draw(ctx, s, k) {
      const g = ctx.g, n = ctx.p.n;
      const q = 24 * n, N = q / 60;
      g.people.forEach((p, i) => u.op(p, i < n ? 1 : 0));
      // 공기 바뀜: 상태 2 에서 한 시간(0~1) 동안 N 번 휩쓸고 지나감
      const hour = s === 2 ? k : s === 3 ? k : 0;
      const reps = s === 3 ? N : 2;
      const sweeps = hour * reps, cnt = Math.floor(sweeps + 1e-9), fr = sweeps - cnt;
      const fresh = j => j % 2 ? 'vz-dot' : 'vz-dot tl';
      g.air.forEach((c, i) => {
        const col = i % 12;
        let cls = 'vz-dot mu';
        if (s >= 2) cls = col < fr * 12 ? fresh(cnt) : cnt === 0 ? 'vz-dot mu' : fresh(cnt - 1);
        c.setAttribute('class', cls);
      });
      u.setArrow(g.inA, [0, 110], [18, 110], at(s, k, 1)); u.setArrow(g.outA, [282, 110], [298, 110], at(s, k, 1));
      const ang = hour * Math.PI * 2 - Math.PI / 2;
      u.set(g.hand, { x2: 60 + 20 * Math.cos(ang), y2: 262 + 20 * Math.sin(ang) });
      const done = s >= 2 ? Math.floor(hour * (s === 3 ? N : 2) + 1e-9) : 0;
      u.txt(g.clockT, s >= 2 ? Math.round(hour * 60) + '분, ' + Math.min(done, s === 3 ? N : 2) + '번 바뀜' : '1시간 동안');
      const L = [['1인당', '24 m³/h', 0], ['필요환기량', '24 × ' + n + ' = ' + q + ' m³/h', 1], ['환기횟수', q + ' ÷ 60 = ' + num(N, 2) + '회/h', 2]];
      L.forEach((x, i) => { u.txt(g.lines[2 * i], x[0]); u.txt(g.lines[2 * i + 1], x[1]); const o = x[2] === 0 ? 1 : at(s, k, x[2]); u.op(g.lines[2 * i], o); u.op(g.lines[2 * i + 1], o); });
    },
  });

  /* ---------- 7. 계절별 해의 높이와 차양 (wb-9) ---------- */
  const ALT = { summer: 76, equinox: 52.5, winter: 29 };
  const SEASON = { summer: '하지', equinox: '춘분, 추분', winter: '동지' };
  V.add('eco.sun', {
    title: '여름 해는 높고 겨울 해는 낮아요',
    w: 480, h: 300,
    params: { season: 'summer', depth: 0 },
    controls: [
      { key: 'season', type: 'choice', label: '계절', options: [['summer', '여름'], ['equinox', '봄, 가을'], ['winter', '겨울']] },
      { key: 'depth', type: 'range', label: '바깥 차양 길이', min: 0, max: 1.2, step: 0.1, fmt: v => num(v, 1) + ' m' },
    ],
    states: [
      { set: { season: 'summer', depth: 0 }, cap: '여름 한낮은 해가 높아요(서울 하지 약 76도). 차양이 없으면 창 전체에 햇빛이 들어요.' },
      { set: { season: 'summer', depth: 0.6 }, tag: '바깥 차양', cap: '창 위에 0.6 m 차양을 달면 여름 햇빛이 창 밖에서 막혀요.' },
      { set: { season: 'winter', depth: 0.6 }, tag: '겨울', cap: '겨울 한낮은 해가 낮아요(동지 약 29도). 같은 차양 아래로 햇빛이 깊이 들어와 따뜻해요.' },
      { set: { season: 'equinox', depth: 0.6 }, tag: '봄, 가을', cap: '봄과 가을은 약 52도, 그 사이예요. 창의 윗부분만 그늘이 져요.' },
      { set: { season: 'summer', depth: 0 }, tag: '안쪽 블라인드', cap: '안쪽 블라인드는 유리를 지난 열이 실내에 남아요. 차양은 창 바깥에 달아야 열을 더 잘 막아요.' },
    ],
    build(ctx) {
      const g = ctx.g = {};
      g.S = 110;   // 1 m = 110 px
      g.wallX = 300;
      u.el(ctx.svg, 'rect', { x: 0, y: 270, width: 480, height: 30, class: 'vz-area' });
      u.el(ctx.svg, 'rect', { x: g.wallX, y: 40, width: 20, height: 40, class: 'vz-wall' });
      u.el(ctx.svg, 'rect', { x: g.wallX, y: 245, width: 20, height: 25, class: 'vz-wall' });
      g.glass = u.el(ctx.svg, 'rect', { x: g.wallX + 6, y: 80 + 0.3 * 0, width: 8, height: 165, class: 'vz-box' });
      g.shadeGlass = u.el(ctx.svg, 'rect', { x: g.wallX + 6, y: 80, width: 8, class: 'vz-bar mu' });
      g.over = u.el(ctx.svg, 'rect', { y: 74, height: 8, class: 'vz-bar' });
      g.blind = u.el(ctx.svg, 'g');
      for (let i = 0; i < 9; i++) u.el(g.blind, 'line', { x1: g.wallX + 26, x2: g.wallX + 40, y1: 86 + i * 18, y2: 92 + i * 18, class: 'vz-e' });
      g.rays = [0, 1, 2, 3, 4].map(() => u.el(ctx.svg, 'line', { class: 'vz-e cr' }));
      g.patch = u.el(ctx.svg, 'rect', { y: 266, height: 6, class: 'vz-bar am' });
      g.sun = u.el(ctx.svg, 'circle', { r: 16, class: 'vz-dot am' });
      g.angT = u.el(ctx.svg, 'text', { class: 'vz-ta' }, '');
      g.heat = u.el(ctx.svg, 'text', { x: 470, y: 30, 'text-anchor': 'end', class: 'vz-tc' }, '');
      g.pct = u.el(ctx.svg, 'text', { x: 470, y: 290, 'text-anchor': 'end', class: 'vz-tb' }, '');
      u.el(ctx.svg, 'text', { x: 470, y: 60, 'text-anchor': 'end', class: 'vz-ts' }, '실내');
      u.el(ctx.svg, 'text', { x: 12, y: 60, class: 'vz-ts' }, '실외');
    },
    draw(ctx, s, k) {
      const g = ctx.g, P = ctx.p, S = g.S, wx = g.wallX;
      const prev = [null, { season: 'summer', depth: 0 }, { season: 'summer', depth: 0.6 }, { season: 'winter', depth: 0.6 }, { season: 'equinox', depth: 0.6 }][s];
      let alt = ALT[P.season], depth = P.depth;
      if (prev && k < 1) { alt = u.lerp(ALT[prev.season], alt, u.ease(k)); depth = u.lerp(prev.depth, depth, u.ease(k)); }
      const tn = Math.tan(alt * Math.PI / 180);
      // 창: 차양 아래 0.05 m 부터 1.5 m
      const top = 80, win = 165, gapPx = 0;
      const shadeLen = depth * S * tn;   // 차양 끝에서 그늘이 내려오는 길이(px)
      const shaded = u.clamp(shadeLen - gapPx, 0, win);
      u.set(g.over, { x: wx - depth * S, width: depth * S + 20 }); u.op(g.over, depth > 0.01 ? 1 : 0);
      u.set(g.shadeGlass, { height: shaded });
      const inner = s === 4 ? seg(k, 0, 0.5) : 0;
      u.op(g.blind, inner);
      // 햇빛 선: 창의 그늘 아래 부분으로 들어감
      const dx = Math.cos(alt * Math.PI / 180), dy = Math.sin(alt * Math.PI / 180);
      g.rays.forEach((r, i) => {
        const y = top + shaded + (win - shaded) * (i + 0.5) / 5;
        const lit = shaded < win - 2;
        const x0 = wx - dx * 130, y0 = y - dy * 130;
        const inLen = s === 4 ? 30 : (270 - y) / dy;
        u.set(r, { x1: x0, y1: y0, x2: wx + 10 + dx * inLen, y2: y + dy * inLen });
        u.op(r, lit && y < 262 ? 1 : 0);
      });
      const bottom = top + win;
      const patchStart = wx + 20 + (270 - bottom) / tn, patchEnd = wx + 20 + (270 - (top + shaded)) / tn;
      u.set(g.patch, { x: Math.min(480, patchStart), width: Math.max(0, Math.min(480, patchEnd) - Math.min(480, patchStart)) });
      u.op(g.patch, shaded < win - 2 && s !== 4 ? 1 : 0);
      const sx = wx - dx * 250, sy = 170 - dy * 150;
      u.set(g.sun, { cx: Math.max(20, sx), cy: Math.max(20, sy) });
      u.set(g.angT, { x: 16, y: 290 });
      u.txt(g.angT, SEASON[P.season] + ' 약 ' + num(alt, 0) + '도');
      const pct = Math.round(100 * (1 - shaded / win));
      u.txt(g.pct, '창에 햇빛 ' + pct + '%');
      u.txt(g.heat, s === 4 ? '블라인드: 열이 실내에 남음' : ''); u.op(g.heat, s === 4 ? seg(k, 0.4, 1) : 0);
    },
  });

  /* ---------- 8. 데시벨과 차음 (wb-10) ---------- */
  V.add('eco.sound', {
    title: '로그로 세는 소리',
    w: 480, h: 300,
    params: { m: 100 },
    controls: [{ key: 'm', type: 'range', label: '벽 무게 (kg/m²)', min: 25, max: 400, step: 25, fmt: v => v + ' kg/m²' }],
    capsDependOn: true,
    states(P) {
      const tl = 20 * Math.log10(P.m * 500) - 47;
      return [
        { cap: '기준음압 0.00002 Pa 가 0 dB 예요. 사람이 겨우 듣는 크기예요.' },
        { tag: '10배에 20 dB', cap: '음압이 10배가 될 때마다 20 dB 씩 올라가요. 0.02 Pa 는 1000배라 20 × 3 = 60 dB.' },
        { tag: '두 소리', cap: '60 dB 소리 두 개를 함께 켜도 120 dB 가 아니에요. 10 × log(2 × 10⁶) ≈ 63 dB 예요.' },
        { tag: '벽에 닿으면', cap: '벽에 부딪힌 소리는 흩어지고(확산), 빨려 들고(흡음), 넘어가지 못하게 막혀요(차음).' },
        { tag: '차음', cap: '벽이 무겁고 틈이 없을수록 넘어가는 소리가 작아요. 지금 벽은 약 ' + Math.round(tl) + ' dB 를 막아요.' },
      ];
    },
    build(ctx) {
      const g = ctx.g = {};
      g.rows = [['0.00002 Pa', 0], ['0.0002 Pa', 20], ['0.002 Pa', 40], ['0.02 Pa', 60]].map(([p, db], i) => {
        const y = 250 - i * 50;
        return {
          p: u.el(ctx.svg, 'text', { x: 16, y: y + 5, class: 'vz-ts' }, p),
          b: u.el(ctx.svg, 'rect', { x: 100, y: y - 12, height: 24, rx: 4, class: 'vz-bar' }),
          t: u.el(ctx.svg, 'text', { y: y + 6, class: 'vz-tb' }, db + ' dB'),
          x10: u.el(ctx.svg, 'text', { x: 60, y: y + 30, 'text-anchor': 'middle', class: 'vz-ta' }, i < 3 ? '× 10' : ''),
          db, y,
        };
      });
      g.spk = [0, 1].map(i => tag(ctx.svg, 350, 70 + i * 60, 90, 40, '스피커', '60 dB'));
      g.sum = u.el(ctx.svg, 'text', { x: 350, y: 208, 'text-anchor': 'middle', class: 'vz-tb' }, '');
      g.no = u.el(ctx.svg, 'text', { x: 350, y: 232, 'text-anchor': 'middle', class: 'vz-tc' }, '120 dB 아님');
      g.wall = u.el(ctx.svg, 'rect', { x: 300, y: 40, height: 220, class: 'vz-wall' });
      g.inA = u.arrow(ctx.svg, 'cr'); g.refA = [u.arrow(ctx.svg, 'mu'), u.arrow(ctx.svg, 'mu')]; g.absT = u.el(ctx.svg, 'text', { class: 'vz-tt' }, '흡음');
      g.trA = u.arrow(ctx.svg, 'cr');
      g.labels = [u.el(ctx.svg, 'text', { x: 160, y: 60, class: 'vz-tm' }, '확산'), u.el(ctx.svg, 'text', { x: 420, y: 130, 'text-anchor': 'middle', class: 'vz-tc' }, '')];
      g.inDb = u.el(ctx.svg, 'text', { x: 150, y: 170, 'text-anchor': 'middle', class: 'vz-tb' }, '옆집 60 dB');
    },
    draw(ctx, s, k) {
      const g = ctx.g, m = ctx.p.m;
      const ladder = s <= 1 ? 1 : 1 - seg(at(s, k, 2), 0, 0.5);
      g.rows.forEach((r, i) => {
        const show = i === 0 ? 1 : at(s, k, 1) >= (i / 4) ? 1 : 0;
        const w = 20 + r.db * 2.6;
        u.set(r.b, { width: w }); u.set(r.t, { x: 108 + w });
        [r.p, r.b, r.t].forEach(x => u.op(x, show * ladder));
        u.op(r.x10, (s === 1 ? seg(k, 0.5, 1) : s > 1 ? 1 : 0) * ladder);
        r.b.setAttribute('class', 'vz-bar' + (i === 3 && s === 1 ? ' cr' : ''));
      });
      const two = s === 2 ? 1 : 0;
      g.spk.forEach((sp, i) => u.op(sp.g, two * (i === 0 ? seg(k, 0, 0.2) : seg(k, 0.25, 0.45))));
      const sumDb = 60 + 3.01 * seg(k, 0.5, 0.9);
      u.txt(g.sum, '합치면 약 ' + num(s === 2 ? sumDb : 63.01, 1) + ' dB'); u.op(g.sum, two * seg(k, 0.5, 0.7)); u.op(g.no, two * seg(k, 0.85, 1));
      const wv = at(s, k, 3) >= 0 && s >= 3 ? 1 : 0;
      const thick = 8 + m / 400 * 36;
      u.set(g.wall, { width: thick }); u.op(g.wall, wv);
      u.op(g.inDb, wv);
      const p3 = s === 3 ? k : s > 3 ? 1 : 0;
      u.setArrow(g.inA, [100, 150], [296, 150], seg(p3, 0, 0.4)); u.op(g.inA.g, wv * (p3 > 0 ? 1 : 0));
      u.setArrow(g.refA[0], [290, 140], [200, 70], seg(p3, 0.4, 0.8)); u.op(g.refA[0].g, wv * (p3 > 0.4 ? 1 : 0));
      u.setArrow(g.refA[1], [290, 160], [210, 230], seg(p3, 0.4, 0.8)); u.op(g.refA[1].g, wv * (p3 > 0.4 ? 1 : 0));
      u.set(g.absT, { x: 250, y: 184 }); u.op(g.absT, wv * seg(p3, 0.6, 1));
      u.op(g.labels[0], wv * seg(p3, 0.6, 1));
      const tl = 20 * Math.log10(m * 500) - 47;
      const left = 60 - tl;
      const tr = s === 4 ? seg(k, 0.2, 1) : 0;
      u.setArrow(g.trA, [300 + thick + 4, 150], [300 + thick + 4 + Math.max(10, (left + 10) * 1.4), 150], tr);
      g.trA.l.style.strokeWidth = u.r(Math.max(1, (left + 10) / 8)) + 'px';
      u.txt(g.labels[1], '넘어온 소리 약 ' + Math.max(0, Math.round(left)) + ' dB'); u.set(g.labels[1], { x: 420, y: 130 }); u.op(g.labels[1], tr);
    },
  });
})();
