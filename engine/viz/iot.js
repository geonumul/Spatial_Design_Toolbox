/* 움직이는 개념 그림: IoT 스마트홈 묶음. 틀은 viz.js, 설명은 README.md
   숫자는 기초 다지기와 주차 정리 슬라이드 손계산에서 가져왔다. 강의에 없는 숫자는 그림 캡션에 '가정 숫자'라고 적는다. */
(function () {
  'use strict';
  const V = window.SDTViz;
  if (!V) return;
  const u = V.u;
  const at = u.at, seg = u.seg, num = u.num;

  /* 이름표 상자: {g, r, t, s(작은 글씨)} */
  function tag(parent, x, y, w, h, label, small) {
    const g = u.el(parent, 'g');
    const r = u.el(g, 'rect', { x: x - w / 2, y: y - h / 2, width: w, height: h, rx: 8, class: 'vz-box' });
    const t = u.el(g, 'text', { x, y: y + (small != null ? -2 : 5.5), 'text-anchor': 'middle', class: 'vz-tb' }, label);
    const s = u.el(g, 'text', { x, y: y + 15, 'text-anchor': 'middle', class: 'vz-ts' }, small || '');
    return { g, r, t, s, x, y, w, h };
  }
  const boxCls = (b, c) => b.r.setAttribute('class', 'vz-box' + (c ? ' ' + c : ''));
  /* 움직이는 봉투 점 + 글자 */
  function packet(parent, cls) {
    const g = u.el(parent, 'g');
    return { g, c: u.el(g, 'circle', { r: 9, class: 'vz-dot ' + (cls || '') }), t: u.el(g, 'text', { 'text-anchor': 'middle', class: 'vz-ts' }, '') };
  }
  function putPacket(p, xy, o, label) {
    u.set(p.c, { cx: xy[0], cy: xy[1] });
    u.set(p.t, { x: xy[0], y: xy[1] - 15 });
    u.txt(p.t, label || '');
    u.op(p.g, o);
  }

  /* ---------- 1. 패킷이 집 안과 클라우드를 오가는 길, 지연 시간 (wb-8, w2-4) ---------- */
  V.add('iot.packet', {
    title: '집 안 한 바퀴와 클라우드 다녀오기',
    w: 480, h: 300,
    dur: 1200,
    states: [
      { cap: '움직임 센서가 사람을 느꼈어요. 전구를 켜는 길은 두 가지예요.' },
      { tag: '집 안', cap: '센서에서 허브까지 10ms.' },
      { tag: '집 안', cap: '허브가 "불 켜자" 하고 판단해요. 5ms.' },
      { tag: '집 안', cap: '허브에서 전구까지 10ms. 합 25ms 만에 불이 켜져요.' },
      { tag: '클라우드', cap: '이번엔 클라우드에 물어봐요. 센서에서 허브까지 10ms.' },
      { tag: '클라우드', cap: '허브에서 공유기를 지나 클라우드까지 50ms. 집 밖으로 나가요.' },
      { tag: '클라우드', cap: '클라우드 서버가 판단해요. 20ms.' },
      { tag: '클라우드', cap: '클라우드에서 허브로 돌아오는 데 50ms.' },
      { tag: '클라우드', cap: '허브에서 전구까지 10ms. 합 140ms, 집 안 길보다 5.6배 오래 걸려요.' },
      { cap: '인터넷이 끊기면 클라우드 길은 멈춰요. 집 안 길 25ms 는 그대로 불을 켜요.' },
    ],
    build(ctx) {
      const g = ctx.g = {};
      u.el(ctx.svg, 'rect', { x: 8, y: 30, width: 262, height: 262, rx: 10, class: 'vz-area' });
      u.el(ctx.svg, 'text', { x: 20, y: 52, class: 'vz-ts' }, '우리 집');
      const P = g.P = { sensor: [60, 235], hub: [140, 160], bulb: [225, 235], router: [225, 85], cloud: [405, 70] };
      g.link = {
        sh: u.el(ctx.svg, 'line', { x1: P.sensor[0], y1: P.sensor[1], x2: P.hub[0], y2: P.hub[1], class: 'vz-e' }),
        hb: u.el(ctx.svg, 'line', { x1: P.hub[0], y1: P.hub[1], x2: P.bulb[0], y2: P.bulb[1], class: 'vz-e' }),
        hr: u.el(ctx.svg, 'line', { x1: P.hub[0], y1: P.hub[1], x2: P.router[0], y2: P.router[1], class: 'vz-e' }),
        rc: u.el(ctx.svg, 'line', { x1: P.router[0], y1: P.router[1], x2: P.cloud[0], y2: P.cloud[1], class: 'vz-e' }),
      };
      g.cut = u.el(ctx.svg, 'text', { x: 318, y: 72, 'text-anchor': 'middle', class: 'vz-tc' }, '끊김');
      g.B = {
        sensor: tag(ctx.svg, P.sensor[0], P.sensor[1], 84, 44, '센서', '움직임'),
        hub: tag(ctx.svg, P.hub[0], P.hub[1], 76, 40, '허브'),
        bulb: tag(ctx.svg, P.bulb[0], P.bulb[1], 70, 44, '전구', '꺼짐'),
        router: tag(ctx.svg, P.router[0], P.router[1], 76, 40, '공유기'),
        cloud: tag(ctx.svg, P.cloud[0], P.cloud[1], 110, 50, '클라우드', '먼 서버'),
      };
      g.pk = packet(ctx.svg, 'cr');
      const bx = 300, by = 160;
      u.el(ctx.svg, 'text', { x: bx, y: by - 10, class: 'vz-tb' }, '지연 시간');
      g.bars = [['집 안', 'tl'], ['클라우드', 'cr']].map(([name, c], i) => {
        const y = by + 12 + i * 58;
        u.el(ctx.svg, 'text', { x: bx, y: y + 4, class: 'vz-ts' }, name);
        u.el(ctx.svg, 'rect', { x: bx, y: y + 12, width: 170, height: 18, rx: 3, class: 'vz-area' });
        return { b: u.el(ctx.svg, 'rect', { x: bx, y: y + 12, width: 0, height: 18, rx: 3, class: 'vz-bar ' + c }), t: u.el(ctx.svg, 'text', { x: bx + 170, y: y + 4, 'text-anchor': 'end', class: 'vz-tb' }, '') };
      });
    },
    draw(ctx, s, k) {
      const g = ctx.g, P = g.P;
      const path = { 1: [P.sensor, P.hub], 3: [P.hub, P.bulb], 4: [P.sensor, P.hub], 5: [P.hub, P.router, P.cloud], 7: [P.cloud, P.router, P.hub], 8: [P.hub, P.bulb] };
      const edgeMs = [0, 10, 15, 25, 25, 25, 25, 25, 25, 25];
      const cloudMs = [0, 0, 0, 0, 10, 60, 80, 130, 140, 140];
      const mv = seg(k, 0, 0.85);
      if (path[s]) putPacket(g.pk, u.along(path[s], mv), 1 - seg(k, 0.9, 1), '');
      else if (s === 9) putPacket(g.pk, u.along([P.sensor, P.hub, P.bulb], seg(k, 0.2, 0.9)), seg(k, 0, 0.2) * (1 - seg(k, 0.92, 1)), '');
      else putPacket(g.pk, s === 2 ? P.hub : s === 6 ? P.cloud : P.sensor, 0, '');
      const ms = (arr) => s === 0 ? 0 : u.lerp(arr[s - 1], arr[s], seg(k, 0, 0.85));
      const e = ms(edgeMs), c = ms(cloudMs);
      u.set(g.bars[0].b, { width: 170 * e / 140 }); u.txt(g.bars[0].t, Math.round(e) + 'ms');
      u.set(g.bars[1].b, { width: 170 * c / 140 }); u.txt(g.bars[1].t, Math.round(c) + 'ms');
      const edgeOn = { 1: 'sh', 3: 'hb', 4: 'sh', 5: ['hr', 'rc'], 7: ['rc', 'hr'], 8: 'hb' }[s] || [];
      Object.keys(g.link).forEach(key => {
        const on = [].concat(edgeOn).indexOf(key) >= 0;
        g.link[key].setAttribute('class', 'vz-e' + (key === 'rc' && s === 9 ? ' off' : on ? (s >= 4 && s <= 8 ? ' cr' : ' tl') : ''));
      });
      u.op(g.cut, s === 9 ? seg(k, 0, 0.3) : 0);
      const lit = (s === 3 && k > 0.85) || (s === 8 && k > 0.85) || (s === 9 && k > 0.9);
      boxCls(g.B.bulb, lit ? 'am' : ''); u.txt(g.B.bulb.s, lit ? '켜짐' : '꺼짐');
      boxCls(g.B.sensor, s === 0 || ((s === 1 || s === 4) && k < 0.3) ? 'on' : '');
      boxCls(g.B.hub, s === 2 ? 'tl' : '');
      boxCls(g.B.cloud, s === 6 ? 'cr' : s === 9 ? 'off' : '');
      boxCls(g.B.router, s === 5 || s === 7 ? 'on' : '');
    },
  });

  /* ---------- 2. 스타, 메시, 트리와 노드 고장 (wb-6, w3-1) ---------- */
  V.add('iot.topology', {
    title: '노드 하나가 고장 나면',
    w: 480, h: 300,
    dur: 1300,
    states: [
      { cap: '세 가지 모양이에요. 점 하나가 노드, 선이 연결이에요.' },
      { cap: '소식을 보내 봐요. 세 모양 모두 끝 노드까지 잘 가요.' },
      { cap: '가운데 역할을 하던 노드가 하나씩 고장 났어요.' },
      { tag: '스타', cap: '스타형은 모두가 허브에 붙어 있어서 허브가 멈추면 전부 멈춰요.' },
      { tag: '메시', cap: '메시는 다른 길로 돌아가요. 알아서 새 길을 찾는 자가 치유예요.' },
      { tag: '트리', cap: '트리는 끊긴 가지 아래 노드가 위로 올라갈 길이 없어요.' },
      { cap: '스타는 단순하지만 가운데가 약점, 메시는 튼튼하지만 중계 기기에 전원이 늘 필요, 트리는 윗가지가 약점이에요.' },
    ],
    build(ctx) {
      const g = ctx.g = {};
      [['스타형', 80], ['메시', 240], ['트리형', 400]].forEach(([t, x]) => u.el(ctx.svg, 'text', { x, y: 26, 'text-anchor': 'middle', class: 'vz-tb' }, t));
      u.el(ctx.svg, 'line', { x1: 160, y1: 12, x2: 160, y2: 250, class: 'vz-grid' });
      u.el(ctx.svg, 'line', { x1: 320, y1: 12, x2: 320, y2: 250, class: 'vz-grid' });
      const mk = (pos, edges) => {
        const ge = u.el(ctx.svg, 'g'), gn = u.el(ctx.svg, 'g');
        const E = {}; edges.forEach(([a, b]) => { E[a + '-' + b] = u.el(ge, 'line', { x1: pos[a][0], y1: pos[a][1], x2: pos[b][0], y2: pos[b][1], class: 'vz-e' }); });
        const N = {}; Object.keys(pos).forEach(id => { N[id] = u.node(gn, pos[id][0], pos[id][1], id === 'h' ? 15 : 11, ''); });
        return { pos, E, N };
      };
      const star = { h: [80, 140] };
      ['a', 'b', 'c', 'd', 'e'].forEach((id, i) => { const ang = -Math.PI / 2 + i * 2 * Math.PI / 5; star[id] = [80 + 62 * Math.cos(ang), 140 + 62 * Math.sin(ang)]; });
      g.star = mk(star, [['h', 'a'], ['h', 'b'], ['h', 'c'], ['h', 'd'], ['h', 'e']]);
      g.mesh = mk({ a: [185, 70], b: [240, 55], c: [295, 80], d: [190, 160], e: [245, 130], f: [290, 175], z: [240, 225] },
        [['a', 'b'], ['b', 'c'], ['a', 'd'], ['a', 'e'], ['b', 'e'], ['c', 'e'], ['c', 'f'], ['d', 'e'], ['e', 'f'], ['d', 'z'], ['f', 'z']]);
      g.tree = mk({ r: [400, 60], l: [360, 130], m: [440, 130], l1: [338, 205], l2: [382, 205], m1: [418, 205], m2: [462, 205] },
        [['r', 'l'], ['r', 'm'], ['l', 'l1'], ['l', 'l2'], ['m', 'm1'], ['m', 'm2']]);
      g.x = ['star', 'mesh', 'tree'].map(() => u.el(ctx.svg, 'text', { 'text-anchor': 'middle', class: 'vz-tc' }, 'X'));
      g.pk = ['star', 'mesh', 'tree'].map(() => packet(ctx.svg, 'cr'));
      g.stop = ['star', 'mesh', 'tree'].map((_, i) => u.el(ctx.svg, 'text', { x: 80 + 160 * i, y: 248, 'text-anchor': 'middle', class: 'vz-tc' }, ''));
      g.sum = [['단순, 관리 쉬움', '가운데가 멈추면 전부'], ['한 길 끊겨도 돌아감', '중계 기기 전원 필요'], ['층층이 넓히기 쉬움', '윗가지 끊기면 아래도']].map((pair, i) =>
        pair.map((t, j) => u.el(ctx.svg, 'text', { x: 80 + 160 * i, y: 272 + j * 20, 'text-anchor': 'middle', class: j ? 'vz-tc' : 'vz-tok' }, t)));
    },
    draw(ctx, s, k) {
      const g = ctx.g;
      const fail = { star: 'h', mesh: 'e', tree: 'l' };
      const routes = { star: ['a', 'h', 'c'], mesh: ['a', 'e', 'f', 'z'], tree: ['l1', 'l', 'r', 'm', 'm2'] };
      const failed = at(s, k, 2) > 0.4;
      ['star', 'mesh', 'tree'].forEach((key, i) => {
        const G = g[key], f = fail[key];
        let route = null, mv = 0, o = 0, stopAt = null;
        if (s === 1) { route = routes[key]; mv = seg(k, 0, 0.9); o = 1 - seg(k, 0.92, 1); }
        if ((key === 'star' && s === 3) || (key === 'tree' && s === 5)) { route = routes[key].slice(0, 2); mv = seg(k, 0, 0.8) * 0.72; o = 1; stopAt = true; }
        if (key === 'mesh' && s === 4) { route = ['a', 'b', 'c', 'f', 'z']; mv = seg(k, 0, 0.9); o = 1 - seg(k, 0.92, 1); }
        if (route) putPacket(g.pk[i], u.along(route.map(id => G.pos[id]), mv), o, '');
        else putPacket(g.pk[i], G.pos[routes[key][0]], 0, '');
        Object.keys(G.N).forEach(id => {
          let c = '';
          if (failed && id === f) c = 'off';
          else if (id === routes[key][0] || id === routes[key][routes[key].length - 1]) c = s === 1 || (s === 4 && key === 'mesh') ? 'tl' : '';
          if (key === 'tree' && failed && s >= 5 && (id === 'l1' || id === 'l2')) c = 'cr';
          if (key === 'star' && failed && s >= 3 && id !== 'h') c = 'dim';
          G.N[id].g.setAttribute('class', 'vz-node' + (c ? ' ' + c : ''));
        });
        Object.keys(G.E).forEach(e => {
          const [a, b] = e.split('-');
          let c = '';
          if (failed && (a === f || b === f)) c = 'off';
          else if (key === 'mesh' && s === 4 && ['a-b', 'b-c', 'c-f', 'f-z'].indexOf(e) >= 0) c = 'tl';
          G.E[e].setAttribute('class', 'vz-e' + (c ? ' ' + c : ''));
        });
        u.set(g.x[i], { x: G.pos[f][0], y: G.pos[f][1] + 6 }); u.op(g.x[i], seg(at(s, k, 2), 0, 0.5));
        const msg = key === 'star' ? (s >= 3 ? '전부 멈춤' : '') : key === 'mesh' ? (s >= 4 ? '돌아서 도착' : '') : (s >= 5 ? '아래 가지 끊김' : '');
        const when = key === 'star' ? 3 : key === 'mesh' ? 4 : 5;
        u.txt(g.stop[i], msg); u.op(g.stop[i], s === when ? seg(k, 0.8, 1) : s > when ? 1 : 0);
        g.stop[i].setAttribute('class', key === 'mesh' ? 'vz-tok' : 'vz-tc');
        g.sum[i].forEach(t => u.op(t, at(s, k, 6)));
        void stopAt;
      });
    },
  });

  /* ---------- 3. 지그비 그물망, 홉마다 건너기와 자가 치유 (w3-6, wb-6) ---------- */
  V.add('iot.zigbee', {
    title: '안방 센서 신호가 허브까지 가는 길',
    w: 480, h: 300,
    dur: 1100,
    states: [
      { cap: '안방 센서는 배터리로 도는 엔드 디바이스예요. 평소에는 전기를 아끼려고 잠자요.' },
      { cap: '센서가 깨어나 온도를 보내요. 콘크리트 벽 너머 거실 허브까지는 바로 닿지 않아요.' },
      { tag: '1홉', cap: '가장 가까운 안방 스위치(라우터)가 받아요.' },
      { tag: '2홉', cap: '스위치가 복도 플러그(라우터)에게 건네요.' },
      { tag: '3홉', cap: '플러그가 거실 허브(코디네이터)에게 전해요. 3번 건너 도착했어요.' },
      { cap: '복도 플러그의 전원이 빠졌어요. 이 징검다리는 이제 못 써요.' },
      { tag: '자가 치유', cap: '스위치가 복도 조명(라우터)으로 길을 바꿔 허브에 닿아요.' },
      { cap: '보내고 나면 센서는 다시 잠자요. 중계는 늘 전원이 들어오는 라우터가 맡아요.' },
    ],
    build(ctx) {
      const g = ctx.g = {};
      u.el(ctx.svg, 'rect', { x: 8, y: 20, width: 185, height: 150, rx: 6, class: 'vz-area' });
      u.el(ctx.svg, 'rect', { x: 290, y: 20, width: 182, height: 270, rx: 6, class: 'vz-area' });
      u.el(ctx.svg, 'text', { x: 18, y: 40, class: 'vz-ts' }, '안방');
      u.el(ctx.svg, 'text', { x: 206, y: 40, class: 'vz-ts' }, '복도');
      u.el(ctx.svg, 'text', { x: 300, y: 40, class: 'vz-ts' }, '거실');
      u.el(ctx.svg, 'rect', { x: 190, y: 20, width: 8, height: 150, class: 'vz-wall' });
      u.el(ctx.svg, 'rect', { x: 283, y: 20, width: 8, height: 190, class: 'vz-wall' });
      u.el(ctx.svg, 'text', { x: 236, y: 290, 'text-anchor': 'middle', class: 'vz-ts' }, '검은 막대 = 콘크리트 벽');
      const P = g.P = { sensor: [60, 120], sw: [140, 60], plug: [240, 95], light: [240, 215], hub: [390, 140] };
      g.links = [['sensor', 'sw'], ['sw', 'plug'], ['plug', 'hub'], ['sw', 'light'], ['light', 'hub'], ['plug', 'light']].map(([a, b]) => ({ a, b, l: u.el(ctx.svg, 'line', { x1: P[a][0], y1: P[a][1], x2: P[b][0], y2: P[b][1], class: 'vz-e' }) }));
      g.direct = u.el(ctx.svg, 'line', { x1: P.sensor[0], y1: P.sensor[1], x2: P.hub[0], y2: P.hub[1], class: 'vz-e cr' });
      g.dx = u.el(ctx.svg, 'text', { x: 225, y: 138, 'text-anchor': 'middle', class: 'vz-tc' }, 'X 약함');
      g.B = {
        sensor: tag(ctx.svg, P.sensor[0], P.sensor[1], 78, 44, '센서', 'ED 배터리'),
        sw: tag(ctx.svg, P.sw[0], P.sw[1], 78, 44, '스위치', 'ZR 220V'),
        plug: tag(ctx.svg, P.plug[0], P.plug[1], 78, 44, '플러그', 'ZR 220V'),
        light: tag(ctx.svg, P.light[0], P.light[1], 78, 44, '조명', 'ZR 220V'),
        hub: tag(ctx.svg, P.hub[0], P.hub[1], 96, 48, '허브', 'ZC 코디네이터'),
      };
      g.zz = u.el(ctx.svg, 'text', { x: P.sensor[0] + 44, y: P.sensor[1] - 26, class: 'vz-tm' }, 'zZ');
      g.pk = packet(ctx.svg, 'cr');
      g.hops = u.el(ctx.svg, 'text', { x: 380, y: 250, 'text-anchor': 'middle', class: 'vz-ta' }, '');
    },
    draw(ctx, s, k) {
      const g = ctx.g, P = g.P;
      const route = { 2: ['sensor', 'sw'], 3: ['sw', 'plug'], 4: ['plug', 'hub'], 6: ['sensor', 'sw', 'light', 'hub'] }[s];
      if (route) putPacket(g.pk, u.along(route.map(id => P[id]), seg(k, 0, 0.9)), 1 - (s === 4 || s === 6 ? seg(k, 0.92, 1) : 0), '22°C');
      else if (s === 1) putPacket(g.pk, u.pt(P.sensor, [205, 128], seg(k, 0.2, 0.8)), seg(k, 0.1, 0.3) * (1 - seg(k, 0.8, 1)), '22°C');
      else putPacket(g.pk, P.sensor, 0, '');
      const plugOff = at(s, k, 5) > 0.4;
      const used = s === 2 ? ['sensor-sw'] : s === 3 ? ['sensor-sw', 'sw-plug'] : s === 4 ? ['sensor-sw', 'sw-plug', 'plug-hub'] : s === 6 || s === 7 ? ['sensor-sw', 'sw-light', 'light-hub'] : [];
      g.links.forEach(L => {
        const key = L.a + '-' + L.b;
        let c = used.indexOf(key) >= 0 ? (s >= 6 ? ' tl' : ' on') : '';
        if (plugOff && (L.a === 'plug' || L.b === 'plug')) c = ' off';
        L.l.setAttribute('class', 'vz-e' + c);
      });
      const dOn = s === 1 ? seg(k, 0, 0.4) : 0;
      u.op(g.direct, dOn); u.op(g.dx, s === 1 ? seg(k, 0.5, 0.8) : 0);
      const awake = s >= 1 && s <= 6;
      boxCls(g.B.sensor, awake ? 'on' : 'off');
      u.op(g.zz, awake ? 0 : 1);
      boxCls(g.B.sw, (s === 2 && k > 0.85) || s === 3 || (s === 6 && k < 0.5) ? 'tl' : '');
      boxCls(g.B.plug, plugOff ? 'off' : (s === 3 && k > 0.85) || s === 4 ? 'tl' : '');
      boxCls(g.B.light, s === 6 && k > 0.35 && k < 0.8 ? 'tl' : '');
      boxCls(g.B.hub, (s === 4 && k > 0.85) || (s === 6 && k > 0.85) ? 'ok' : '');
      u.txt(g.hops, s >= 2 && s <= 4 ? (s - 1) + '홉' : s >= 6 ? '센서 → 스위치 → 조명 → 허브' : '');
      u.op(g.hops, s >= 2 && s <= 4 ? seg(k, 0.5, 1) : s === 6 ? seg(k, 0.8, 1) : s === 7 ? 1 : 0);
    },
  });

  /* ---------- 4. 주파수와 파장, 벽을 지나는 세기 (wb-4, w3-5, w3-9) ---------- */
  const RSSI0 = -40, LOSS = { hi: 12, lo: 6 };
  V.add('iot.wave', {
    title: '2.4GHz 와 900MHz, 벽을 만나면',
    w: 480, h: 330,
    dur: 1100,
    live: true,
    params: { walls: 0 },
    controls: [{ key: 'walls', type: 'range', label: '벽 개수', min: 0, max: 3, step: 1, fmt: v => v + '장' }],
    states: [
      { set: { walls: 0 }, cap: '같은 50cm 안에서 2.4GHz 파도는 4번, 900MHz 파도는 1.5번 출렁여요.' },
      { set: { walls: 0 }, cap: '파장 = 3억 m ÷ 주파수. 2.4GHz 는 12.5cm, 900MHz 는 약 33cm 예요.' },
      { set: { walls: 0 }, cap: '허브 옆에서 받은 세기는 둘 다 -40dBm 이에요. -50dBm 보다 세서 우수해요.' },
      { set: { walls: 1 }, cap: '콘크리트 벽 하나: 2.4GHz 는 12dB 줄어 -52dBm 이에요. 3dB 가 절반이니 12dB 는 16분의 1 이에요.' },
      { set: { walls: 2 }, cap: '벽 두 장: 2.4GHz 는 -64dBm, 900MHz 는 -52dBm. 파장이 긴 쪽이 덜 약해져요.' },
      { set: { walls: 3 }, cap: '벽 세 장: 2.4GHz 는 -76dBm 로 음영 지역(-75dBm 이하)이에요. 900MHz 는 -58dBm 로 아직 닿아요.' },
    ],
    build(ctx) {
      const g = ctx.g = {};
      g.X0 = 90; g.X1 = 450;   // 50cm = 360px
      g.lanes = [['900MHz', 33.3, 48, 'tl'], ['2.4GHz', 12.5, 118, 'on']].map(([name, lam, y, c]) => {
        u.el(ctx.svg, 'text', { x: 12, y: y + 5, class: 'vz-tb' }, name);
        u.el(ctx.svg, 'line', { x1: g.X0, y1: y, x2: g.X1, y2: y, class: 'vz-grid' });
        const p = u.el(ctx.svg, 'path', { class: 'vz-curve' + (c === 'tl' ? ' tl' : '') });
        const ruler = u.el(ctx.svg, 'path', { class: 'vz-axis' });
        const rt = u.el(ctx.svg, 'text', { 'text-anchor': 'middle', class: 'vz-ta' }, lam === 12.5 ? '12.5cm' : '약 33cm');
        return { name, lam, y, p, ruler, rt };
      });
      u.el(ctx.svg, 'text', { x: g.X1, y: 150, 'text-anchor': 'end', class: 'vz-ts' }, '가로 전체 = 50cm');
      const my = 176;
      g.my = my;
      g.hub = tag(ctx.svg, 44, my + 34, 64, 40, '허브');
      g.walls = [0, 1, 2].map(i => u.el(ctx.svg, 'rect', { x: 150 + i * 60, y: my + 6, width: 12, height: 58, class: 'vz-wall' }));
      g.sig = [['hi', 'on'], ['lo', 'tl']].map(([key, c], i) => ({ key, segs: [0, 1, 2, 3].map(() => u.el(ctx.svg, 'line', { class: 'vz-e ' + c })), y: my + 22 + i * 26 }));
      g.meter = { x0: 110, x1: 460, y: 282 };
      const M = g.meter, dbx = db => M.x0 + (M.x1 - M.x0) * (db + 90) / 60;
      g.dbx = dbx;
      u.el(ctx.svg, 'rect', { x: dbx(-90), y: M.y, width: dbx(-75) - dbx(-90), height: 10, class: 'vz-bar cr' });
      u.el(ctx.svg, 'rect', { x: dbx(-75), y: M.y, width: dbx(-50) - dbx(-75), height: 10, class: 'vz-bar am' });
      u.el(ctx.svg, 'rect', { x: dbx(-50), y: M.y, width: dbx(-30) - dbx(-50), height: 10, class: 'vz-bar ok' });
      [-90, -75, -50, -30].forEach(v => u.el(ctx.svg, 'text', { x: dbx(v), y: M.y + 26, 'text-anchor': 'middle', class: 'vz-ts' }, String(v)));
      u.el(ctx.svg, 'text', { x: 12, y: M.y + 10, class: 'vz-ts' }, '받은 세기 dBm');
      g.mk = [['2.4GHz', 'on'], ['900MHz', 'tl']].map(([name, c], i) => ({
        tri: u.el(ctx.svg, 'polygon', { class: 'vz-bar' + (c === 'tl' ? ' tl' : '') }),
        t: u.el(ctx.svg, 'text', { 'text-anchor': 'middle', class: c === 'tl' ? 'vz-tt' : 'vz-ta' }, ''),
        up: i === 0,
      }));
      g.sensor = tag(ctx.svg, 440, my + 34, 58, 40, '센서');
      g.meterG = [g.hub.g, g.sensor.g];
    },
    draw(ctx, s, k) {
      const g = ctx.g, t = ctx.t || 0;
      g.lanes.forEach((L, i) => {
        const px = 360 / 50 * L.lam, amp = 20, ph = t * (i ? 2.6 : 1.4);
        let d = '';
        for (let x = g.X0; x <= g.X1 + 0.1; x += 3) d += (d ? ' L' : 'M') + u.r(x) + ' ' + u.r(L.y - amp * Math.sin(2 * Math.PI * ((x - g.X0) / px) - ph));
        u.set(L.p, { d });
        const ro = at(s, k, 1);
        const rx = g.X0 + px * 0.25, ry = L.y + 30;
        u.set(L.ruler, { d: 'M' + u.r(rx) + ' ' + (ry - 6) + ' V' + ry + ' H' + u.r(rx + px * seg(ro, 0, 0.8)) + ' V' + (ry - 6) });
        u.op(L.ruler, ro > 0 ? 1 : 0);
        u.set(L.rt, { x: rx + px / 2, y: ry + 16 }); u.op(L.rt, seg(ro, 0.6, 1));
      });
      const W = ctx.p.walls;
      let wv = W;
      if (k < 1 && s >= 3) { const prevW = [0, 0, 0, 0, 1, 2][s]; wv = u.lerp(prevW, W, seg(k, 0, 0.6)); }
      const mo = at(s, k, 2);
      [g.hub.g, g.sensor.g].forEach(x => u.op(x, mo));
      g.walls.forEach((r, i) => u.op(r, mo * u.clamp(wv - i, 0, 1)));
      const wx = [150, 210, 270];
      g.sig.forEach(S => {
        const loss = LOSS[S.key];
        S.segs.forEach((l, i) => {
          const x1 = i === 0 ? 76 : wx[i - 1] + 12, x2 = i < W ? wx[i] : 410;
          const db = RSSI0 - loss * Math.min(i, wv);
          u.set(l, { x1, y1: S.y, x2, y2: S.y });
          l.style.strokeWidth = u.r(u.clamp(2 + (db + 90) / 5, 1.5, 12)) + 'px';
          u.op(l, i <= W ? mo : 0);
        });
      });
      g.mk.forEach((m, i) => {
        const loss = i === 0 ? LOSS.hi : LOSS.lo, db = RSSI0 - loss * wv;
        const x = g.dbx(Math.max(-90, db)), y = g.meter.y;
        u.set(m.tri, { points: m.up ? [x, y - 2, x - 7, y - 14, x + 7, y - 14].join(',') : [x, y + 12, x - 7, y + 24, x + 7, y + 24].join(',') });
        u.set(m.t, { x, y: m.up ? y - 18 : y + 40 });
        u.txt(m.t, (i === 0 ? '2.4GHz ' : '900MHz ') + Math.round(db));
        u.op(m.tri, mo); u.op(m.t, mo);
      });
      boxCls(g.sensor, mo > 0 && RSSI0 - LOSS.hi * W <= -75 ? 'cr' : '');
    },
  });

  /* ---------- 5. 1-Loop: 감지, 전달, 판단, 실행 (w2-3, wb-3) ---------- */
  V.add('iot.loop', {
    title: '1-Loop 한 바퀴',
    w: 480, h: 300,
    dur: 1200,
    states: [
      { cap: '거실이 28°C 예요. 목표 온도는 25°C 로 정해 뒀어요.' },
      { tag: '감지', cap: '온도 센서가 28°C 를 0 과 1 데이터로 바꿔요.' },
      { tag: '전달', cap: '데이터를 담은 패킷이 무선으로 허브에 가요.' },
      { tag: '판단', cap: '허브가 28°C 가 목표 25°C 보다 높은 걸 보고 "에어컨 켜기"로 정해요.' },
      { tag: '실행', cap: '에어컨(액추에이터)이 켜지고 온도가 내려가요.' },
      { tag: '다시 감지', cap: '센서가 25°C 를 느껴요. 실행한 결과가 다시 감지로 돌아와 한 바퀴가 닫혀요.' },
      { tag: '다시 판단', cap: '목표에 닿았으니 에어컨을 꺼요. 결과를 보고 또 맞추며 도는 고리가 1-Loop 예요.' },
    ],
    build(ctx) {
      const g = ctx.g = {};
      const C = [150, 150], R = 96;
      g.pos = [[C[0], C[1] - R], [C[0] + R, C[1]], [C[0], C[1] + R], [C[0] - R, C[1]]];
      g.arc = u.el(ctx.svg, 'circle', { cx: C[0], cy: C[1], r: R, class: 'vz-e' });
      g.arcs = [0, 1, 2, 3].map(() => u.el(ctx.svg, 'path', { class: 'vz-e on' }));
      g.C = C; g.R = R;
      g.B = [['감지', '센서'], ['전달', '네트워크'], ['판단', '허브'], ['실행', '에어컨']].map(([a, b], i) => tag(ctx.svg, g.pos[i][0], g.pos[i][1], 92, 46, a, b));
      g.temp = u.el(ctx.svg, 'text', { x: C[0], y: C[1] + 6, 'text-anchor': 'middle', class: 'vz-tb' }, '');
      g.temp.style.fontSize = '30px';
      u.el(ctx.svg, 'text', { x: C[0], y: C[1] + 30, 'text-anchor': 'middle', class: 'vz-ts' }, '거실 온도');
      g.pk = packet(ctx.svg, 'cr');
      const px = 318;
      u.el(ctx.svg, 'rect', { x: px - 10, y: 30, width: 170, height: 240, rx: 8, class: 'vz-box' });
      g.lines = ['목표 25°C', '', '', ''].map((t, i) => u.el(ctx.svg, 'text', { x: px, y: 60 + i * 34, class: i ? 'vz-tb' : 'vz-ts' }, t));
      g.ac = tag(ctx.svg, px + 75, 225, 130, 50, '에어컨', '꺼짐');
    },
    draw(ctx, s, k) {
      const g = ctx.g, C = g.C, R = g.R;
      const hot = [-1, 0, 1, 2, 3, 0, 2][s];
      g.B.forEach((b, i) => boxCls(b, i === hot ? (i === 3 ? 'am' : i === 2 ? 'tl' : 'on') : ''));
      const arcPath = (a0, a1) => {
        const p0 = [C[0] + R * Math.cos(a0), C[1] + R * Math.sin(a0)], p1 = [C[0] + R * Math.cos(a1), C[1] + R * Math.sin(a1)];
        return 'M' + u.r(p0[0]) + ' ' + u.r(p0[1]) + ' A' + R + ' ' + R + ' 0 0 1 ' + u.r(p1[0]) + ' ' + u.r(p1[1]);
      };
      const base = -Math.PI / 2;
      const arcFor = { 2: 0, 3: 1, 4: 2, 5: 3 };
      g.arcs.forEach((p, i) => {
        const a0 = base + i * Math.PI / 2 + 0.3, a1 = base + (i + 1) * Math.PI / 2 - 0.3;
        const on = arcFor[s] === i;
        const done = s >= 2 && i < (arcFor[s] == null ? (s === 6 ? 4 : 0) : arcFor[s]);
        const prog = on ? seg(k, 0, 0.8) : done ? 1 : 0;
        u.set(p, { d: arcPath(a0, a0 + (a1 - a0) * Math.max(prog, 0.001)) });
        u.op(p, prog > 0 ? 1 : 0);
      });
      if (arcFor[s] != null) {
        const i = arcFor[s], a0 = base + i * Math.PI / 2 + 0.3, a1 = base + (i + 1) * Math.PI / 2 - 0.3, a = u.lerp(a0, a1, seg(k, 0, 0.8));
        putPacket(g.pk, [C[0] + R * Math.cos(a), C[1] + R * Math.sin(a)], 1 - seg(k, 0.85, 1), s === 5 ? '' : '28°C');
      } else putPacket(g.pk, g.pos[0], 0, '');
      let T = 28;
      if (s === 4) T = u.lerp(28, 25, seg(k, 0.2, 1)); else if (s >= 5) T = 25;
      u.txt(g.temp, num(T, 1) + '°C');
      u.txt(g.lines[1], s >= 1 ? '센서 값 ' + (s >= 5 ? '25' : '28') + '°C' : '');
      u.txt(g.lines[2], s >= 3 ? (s >= 6 ? '25 = 목표, 끄기' : '28 > 25, 켜기') : '');
      u.txt(g.lines[3], s >= 4 ? (s >= 6 ? '결과를 보고 멈춤' : '온도 내려가는 중') : '');
      [1, 2, 3].forEach(i => u.op(g.lines[i], at(s, k, [1, 3, 4][i - 1])));
      const acOn = (s === 4 && k > 0.15) || s === 5 || (s === 6 && k < 0.6);
      boxCls(g.ac, acOn ? 'tl' : ''); u.txt(g.ac.s, acOn ? '켜짐' : '꺼짐');
    },
  });

  /* ---------- 6. 상태, 이벤트, 시계열 데이터 (w2-5, wb-9) ---------- */
  const WAKE = [0, 10, 20, 5, 15, 25, 9];
  V.add('iot.datatypes', {
    title: '집의 데이터 세 가지',
    w: 480, h: 300,
    dur: 1400,
    params: { period: '10s' },
    capsDependOn: true,
    controls: [{ key: 'period', type: 'choice', label: '보고 주기', options: [['10s', '10초마다'], ['5m', '5분마다']] }],
    states(P) {
      return [
        { cap: '하루 동안 집에서 생기는 데이터를 세 줄로 나눠 그려요.' },
        { tag: '상태', cap: '온도 센서가 ' + (P.period === '10s' ? '10초마다, 하루 8,640번' : '5분마다, 하루 288번') + ' 지금 값을 보내요. 선이 끊기지 않아요.' },
        { tag: '이벤트', cap: '문이 열린 그 순간에만 신호가 한 번 와요. 켜짐과 꺼짐 같은 한 번짜리예요.' },
        { tag: '시계열', cap: '날마다 기상 시각을 하나씩 찍어 7일을 쌓아요.' },
        { tag: '시계열', cap: '0 + 10 + 20 + 5 + 15 + 25 + 9 = 84분, 84 ÷ 7 = 12분. 평균 07:12 라는 습관이 보여요.' },
        { cap: '상태는 온도 맞추기 기준값, 이벤트는 자동화를 깨우는 트리거, 시계열은 생활 패턴 찾기에 써요.' },
      ];
    },
    build(ctx) {
      const g = ctx.g = {};
      const X0 = g.X0 = 86, X1 = g.X1 = 470;
      const lanes = [['상태', 18, 92], ['이벤트', 104, 160], ['시계열', 172, 282]];
      lanes.forEach(([t, y0, y1]) => {
        u.el(ctx.svg, 'rect', { x: 8, y: y0, width: 464, height: y1 - y0, rx: 6, class: 'vz-area' });
        u.el(ctx.svg, 'text', { x: 16, y: (y0 + y1) / 2 + 5, class: 'vz-tb' }, t);
      });
      g.curve = u.el(ctx.svg, 'path', { class: 'vz-curve' });
      g.samples = Array.from({ length: 48 }, () => u.el(ctx.svg, 'circle', { r: 2.6, class: 'vz-dot' }));
      g.now = u.el(ctx.svg, 'text', { x: X1 - 4, y: 36, 'text-anchor': 'end', class: 'vz-ta' }, '');
      g.count = u.el(ctx.svg, 'text', { x: X0 + 4, y: 36, class: 'vz-ts' }, '');
      g.ev = [0.22, 0.5, 0.78].map(f => ({ l: u.el(ctx.svg, 'line', { x1: X0 + (X1 - X0) * f, x2: X0 + (X1 - X0) * f, y1: 152, class: 'vz-e cr' }), t: u.el(ctx.svg, 'text', { x: X0 + (X1 - X0) * f, y: 124, 'text-anchor': 'middle', class: 'vz-tc' }, '문 열림') }));
      g.ev.forEach(e => { e.l.style.strokeWidth = '5px'; });
      const ty = m => 262 - m * 2.6;
      g.ty = ty;
      g.days = WAKE.map((m, i) => {
        const x = X0 + 20 + i * 50;
        u.el(ctx.svg, 'text', { x, y: 278, 'text-anchor': 'middle', class: 'vz-ts' }, (i + 1) + '일');
        return { c: u.el(ctx.svg, 'circle', { cx: x, cy: ty(m), r: 6, class: 'vz-dot tl' }), t: u.el(ctx.svg, 'text', { x, y: ty(m) - 10, 'text-anchor': 'middle', class: 'vz-ts' }, '7:' + String(m).padStart(2, '0')) };
      });
      g.avg = u.el(ctx.svg, 'line', { x1: X0, x2: X1, y1: ty(12), y2: ty(12), class: 'vz-e on' });
      g.avgT = u.el(ctx.svg, 'text', { x: X1 - 4, y: ty(12) - 8, 'text-anchor': 'end', class: 'vz-ta' }, '평균 07:12');
      g.use = [['온도 맞추기 기준값', 58], ['자동화 트리거', 140], ['생활 패턴 찾기', 196]].map(([t, y]) => u.el(ctx.svg, 'text', { x: X1 - 4, y, 'text-anchor': 'end', class: 'vz-tok' }, t));
    },
    draw(ctx, s, k) {
      const g = ctx.g, X0 = g.X0, X1 = g.X1;
      const temp = f => 22.5 + 1.4 * Math.sin(f * Math.PI * 2 - 1.2) + 0.4 * Math.sin(f * 11);
      const ty = v => 80 - (v - 20.5) * 13;
      const draw = at(s, k, 1);
      let d = '';
      const upto = draw;
      for (let i = 0; i <= 96; i++) { const f = i / 96; if (f > upto + 1e-9) break; d += (d ? ' L' : 'M') + u.r(X0 + (X1 - X0) * f) + ' ' + u.r(ty(temp(f))); }
      u.set(g.curve, { d: d || 'M' + X0 + ' ' + ty(temp(0)) });
      u.op(g.curve, draw > 0 ? 1 : 0);
      const n = ctx.p.period === '10s' ? 48 : 12;
      g.samples.forEach((c, i) => {
        const f = n === 48 ? i / 47 : (i < 12 ? i / 11 : -1);
        const on = f >= 0 && f <= upto + 1e-9 && draw > 0;
        u.set(c, { cx: X0 + (X1 - X0) * Math.max(0, f), cy: ty(temp(Math.max(0, f))) });
        u.op(c, on ? 1 : 0);
      });
      u.txt(g.now, '지금 ' + num(temp(Math.max(0, upto)), 1) + '°C'); u.op(g.now, draw > 0 ? 1 : 0);
      u.txt(g.count, ctx.p.period === '10s' ? '10초마다: 하루 8,640번' : '5분마다: 하루 288번'); u.op(g.count, seg(draw, 0.2, 0.6));
      const ev = at(s, k, 2);
      g.ev.forEach((e, i) => {
        const p = seg(ev, i * 0.25, i * 0.25 + 0.35);
        u.set(e.l, { y2: 152 - 22 * p });
        u.op(e.l, p > 0 ? 1 : 0); u.op(e.t, p);
      });
      const ts = at(s, k, 3);
      g.days.forEach((dd, i) => { const p = seg(ts, i / 7, (i + 0.8) / 7); u.op(dd.c, p); u.op(dd.t, p); });
      const av = at(s, k, 4);
      u.set(g.avg, { x2: X0 + (X1 - X0) * seg(av, 0, 0.7) }); u.op(g.avg, av > 0 ? 1 : 0); u.op(g.avgT, seg(av, 0.6, 1));
      g.use.forEach((t, i) => u.op(t, seg(at(s, k, 5), i * 0.25, i * 0.25 + 0.4)));
      if (s === 5) { u.op(g.now, 0); u.op(g.count, 0); u.op(g.avgT, 0); }
    },
  });

  /* ---------- 7. IP, MAC 과 공유기의 주소 바꾸기(NAT) (wb-7) ---------- */
  V.add('iot.nat', {
    title: '공유기가 주소를 바꿔 주는 길',
    w: 480, h: 300,
    dur: 1300,
    states: [
      { cap: '집 안 기기는 192.168.0.x 사설 주소를 써요. 바깥에서 보이는 주소는 공유기의 203.0.113.7 하나예요.' },
      { cap: '폰이 서버에 요청을 보내요. 집 안 구간은 MAC 이름표로 공유기를 찾아가요.' },
      { tag: 'NAT', cap: '공유기가 보낸 곳을 203.0.113.7:40001 로 바꾸고 표에 적어요.' },
      { cap: '바뀐 봉투가 인터넷을 건너 서버에 닿아요.' },
      { cap: '서버는 203.0.113.7:40001 로 답장을 보내요. 서버는 집 안 주소를 몰라요.' },
      { tag: 'NAT', cap: '공유기가 표에서 40001 을 찾아 받는 곳을 192.168.0.12:5000 으로 바꿔 폰에 전해요.' },
      { cap: '노트북이 나가면 40002 로 적어요. 바깥 주소 하나로 여러 기기가 인터넷을 써요.' },
    ],
    build(ctx) {
      const g = ctx.g = {};
      u.el(ctx.svg, 'rect', { x: 8, y: 20, width: 236, height: 180, rx: 10, class: 'vz-area' });
      u.el(ctx.svg, 'text', { x: 18, y: 40, class: 'vz-ts' }, '우리 집, 사설 주소');
      const P = g.P = { phone: [70, 78], laptop: [70, 148], router: [205, 113], server: [405, 70] };
      g.lines = [['phone', 'router'], ['laptop', 'router'], ['router', 'server']].map(([a, b]) => u.el(ctx.svg, 'line', { x1: P[a][0], y1: P[a][1], x2: P[b][0], y2: P[b][1], class: 'vz-e' }));
      g.B = {
        phone: tag(ctx.svg, P.phone[0], P.phone[1], 112, 44, '폰', '192.168.0.12'),
        laptop: tag(ctx.svg, P.laptop[0], P.laptop[1], 112, 44, '노트북', '192.168.0.15'),
        router: tag(ctx.svg, P.router[0], P.router[1], 76, 58, '공유기', '안 .0.1'),
        server: tag(ctx.svg, P.server[0], P.server[1], 130, 44, '서버', '198.51.100.20'),
      };
      u.el(ctx.svg, 'text', { x: 256, y: 150, class: 'vz-ts' }, '바깥 주소 203.0.113.7');
      g.mac = u.el(ctx.svg, 'text', { x: 18, y: 192, class: 'vz-ts' }, 'MAC 08:21:03:1C:2B:A2 (폰 이름표)');
      g.pk = packet(ctx.svg, 'cr');
      g.card = u.el(ctx.svg, 'g');
      g.cardR = u.el(g.card, 'rect', { width: 196, height: 44, rx: 6, class: 'vz-box am' });
      g.cardA = u.el(g.card, 'text', { class: 'vz-ts' }, '');
      g.cardB = u.el(g.card, 'text', { class: 'vz-ts' }, '');
      const tx = 12, ty = 212;
      u.el(ctx.svg, 'rect', { x: tx - 4, y: ty, width: 464, height: 82, rx: 8, class: 'vz-box' });
      u.el(ctx.svg, 'text', { x: tx + 6, y: ty + 20, class: 'vz-tb' }, '공유기의 주소 바꾸기 표');
      u.el(ctx.svg, 'text', { x: tx + 6, y: ty + 40, class: 'vz-ts' }, '집 안 주소:포트');
      u.el(ctx.svg, 'text', { x: tx + 250, y: ty + 40, class: 'vz-ts' }, '바깥 포트');
      g.rows = [['192.168.0.12:5000', '40001'], ['192.168.0.15:6000', '40002']].map(([a, b], i) => ({
        a: u.el(ctx.svg, 'text', { x: tx + 6, y: ty + 58 + i * 18, class: 'vz-tb' }, a),
        b: u.el(ctx.svg, 'text', { x: tx + 250, y: ty + 58 + i * 18, class: 'vz-ta' }, b),
      }));
    },
    draw(ctx, s, k) {
      const g = ctx.g, P = g.P;
      const legs = { 1: [P.phone, P.router], 3: [P.router, P.server], 4: [P.server, P.router], 5: [P.router, P.phone], 6: [P.laptop, P.router, P.server] };
      const card = {
        1: ['보낸 192.168.0.12:5000', '받는 198.51.100.20:443'],
        2: k < 0.5 ? ['보낸 192.168.0.12:5000', '받는 198.51.100.20:443'] : ['보낸 203.0.113.7:40001', '받는 198.51.100.20:443'],
        3: ['보낸 203.0.113.7:40001', '받는 198.51.100.20:443'],
        4: ['보낸 198.51.100.20:443', '받는 203.0.113.7:40001'],
        5: ['보낸 198.51.100.20:443', '받는 192.168.0.12:5000'],
        6: k < 0.5 ? ['보낸 192.168.0.15:6000', '받는 198.51.100.20:443'] : ['보낸 203.0.113.7:40002', '받는 198.51.100.20:443'],
      }[s];
      let xy = P.phone, o = 0;
      if (legs[s]) { xy = u.along(legs[s], seg(k, 0, 0.9)); o = 1; }
      else if (s === 2) { xy = P.router; o = 1; }
      putPacket(g.pk, xy, o, '');
      if (card) {
        const cx = u.clamp(xy[0] - 98, 8, 276), cy = Math.max(2, xy[1] - 62);
        u.set(g.cardR, { x: cx, y: cy }); u.set(g.cardA, { x: cx + 8, y: cy + 18 }); u.set(g.cardB, { x: cx + 8, y: cy + 36 });
        u.txt(g.cardA, card[0]); u.txt(g.cardB, card[1]);
        g.cardR.setAttribute('class', 'vz-box ' + ((s === 2 || s === 6) && k >= 0.5 || s === 3 || s === 4 ? 'tl' : 'am'));
      } else { u.set(g.cardR, { x: 8, y: 8 }); u.set(g.cardA, { x: 16, y: 26 }); u.set(g.cardB, { x: 16, y: 44 }); u.txt(g.cardA, ''); u.txt(g.cardB, ''); }
      u.op(g.card, card ? 1 : 0);
      g.lines.forEach((l, i) => l.setAttribute('class', 'vz-e' + ((i === 0 && (s === 1 || s === 5)) || (i === 2 && (s === 3 || s === 4 || (s === 6 && k > 0.5))) || (i === 1 && s === 6 && k <= 0.5) ? ' on' : '')));
      boxCls(g.B.router, s === 2 || s === 5 || (s === 6 && k > 0.4 && k < 0.6) ? 'on' : '');
      boxCls(g.B.phone, (s === 1 && k < 0.3) || (s === 5 && k > 0.9) ? 'tl' : '');
      boxCls(g.B.laptop, s === 6 && k < 0.3 ? 'tl' : '');
      boxCls(g.B.server, (s === 3 && k > 0.9) || (s === 4 && k < 0.2) ? 'tl' : '');
      u.op(g.mac, s === 1 ? 1 : 0.35);
      u.op(g.rows[0].a, at(s, k, 2) >= 0.5 ? 1 : 0); u.op(g.rows[0].b, at(s, k, 2) >= 0.5 ? 1 : 0);
      u.op(g.rows[1].a, at(s, k, 6) >= 0.5 ? 1 : 0); u.op(g.rows[1].b, at(s, k, 6) >= 0.5 ? 1 : 0);
      [g.rows[0].a, g.rows[0].b].forEach(t => t.setAttribute('class', s === 5 ? 'vz-tc' : t === g.rows[0].a ? 'vz-tb' : 'vz-ta'));
    },
  });

  /* ---------- 8. 인증과 암호화 (wb-10, w2-8) ---------- */
  V.add('iot.secure', {
    title: '진짜인지 묻고, 비밀 글씨로 보내기',
    w: 480, h: 300,
    dur: 1400,
    states: [
      { cap: '밖에서 앱으로 현관 도어락을 열려고 해요. 가운데 길은 누가 엿볼 수도 있어요.' },
      { tag: '인증 1', cap: '앱이 "열어 줘" 를 보내면, 허브가 먼저 문제 번호 58 을 내요.' },
      { tag: '인증 2', cap: '앱은 가족만 아는 열쇠로 58 을 섞어 도장 7Q2K 를 보내요. 허브도 같은 계산을 해 보고 맞으면 통과예요.' },
      { tag: '암호화', cap: '명령 번호 1234 를 열쇠 약속(숫자마다 3 더하기)으로 4567 로 바꿔 보내요.' },
      { cap: '엿보는 사람 수첩에는 58, 7Q2K, 4567 만 남아요. 열쇠가 없어서 뜻을 몰라요.' },
      { tag: '복호화', cap: '허브는 숫자마다 3 을 빼서 1234 로 되돌리고 문을 열어요.' },
      { tag: '막기', cap: '가짜 앱이 새 문제 31 에 옛 도장 7Q2K 를 보내면 틀려서 막혀요. 문제 번호가 매번 바뀌어서예요.' },
    ],
    build(ctx) {
      const g = ctx.g = {};
      g.A = [70, 110]; g.H = [410, 110];
      g.app = tag(ctx.svg, g.A[0], g.A[1], 110, 56, '폰 앱', '열쇠 있음');
      g.hub = tag(ctx.svg, g.H[0], g.H[1], 110, 56, '허브', '도어락 잠김');
      g.wire = u.el(ctx.svg, 'line', { x1: 125, y1: 110, x2: 355, y2: 110, class: 'vz-e' });
      g.spy = tag(ctx.svg, 170, 238, 110, 56, '엿보는 사람', '열쇠 없음');
      g.look = u.el(ctx.svg, 'line', { x1: 170, y1: 210, x2: 200, y2: 118, class: 'vz-e off' });
      u.el(ctx.svg, 'rect', { x: 238, y: 200, width: 150, height: 90, rx: 6, class: 'vz-box' });
      u.el(ctx.svg, 'text', { x: 248, y: 220, class: 'vz-ts' }, '엿본 수첩');
      g.note = [0, 1, 2].map(i => u.el(ctx.svg, 'text', { x: 248, y: 242 + i * 18, class: 'vz-tb' }, ''));
      g.fake = tag(ctx.svg, 240, 32, 110, 40, '가짜 앱');
      g.pk = packet(ctx.svg, 'cr');
      g.pk.t.setAttribute('class', 'vz-tb');
      g.appSay = u.el(ctx.svg, 'text', { x: g.A[0], y: 165, 'text-anchor': 'middle', class: 'vz-ta' }, '');
      g.hubSay = u.el(ctx.svg, 'text', { x: g.H[0], y: 165, 'text-anchor': 'middle', class: 'vz-ta' }, '');
    },
    draw(ctx, s, k) {
      const g = ctx.g, A = [125, 110], H = [355, 110];
      let xy = A, o = 0, lab = '', cls = 'cr';
      if (s === 1) { if (k < 0.5) { xy = u.pt(A, H, seg(k, 0, 0.45)); lab = '열어 줘'; } else { xy = u.pt(H, A, seg(k, 0.5, 0.95)); lab = '문제 58'; cls = 'am'; } o = 1 - seg(k, 0.95, 1); }
      if (s === 2) { xy = u.pt(A, H, seg(k, 0, 0.7)); lab = '도장 7Q2K'; o = 1 - seg(k, 0.9, 1); }
      if (s === 3) { xy = u.pt(A, H, seg(k, 0.3, 0.95)); lab = k < 0.3 ? '1234' : '4567'; o = 1 - seg(k, 0.96, 1); }
      if (s === 6) { xy = u.pt([240, 52], H, seg(k, 0, 0.7)); lab = '31 → 7Q2K'; o = 1 - seg(k, 0.9, 1); }
      putPacket(g.pk, xy, o, lab);
      g.pk.c.setAttribute('class', 'vz-dot ' + cls);
      u.txt(g.appSay, s === 3 ? '1234 → 4567' : s === 2 ? '58 + 열쇠 → 7Q2K' : '');
      u.op(g.appSay, s === 2 || s === 3 ? seg(k, 0, 0.3) : 0);
      const hubMsg = s === 2 ? (k > 0.7 ? '확인: 맞아요' : '') : s === 5 ? '4567 → 1234' : s === 6 ? (k > 0.7 ? '확인: 틀려요, 차단' : '') : '';
      u.txt(g.hubSay, hubMsg); u.op(g.hubSay, hubMsg ? 1 : 0);
      g.hubSay.setAttribute('class', s === 6 ? 'vz-tc' : s === 2 ? 'vz-tok' : 'vz-ta');
      boxCls(g.hub, s === 2 && k > 0.7 ? 'ok' : s === 5 && k > 0.5 ? 'ok' : s === 6 && k > 0.7 ? 'cr' : '');
      const open = (s === 5 && k > 0.5);
      u.txt(g.hub.s, open ? '도어락 열림' : '도어락 잠김');
      boxCls(g.app, s >= 1 && s <= 3 ? 'on' : '');
      g.wire.setAttribute('class', 'vz-e' + (s >= 1 && s <= 3 ? ' on' : s === 6 ? ' cr' : ''));
      const notes = ['58', '7Q2K', '4567'];
      const when = [1, 2, 3];
      g.note.forEach((t, i) => {
        u.txt(t, notes[i] + (s >= 4 ? '  뜻 모름' : ''));
        u.op(t, s > when[i] ? 1 : s === when[i] ? seg(k, 0.6, 1) : 0);
      });
      boxCls(g.spy, s === 4 ? 'am' : '');
      u.op(g.look, s >= 1 && s <= 4 ? 1 : 0.3);
      u.op(g.fake.g, s === 6 ? seg(k, 0, 0.2) : 0);
      boxCls(g.fake, s === 6 ? 'cr' : '');
    },
  });
})();
