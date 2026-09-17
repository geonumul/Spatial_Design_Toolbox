/* 움직이는 개념 그림: 실내디자인시공과실무 묶음. 틀은 viz.js, 설명은 README.md
   순서와 숫자는 work/interior-construction/pages/note.html (2강, 3강)에서 가져왔다. 그림 비례는 개념용이다. */
(function () {
  'use strict';
  const V = window.SDTViz;
  if (!V) return;
  const u = V.u;
  const at = u.at, seg = u.seg, num = u.num;

  function tag(parent, x, y, w, h, label, small) {
    const g = u.el(parent, 'g');
    const r = u.el(g, 'rect', { x: x - w / 2, y: y - h / 2, width: w, height: h, rx: 7, class: 'vz-box' });
    const t = u.el(g, 'text', { x, y: y + (small ? -2 : 5), 'text-anchor': 'middle', class: 'vz-tb' }, label);
    const s = u.el(g, 'text', { x, y: y + 14, 'text-anchor': 'middle', class: 'vz-ts' }, small || '');
    return { g, r, t, s, x, y, w, h };
  }
  const boxCls = (b, c) => b.r.setAttribute('class', 'vz-box' + (c ? ' ' + c : ''));
  const shown = (s, k, n) => at(s, k, n);

  /* ---------- 1. 경량철골 벽체 시공 순서 (3-2) ---------- */
  V.add('interior.stud', {
    title: '스터드 벽체 한 장 세우기',
    w: 480, h: 300,
    dur: 1200,
    states: [
      { tag: '1', cap: '먹매김: 도면대로 바닥과 천장에 런너가 놓일 선을 그어요.' },
      { tag: '2', cap: '하부 런너를 바닥에 600mm 간격으로 고정해요.' },
      { tag: '3', cap: '상부 런너를 천장 슬라브에 고정해요. 칸막이는 보통 슬라브까지 올려요.' },
      { tag: '4', cap: '스터드를 450mm 간격으로 세워요. 층고보다 10mm 짧게 자르고, 날개 방향은 한쪽으로 같게 해요.' },
      { tag: '5', cap: '문이 들어갈 자리는 스터드를 2겹으로 겹쳐 여닫을 때의 충격을 받게 해요.' },
      { tag: '6', cap: '한쪽 면에 바탕 석고보드(1ply)를 나사못으로 붙여요. 바닥에서 5~10mm 띄워요.' },
      { tag: '7', cap: '스터드 사이사이에 단열재를 채워요.' },
      { tag: '8', cap: '반대쪽 면에도 바탕 석고보드를 붙여요.' },
      { tag: '9', cap: '양쪽에 마감 석고보드(2ply)를 1ply 와 경계가 엇갈리게 붙여요. 벽 두께는 9.5 + 9.5 + 65 + 9.5 + 9.5 = 103mm, 도면에는 100mm 로 그려요.' },
      { tag: '10', cap: '이음매에 조인트 테이프를 붙이고 컴파운드로 메운 뒤 24시간 굳혀요. 그다음 퍼티, 도장이나 도배예요.' },
    ],
    build(ctx) {
      const g = ctx.g = {};
      const X0 = 20, SP = 55, FL = 196, CE = 24;
      g.X0 = X0; g.SP = SP; g.FL = FL; g.CE = CE;
      u.el(ctx.svg, 'rect', { x: 10, y: 10, width: 460, height: 14, class: 'vz-wall' });
      u.el(ctx.svg, 'rect', { x: 10, y: FL + 4, width: 460, height: 8, class: 'vz-wall' });
      g.chalk = [u.el(ctx.svg, 'line', { x1: X0, x2: X0 + 8 * SP, y1: FL + 2, y2: FL + 2, class: 'vz-e cr' }), u.el(ctx.svg, 'line', { x1: X0, x2: X0 + 8 * SP, y1: CE + 2, y2: CE + 2, class: 'vz-e cr' })];
      g.chalk.forEach(l => { l.style.strokeDasharray = '6 5'; });
      g.botR = u.el(ctx.svg, 'rect', { x: X0 - 4, y: FL - 6, width: 8 * SP + 8, height: 8, class: 'vz-bar mu' });
      g.topR = u.el(ctx.svg, 'rect', { x: X0 - 4, y: CE, width: 8 * SP + 8, height: 8, class: 'vz-bar mu' });
      g.anch = [0, 1, 2, 3, 4, 5].map(i => u.el(ctx.svg, 'circle', { cx: X0 + 20 + i * 73, cy: FL - 2, r: 3, class: 'vz-dot cr' }));
      g.anchT = u.el(ctx.svg, 'text', { x: X0 + 56, y: FL - 12, 'text-anchor': 'middle', class: 'vz-ta' }, '@600');
      g.studs = [];
      for (let n = 0; n <= 8; n++) {
        if (n === 6) continue;
        g.studs.push({ n, r: u.el(ctx.svg, 'rect', { x: X0 + n * SP - 3, y: CE + 9, width: 6, height: FL - CE - 16, class: 'vz-bar' }) });
      }
      g.dbl = [5, 7].map(n => u.el(ctx.svg, 'rect', { x: X0 + n * SP + (n === 5 ? 3 : -9), y: CE + 9, width: 6, height: FL - CE - 16, class: 'vz-bar cr' }));
      g.door = u.el(ctx.svg, 'rect', { x: X0 + 5 * SP + 9, y: 80, width: 2 * SP - 18, height: FL - 86, rx: 2, class: 'vz-box off' });
      g.doorT = u.el(ctx.svg, 'text', { x: X0 + 6 * SP, y: 140, 'text-anchor': 'middle', class: 'vz-tc' }, '문');
      g.spT = u.el(ctx.svg, 'text', { x: X0 + 1.5 * SP, y: 60, 'text-anchor': 'middle', class: 'vz-ta' }, '@450');
      g.shortT = u.el(ctx.svg, 'text', { x: X0 + 3 * SP + 8, y: 44, class: 'vz-ts' }, '층고보다 10mm 짧게');
      // 보드 (앞면만 보여 줌): 1ply 900 폭 = 2칸, 2ply 는 한 칸 엇갈림
      g.ply1 = [0, 2].map(i => u.el(ctx.svg, 'rect', { x: X0 + i * SP + 1, y: CE + 12, width: 2 * SP - 2, height: FL - CE - 20, class: 'vz-box' }));
      g.ply1.push(u.el(ctx.svg, 'rect', { x: X0 + 4 * SP + 1, y: CE + 12, width: SP - 2, height: FL - CE - 20, class: 'vz-box' }));
      g.ply2 = [[1, 2], [3, 2]].map(([i, w]) => u.el(ctx.svg, 'rect', { x: X0 + i * SP + 1, y: CE + 12, width: w * SP - 2, height: FL - CE - 20, class: 'vz-box tl' }));
      g.ply2.push(u.el(ctx.svg, 'rect', { x: X0 + 1, y: CE + 12, width: SP - 2, height: FL - CE - 20, class: 'vz-box tl' }));
      g.gapT = u.el(ctx.svg, 'text', { x: X0 + 2 * SP, y: FL - 12, 'text-anchor': 'middle', class: 'vz-ta' }, '바닥에서 5~10mm 띄움');
      g.tape = [1, 3, 5].map(n => u.el(ctx.svg, 'rect', { x: X0 + n * SP - 4, y: CE + 12, width: 8, height: FL - CE - 20, class: 'vz-bar am' }));
      g.tapeT = u.el(ctx.svg, 'text', { x: X0 + 2 * SP, y: 110, 'text-anchor': 'middle', class: 'vz-tb' }, '24시간 경화');
      // 아래: 벽 단면 (위에서 본 모양), 1mm = 2.6px
      const PY = 240, S = 2.6, PX = 100;
      g.plan = [['A2', 9.5, 'vz-box tl'], ['A1', 9.5, 'vz-box'], ['C', 65, 'vz-area'], ['B1', 9.5, 'vz-box'], ['B2', 9.5, 'vz-box tl']];
      let x = PX;
      g.planR = g.plan.map(([id, t, c]) => { const r = u.el(ctx.svg, 'rect', { x, y: PY, width: t * S, height: 30, class: c }); const lab = u.el(ctx.svg, 'text', { x: x + t * S / 2, y: PY + 48, 'text-anchor': 'middle', class: 'vz-ts' }, String(t)); x += t * S; return { id, r, lab }; });
      g.planStud = [0, 1].map(i => u.el(ctx.svg, 'rect', { x: PX + 19 * S + (i ? 65 * S - 4 : 0), y: PY - 2, width: 4, height: 34, class: 'vz-bar' }));
      g.ins = u.el(ctx.svg, 'rect', { x: PX + 19 * S + 6, y: PY + 4, width: 65 * S - 12, height: 22, class: 'vz-bar am' });
      g.planT = u.el(ctx.svg, 'text', { x: 12, y: PY + 20, class: 'vz-ts' }, '단면');
      g.total = u.el(ctx.svg, 'text', { x: PX + 103 * S + 10, y: PY + 20, class: 'vz-tb' }, '');
    },
    draw(ctx, s, k) {
      const g = ctx.g;
      g.chalk.forEach(l => u.op(l, s === 0 ? seg(k === 1 ? 1 : k, 0, 1) : s <= 2 ? 0.6 : 0));
      u.op(g.chalk[0], s === 0 ? 1 : s <= 2 ? 0.6 : 0);
      const b = shown(s, k, 1), t = shown(s, k, 2), st = shown(s, k, 3), dbl = shown(s, k, 4);
      u.op(g.botR, b); u.op(g.topR, t);
      g.anch.forEach((a, i) => u.op(a, s === 1 ? seg(k, i * 0.12, i * 0.12 + 0.2) : 0));
      u.op(g.anchT, s === 1 ? seg(k, 0.5, 1) : 0);
      g.studs.forEach((x, i) => { u.op(x.r, seg(st, i * 0.1, i * 0.1 + 0.2)); x.r.setAttribute('class', 'vz-bar' + ((x.n === 5 || x.n === 7) && s === 4 ? ' cr' : '')); });
      u.op(g.spT, s === 3 ? seg(k, 0.6, 1) : 0); u.op(g.shortT, s === 3 ? seg(k, 0.7, 1) : 0);
      g.dbl.forEach(d => u.op(d, dbl));
      u.op(g.door, dbl); u.op(g.doorT, dbl);
      const p1 = shown(s, k, 5), p2 = shown(s, k, 8), tp = shown(s, k, 9);
      g.ply1.forEach((r, i) => { u.op(r, seg(p1, i * 0.25, i * 0.25 + 0.3) * (s >= 6 && s <= 7 ? 0.35 : 1)); });
      g.ply2.forEach((r, i) => u.op(r, seg(p2, i * 0.25, i * 0.25 + 0.3)));
      u.op(g.gapT, s === 5 ? seg(k, 0.6, 1) : 0);
      g.tape.forEach((r, i) => u.op(r, seg(tp, i * 0.2, i * 0.2 + 0.3)));
      u.op(g.tapeT, s === 9 ? seg(k, 0.7, 1) : 0);
      const lay = { A1: shown(s, k, 5), C: shown(s, k, 3), B1: shown(s, k, 7), A2: p2, B2: p2 };
      g.planR.forEach(x => { u.op(x.r, lay[x.id]); u.op(x.lab, lay[x.id] > 0.5 ? 1 : 0); });
      g.planStud.forEach(r => u.op(r, st));
      u.op(g.ins, shown(s, k, 6));
      u.op(g.planT, st);
      const sum = [9.5 * (lay.A2 > 0.5), 9.5 * (lay.A1 > 0.5), 65 * (lay.C > 0.5), 9.5 * (lay.B1 > 0.5), 9.5 * (lay.B2 > 0.5)].reduce((a, c) => a + c, 0);
      u.txt(g.total, '= ' + num(sum, 1) + 'mm'); u.op(g.total, sum > 0 ? 1 : 0);
      g.total.setAttribute('class', s >= 8 ? 'vz-ta' : 'vz-tb');
    },
  });

  /* ---------- 2. M-Bar 천장틀 시공 순서 (3-4, 3-5) ---------- */
  V.add('interior.ceiling', {
    title: 'M-Bar 천장, 위에서 아래로',
    w: 480, h: 300,
    dur: 1200,
    states: [
      { tag: '1', cap: '중심선을 잡고 슬라브에 스트롱 앵커를 900~1,200mm 간격으로 박아요. 망치로 치면 머리가 벌어지며 고정돼요.' },
      { tag: '2', cap: '벽에 테두리 몰딩을 붙여요. 고정못 간격이 600mm 를 넘으면 몰딩이 처져요.' },
      { tag: '3', cap: '달대 볼트(행거볼트)와 행거를 달아요. 너트를 살짝 풀어 두어 나중에 높이를 맞춰요.' },
      { tag: '4', cap: '캐링 채널을 행거에 걸어요. 약 900mm 간격, 벽에서 50mm 이하, 이음은 엇갈리게 조인트로 이어요.' },
      { tag: '5', cap: '캐링 채널 위에 마이너 채널을 2,000~3,000mm 간격으로 직각으로 묶어 흔들림을 막아요.' },
      { tag: '6', cap: 'M-Bar 를 300mm 간격으로 캐링 채널과 직각으로 걸고 M-Bar 클립으로 고정해요.' },
      { tag: '7', cap: '레이저 수평기로 수평을 맞춘 뒤 행거 너트를 조여요.' },
      { tag: '8', cap: '석고보드 1ply 를 300mm 간격 나사못으로 M-Bar 에 고정해요.' },
      { tag: '9', cap: '2ply 는 1ply 와 경계를 300mm 이상 엇갈리게, 나사못으로 고정해요. 머리 위라 타카는 절대 금지예요.' },
      { tag: '보강', cap: '달대 볼트가 1.5m 이상 길어지면 C-형강 보강틀에 매달아요. 긴 줄의 그네처럼 천장이 울렁이기 때문이에요.' },
    ],
    build(ctx) {
      const g = ctx.g = {};
      const Y = g.Y = { slab: 34, cc: 150, mb: 160, b1: 170, b2: 177 };
      u.el(ctx.svg, 'rect', { x: 0, y: 14, width: 480, height: 20, class: 'vz-wall' });
      u.el(ctx.svg, 'rect', { x: 0, y: 14, width: 14, height: 240, class: 'vz-wall' });
      u.el(ctx.svg, 'text', { x: 470, y: 29, 'text-anchor': 'end', class: 'vz-ts' }, '');
      g.hx = [75, 185, 295, 405];
      g.anch = g.hx.map(x => u.el(ctx.svg, 'path', { d: 'M' + (x - 5) + ' 34 l5 10 l5 -10', class: 'vz-bar cr' }));
      g.dim900 = u.el(ctx.svg, 'text', { x: 130, y: 58, 'text-anchor': 'middle', class: 'vz-ta' }, '@900~1,200');
      g.mold = u.el(ctx.svg, 'path', { d: 'M14 ' + Y.b2 + ' h22 v7 h-22 z', class: 'vz-bar am' });
      g.bolts = g.hx.map(x => u.el(ctx.svg, 'line', { x1: x, x2: x, y1: 44, class: 'vz-e' }));
      g.bolts.forEach(b => { b.style.strokeDasharray = '3 2'; });
      g.hang = g.hx.map(x => u.el(ctx.svg, 'rect', { x: x - 5, width: 10, height: 10, class: 'vz-bar' }));
      g.cc = u.el(ctx.svg, 'rect', { y: Y.cc - 6, height: 8, class: 'vz-bar' });
      g.ccJoint = u.el(ctx.svg, 'rect', { x: 236, y: Y.cc - 8, width: 18, height: 12, rx: 2, class: 'vz-box am' });
      g.wall50 = u.el(ctx.svg, 'text', { x: 24, y: Y.cc - 16, class: 'vz-ta' }, '벽에서 50mm 이하');
      g.minor = [110, 400].map(x => u.el(ctx.svg, 'rect', { x: x - 6, y: Y.cc - 18, width: 12, height: 12, class: 'vz-bar tl' }));
      g.minorT = u.el(ctx.svg, 'text', { x: 255, y: Y.cc - 26, 'text-anchor': 'middle', class: 'vz-tt' }, '마이너 채널 @2,000~3,000');
      g.mbars = Array.from({ length: 12 }, (_, i) => u.el(ctx.svg, 'rect', { x: 30 + i * 37 - 4, y: Y.mb - 6, width: 8, height: 8, class: 'vz-bar' }));
      g.mbT = u.el(ctx.svg, 'text', { x: 48, y: Y.mb + 34, 'text-anchor': 'middle', class: 'vz-ta' }, '@300');
      g.level = u.el(ctx.svg, 'line', { x1: 14, y1: Y.mb - 2, y2: Y.mb - 2, class: 'vz-e cr' });
      g.level.style.strokeDasharray = '8 4';
      g.ply1 = [0, 1, 2].map(i => u.el(ctx.svg, 'rect', { x: 16 + i * 150, y: Y.b1 - 3, width: 148, height: 6, class: 'vz-bar mu' }));
      g.screws = Array.from({ length: 12 }, (_, i) => u.el(ctx.svg, 'circle', { cx: 30 + i * 37, cy: Y.b1, r: 2.5, class: 'vz-dot cr' }));
      g.ply2 = [[16, 90], [108, 150], [260, 150], [412, 58]].map(([x, w]) => u.el(ctx.svg, 'rect', { x, y: Y.b2 - 3, width: w - 2, height: 6, class: 'vz-bar tl' }));
      g.stagT = u.el(ctx.svg, 'text', { x: 138, y: Y.b2 + 22, 'text-anchor': 'middle', class: 'vz-ta' }, '경계 300mm 이상 엇갈림');
      g.noTaca = u.el(ctx.svg, 'g');
      u.el(g.noTaca, 'rect', { x: 290, y: 212, width: 170, height: 40, rx: 8, class: 'vz-box cr' });
      u.el(g.noTaca, 'text', { x: 375, y: 237, 'text-anchor': 'middle', class: 'vz-tc' }, '타카 금지, 나사못만');
      g.cframe = u.el(ctx.svg, 'rect', { x: 40, y: 92, width: 400, height: 10, class: 'vz-bar am' });
      g.cT = u.el(ctx.svg, 'text', { x: 240, y: 86, 'text-anchor': 'middle', class: 'vz-tb' }, 'C-형강 보강틀 (달대 1.5m 이상)');
      g.label = u.el(ctx.svg, 'text', { x: 240, y: 290, 'text-anchor': 'middle', class: 'vz-tb' }, '');
    },
    draw(ctx, s, k) {
      const g = ctx.g, Y = g.Y;
      g.anch.forEach((a, i) => u.op(a, s === 0 ? seg(k, i * 0.15, i * 0.15 + 0.3) : 1));
      u.op(g.dim900, s === 0 ? seg(k, 0.6, 1) : s === 2 ? 1 : 0);
      u.op(g.mold, shown(s, k, 1));
      const hb = shown(s, k, 2);
      const lvl = s >= 6 ? 0 : 1;   // 수평 맞추기 전에는 행거 높이가 조금씩 달라요
      const off = [4, -3, 5, -2];
      g.bolts.forEach((b, i) => { const yb = Y.cc - 10 + off[i] * lvl * (s === 6 ? 1 - seg(k, 0.2, 0.9) : 1); u.set(b, { y2: 44 + (yb - 44) * hb }); u.op(b, hb > 0 ? 1 : 0); });
      g.hang.forEach((h, i) => { const yb = Y.cc - 10 + off[i] * lvl * (s === 6 ? 1 - seg(k, 0.2, 0.9) : 1); u.set(h, { y: yb - 2 }); u.op(h, hb); });
      const c = shown(s, k, 3);
      u.set(g.cc, { x: 20, width: 444 * c }); u.op(g.cc, c > 0 ? 1 : 0);
      u.op(g.ccJoint, s === 3 ? seg(k, 0.7, 1) : 0); u.op(g.wall50, s === 3 ? seg(k, 0.5, 1) : 0);
      const mi = shown(s, k, 4);
      g.minor.forEach((m, i) => u.op(m, seg(mi, i * 0.3, i * 0.3 + 0.4)));
      u.op(g.minorT, s === 4 ? seg(k, 0.5, 1) : 0);
      const mb = shown(s, k, 5);
      g.mbars.forEach((m, i) => u.op(m, seg(mb, i / 14, i / 14 + 0.15)));
      u.op(g.mbT, s === 5 ? seg(k, 0.6, 1) : 0);
      u.set(g.level, { x2: 14 + 450 * (s === 6 ? seg(k, 0, 0.5) : 0) }); u.op(g.level, s === 6 ? 1 : 0);
      const b1 = shown(s, k, 7), b2 = shown(s, k, 8);
      g.ply1.forEach((p, i) => u.op(p, seg(b1, i * 0.2, i * 0.2 + 0.3)));
      g.screws.forEach((d, i) => u.op(d, s === 7 ? seg(k, 0.5 + i * 0.03, 0.55 + i * 0.03) : s > 7 && s < 9 ? 1 : 0));
      g.ply2.forEach((p, i) => u.op(p, seg(b2, i * 0.2, i * 0.2 + 0.3)));
      u.op(g.stagT, s === 8 ? seg(k, 0.6, 1) : 0);
      u.op(g.noTaca, s === 8 ? seg(k, 0.7, 1) : 0);
      const cf = s === 9 ? k : 0;
      u.op(g.cframe, cf); u.op(g.cT, cf);
      u.txt(g.label, ['스트롱 앵커', '테두리 몰딩', '행거볼트와 행거', '캐링 채널', '마이너 채널', 'M-Bar', '수평 맞추기', '석고보드 1ply', '석고보드 2ply', '보강틀'][s]);
    },
  });

  /* ---------- 3. 강관비계 설치 기준과 보양 (2-8) ---------- */
  const M = 42;   // 1m = 42px
  V.add('interior.scaffold', {
    title: '강관비계 기준 숫자',
    w: 480, h: 300,
    dur: 1100,
    params: { span: 1.85 },
    controls: [{ key: 'span', type: 'range', label: '비계기둥 간격 (띠장 방향)', min: 1.2, max: 2.4, step: 0.05, fmt: v => num(v, 2) + ' m' }],
    capsDependOn: true,
    states(P) {
      const ang = Math.atan(2 / P.span) * 180 / Math.PI;
      return [
        { set: { span: 1.85 }, cap: '비계는 높은 곳에서 일하려고 세우는 임시 발판이에요. 외경 약 48.6mm 강관을 클램프로 조여 만들어요.' },
        { set: { span: 1.85 }, tag: '기둥', cap: '비계기둥 간격은 띠장 방향(앞에서 본 가로) 1.85m 이하예요.' },
        { set: { span: 2.2 }, tag: '넘치면', cap: '2.2m 로 벌리면 기준을 넘어요. 막대로 간격을 바꿔 보세요.' },
        { set: { span: 1.85 }, tag: '띠장', cap: '작업 발판 사이 높이인 띠장 간격은 2m 이하예요.' },
        { set: { span: 1.85 }, tag: '가새', cap: '가새는 40~60도로 비스듬히 걸어 흔들림을 막아요. 지금 그림은 약 ' + Math.round(ang) + '도예요.' },
        { set: { span: 1.85 }, tag: '발판', cap: '작업발판과 안전 난간(상부, 중간 난간대, 발끝막이판)을 달아요. 기둥 사이 적재하중은 400kg 이하예요.' },
        { tag: '보양', cap: '끝난 마감은 덮어 지켜요. 바닥 타일은 합판, 도장할 때 벽은 비닐, 모서리와 문틀은 각대로 보양해요.' },
      ];
    },
    build(ctx) {
      const g = ctx.g = {};
      g.G = 268;
      u.el(ctx.svg, 'rect', { x: 0, y: g.G, width: 480, height: 32, class: 'vz-area' });
      u.el(ctx.svg, 'rect', { x: 0, y: 0, width: 480, height: 4, class: 'vz-area' });
      g.scene = u.el(ctx.svg, 'g');
      g.cols = [0, 1, 2, 3, 4].map(() => u.el(g.scene, 'rect', { y: 30, width: 6, height: g.G - 30, class: 'vz-bar' }));
      g.ledgers = [1, 2, 3].map(() => u.el(g.scene, 'rect', { height: 5, class: 'vz-bar' }));
      g.braces = [0, 1].map(() => u.el(g.scene, 'line', { class: 'vz-e cr' }));
      g.boards = [1, 2].map(() => u.el(g.scene, 'rect', { height: 8, class: 'vz-bar am' }));
      g.rails = [0, 1, 2].map(() => u.el(g.scene, 'rect', { height: 3, class: 'vz-bar tl' }));
      g.clamp = u.el(g.scene, 'circle', { r: 9, class: 'vz-hl' });
      g.dimS = u.el(g.scene, 'text', { 'text-anchor': 'middle', class: 'vz-tb' }, '');
      g.dimL = u.el(g.scene, 'text', { class: 'vz-ta' }, '2m 이하');
      g.angT = u.el(g.scene, 'text', { class: 'vz-tc' }, '');
      g.load = u.el(g.scene, 'text', { class: 'vz-tb' }, '400kg 이하');
      g.tube = u.el(g.scene, 'text', { x: 12, y: 50, class: 'vz-ts' }, '');
      // 보양 장면
      g.yang = u.el(ctx.svg, 'g');
      u.el(g.yang, 'rect', { x: 20, y: 30, width: 440, height: 238, class: 'vz-area' });
      u.el(g.yang, 'rect', { x: 60, y: 250, width: 360, height: 10, class: 'vz-box' });
      g.ply = u.el(g.yang, 'rect', { x: 60, y: 238, width: 360, height: 12, class: 'vz-bar am' });
      g.plyT = u.el(g.yang, 'text', { x: 240, y: 232, 'text-anchor': 'middle', class: 'vz-tb' }, '합판 (바닥 타일, 석재 위)');
      g.vinyl = u.el(g.yang, 'path', { d: 'M420 40 q14 50 0 100 q14 50 0 98', class: 'vz-curve tl' });
      g.vinylT = u.el(g.yang, 'text', { x: 410, y: 60, 'text-anchor': 'end', class: 'vz-tt' }, '비닐 (벽, 도장 때)');
      g.corner = u.el(g.yang, 'path', { d: 'M60 120 v110 h8 v-110 z', class: 'vz-bar cr' });
      g.cornerT = u.el(g.yang, 'text', { x: 76, y: 110, class: 'vz-tc' }, '각대 (모서리, 문틀)');
    },
    draw(ctx, s, k) {
      const g = ctx.g, G = g.G;
      const prevSpan = [1.85, 1.85, 1.85, 2.2, 1.85, 1.85, 1.85][s];
      let span = ctx.p.span;
      if (k < 1 && s >= 2 && s <= 3) span = u.lerp(prevSpan, span, u.ease(k));
      const X0 = 40, w = span * M, lift = 2 * M;
      const colP = at(s, k, 1);
      g.cols.forEach((c, i) => { u.set(c, { x: X0 + i * w - 3, y: G - 3 * lift - 10, height: 3 * lift + 10 }); u.op(c, seg(colP, i * 0.15, i * 0.15 + 0.3)); c.setAttribute('class', 'vz-bar' + (span > 1.85 + 1e-6 ? ' cr' : '')); });
      const led = at(s, k, 3);
      g.ledgers.forEach((l, i) => { u.set(l, { x: X0, y: G - (i + 1) * lift - 2, width: 4 * w }); u.op(l, seg(led, i * 0.25, i * 0.25 + 0.4)); });
      const br = at(s, k, 4);
      g.braces.forEach((b, i) => { u.set(b, { x1: X0 + i * 2 * w, y1: G - i * lift, x2: X0 + (i * 2 + 1) * w, y2: G - (i + 1) * lift }); u.op(b, seg(br, i * 0.3, i * 0.3 + 0.5)); });
      const bd = at(s, k, 5);
      g.boards.forEach((b, i) => { u.set(b, { x: X0, y: G - (i + 1) * lift - 10, width: 4 * w }); u.op(b, bd); });
      g.rails.forEach((r, i) => { const y = G - 2 * lift - 10 - [36, 18, 4][i]; u.set(r, { x: X0, y, width: 4 * w, height: i === 2 ? 6 : 3 }); u.op(r, seg(bd, 0.3 + i * 0.15, 0.6 + i * 0.15)); });
      u.set(g.clamp, { cx: X0 + w, cy: G - lift }); u.op(g.clamp, s === 0 ? 1 : 0);
      u.txt(g.tube, s === 0 ? '강관 외경 약 48.6mm, 클램프로 연결' : '');
      u.set(g.dimS, { x: X0 + w / 2, y: G + 20 }); u.txt(g.dimS, num(span, 2) + 'm' + (span > 1.85 + 1e-6 ? ' 초과' : ' (1.85 이하)'));
      g.dimS.setAttribute('class', span > 1.85 + 1e-6 ? 'vz-tc' : 'vz-tb'); u.op(g.dimS, colP > 0.5 && s < 6 ? 1 : 0);
      u.set(g.dimL, { x: X0 + 4 * w + 8, y: G - lift / 2 }); u.op(g.dimL, s === 3 ? seg(k, 0.6, 1) : s > 3 && s < 6 ? 0.6 : 0);
      const ang = Math.atan(lift / w) * 180 / Math.PI;
      u.set(g.angT, { x: X0 + w + 8, y: G - 14 }); u.txt(g.angT, Math.round(ang) + '도'); u.op(g.angT, s === 4 ? seg(k, 0.6, 1) : 0);
      u.set(g.load, { x: X0 + w * 1.5, y: G - lift - 20 }); u.op(g.load, s === 5 ? seg(k, 0.7, 1) : 0);
      const y6 = s === 6 ? k : 0;
      u.op(g.scene, 1 - y6 * 0.9);
      u.op(g.yang, y6);
      u.op(g.ply, seg(y6, 0.2, 0.5)); u.op(g.plyT, seg(y6, 0.2, 0.5));
      u.op(g.vinyl, seg(y6, 0.45, 0.75)); u.op(g.vinylT, seg(y6, 0.45, 0.75));
      u.op(g.corner, seg(y6, 0.7, 1)); u.op(g.cornerT, seg(y6, 0.7, 1));
    },
  });

  /* ---------- 4. 공사를 맡기는 방식과 돈 주는 방식 (2-2) ---------- */
  V.add('interior.contract', {
    title: '직영, 도급, 턴키',
    w: 480, h: 300,
    dur: 1200,
    states: [
      { tag: '직영', cap: '발주자가 재료를 사고, 기술자를 부르고, 장비를 빌려 직접 관리해요. 셀프 인테리어와 같아요.' },
      { tag: '일식도급', cap: '한 업체(원도급자)에 전부 맡겨요. 설계는 포함되지 않아요. 공사비가 확정되고 책임이 분명해요.' },
      { tag: '분할도급', cap: '공종별로 쪼개 전문업체와 따로 계약해요. 기술은 전문화되지만 공사 관리가 복잡해요.' },
      { tag: '공동도급', cap: '여러 회사가 한 팀(공동수급체)을 꾸려 큰 공사를 받아요. 같은 업종이면 공동이행, 다른 업종이면 분담이행.' },
      { tag: '턴키', cap: '설계와 시공을 한 번에 맡겨요. 열쇠를 돌리면 바로 쓸 수 있게 넘겨받아요.' },
      { tag: '정액도급', cap: '공사비 총액을 먼저 딱 정해요. 관리가 간편하지만 설계가 바뀌면 금액을 고치기 어려워요.' },
      { tag: '단가도급', cap: '바닥 타일 1㎡당 50,000원으로 정하고, 끝난 뒤 실제 면적 120㎡ 로 계산하면 6,000,000원이에요.' },
      { tag: '실비정산', cap: '재료비 6,000만 + 노무비 3,000만 + 장비, 경비 1,000만 = 1억, 여기에 보수 1,000만을 더해 1억 1,000만 원.' },
    ],
    build(ctx) {
      const g = ctx.g = {};
      g.own = tag(ctx.svg, 60, 130, 96, 50, '발주자', '맡기는 사람');
      g.mid = tag(ctx.svg, 215, 130, 118, 60, '', '');
      g.mid2 = tag(ctx.svg, 215, 130, 118, 60, '', '');
      g.T = [0, 1, 2, 3, 4].map(i => tag(ctx.svg, 395, 30 + i * 50, 140, 40, '', ''));
      g.A = [0, 1, 2, 3, 4].map(() => u.arrow(ctx.svg));
      g.A0 = u.arrow(ctx.svg, 'tl');
      g.money = u.el(ctx.svg, 'g');
      g.bars = [['재료비', 6000, 'vz-k0'], ['노무비', 3000, 'vz-k2'], ['장비, 경비', 1000, 'vz-k1'], ['보수', 1000, 'vz-k3']].map(([n, v, c], i) => ({ r: u.el(g.money, 'rect', { y: 250, height: 26, class: 'vz-bar ' + c }), t: u.el(g.money, 'text', { y: 244, class: 'vz-ts' }, n), v }));
      g.moneyT = u.el(g.money, 'text', { x: 470, y: 294, 'text-anchor': 'end', class: 'vz-tb' }, '');
      g.area = u.el(ctx.svg, 'g');
      g.tiles = Array.from({ length: 120 }, (_, i) => u.el(g.area, 'rect', { x: 150 + (i % 20) * 16, y: 60 + Math.floor(i / 20) * 16, width: 14, height: 14, class: 'vz-bar tl' }));
      g.areaT = u.el(g.area, 'text', { x: 310, y: 180, 'text-anchor': 'middle', class: 'vz-tb' }, '');
      g.fixed = u.el(ctx.svg, 'g');
      u.el(g.fixed, 'rect', { x: 150, y: 90, width: 300, height: 70, rx: 10, class: 'vz-box on' });
      u.el(g.fixed, 'text', { x: 300, y: 122, 'text-anchor': 'middle', class: 'vz-tb' }, '계약할 때 총액을 확정');
      u.el(g.fixed, 'text', { x: 300, y: 146, 'text-anchor': 'middle', class: 'vz-ts' }, '계약금, 중도금, 잔금으로 나눠 지급');
    },
    draw(ctx, s, k) {
      const g = ctx.g;
      const conf = [
        { mid: null, T: [['공종별 전문업체'], ['작업자, 노무자'], ['자재 공급 업체'], ['장비, 가설재 임대']], from: 'own' },
        { mid: ['원도급자', '한 업체에 전부'], T: [['목공'], ['전기'], ['설비'], ['도장']], from: 'mid' },
        { mid: null, T: [['금속공사'], ['목공사'], ['전기공사'], ['설비공사'], ['창호공사']], from: 'own' },
        { mid: ['공동수급체', 'A사 + B사'], T: [['같은 업종: 공동이행'], ['다른 업종: 분담이행'], ['지역업체: 의무공동']], from: 'mid' },
        { mid: ['턴키 사업자', '설계, 시공, 관리'], T: [['설계팀'], ['현장관리팀'], ['시공팀'], ['공종별 하도급']], from: 'mid' },
      ][s] || null;
      const lay = s <= 4 ? 1 : 0;
      const pop = seg(k, 0.1, 0.7);
      u.op(g.own.g, 1);
      boxCls(g.mid, 'on');
      if (conf && conf.mid) { u.txt(g.mid.t, conf.mid[0]); u.txt(g.mid.s, conf.mid[1]); u.op(g.mid.g, pop); } else { u.txt(g.mid.t, ''); u.txt(g.mid.s, ''); u.op(g.mid.g, 0); }
      u.op(g.mid2.g, 0);
      u.setArrow(g.A0, [110, 130], [154, 130], conf && conf.mid ? pop : 0);
      g.T.forEach((t, i) => {
        const on = conf && conf.T[i];
        u.txt(t.t, on ? conf.T[i][0] : ''); u.set(t.t, { y: t.y + 5 });
        u.op(t.g, on ? seg(k, 0.2 + i * 0.1, 0.5 + i * 0.1) : 0);
        boxCls(t, s === 0 ? 'am' : s === 2 ? 'tl' : '');
        const from = conf && conf.from === 'mid' ? [276, 130] : [110, 130];
        u.setArrow(g.A[i], from, [323, t.y], on ? seg(k, 0.2 + i * 0.1, 0.6 + i * 0.1) : 0);
      });
      u.op(g.fixed, s === 5 ? seg(k, 0, 0.5) : 0);
      const a = s === 6 ? k : 0;
      const n = Math.round(120 * seg(a, 0.1, 0.9));
      g.tiles.forEach((t, i) => u.op(t, i < n ? 1 : 0));
      u.txt(g.areaT, '50,000원 × ' + n + '㎡ = ' + (50000 * n).toLocaleString('en-US') + '원');
      u.op(g.area, s === 6 ? 1 : 0);
      const m = s === 7 ? k : 0;
      let x = 20;
      g.bars.forEach((b, i) => {
        const w = b.v / 11000 * 440 * seg(m, i * 0.22, i * 0.22 + 0.3);
        u.set(b.r, { x, width: w }); u.set(b.t, { x });
        u.op(b.t, w > 1 ? 1 : 0);
        x += b.v / 11000 * 440;
      });
      const sumNow = g.bars.reduce((acc, b, i) => acc + b.v * (seg(m, i * 0.22, i * 0.22 + 0.3) >= 1 ? 1 : 0), 0);
      u.txt(g.moneyT, '합계 ' + sumNow.toLocaleString('en-US') + '만 원');
      u.op(g.money, s === 7 ? 1 : 0);
      u.op(g.own.g, lay ? 1 : (s === 7 || s === 6 || s === 5) ? 0.4 : 1);
    },
  });

  /* ---------- 5. 네트워크 공정표와 바차트, 주공정선 (2-5) ---------- */
  function plan(p) {
    const de = p.who === 'elec' ? p.delay : 0, dm = p.who === 'mech' ? p.delay : 0;
    const T = { demo: [0, 2] };
    T.elec = [2, 2 + 3 + de]; T.mech = [2, 2 + 2 + dm];
    const f0 = Math.max(T.elec[1], T.mech[1]);
    T.fin = [f0, f0 + 3]; T.paint = [f0 + 3, f0 + 5];
    return T;
  }
  V.add('interior.gantt', {
    title: '공정표와 주공정선',
    w: 480, h: 300,
    dur: 1200,
    params: { who: 'elec', delay: 0 },
    controls: [
      { key: 'who', type: 'choice', label: '늦어지는 작업', options: [['elec', '전기'], ['mech', '설비']] },
      { key: 'delay', type: 'range', label: '며칠 늦나', min: 0, max: 3, step: 1, fmt: v => v + '일' },
    ],
    capsDependOn: true,
    states(P) {
      const T = plan(P);
      return [
        { set: { who: 'elec', delay: 0 }, cap: '작업 표: 철거 2일, 전기 배선 3일, 설비 배관 2일, 천장과 벽 마감 3일, 도장 2일.' },
        { set: { who: 'elec', delay: 0 }, tag: '선행', cap: '철거부터 해요. 철거가 끝나야 전기와 설비를 시작할 수 있어요.' },
        { set: { who: 'elec', delay: 0 }, tag: '병행', cap: '전기와 설비는 동시에 해요. 전기는 5일째, 설비는 4일째 끝나요.' },
        { set: { who: 'elec', delay: 0 }, tag: '대기', cap: '마감은 전기와 설비가 모두 끝난 5일째부터 3일이에요.' },
        { set: { who: 'elec', delay: 0 }, cap: '도장 2일까지 하면 10일에 준공해요. 이렇게 막대로 그린 표가 바차트예요.' },
        { set: { who: 'elec', delay: 0 }, tag: '주공정선', cap: '가장 긴 길 철거 2 + 전기 3 + 마감 3 + 도장 2 = 10일이 주공정선이에요. 설비 길은 9일이에요.' },
        { set: { who: 'mech', delay: 1 }, tag: '여유시간', cap: '설비가 하루 늦어도 전기와 같은 날 끝나서 준공은 그대로 10일이에요. 이 하루가 여유시간(Float)이에요.' },
        { set: { who: 'elec', delay: 1 }, tag: '지연', cap: '주공정선의 전기가 하루 늦으면 마감과 도장이 밀려 준공이 ' + (T.paint[1]) + '일이 돼요. 막대로 바꿔 보세요.' },
      ];
    },
    build(ctx) {
      const g = ctx.g = {};
      const nodes = { s: [24, 40], demo: [100, 40], elec: [200, 18], mech: [200, 62], fin: [300, 40], paint: [390, 40], e: [460, 40] };
      g.nodes = nodes;
      g.netE = [['s', 'demo'], ['demo', 'elec'], ['demo', 'mech'], ['elec', 'fin'], ['mech', 'fin'], ['fin', 'paint'], ['paint', 'e']].map(([a, b]) => ({ a, b, ar: u.arrow(ctx.svg) }));
      const names = { s: '시작', demo: '철거', elec: '전기', mech: '설비', fin: '마감', paint: '도장', e: '준공' };
      g.netN = {};
      Object.keys(nodes).forEach(id => { g.netN[id] = u.node(ctx.svg, nodes[id][0], nodes[id][1], 17, names[id]); g.netN[id].t.setAttribute('class', 'vz-nt vz-ts'); });
      const X0 = 92, DX = 29, Y0 = 108, RH = 30;
      g.X0 = X0; g.DX = DX;
      for (let d = 0; d <= 12; d++) {
        u.el(ctx.svg, 'line', { x1: X0 + d * DX, x2: X0 + d * DX, y1: Y0 - 6, y2: Y0 + 5 * RH, class: 'vz-grid' });
        if (d % 2 === 0) u.el(ctx.svg, 'text', { x: X0 + d * DX, y: Y0 + 5 * RH + 16, 'text-anchor': 'middle', class: 'vz-ts' }, d + '일');
      }
      g.rows = [['demo', '철거', 2], ['elec', '전기 배선', 3], ['mech', '설비 배관', 2], ['fin', '천장, 벽 마감', 3], ['paint', '도장', 2]].map(([id, n, d], i) => ({
        id, d,
        lab: u.el(ctx.svg, 'text', { x: 8, y: Y0 + i * RH + 18, class: 'vz-ts' }, n + ' ' + d + '일'),
        bar: u.el(ctx.svg, 'rect', { y: Y0 + i * RH + 4, height: 20, rx: 3, class: 'vz-bar' }),
        late: u.el(ctx.svg, 'rect', { y: Y0 + i * RH + 4, height: 20, rx: 3, class: 'vz-bar am' }),
        float: u.el(ctx.svg, 'rect', { y: Y0 + i * RH + 8, height: 12, rx: 3, class: 'vz-box off' }),
      }));
      g.end = u.el(ctx.svg, 'line', { y1: Y0 - 10, y2: Y0 + 5 * RH, class: 'vz-e cr' });
      g.endT = u.el(ctx.svg, 'text', { y: Y0 - 14, 'text-anchor': 'middle', class: 'vz-tc' }, '');
    },
    draw(ctx, s, k) {
      const g = ctx.g, P = ctx.p;
      const T = plan(P);
      const base = plan({ who: 'elec', delay: 0 });
      const crit = T.elec[1] >= T.mech[1] ? 'elec' : 'mech';
      const critOn = s >= 5;
      const step = { demo: 1, elec: 2, mech: 2, fin: 3, paint: 4 };
      g.rows.forEach(r => {
        const [a, b] = T[r.id];
        const baseLen = r.d;
        const grow = at(s, k, step[r.id]);
        const start = a, full = b - a;
        const w = full * g.DX * grow;
        u.set(r.bar, { x: g.X0 + start * g.DX, width: Math.max(0, Math.min(baseLen, full) * g.DX * grow) });
        const lateD = full - baseLen;
        u.set(r.late, { x: g.X0 + (start + baseLen) * g.DX, width: Math.max(0, lateD * g.DX * grow) });
        u.op(r.late, lateD > 0 && grow > 0 ? 1 : 0);
        u.op(r.bar, grow > 0 ? 1 : 0);
        const isCrit = critOn && (r.id === 'demo' || r.id === crit || r.id === 'fin' || r.id === 'paint');
        r.bar.setAttribute('class', 'vz-bar' + (isCrit ? ' cr' : ''));
        const other = crit === 'elec' ? 'mech' : 'elec';
        const fl = (s === 5 || s === 6) && r.id === other ? T[crit][1] - T[other][1] : 0;
        u.set(r.float, { x: g.X0 + T[other][1] * g.DX, width: Math.max(0, fl) * g.DX });
        u.op(r.float, fl > 0 ? seg(k === 1 ? 1 : k, 0.5, 1) : 0);
        u.op(r.lab, 1);
      });
      const endDay = T.paint[1];
      const eo = at(s, k, 4);
      u.set(g.end, { x1: g.X0 + endDay * g.DX, x2: g.X0 + endDay * g.DX }); u.op(g.end, eo);
      u.set(g.endT, { x: g.X0 + endDay * g.DX }); u.txt(g.endT, '준공 ' + endDay + '일'); u.op(g.endT, eo);
      g.netE.forEach(e => {
        const on = critOn && ['s', 'demo', crit, 'fin', 'paint', 'e'].indexOf(e.a) >= 0 && ['demo', crit, 'fin', 'paint', 'e'].indexOf(e.b) >= 0;
        e.ar.g.setAttribute('class', 'vz-arr' + (on ? ' cr' : ''));
        const A = g.nodes[e.a], B = g.nodes[e.b];
        const [p, q] = u.shrink(A, B, 18, 18);
        u.setArrow(e.ar, p, q, 1);
      });
      Object.keys(g.netN).forEach(id => {
        const on = critOn && ['demo', crit, 'fin', 'paint'].indexOf(id) >= 0;
        g.netN[id].g.setAttribute('class', 'vz-node' + (on ? ' cr' : (s >= 1 && s <= 4 && step[id] === s) ? ' on' : ''));
      });
      void base;
    },
  });

  /* ---------- 6. 철거공사와 폐기물 (2-9) ---------- */
  V.add('interior.demolish', {
    title: '철거는 막고, 걷고, 나누고',
    w: 480, h: 300,
    dur: 1300,
    states: [
      { cap: '새 인테리어 전의 방이에요. 기존 천장재, 벽 마감, 바닥재와 벽돌 칸막이벽이 있어요.' },
      { tag: '막기', cap: '뜯기 전에 수도, 전기, 인터넷, 스프링클러, 덕트 배관을 먼저 막아요.' },
      { tag: '대비', cap: '분진흡입기, 안전망, 방음벽을 세우고, 먼지가 날리지 않게 수시로 물을 뿌려요.' },
      { tag: '철거', cap: '마감재(천장재, 벽재, 바닥재)를 걷어내요. 실내는 대부분 사람이 공구와 소형 장비로 해서 안전교육을 해요.' },
      { tag: '해체', cap: '벽돌벽 같은 구조체는 해체해요. 압쇄기는 유압으로 눌러 부숴 소음과 진동이 적고, 핸드 브레이커는 소음이 가장 커요.' },
      { tag: '분리', cap: '폐기물은 종류별로 나눠요. 건설폐재류(콘크리트, 벽돌), 목재, 금속, 합성수지. 석면이 든 텍스는 따로 처리해요.' },
      { tag: '위탁', cap: '허가받은 업체에 맡기고 위, 수탁 계약서는 3년간 보관해요. 폐자재가 정리되어야 본 공사를 시작해요.' },
    ],
    build(ctx) {
      const g = ctx.g = {};
      u.el(ctx.svg, 'rect', { x: 10, y: 14, width: 300, height: 12, class: 'vz-wall' });
      u.el(ctx.svg, 'rect', { x: 10, y: 250, width: 300, height: 12, class: 'vz-wall' });
      u.el(ctx.svg, 'rect', { x: 298, y: 14, width: 12, height: 248, class: 'vz-wall' });
      g.ceil = [0, 1, 2, 3, 4, 5, 6].map(i => u.el(ctx.svg, 'rect', { x: 14 + i * 40, y: 40, width: 38, height: 8, class: 'vz-bar mu' }));
      g.wallF = u.el(ctx.svg, 'rect', { x: 290, y: 48, width: 8, height: 196, class: 'vz-bar am' });
      g.floor = [0, 1, 2, 3, 4, 5, 6].map(i => u.el(ctx.svg, 'rect', { x: 14 + i * 40, y: 244, width: 38, height: 6, class: 'vz-bar tl' }));
      g.brick = Array.from({ length: 16 }, (_, i) => u.el(ctx.svg, 'rect', { x: 150 + (i % 2) * 18, y: 50 + Math.floor(i / 2) * 24, width: 17, height: 23, class: 'vz-bar cr' }));
      g.pipes = [['수도', 30], ['전기', 60], ['덕트', 90]].map(([n, y]) => ({ l: u.el(ctx.svg, 'line', { x1: 14, x2: 290, y1: y, y2: y, class: 'vz-e' }), x: u.el(ctx.svg, 'text', { x: 30, y: y + 5, class: 'vz-tc' }, 'X'), t: u.el(ctx.svg, 'text', { x: 44, y: y + 5, class: 'vz-ts' }, n + ' 막음') }));
      g.pipes.forEach(p => u.set(p.l, { y1: +p.l.getAttribute('y1') + 20, y2: +p.l.getAttribute('y2') + 20 }));
      g.guard = u.el(ctx.svg, 'g');
      u.el(g.guard, 'rect', { x: 20, y: 120, width: 90, height: 40, rx: 6, class: 'vz-box tl' });
      u.el(g.guard, 'text', { x: 65, y: 145, 'text-anchor': 'middle', class: 'vz-ts' }, '분진흡입기');
      u.el(g.guard, 'rect', { x: 200, y: 170, width: 84, height: 40, rx: 6, class: 'vz-box tl' });
      u.el(g.guard, 'text', { x: 242, y: 195, 'text-anchor': 'middle', class: 'vz-ts' }, '방음벽');
      g.drops = [0, 1, 2, 3, 4].map(i => u.el(ctx.svg, 'circle', { r: 3, class: 'vz-dot tl' }));
      g.noise = [['핸드 브레이커', 1, 'cr'], ['압쇄기', 0.3, 'tl']].map(([n, v, c], i) => ({ t: u.el(ctx.svg, 'text', { x: 330, y: 64 + i * 46, class: 'vz-ts' }, n + ' 소음'), b: u.el(ctx.svg, 'rect', { x: 330, y: 72 + i * 46, height: 14, rx: 3, class: 'vz-bar ' + c }), v }));
      g.bins = [['건설폐재류', 'vz-k3'], ['목재', 'vz-k1'], ['금속', 'vz-k8'], ['합성수지', 'vz-k4']].map(([n, c], i) => {
        const gg = u.el(ctx.svg, 'g');
        u.el(gg, 'rect', { x: 326 + (i % 2) * 76, y: 150 + Math.floor(i / 2) * 60, width: 70, height: 46, rx: 4, class: 'vz-bar ' + c });
        u.el(gg, 'text', { x: 361 + (i % 2) * 76, y: 177 + Math.floor(i / 2) * 60, 'text-anchor': 'middle', class: 'vz-ts' }, n);
        return gg;
      });
      g.bits = Array.from({ length: 12 }, (_, i) => u.el(ctx.svg, 'rect', { width: 8, height: 8, class: 'vz-bar ' + ['cr', 'am', 'mu', 'tl'][i % 4] }));
      g.asb = u.el(ctx.svg, 'text', { x: 402, y: 280, 'text-anchor': 'middle', class: 'vz-tc' }, '석면 텍스는 따로');
      g.doc = u.el(ctx.svg, 'g');
      u.el(g.doc, 'rect', { x: 60, y: 90, width: 200, height: 110, rx: 8, class: 'vz-box on' });
      u.el(g.doc, 'text', { x: 160, y: 130, 'text-anchor': 'middle', class: 'vz-tb' }, '위, 수탁 계약서');
      u.el(g.doc, 'text', { x: 160, y: 160, 'text-anchor': 'middle', class: 'vz-ta' }, '3년간 보관');
    },
    draw(ctx, s, k) {
      const g = ctx.g;
      g.pipes.forEach((p, i) => { u.op(p.l, s <= 2 ? 1 : 0.4); const o = at(s, k, 1); u.op(p.x, seg(o, i * 0.25, i * 0.25 + 0.3)); u.op(p.t, seg(o, i * 0.25, i * 0.25 + 0.3) * (s <= 2 ? 1 : 0)); });
      const gd = s === 2 ? seg(k, 0, 0.5) : (s >= 3 && s <= 4) ? 0.5 : 0;
      u.op(g.guard, gd);
      g.drops.forEach((d, i) => { const t = (k * 3 + i / 5) % 1; u.set(d, { cx: 120 + i * 30, cy: 60 + t * 170 }); u.op(d, s === 2 ? 1 : 0); });
      const rm = at(s, k, 3);
      g.ceil.forEach((c, i) => { const p = seg(rm, i * 0.05, i * 0.05 + 0.3); u.set(c, { y: 40 + 200 * p }); u.op(c, 1 - seg(rm, 0.7, 1)); });
      u.op(g.wallF, 1 - seg(rm, 0.3, 0.7));
      g.floor.forEach((c, i) => u.op(c, 1 - seg(rm, 0.5 + i * 0.05, 0.7 + i * 0.05)));
      const dm = at(s, k, 4);
      g.brick.forEach((b, i) => { const p = seg(dm, i * 0.04, i * 0.04 + 0.35); u.set(b, { y: 50 + Math.floor(i / 2) * 24 + p * (190 - Math.floor(i / 2) * 24), x: 150 + (i % 2) * 18 + p * ((i % 4) - 1.5) * 16 }); u.op(b, 1 - seg(at(s, k, 5), 0, 0.5)); });
      g.noise.forEach(n => { u.set(n.b, { width: 130 * n.v * (s === 4 ? seg(k, 0.4, 0.9) : 0) }); u.op(n.t, s === 4 ? 1 : 0); u.op(n.b, s === 4 ? 1 : 0); });
      const sp = at(s, k, 5);
      g.bins.forEach(b => u.op(b, s >= 5 ? (s === 5 ? seg(k, 0, 0.3) : 1) : 0));
      g.bits.forEach((b, i) => {
        const bin = i % 4, tx = 357 + (bin % 2) * 76, ty = 168 + Math.floor(bin / 2) * 60;
        const p = seg(sp, 0.2 + i * 0.05, 0.45 + i * 0.05);
        u.set(b, { x: u.lerp(40 + i * 20, tx + (i % 3) * 6, p), y: u.lerp(236, ty, p) });
        u.op(b, s === 5 ? (p > 0 ? 1 - seg(p, 0.9, 1) : 0) : 0);
      });
      u.op(g.asb, s === 5 ? seg(k, 0.8, 1) : 0);
      u.op(g.doc, s === 6 ? seg(k, 0.2, 0.7) : 0);
    },
  });
})();
