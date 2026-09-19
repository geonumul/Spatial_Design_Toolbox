/* 움직이는 개념 그림 (viz) 공통 틀. 모든 과목 공통.
   정리 슬라이드, 회독 레슨의 {"kind": "viz", "viz": "<이름>", ...} 프레임을 그린다.
   그림 하나하나는 engine/viz/<묶음>.js 에서 SDTViz.add('<묶음>.<이름>', {...}) 로 등록한다.
   쓰는 법, JSON 모양, 새 그림 추가 방법: engine/viz/README.md
   GNN 사이트(02_작업/그래프신경망/최종정리/_작업/html/viz/)에도 같은 파일이 있다. 고치면 tools/viz_tool.py sync-gnn 으로 맞춘다. */
(function () {
  'use strict';
  if (window.SDTViz) return;
  const NS = 'http://www.w3.org/2000/svg';
  const REG = {};
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const escH = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const reduced = () => { try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; } };

  /* ---------- 그림 도우미 (그림 파일에서 ctx.u 로 쓴다) ---------- */
  const U = {
    NS,
    clamp,
    lerp: (a, b, t) => a + (b - a) * t,
    ease: t => { t = clamp(t, 0, 1); return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; },
    /* 전체 진행 k(0~1) 가운데 a~b 구간의 진행도 (부드럽게) */
    seg: (k, a, b) => U.ease(b <= a ? (k >= b ? 1 : 0) : (k - a) / (b - a)),
    /* 진행 중인 단계 s 에서 이 단계 번호 n 의 진행도: n 보다 앞이면 0, 지났으면 1, 지금이면 k */
    at: (s, k, n) => s > n ? 1 : s < n ? 0 : k,
    el(parent, tag, attrs, text) {
      const n = document.createElementNS(NS, tag);
      if (attrs) U.set(n, attrs);
      if (text != null) n.textContent = text;
      if (parent) parent.appendChild(n);
      return n;
    },
    set(n, attrs) {
      Object.keys(attrs).forEach(k => {
        const v = attrs[k];
        if (v == null || v === false) n.removeAttribute(k); else n.setAttribute(k, typeof v === 'number' ? U.r(v) : v);
      });
      return n;
    },
    r: v => String(Math.round(v * 100) / 100),
    txt(n, s) { s = String(s); if (n.textContent !== s) n.textContent = s; return n; },
    cls(n, name, on) { n.classList.toggle(name, !!on); return n; },
    op(n, v) {
      v = clamp(v, 0, 1);
      n.setAttribute('opacity', U.r(v));
      if (v <= 0.001) n.style.visibility = 'hidden';
      else { n.style.removeProperty('visibility'); if (!n.getAttribute('style')) n.removeAttribute('style'); }
      return n;
    },
    /* 숫자 적기: 소수 자리 d 까지, 끝의 0 은 뺀다 */
    num(x, d) { const p = Math.pow(10, d == null ? 2 : d); const v = Math.round(x * p) / p; return String(Object.is(v, -0) ? 0 : v); },
    pt: (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t],
    /* 여러 점을 잇는 길 위에서 t(0~1) 위치 */
    along(pts, t) {
      if (pts.length < 2) return pts[0].slice();
      const L = []; let tot = 0;
      for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); L.push(d); tot += d; }
      let want = clamp(t, 0, 1) * tot;
      for (let i = 0; i < L.length; i++) { if (want <= L[i] || i === L.length - 1) return U.pt(pts[i], pts[i + 1], L[i] ? clamp(want / L[i], 0, 1) : 1); want -= L[i]; }
      return pts[pts.length - 1].slice();
    },
    /* 선 두 끝을 원 반지름만큼 줄인다 */
    shrink(a, b, ra, rb) {
      const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1;
      return [[a[0] + dx / d * ra, a[1] + dy / d * ra], [b[0] - dx / d * rb, b[1] - dy / d * rb]];
    },
    /* 노드 원 + 글자. 반환 {g, c, t} */
    node(parent, x, y, r, label, cls) {
      const g = U.el(parent, 'g', { class: 'vz-node ' + (cls || '') });
      const c = U.el(g, 'circle', { cx: x, cy: y, r, class: 'vz-n' });
      const t = U.el(g, 'text', { x, y: y + 5.5, class: 'vz-nt', 'text-anchor': 'middle' }, label == null ? '' : label);
      return { g, c, t, x, y, r };
    },
    /* 선이 k 만큼 그려지게 (0 이면 안 보임) */
    draw(line, a, b, k) {
      const p = U.pt(a, b, clamp(k, 0, 1));
      U.set(line, { x1: a[0], y1: a[1], x2: p[0], y2: p[1] });
      U.op(line, k > 0.001 ? 1 : 0);
    },
    /* 화살촉 달린 선: {g, l, h} */
    arrow(parent, cls) {
      const g = U.el(parent, 'g', { class: 'vz-arr ' + (cls || '') });
      return { g, l: U.el(g, 'line', {}), h: U.el(g, 'polygon', {}) };
    },
    setArrow(a, p, q, k) {
      k = clamp(k, 0, 1);
      const e = U.pt(p, q, k), dx = q[0] - p[0], dy = q[1] - p[1], d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d;
      U.set(a.l, { x1: p[0], y1: p[1], x2: e[0] - ux * 6, y2: e[1] - uy * 6 });
      U.set(a.h, { points: [e[0], e[1], e[0] - ux * 11 - uy * 5.5, e[1] - uy * 11 + ux * 5.5, e[0] - ux * 11 + uy * 5.5, e[1] - uy * 11 - ux * 5.5].map(U.r).join(',') });
      U.op(a.g, k > 0.001 ? 1 : 0);
    },
  };

  /* ---------- 스타일 (한 번만 넣는다. 색은 app.css 의 --accent, --teal 같은 변수) ---------- */
  const CSS = `
#pslide:has(.vz){justify-content:flex-start;gap:12px;padding:24px 32px 22px}
.vz{display:flex;flex-direction:column;gap:10px;min-width:0}
.vz .vz-top{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap}
.vz .vz-top .sk{flex:none}
.vz .sh{font-size:24px}
.vz-stage{position:relative;border:1px solid var(--line);border-radius:var(--r-md,6px);background:var(--surface);overflow:hidden}
.vz-svg{display:block;width:100%;height:auto;max-height:52vh;margin:0 auto;font-family:inherit;font-size:16px;-webkit-user-select:none;user-select:none}
.vz-caps{min-height:3.2em}
.vz-cap{font-size:18px;line-height:1.55;background:var(--surface-2);border-left:4px solid var(--accent);border-radius:4px;padding:9px 14px}
.vz-cap.gone,.vz-cap.hide{display:none}
.vz-cap .vz-k{display:inline-block;min-width:3.2em;font-size:12.5px;font-weight:600;color:var(--accent-deep);margin-right:6px}
.vz-bar{display:flex;flex-wrap:wrap;align-items:center;gap:8px 10px}
.vz-btn{min-height:44px;padding:8px 14px;border-radius:4px;border:1.5px solid var(--line-2);background:var(--surface);color:var(--ink);font:inherit;font-size:15px;font-weight:500;cursor:pointer;touch-action:manipulation}
.vz-btn.vz-play{background:var(--accent);border-color:var(--accent);color:var(--accent-ink);min-width:92px}
.vz-btn.vz-play.on{background:var(--surface);color:var(--accent-deep)}
.vz-n-of{font-size:14px;color:var(--sub);font-variant-numeric:tabular-nums;margin-right:auto}
.vz-ctl{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:14.5px;color:var(--ink-2)}
.vz-ctl input[type=range]{width:150px;min-height:44px;accent-color:var(--accent);touch-action:pan-x}
.vz-ctl b{min-width:3.5em;color:var(--ink);font-variant-numeric:tabular-nums}
.vz-seg{display:inline-flex;border:1.5px solid var(--line-2);border-radius:4px;overflow:hidden}
.vz-seg button{min-height:40px;min-width:48px;padding:6px 12px;border:0;background:var(--surface);color:var(--ink-2);font:inherit;font-size:14.5px;cursor:pointer;touch-action:manipulation}
.vz-seg button+button{border-left:1.5px solid var(--line-2)}
.vz-seg button[aria-pressed="true"]{background:var(--ink);color:var(--ground)}
.vz-note{font-size:14.5px;color:var(--sub);margin:0}
.vz-miss{padding:18px;color:var(--sub)}
.vz-embed{margin:18px 0 22px;padding:16px 18px;border:1px solid var(--line);border-radius:var(--r-lg,8px);background:var(--stage-bg,var(--surface));box-shadow:var(--shadow)}
.vz-embed .vz .sh{font-size:21px}
.vz-embed .vz-btn:disabled{opacity:.45;cursor:default}
.vz-check{margin-top:14px;border-top:1px solid var(--line);padding-top:12px}
.vz-check .vz-q{font-size:17px;margin:6px 0 10px;font-weight:550}
.vz-choices{display:flex;flex-direction:column;gap:8px}
.vz-choices .vz-btn{text-align:left;font-weight:450}
.vz-choices .vz-btn.correct{border-color:var(--ok);background:var(--ok-soft);opacity:1}
.vz-choices .vz-btn.wrong{border-color:var(--no);background:var(--no-soft);opacity:1}
.vz-why{margin:10px 0 0;font-size:15.5px;line-height:1.6}
@media (max-width:640px){
  #pslide:has(.vz){padding:14px 10px 16px}
  .vz-embed{padding:12px 10px;margin:14px -4px 18px}
  .vz .sh{font-size:19px}
  .vz-cap{font-size:16px;padding:8px 11px}
  .vz-svg{max-height:none;font-size:17.5px}
  .vz-svg .vz-ts{font-size:14.5px}
  .vz-stage{margin:0 -4px}
  .vz-ctl{width:100%}
  .vz-ctl input[type=range]{flex:1;min-width:0;width:auto}
}
/* 그림 안 요소 */
.vz-svg text{fill:var(--ink);font-weight:450}
.vz-svg .vz-tb{font-weight:650}
.vz-svg .vz-tm{fill:var(--sub)}
.vz-svg .vz-ts{font-size:13px;fill:var(--sub)}
.vz-svg .vz-ta{fill:var(--accent-deep);font-weight:650}
.vz-svg .vz-tc{fill:var(--coral);font-weight:650}
.vz-svg .vz-tt{fill:var(--teal);font-weight:650}
.vz-svg .vz-tok{fill:var(--ok);font-weight:650}
.vz-svg .vz-n{fill:var(--surface);stroke:var(--ink-2);stroke-width:2.5}
.vz-svg .vz-nt{font-weight:600;fill:var(--ink)}
.vz-svg .on>.vz-n,.vz-svg .vz-n.on{fill:var(--accent);stroke:var(--accent)}
.vz-svg .tl>.vz-n{fill:var(--teal);stroke:var(--teal)}
.vz-svg .cr>.vz-n{fill:var(--coral);stroke:var(--coral)}
.vz-svg .am>.vz-n{fill:var(--amber);stroke:var(--amber)}
.vz-svg .on>.vz-nt,.vz-svg .tl>.vz-nt,.vz-svg .cr>.vz-nt,.vz-svg .am>.vz-nt{fill:#fff}
.vz-svg .dim{opacity:.35}
.vz-svg .off>.vz-n{fill:var(--surface-2);stroke:var(--faint);stroke-dasharray:4 4}
.vz-svg .off>.vz-nt{fill:var(--faint)}
.vz-svg .vz-e{stroke:var(--line-2);stroke-width:3;fill:none;stroke-linecap:round}
.vz-svg .vz-e.on{stroke:var(--accent);stroke-width:4.5}
.vz-svg .vz-e.tl{stroke:var(--teal);stroke-width:4.5}
.vz-svg .vz-e.cr{stroke:var(--coral);stroke-width:4}
.vz-svg .vz-e.off{stroke:var(--faint);stroke-dasharray:6 6}
.vz-svg .vz-arr line{stroke:var(--accent);stroke-width:3;stroke-linecap:round}
.vz-svg .vz-arr polygon{fill:var(--accent)}
.vz-svg .vz-arr.tl line{stroke:var(--teal)}.vz-svg .vz-arr.tl polygon{fill:var(--teal)}
.vz-svg .vz-arr.cr line{stroke:var(--coral)}.vz-svg .vz-arr.cr polygon{fill:var(--coral)}
.vz-svg .vz-arr.mu line{stroke:var(--faint)}.vz-svg .vz-arr.mu polygon{fill:var(--faint)}
.vz-svg .vz-box{fill:var(--surface-2);stroke:var(--line-2);stroke-width:1.5}
.vz-svg .vz-box.on{fill:var(--accent-soft);stroke:var(--accent);stroke-width:2.5}
.vz-svg .vz-box.tl{fill:var(--teal-soft);stroke:var(--teal);stroke-width:2.5}
.vz-svg .vz-box.cr{fill:var(--coral-soft);stroke:var(--coral);stroke-width:2.5}
.vz-svg .vz-box.am{fill:var(--amber-soft);stroke:var(--amber);stroke-width:2.5}
.vz-svg .vz-box.ok{fill:var(--ok-soft);stroke:var(--ok);stroke-width:2.5}
.vz-svg .vz-box.off{fill:var(--surface-2);stroke:var(--faint);stroke-dasharray:5 5}
.vz-svg .vz-area{fill:var(--surface-2);stroke:none}
.vz-svg .vz-wall{fill:var(--ink-2);stroke:none}
.vz-svg .vz-grid{stroke:var(--line);stroke-width:1}
.vz-svg .vz-axis{stroke:var(--sub);stroke-width:1.5;fill:none}
.vz-svg .vz-curve{stroke:var(--accent);stroke-width:3;fill:none}
.vz-svg .vz-curve.tl{stroke:var(--teal)}
.vz-svg .vz-curve.cr{stroke:var(--coral)}
.vz-svg .vz-curve.mu{stroke:var(--faint);stroke-width:2}
.vz-svg .vz-dot{fill:var(--accent);stroke:var(--surface);stroke-width:2}
.vz-svg .vz-dot.tl{fill:var(--teal)}
.vz-svg .vz-dot.cr{fill:var(--coral)}
.vz-svg .vz-dot.am{fill:var(--amber)}
.vz-svg .vz-dot.mu{fill:var(--line-2)}
.vz-svg .vz-hl{fill:none;stroke:var(--coral);stroke-width:3}
.vz-svg .vz-hl.on{stroke:var(--accent)}
.vz-svg .vz-bar{fill:var(--accent)}
.vz-svg .vz-bar.tl{fill:var(--teal)}.vz-svg .vz-bar.cr{fill:var(--coral)}.vz-svg .vz-bar.am{fill:var(--amber)}.vz-svg .vz-bar.ok{fill:var(--ok)}.vz-svg .vz-bar.mu{fill:var(--line-2)}
.vz-svg .vz-k0>.vz-n,.vz-svg .vz-bar.vz-k0{fill:#DCD8FF;stroke:#6A5CF0}
.vz-svg .vz-k1>.vz-n,.vz-svg .vz-bar.vz-k1{fill:#FFE08A;stroke:#B7791F}
.vz-svg .vz-k2>.vz-n,.vz-svg .vz-bar.vz-k2{fill:#9FE3D5;stroke:#0E8F80}
.vz-svg .vz-k3>.vz-n,.vz-svg .vz-bar.vz-k3{fill:#FFB3BD;stroke:#D9485A}
.vz-svg .vz-k4>.vz-n,.vz-svg .vz-bar.vz-k4{fill:#B9D8FF;stroke:#2F6FC9}
.vz-svg .vz-k5>.vz-n,.vz-svg .vz-bar.vz-k5{fill:#C9EFA6;stroke:#4E8A1C}
.vz-svg .vz-k6>.vz-n,.vz-svg .vz-bar.vz-k6{fill:#F2C4F5;stroke:#A33FAE}
.vz-svg .vz-k7>.vz-n,.vz-svg .vz-bar.vz-k7{fill:#FFCFA3;stroke:#C4621A}
.vz-svg .vz-k8>.vz-n,.vz-svg .vz-bar.vz-k8{fill:#D5D7E3;stroke:#5B5E78}
.vz-svg .vz-k9>.vz-n,.vz-svg .vz-bar.vz-k9{fill:#A8EEF5;stroke:#1B8C9C}
.vz-svg [class*="vz-k"]>.vz-nt{fill:#17182C}
`;
  function injectCss() {
    if (document.getElementById('sdt-viz-css')) return;
    const s = document.createElement('style');
    s.id = 'sdt-viz-css';
    s.textContent = CSS;
    (document.head || document.documentElement).appendChild(s);
  }

  /* ---------- 프레임 ---------- */
  function statesOf(def, p) { const st = typeof def.states === 'function' ? def.states(p) : def.states; return Array.isArray(st) && st.length ? st : [{ cap: '' }]; }

  /* h: 엔진이 주는 도우미 {S, fmt, esc, renderMath, go(n)} */
  function frame(f, h) {
    injectCss();
    const def = REG[f.viz];
    const fmt = (h && h.fmt) || escH;
    const head = f.head ? '<h2 class="sh">' + fmt(f.head) + '</h2>' : '';
    if (!def) return { html: head + '<div class="vz-miss">움직이는 그림 "' + escH(f.viz) + '" 을 불러오지 못했어요.</div>' + (f.caption ? '<p class="vz-note">' + fmt(f.caption) + '</p>' : ''), steps: 0 };
    const base = Object.assign({}, def.params || {}, f.params || {});
    const st0 = statesOf(def, Object.assign({}, base, statesOf(def, base)[0].set || {}));
    const n = st0.length;
    const caps = st0.map((x, i) => capHtml(f, x, i, fmt));
    const S = h && h.S ? h.S : (i, html, tag, cls) => '<' + tag + ' class="bld ' + cls + '" data-s="' + i + '">' + html + '</' + tag + '>';
    const ctls = (def.controls || []).map(c => {
      if (c.type === 'choice') return '<div class="vz-ctl"><span>' + escH(c.label) + '</span><div class="vz-seg" role="group" aria-label="' + escH(c.label) + '">'
        + c.options.map(o => '<button type="button" data-k="' + escH(c.key) + '" data-v="' + escH(o[0]) + '" aria-pressed="false">' + escH(o[1]) + '</button>').join('') + '</div></div>';
      return '<label class="vz-ctl"><span>' + escH(c.label) + '</span><input type="range" data-k="' + escH(c.key) + '" min="' + c.min + '" max="' + c.max + '" step="' + (c.step || 1) + '"><b class="vz-rv" data-k="' + escH(c.key) + '"></b></label>';
    }).join('');
    const html = '<div class="vz" data-viz="' + escH(f.viz) + '">'
      + '<div class="vz-top"><span class="sk">움직이는 그림</span></div>' + head
      + '<div class="vz-stage"><svg class="vz-svg" xmlns="' + NS + '" role="img" aria-label="' + escH(f.alt || f.head || def.title || '') + '"></svg></div>'
      + '<div class="vz-caps" aria-live="polite">' + caps.map((c, i) => S(i, c, 'div', 'vz-cap')).join('') + '</div>'
      + '<div class="vz-bar">' + (h && h.nav ? '<button type="button" class="vz-btn vz-prev" aria-label="이전 단계">이전</button><button type="button" class="vz-btn vz-next" aria-label="다음 단계">다음</button>' : '')
      + '<button type="button" class="vz-btn vz-play" aria-label="처음부터 끝까지 움직이기">▶ 재생</button><button type="button" class="vz-btn vz-reset">처음부터</button><span class="vz-n-of"></span>' + ctls + '</div>'
      + (f.caption ? '<p class="vz-note">' + fmt(f.caption) + '</p>' : '')
      + '</div>';
    let inst = null;
    return {
      html,
      steps: n - 1,
      after: el => { const root = el.querySelector('.vz'); if (root) inst = mount(root, f, def, base, n, h || {}); },
      onStep: s => { if (inst) inst.onStep(s); },
    };
  }
  function capHtml(f, x, i, fmt) {
    const c = (f.caps && f.caps[i] != null) ? f.caps[i] : x.cap;
    return (x.tag ? '<span class="vz-k">' + escH(x.tag) + '</span>' : '') + fmt(c || '');
  }

  function mount(root, f, def, base, n, h) {
    const svg = root.querySelector('svg.vz-svg');
    const W = def.w || 480, H = def.h || 300;
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    const user = {};   // 사용자가 바꾼 조절값
    const ctx = { svg, W, H, u: U, p: {}, t: 0, root, f, reduced: reduced() || !!SDTViz.instant };
    let cur = -1, anim = null, raf = 0, t0 = 0, playing = false, playT = 0, expect = null;
    const setKeys = new Set();
    statesOf(def, base).forEach(x => Object.keys(x.set || {}).forEach(k => setKeys.add(k)));
    const params = s => { const st = statesOf(def, Object.assign({}, base, user)); return Object.assign({}, base, (st[s] || {}).set || {}, user); };
    def.build(ctx);
    const inst = {};
    root._viz = inst;

    const syncControls = () => {
      root.querySelectorAll('.vz-seg button').forEach(b => b.setAttribute('aria-pressed', String(ctx.p[b.dataset.k]) === b.dataset.v ? 'true' : 'false'));
      root.querySelectorAll('input[type=range][data-k]').forEach(r => { const v = ctx.p[r.dataset.k]; if (String(r.value) !== String(v)) r.value = v; });
      root.querySelectorAll('.vz-rv').forEach(b => { const c = (def.controls || []).find(x => x.key === b.dataset.k); b.textContent = c && c.fmt ? c.fmt(ctx.p[b.dataset.k]) : String(ctx.p[b.dataset.k]); });
      const k = root.querySelector('.vz-n-of'); if (k) k.textContent = (cur + 1) + ' / ' + n;
    };
    const refreshCaps = () => {
      if (!def.capsDependOn) return;
      const st = statesOf(def, ctx.p);
      root.querySelectorAll('.vz-cap').forEach((c, i) => { if (!st[i]) return; const html = capHtml(f, st[i], i, h.fmt || escH); if (c.innerHTML !== html) { c.innerHTML = html; if (h.renderMath) h.renderMath(c); } });
    };
    const paint = k => { ctx.k = k; def.draw(ctx, cur, k); };
    const live = () => !!def.live && !ctx.reduced && !SDTViz.freeze;
    const loop = now => {
      raf = 0;
      if (!root.isConnected) { if (anim) { anim = null; paint(1); } stop(); return; }   // 화면에서 떼어졌으면 끝 모습으로 두고 멈춤 (다시 붙이면 다음 단계부터 또 움직임)
      if (!t0) t0 = now;
      if (def.live && !SDTViz.freeze) ctx.t = (now - t0) / 1000;
      if (anim) {
        const k = clamp((now - anim.start) / anim.dur, 0, 1);
        paint(k);
        if (k >= 1) anim = null;
      } else if (def.live) paint(1);
      if (anim || live()) raf = requestAnimationFrame(loop);
    };
    const kick = () => { if (!raf && typeof requestAnimationFrame === 'function') raf = requestAnimationFrame(loop); };
    const dur = s => ctx.reduced ? 0 : (typeof def.dur === 'function' ? def.dur(s, ctx.p) : (def.dur || 1100));

    function show(s, animate) {
      s = clamp(s | 0, 0, n - 1);
      if (s !== cur) Object.keys(user).forEach(k => { if (setKeys.has(k)) delete user[k]; });
      const prev = cur;
      cur = s;
      ctx.p = params(s);
      refreshCaps();
      syncControls();
      root.querySelectorAll('.vz-cap').forEach((c, i) => c.classList.toggle('gone', i < s));
      const d = dur(s);
      if (animate && prev >= 0 && s === prev + 1 && d > 0 && typeof requestAnimationFrame === 'function') {
        anim = { start: (typeof performance !== 'undefined' ? performance.now() : Date.now()), dur: d };
        paint(0);
        kick();
      } else {
        anim = null;
        paint(1);
        if (live()) kick();
      }
    }
    function stop() {
      playing = false; clearTimeout(playT);
      const b = root.querySelector('.vz-play'); if (b) { b.classList.remove('on'); b.textContent = '▶ 재생'; }
    }
    const go = s => { expect = s; if (h.go) h.go(s); else show(s, true); expect = null; };
    function playNext() {
      if (!playing) return;
      if (!root.isConnected) { stop(); return; }
      if (cur >= n - 1) { stop(); return; }
      go(cur + 1);
      const cap = (root.querySelectorAll('.vz-cap')[cur] || {}).textContent || '';
      playT = setTimeout(playNext, dur(cur) + (ctx.reduced ? 1400 : 900) + clamp(cap.length * 45, 0, 3200));
    }
    function play() {
      playing = true;
      const b = root.querySelector('.vz-play'); if (b) { b.classList.add('on'); b.textContent = '멈춤'; }
      if (cur >= n - 1) { go(0); playT = setTimeout(playNext, 900); } else playNext();
    }

    inst.onStep = s => {
      if (playing && expect !== s) stop();
      show(s, true);
    };
    inst.finish = () => { if (anim) { anim = null; paint(1); } };
    inst.state = () => cur;
    inst.params = () => Object.assign({}, ctx.p);
    inst.set = (k, v) => { user[k] = v; ctx.p = params(cur); refreshCaps(); syncControls(); anim = null; paint(1); };
    inst.play = play; inst.stop = stop;
    inst.snapshot = () => svg.innerHTML;
    inst.pose = (s, k) => { show(s, false); paint(clamp(k, 0, 1)); };   // 그림 확인용: s 단계로 가는 중간 k

    const bar = root.querySelector('.vz-bar');
    ['touchstart', 'touchend', 'click'].forEach(ev => bar.addEventListener(ev, e => e.stopPropagation(), { passive: ev !== 'click' }));
    root.querySelector('.vz-play').addEventListener('click', () => { playing ? stop() : play(); });
    root.querySelector('.vz-reset').addEventListener('click', () => { stop(); go(0); });
    root.querySelectorAll('.vz-seg button').forEach(b => b.addEventListener('click', () => {
      const c = (def.controls || []).find(x => x.key === b.dataset.k);
      const o = c && c.options.find(x => String(x[0]) === b.dataset.v);
      if (o) inst.set(c.key, o[0]);
    }));
    root.querySelectorAll('input[type=range][data-k]').forEach(r => {
      r.addEventListener('input', () => inst.set(r.dataset.k, +r.value));
      r.addEventListener('keydown', e => e.stopPropagation());
    });
    return inst;
  }

  /* ---------- 플레이어 밖에 끼워 넣기 (정리노트 같은 긴 페이지) ----------
     <div class="vz-embed" data-vp="자리 이름" data-frame='{"kind":"viz","viz":"...","head":"...","check":{q,choices,a,why}}'></div>
     엔진이 페이지를 그린 뒤 SDTViz.embedAll(root, {fmt, renderMath}) 를 부른다. 이전/다음 단추로 단계를 넘긴다. */
  function embed(el, h) {
    if (el._vzDone) return el._vzDone;
    let f;
    try { f = JSON.parse(el.getAttribute('data-frame') || '{}'); } catch (e) { return null; }
    const fmt = (h && h.fmt) || escH;
    let cur = 0, r = null;
    const apply = () => {
      el.querySelectorAll('.vz-caps [data-s]').forEach(e => e.classList.toggle('hide', +e.dataset.s > cur));
      r.onStep(cur);
      const p = el.querySelector('.vz-prev'), nx = el.querySelector('.vz-next');
      if (p) p.disabled = cur <= 0;
      if (nx) nx.disabled = cur >= r.steps;
    };
    const go = n => { cur = clamp(n | 0, 0, r.steps); apply(); };
    r = frame(f, { fmt, renderMath: h && h.renderMath, nav: true, go });
    let chk = '';
    const c = f.check;
    if (c && Array.isArray(c.choices)) {
      chk = '<div class="vz-check"><div class="sk">확인 퀴즈</div><p class="vz-q">' + fmt(c.q) + '</p><div class="vz-choices">'
        + c.choices.map((x, i) => '<button type="button" class="vz-btn" data-i="' + i + '">' + fmt(x) + '</button>').join('') + '</div><p class="vz-why" hidden></p></div>';
    }
    el.innerHTML = r.html + chk;
    if (r.after) r.after(el);
    const p = el.querySelector('.vz-prev'), nx = el.querySelector('.vz-next');
    if (p) p.addEventListener('click', () => go(cur - 1));
    if (nx) nx.addEventListener('click', () => go(cur + 1));
    el.querySelectorAll('.vz-choices button').forEach(b => b.addEventListener('click', () => {
      if (el.querySelector('.vz-choices button[disabled]')) return;
      const ok = +b.dataset.i === c.a;
      el.querySelectorAll('.vz-choices button').forEach(x => { x.disabled = true; if (+x.dataset.i === c.a) x.classList.add('correct'); else if (x === b) x.classList.add('wrong'); });
      const w = el.querySelector('.vz-why'); w.hidden = false; w.innerHTML = '<b>' + (ok ? '맞아요. ' : '아쉬워요. ') + '</b>' + fmt(c.why || '');
      if (h && h.renderMath) h.renderMath(w);
    }));
    apply();
    el._vzDone = { go, state: () => cur, steps: r.steps };
    return el._vzDone;
  }
  function embedAll(root, h) {
    injectCss();
    return Array.from((root || document).querySelectorAll('.vz-embed')).map(el => embed(el, h)).filter(Boolean);
  }

  window.SDTViz = {
    embed,
    embedAll,
    add(name, def) { REG[name] = def; return def; },
    has: name => !!REG[name],
    get: name => REG[name],
    names: () => Object.keys(REG),
    frame,
    u: U,
    instant: false,   // true 면 움직임 없이 바로 끝 상태 (시험용)
    freeze: false,    // true 면 계속 도는 장식 움직임을 멈춘다 (시험용)
  };
})();
