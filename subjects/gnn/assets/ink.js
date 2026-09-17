/* 필기(손글씨) 레이어: GoodNotes 비슷한 위쪽 도구 막대와 사용감, 기기 간 동기화 */
(function () {
'use strict';

const raf = window.requestAnimationFrame ? f => window.requestAnimationFrame(f) : f => setTimeout(f, 16);
const now = () => (window.performance && performance.now ? performance.now() : Date.now());
const cssVar = n => (getComputedStyle(document.documentElement).getPropertyValue(n) || '').trim();
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/* ---------- 색 ---------- */
const LEGACY = { ink: '--ink', red: '--coral', blue: '--accent', green: '--teal', hl: '--hl' };
const PEN_PALETTE = ['#1c1c1e', '#6b6b73', '#1f5fd6', '#2aa3e0', '#0b7285', '#2f9e44', '#d93a3a', '#f08c2e', '#c2255c', '#7048e8', '#8d6e63', '#ffffff'];
const HL_PALETTE = ['#ffd43b', '#ffec99', '#69db7c', '#74c0fc', '#f783ac', '#ffa94d', '#b197fc', '#ced4da'];
function lum(c) {
  let m = /^#([0-9a-f]{3})$/i.exec(c || '');
  if (m) c = '#' + m[1].split('').map(x => x + x).join('');
  m = /^#([0-9a-f]{6})$/i.exec(c || '');
  if (!m) return 0.5;
  const n = parseInt(m[1], 16);
  return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
}
const isDark = () => lum(cssVar('--ground')) < 0.45;
function colorOf(c, dark) {
  if (!c || LEGACY[c]) return cssVar(LEGACY[c || 'ink']) || '#222';
  if (dark && lum(c) < 0.3) return cssVar('--ink') || '#eee';   // 검정 펜은 어두운 화면에서 밝게
  return c;
}

/* ---------- 굵기 ---------- */
const penW = v => 0.0012 + 0.0006 * v;
const hlW = v => 0.006 + 0.004 * v;
const ERASER_R = [0.008, 0.016, 0.03];

/* ---------- 저장: IndexedDB, 안 되면 메모리 ---------- */
const mem = {};
let dbp = null;
function idb() {
  if (dbp) return dbp;
  dbp = new Promise(res => {
    const timer = setTimeout(() => res(null), 1500);   // 열리지 않으면 메모리 저장으로
    const done = v => { clearTimeout(timer); res(v); };
    try {
      const r = indexedDB.open('gnn-ink', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('pages');
      r.onsuccess = () => done(r.result);
      r.onerror = () => done(null);
      r.onblocked = () => done(null);
    } catch (e) { done(null); }
  });
  return dbp;
}
function tx(mode, fn, fallback) {
  return idb().then(db => new Promise(res => {
    if (!db) { res(fallback()); return; }
    try {
      const store = db.transaction('pages', mode).objectStore('pages');
      const q = fn(store);
      if (mode === 'readwrite') { q.transaction.oncomplete = () => res(true); q.transaction.onerror = () => res(false); }
      else { q.onsuccess = () => res(q.result); q.onerror = () => res(fallback()); }
    } catch (e) { res(fallback()); }
  }));
}
const getPage = key => tx('readonly', s => s.get(key), () => mem[key] || null).then(v => v || null);
const putPage = (key, val) => { mem[key] = val; return tx('readwrite', s => s.put(val, key), () => true); };
const delPage = key => { delete mem[key]; return tx('readwrite', s => s.delete(key), () => true); };
const keys = () => tx('readonly', s => s.getAllKeys(), () => Object.keys(mem)).then(v => v || []);
async function all() {
  const ks = await keys(), out = {};
  for (const k of ks) { const v = await getPage(k); if (v && v.s && v.s.length) out[k] = v; }
  return out;
}

/* ---------- 도구 상태 ---------- */
const DEF = {
  mode: 'pen',
  pen: { type: 'f', colors: ['#1c1c1e', '#1f5fd6', '#d93a3a'], ci: 0, sizes: [2, 4, 7], si: 1, hold: true },
  hl: { colors: ['#ffd43b', '#69db7c', '#f783ac'], ci: 0, sizes: [2, 4, 6], si: 1, straight: false },
  eraser: { kind: 'part', si: 1, hlOnly: false },
  fingerNav: false, penSeen: false, twoTapUndo: true,
};
const tool = JSON.parse(JSON.stringify(DEF));
try {
  const old = JSON.parse(localStorage.getItem('gnn_ink_tool') || '{}');
  if (old.fingerNav != null) tool.fingerNav = old.fingerNav;
  if (old.penSeen != null) tool.penSeen = old.penSeen;
  const v2 = JSON.parse(localStorage.getItem('gnn_ink_tool2') || '{}');
  ['mode', 'fingerNav', 'penSeen', 'twoTapUndo'].forEach(k => { if (v2[k] != null) tool[k] = v2[k]; });
  ['pen', 'hl', 'eraser'].forEach(k => { if (v2[k]) Object.assign(tool[k], v2[k]); });
  if (!['pen', 'hl', 'eraser', 'shape', 'lasso', 'laser'].includes(tool.mode)) tool.mode = 'pen';
} catch (e) { /* 기본값 */ }
const saveTool = () => { try { localStorage.setItem('gnn_ink_tool2', JSON.stringify(tool)); } catch (e) { /* 무시 */ } };
const grp = () => (tool.mode === 'hl' ? tool.hl : tool.pen);

/* ---------- 동기화 (Vercel /api/sync, 설정 안 되어 있으면 조용히 끔) ---------- */
const Sync = {
  state: null, last: 0, timers: {},
  key() { try { return localStorage.getItem('gnn_sync_key') || ''; } catch (e) { return ''; } },
  setKey(k) { try { localStorage.setItem('gnn_sync_key', k); } catch (e) { /* 무시 */ } this.state = null; },
  enabled() { return !!this.key() && /^https?:/.test(location.protocol) && this.state !== 'bad_key' && this.state !== 'not_configured'; },
  async req(method, q, body) {
    const r = await fetch('/api/sync' + (q || ''), { method, cache: 'no-store', headers: { 'x-sync-key': this.key(), 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    let j = null; try { j = await r.json(); } catch (e) { /* 빈 응답 */ }
    if (!r.ok) { const err = new Error((j && j.error) || 'http_' + r.status); err.status = r.status; throw err; }
    return j;
  },
  async check() {
    if (!/^https?:/.test(location.protocol)) return (this.state = 'local');
    if (!this.key()) return (this.state = 'nokey');
    try { await this.req('GET', '?k=ping'); return (this.state = 'on'); }
    catch (e) { return (this.state = e.status === 503 ? 'not_configured' : e.status === 401 ? 'bad_key' : e.status === 404 ? 'not_configured' : 'offline'); }
  },
  async pull(k) { if (!this.enabled()) return null; try { const j = await this.req('GET', '?k=' + encodeURIComponent(k)); this.state = 'on'; return j ? j.value : null; } catch (e) { if (e.status === 401) this.state = 'bad_key'; if (e.status === 503) this.state = 'not_configured'; return null; } },
  async push(k, value) { if (!this.enabled()) return false; try { await this.req('POST', '', { k, value }); this.last = Date.now(); this.state = 'on'; return true; } catch (e) { if (e.status === 401) this.state = 'bad_key'; if (e.status === 503) this.state = 'not_configured'; return false; } },
  pullInk(key) { return this.pull('ink:' + key); },
  pushInk(key, val) { clearTimeout(this.timers[key]); this.timers[key] = setTimeout(() => this.push('ink:' + key, val), 900); },
};

/* ---------- 획 그리기 (좌표는 너비로 나눈 비율) ---------- */
function tracePath(c, p, W) {
  c.beginPath(); c.moveTo(p[0][0] * W, p[0][1] * W);
  if (p.length < 3) { for (let i = 1; i < p.length; i++) c.lineTo(p[i][0] * W, p[i][1] * W); return; }
  for (let i = 1; i < p.length - 1; i++) {
    c.quadraticCurveTo(p[i][0] * W, p[i][1] * W, (p[i][0] + p[i + 1][0]) / 2 * W, (p[i][1] + p[i + 1][1]) / 2 * W);
  }
  const l = p[p.length - 1]; c.lineTo(l[0] * W, l[1] * W);
}
function drawStroke(c, s, W, dark) {
  const p = s.p; if (!c || !p || !p.length) return;
  c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
  if (s.h) {
    c.globalAlpha = s.c === 'hl' || !s.c ? 0.32 : 0.38;
    c.strokeStyle = s.c === 'hl' || !s.c ? colorOf('hl') : s.c;
    c.lineWidth = s.w * W;
    tracePath(c, p, W); c.stroke();
  } else if (s.k || s.t === 'b') {
    c.strokeStyle = colorOf(s.c, dark); c.lineWidth = Math.max(0.9, s.w * W);
    if (s.k) { c.beginPath(); c.moveTo(p[0][0] * W, p[0][1] * W); for (let i = 1; i < p.length; i++) c.lineTo(p[i][0] * W, p[i][1] * W); }
    else tracePath(c, p, W);
    c.stroke();
  } else {
    c.strokeStyle = colorOf(s.c, dark);
    const brush = s.t === 'r';
    const wid = q => Math.max(0.8, s.w * W * (brush ? 0.25 + q[2] * 1.5 : 0.55 + q[2] * 0.9));
    if (p.length < 3) {
      c.beginPath(); c.moveTo(p[0][0] * W, p[0][1] * W);
      const l = p[p.length - 1]; c.lineTo(l[0] * W, l[1] * W); c.lineWidth = wid(l); c.stroke();
    } else {
      let px = p[0][0] * W, py = p[0][1] * W;
      for (let i = 1; i < p.length - 1; i++) {
        const mx = (p[i][0] + p[i + 1][0]) / 2 * W, my = (p[i][1] + p[i + 1][1]) / 2 * W;
        c.beginPath(); c.moveTo(px, py); c.quadraticCurveTo(p[i][0] * W, p[i][1] * W, mx, my);
        c.lineWidth = wid(p[i]); c.stroke();
        px = mx; py = my;
      }
      const l = p[p.length - 1];
      c.beginPath(); c.moveTo(px, py); c.lineTo(l[0] * W, l[1] * W); c.lineWidth = wid(l); c.stroke();
    }
  }
  c.restore();
}
function drawAll(c, strokes, W, dark) {
  for (const s of strokes) if (s.h) drawStroke(c, s, W, dark);    // 형광펜은 글씨 아래에
  for (const s of strokes) if (!s.h) drawStroke(c, s, W, dark);
}

/* ---------- 도형 인식: 그리고 멈추면(또는 도형 도구) 반듯하게 ---------- */
function segDist(q, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1], L = dx * dx + dy * dy;
  let t = L ? ((q[0] - a[0]) * dx + (q[1] - a[1]) * dy) / L : 0;
  t = clamp(t, 0, 1);
  return Math.hypot(q[0] - a[0] - t * dx, q[1] - a[1] - t * dy);
}
function rdp(pts, eps) {
  if (pts.length < 3) return pts.slice();
  let md = 0, mi = 0;
  for (let i = 1; i < pts.length - 1; i++) { const d = segDist(pts[i], pts[0], pts[pts.length - 1]); if (d > md) { md = d; mi = i; } }
  if (md < eps) return [pts[0], pts[pts.length - 1]];
  const a = rdp(pts.slice(0, mi + 1), eps), b = rdp(pts.slice(mi), eps);
  return a.slice(0, -1).concat(b);
}
function resample(pts, step) {
  const out = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], d = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.ceil(d / step));
    for (let k = 1; k <= n; k++) out.push([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n]);
  }
  return out;
}
function recognize(p) {
  const n = p.length; if (n < 4) return null;
  const a = p[0], b = p[n - 1];
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const q of p) { x0 = Math.min(x0, q[0]); y0 = Math.min(y0, q[1]); x1 = Math.max(x1, q[0]); y1 = Math.max(y1, q[1]); }
  const diag = Math.hypot(x1 - x0, y1 - y0); if (diag < 0.012) return null;
  const chord = Math.hypot(b[0] - a[0], b[1] - a[1]);
  if (chord > 0.02) {
    let md = 0; for (const q of p) md = Math.max(md, segDist(q, a, b));
    if (md < Math.max(0.006, chord * 0.06)) return [a, b];
  }
  const closed = chord < Math.max(0.02, diag * 0.25);
  if (!closed) { const s = rdp(p, diag * 0.06); return s.length >= 3 && s.length <= 5 ? s : null; }
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, rx = Math.max((x1 - x0) / 2, 1e-4), ry = Math.max((y1 - y0) / 2, 1e-4);
  let err = 0; for (const q of p) err += Math.abs(Math.hypot((q[0] - cx) / rx, (q[1] - cy) / ry) - 1); err /= n;
  const ellipse = () => { const o = []; for (let k = 0; k <= 72; k++) { const t = k / 72 * Math.PI * 2; o.push([cx + rx * Math.cos(t), cy + ry * Math.sin(t)]); } return o; };
  if (err < 0.11) return ellipse();
  let v = rdp(p.concat([p[0]]), diag * 0.07).slice(0, -1);
  for (let changed = true; changed && v.length > 3;) {           // 거의 일직선인 꼭짓점 없애기
    changed = false;
    for (let i = 0; i < v.length; i++) {
      const pr = v[(i - 1 + v.length) % v.length], nx = v[(i + 1) % v.length];
      if (segDist(v[i], pr, nx) < diag * 0.06) { v.splice(i, 1); changed = true; break; }
    }
  }
  if (v.length === 4) {
    const near = v.every(q => Math.min(Math.hypot(q[0] - x0, q[1] - y0), Math.hypot(q[0] - x1, q[1] - y0), Math.hypot(q[0] - x1, q[1] - y1), Math.hypot(q[0] - x0, q[1] - y1)) < diag * 0.18);
    if (near) v = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
  }
  if (v.length >= 3 && v.length <= 8) return v.concat([v[0]]);
  return err < 0.2 ? ellipse() : null;
}
function pip(q, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if ((a[1] > q[1]) !== (b[1] > q[1]) && q[0] < (b[0] - a[0]) * (q[1] - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
  }
  return inside;
}

/* ---------- 필기 레이어 ---------- */
const ctx2d = cv => { try { return cv.getContext ? cv.getContext('2d') : null; } catch (e) { return null; } };
class Layer {
  constructor(host, opts) {
    this.host = host; this.opts = opts || {};
    host.classList.add('inkhost');
    this.cv = document.createElement('canvas'); this.cv.className = 'inkcv';
    this.live = document.createElement('canvas'); this.live.className = 'inklive';
    host.appendChild(this.cv); host.appendChild(this.live);
    this.ctx = ctx2d(this.cv); this.lctx = ctx2d(this.live);
    this.strokes = []; this.hist = []; this.redoS = [];
    this.key = null; this.enabled = false; this.cur = null; this.curId = null;
    this.W = 0; this.H = 0; this.dpr = 1; this.dirty = false; this.seq = 0;
    this.finger = null; this.touches = new Map(); this.gesture = null;
    this.zoom = { s: 1, tx: 0, ty: 0 };
    this.sel = null; this.lasso = null; this.drag = null; this.laser = []; this.ecur = null;
    this.onResize = () => this.resize();
    if (window.ResizeObserver) { this.ro = new ResizeObserver(this.onResize); this.ro.observe(host); }
    else window.addEventListener('resize', this.onResize);
    this.onScroll = () => { if (this.sel) this.placeSelMenu(); };
    window.addEventListener('scroll', this.onScroll, { passive: true });
    this.cv.addEventListener('pointerdown', e => this.down(e));
    this.cv.addEventListener('pointermove', e => this.move(e));
    this.cv.addEventListener('pointerup', e => this.up(e));
    this.cv.addEventListener('pointercancel', e => this.up(e));
    this.cv.addEventListener('contextmenu', e => { if (this.enabled) e.preventDefault(); });
    this.resize();
  }
  get undone() { return this.redoS; }
  setEnabled(on) {
    this.enabled = !!on; this.cv.classList.toggle('on', this.enabled);
    if (!this.enabled) { this.clearSel(); this.lasso = null; this.cur = null; this.drawLive(); }
  }
  async setKey(key) {
    await this.flush();
    const seq = ++this.seq;
    this.key = key || null; this.strokes = []; this.hist = []; this.redoS = []; this.clearSel();
    this.cv.style.visibility = this.key ? 'visible' : 'hidden';
    this.resize(true);
    if (!this.key) return;
    const local = await getPage(this.key);
    if (seq !== this.seq) return;
    this.strokes = local && local.s ? local.s : [];
    this.redraw();
    const remote = await Sync.pullInk(this.key);
    if (seq !== this.seq || !remote) return;
    if (!local || (remote.updated || 0) > (local.updated || 0)) { this.strokes = remote.s || []; putPage(this.key, remote); this.redraw(); }
  }
  resize(force) {
    const w = this.host.clientWidth, h = Math.max(this.host.scrollHeight, this.host.clientHeight);
    if (!w || !h) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (!force && this.W === w && this.H === h && this.dpr === dpr) return;
    this.W = w; this.H = h; this.dpr = dpr;
    for (const cv of [this.cv, this.live]) {
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      cv.style.width = w + 'px'; cv.style.height = h + 'px';
    }
    this.redraw();
  }
  pt(e) {
    const r = this.cv.getBoundingClientRect(), rw = r.width || this.W || 1;
    const pr = e.pointerType === 'pen' && e.pressure > 0 ? e.pressure : 0.5;
    return [(e.clientX - r.left) / rw, (e.clientY - r.top) / rw, pr];
  }
  px() { const r = this.cv.getBoundingClientRect(); return r.width || this.W || 1; }

  /* ----- 되돌리기 기록 ----- */
  pushHist() { this.hist.push(JSON.stringify(this.strokes)); if (this.hist.length > 80) this.hist.shift(); this.redoS = []; }
  snapOnce() { if (!this.opSnap) { this.opSnap = true; this.pushHist(); } }
  undo() { if (!this.hist.length) return false; this.redoS.push(JSON.stringify(this.strokes)); this.strokes = JSON.parse(this.hist.pop()); this.clearSel(); this.redraw(); this.changed(); return true; }
  redo() { if (!this.redoS.length) return false; this.hist.push(JSON.stringify(this.strokes)); this.strokes = JSON.parse(this.redoS.pop()); this.clearSel(); this.redraw(); this.changed(); return true; }
  clear() { if (!this.strokes.length) return; const r = this.redoS; this.pushHist(); this.redoS = r; this.strokes = []; this.clearSel(); this.redraw(); this.changed(); }

  /* ----- 포인터 ----- */
  down(e) {
    if (!this.enabled || !this.key) return;
    if (e.pointerType === 'pen' && !tool.penSeen) { tool.penSeen = true; tool.fingerNav = true; saveTool(); Toolbar.refresh(); Toolbar.hint('펜슬이 보여서, 이제 손가락은 넘기기와 스크롤만 해요 (더보기에서 바꿀 수 있어요)'); }
    e.preventDefault();
    try { this.cv.setPointerCapture(e.pointerId); } catch (err) { /* 무시 */ }
    Toolbar.closePop();
    if (e.pointerType === 'touch') {
      if (this.curId != null && !this.curTouch) return;             // 펜으로 쓰는 중 손바닥은 무시
      this.touches.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY });
      if (this.touches.size === 2) { this.cancelCurrent(); this.startGesture(); return; }
      if (this.touches.size > 2 || this.gesture) return;
      if (tool.fingerNav) { this.finger = { id: e.pointerId, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: Date.now() }; return; }
    } else if (this.gesture) return;
    this.begin(e);
  }
  begin(e) {
    const p = this.pt(e), m = tool.mode;
    this.opSnap = false; this.curId = e.pointerId; this.curTouch = e.pointerType === 'touch';
    if (m === 'eraser') { this.erasing = true; this.lastE = null; this.ecur = p; this.eraseAt(p); this.drawLive(); return; }
    if (m === 'laser') { this.lasering = true; this.laser.push([p[0], p[1], now()]); this.laserLoop(); return; }
    if (m === 'lasso') {
      if (this.sel && this.inSel(p)) { this.drag = { last: p, moved: false }; if (this.selMenu) this.selMenu.hidden = true; return; }
      this.clearSel(); this.lasso = [p]; return;
    }
    const hl = m === 'hl', g = hl ? tool.hl : tool.pen;
    this.cur = { c: g.colors[g.ci], w: hl ? hlW(g.sizes[g.si]) : penW(g.sizes[g.si]), h: hl ? 1 : 0, t: hl || m === 'shape' ? 'b' : tool.pen.type, p: [p] };
    this.snapped = false; this.holdAt = p; this.armHold();
    this.drawLive();
  }
  move(e) {
    const tp = this.touches.get(e.pointerId);
    if (tp) { tp.x = e.clientX; tp.y = e.clientY; }
    if (this.gesture) { this.gestureMove(); return; }
    if (this.finger && e.pointerId === this.finger.id) {
      const dx = e.clientX - this.finger.x, dy = e.clientY - this.finger.y;
      if (this.opts.zoomable && this.zoom.s > 1.01) this.panBy(dx, dy);
      else if (this.opts.scrollOnFinger) window.scrollBy(0, -dy);
      this.finger.x = e.clientX; this.finger.y = e.clientY; return;
    }
    if (e.pointerId !== this.curId) return;
    const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
    if (!evs.length) evs.push(e);
    if (this.erasing) { for (const ev of evs) { const p = this.pt(ev); this.ecur = p; this.eraseAt(p); } this.drawLive(); return; }
    if (this.lasering) { const p = this.pt(e); this.laser.push([p[0], p[1], now()]); return; }
    if (this.drag) {
      const p = this.pt(e), dx = p[0] - this.drag.last[0], dy = p[1] - this.drag.last[1];
      if (!this.drag.moved) { this.pushHist(); this.drag.moved = true; }
      for (const i of this.sel) for (const q of this.strokes[i].p) { q[0] += dx; q[1] += dy; }
      this.drag.last = p; this.redraw(); return;
    }
    if (this.lasso) { this.lasso.push(this.pt(e)); this.drawLive(); return; }
    if (!this.cur || this.snapped) return;
    const pts = this.cur.p, rw = this.px();
    for (const ev of evs) {
      const p = this.pt(ev), last = pts[pts.length - 1];
      if (Math.hypot(p[0] - last[0], p[1] - last[1]) * rw < 1.1) continue;
      pts.push(p);
      if (Math.hypot(p[0] - this.holdAt[0], p[1] - this.holdAt[1]) * rw > 4) { this.holdAt = p; this.armHold(); }
    }
    this.drawLive();
  }
  up(e) {
    if (this.touches.has(e.pointerId)) {
      this.touches.delete(e.pointerId);
      if (this.gesture) { if (!this.touches.size) this.endGesture(); return; }
    }
    if (this.finger && e.pointerId === this.finger.id) {
      const f = this.finger; this.finger = null;
      const dx = e.clientX - f.sx, dy = e.clientY - f.sy;
      if (Math.hypot(dx, dy) < 10 && Date.now() - f.t < 600 && Date.now() - (this.penUpAt || 0) > 450) this.passTap(e.clientX, e.clientY);
      else if (this.opts.onSwipe && Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5 && !(this.zoom.s > 1.01)) this.opts.onSwipe(dx < 0 ? 1 : -1);
      return;
    }
    if (e.pointerId !== this.curId) return;
    this.curId = null; clearTimeout(this.holdT);
    if (e.pointerType === 'pen') this.penUpAt = Date.now();
    if (this.erasing) { this.erasing = false; this.ecur = null; this.drawLive(); if (this.opSnap) this.changed(); return; }
    if (this.lasering) { this.lasering = false; return; }
    if (this.drag) { const mv = this.drag.moved; this.drag = null; this.drawLive(); this.placeSelMenu(); if (mv) this.changed(); return; }
    if (this.lasso) { this.finishLasso(); return; }
    if (!this.cur) return;
    const s = this.cur; this.cur = null;
    if (!s.k && tool.mode === 'shape') { const r = recognize(s.p); if (r) this.toShape(s, r); }
    if (!s.k && s.h && tool.hl.straight && s.p.length > 1) this.toShape(s, [s.p[0], s.p[s.p.length - 1]]);
    if (s.p.length === 1) s.p.push([s.p[0][0] + 0.0004, s.p[0][1] + 0.0004, s.p[0][2]]);
    s.p = s.p.map(q => [+q[0].toFixed(4), +q[1].toFixed(4), +(+q[2]).toFixed(2)]);
    this.pushHist(); this.strokes.push(s);
    this.redraw(); this.changed();
  }
  toShape(s, pts) {
    s.p = resample(pts, 0.004).map(q => [q[0], q[1], 0.5]);
    s.k = 1; if (!s.h) s.t = 'b';
  }
  armHold() {
    clearTimeout(this.holdT);
    if (!(tool.mode === 'pen' && tool.pen.hold) && tool.mode !== 'hl') return;
    this.holdT = setTimeout(() => {
      const s = this.cur; if (!s || this.snapped || s.p.length < 3) return;
      const r = s.h ? [s.p[0], s.p[s.p.length - 1]] : recognize(s.p);
      if (!r || (s.h && Math.hypot(r[1][0] - r[0][0], r[1][1] - r[0][1]) < 0.02)) return;
      this.toShape(s, r); this.snapped = true; this.drawLive();
    }, 650);
  }
  cancelCurrent() {
    clearTimeout(this.holdT);
    if (this.curTouch && this.curId != null) {
      if (this.erasing && this.opSnap) { this.strokes = JSON.parse(this.hist.pop()); this.redraw(); }
      if (this.drag && this.drag.moved) { this.strokes = JSON.parse(this.hist.pop()); this.redraw(); }
      this.cur = null; this.lasso = null; this.drag = null; this.erasing = false; this.lasering = false; this.ecur = null; this.curId = null;
    }
    this.finger = null;
    this.drawLive();
  }

  /* ----- 두 손가락: 확대, 이동, 톡 치면 되돌리기 ----- */
  startGesture() {
    const [a, b] = [...this.touches.values()];
    const r = this.host.getBoundingClientRect(), z = this.zoom, m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    this.gesture = {
      t: Date.now(), d0: Math.max(10, Math.hypot(a.x - b.x, a.y - b.y)), s0: z.s, moved: 0, lastM: m,
      ox: r.left - z.tx, oy: r.top - z.ty, cp: { x: (m.x - r.left) / z.s, y: (m.y - r.top) / z.s },
    };
    for (const t of this.touches.values()) { t.sx = t.x; t.sy = t.y; }
  }
  gestureMove() {
    const g = this.gesture, pts = [...this.touches.values()];
    for (const t of pts) g.moved = Math.max(g.moved, Math.hypot(t.x - t.sx, t.y - t.sy));
    if (pts.length < 2) return;
    const [a, b] = pts, m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    if (this.opts.zoomable) {
      const s = clamp(g.s0 * Math.hypot(a.x - b.x, a.y - b.y) / g.d0, 1, 4);
      this.zoom = { s, tx: m.x - g.ox - g.cp.x * s, ty: m.y - g.oy - g.cp.y * s };
      this.panBy(0, 0);
    } else window.scrollBy(0, g.lastM.y - m.y);
    g.lastM = m;
  }
  endGesture() {
    const g = this.gesture; this.gesture = null;
    if (Date.now() - g.t < 320 && g.moved < 16 && tool.twoTapUndo) { if (this.undo()) Toolbar.hint('되돌렸어요'); }
    if (this.zoom.s < 1.04) this.zoom = { s: 1, tx: 0, ty: 0 };
    this.applyZoom(); Toolbar.refresh();
  }
  panBy(dx, dy) {
    const z = this.zoom, W = this.host.clientWidth, H = this.host.clientHeight;
    z.tx = clamp(z.tx + dx, W * (1 - z.s), 0); z.ty = clamp(z.ty + dy, H * (1 - z.s), 0);
    this.applyZoom();
  }
  applyZoom() {
    const z = this.zoom, st = this.host.style;
    st.transformOrigin = '0 0';
    st.transform = z.s === 1 ? '' : 'translate(' + z.tx.toFixed(1) + 'px,' + z.ty.toFixed(1) + 'px) scale(' + z.s.toFixed(3) + ')';
    this.host.classList.toggle('zoomed', z.s !== 1);
    if (this.sel) this.placeSelMenu();
  }
  resetZoom() { this.zoom = { s: 1, tx: 0, ty: 0 }; this.applyZoom(); }

  passTap(x, y) {
    this.cv.style.pointerEvents = 'none';
    const el = document.elementFromPoint(x, y);
    this.cv.style.pointerEvents = '';
    if (!el) return;
    if (el.matches('input,textarea')) { el.focus(); return; }
    const t = el.closest('button,a,label,summary,.term');
    if (t) { t.click(); return; }
    if (this.opts.onTap) this.opts.onTap(x, y);
  }

  /* ----- 지우개: 정밀(닿은 부분만) / 획 전체 ----- */
  eraseAt(p) {
    const r = ERASER_R[tool.eraser.si] || ERASER_R[1], a = this.lastE || p;
    this.lastE = p;
    const out = []; let changed = false;
    for (const s of this.strokes) {
      if (tool.eraser.hlOnly && !s.h) { out.push(s); continue; }
      const rr = r + s.w * 0.5;
      const hit = i => segDist(s.p[i], a, p) < rr || (i > 0 && segDist(p, s.p[i - 1], s.p[i]) < rr);
      if (tool.eraser.kind === 'stroke') {
        let h = false; for (let i = 0; i < s.p.length && !h; i++) h = hit(i);
        if (h) changed = true; else out.push(s);
        continue;
      }
      const pieces = []; let run = [], any = false;
      for (let i = 0; i < s.p.length; i++) {
        if (hit(i)) { any = true; if (run.length > 1) pieces.push(run); run = []; }
        else run.push(s.p[i]);
      }
      if (!any) { out.push(s); continue; }
      if (run.length > 1) pieces.push(run);
      changed = true;
      for (const pp of pieces) out.push(Object.assign({}, s, { p: pp }));
    }
    if (changed) { this.snapOnce(); this.strokes = out; this.clearSel(); this.redraw(); }
  }

  /* ----- 올가미: 감싸서 선택, 끌어서 옮기기 ----- */
  finishLasso() {
    const poly = this.lasso; this.lasso = null;
    if (!poly || poly.length < 3) { this.drawLive(); return; }
    const sel = [];
    this.strokes.forEach((s, i) => { let n = 0; for (const q of s.p) if (pip(q, poly)) n++; if (n >= Math.max(1, s.p.length * 0.5)) sel.push(i); });
    this.sel = sel.length ? sel : null;
    this.drawLive();
    if (this.sel) this.showSelMenu(); else Toolbar.hint('감싼 안에 필기가 없어요');
  }
  selBox() {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const i of this.sel || []) for (const q of this.strokes[i].p) { x0 = Math.min(x0, q[0]); y0 = Math.min(y0, q[1]); x1 = Math.max(x1, q[0]); y1 = Math.max(y1, q[1]); }
    const pad = 0.012; return { x0: x0 - pad, y0: y0 - pad, x1: x1 + pad, y1: y1 + pad };
  }
  inSel(p) { const b = this.selBox(); return p[0] >= b.x0 && p[0] <= b.x1 && p[1] >= b.y0 && p[1] <= b.y1; }
  showSelMenu() {
    if (!this.selMenu) {
      this.selMenu = document.createElement('div'); this.selMenu.className = 'inksel';
      document.body.appendChild(this.selMenu);
      this.selMenu.addEventListener('click', e => { const b = e.target.closest('[data-sel]'); if (b) { e.stopPropagation(); this.selAct(b.dataset.sel); } });
    }
    this.selMenu.innerHTML = '<button type="button" data-sel="dup">복제</button><button type="button" data-sel="del">삭제</button>'
      + tool.pen.colors.map(c => '<button type="button" class="cs" data-sel="color:' + c + '" aria-label="이 색으로"><i style="background:' + c + '"></i></button>').join('')
      + '<button type="button" data-sel="done">완료</button>';
    this.selMenu.hidden = false;
    this.placeSelMenu();
  }
  placeSelMenu() {
    const m = this.selMenu; if (!m || !this.sel) return;
    const r = this.cv.getBoundingClientRect(), k = r.width || this.W, b = this.selBox();
    const mw = m.offsetWidth || 260, mh = m.offsetHeight || 46;
    let top = r.top + b.y0 * k - mh - 10;
    if (top < 66) top = r.top + b.y1 * k + 10;
    m.style.left = clamp(r.left + (b.x0 + b.x1) / 2 * k - mw / 2, 8, window.innerWidth - mw - 8) + 'px';
    m.style.top = clamp(top, 66, window.innerHeight - mh - 8) + 'px';
  }
  selAct(act) {
    const [a, v] = act.split(/:(.*)/);
    if (!this.sel) return;
    if (a === 'done') { this.clearSel(); return; }
    this.pushHist();
    if (a === 'del') { const set = new Set(this.sel); this.strokes = this.strokes.filter((_, i) => !set.has(i)); this.clearSel(); }
    else if (a === 'dup') {
      const start = this.strokes.length;
      for (const i of this.sel) { const s = JSON.parse(JSON.stringify(this.strokes[i])); s.p.forEach(q => { q[0] += 0.02; q[1] += 0.02; }); this.strokes.push(s); }
      this.sel = this.sel.map((_, j) => start + j);
      this.placeSelMenu();
    } else if (a === 'color') { for (const i of this.sel) if (!this.strokes[i].h) this.strokes[i].c = v; }
    this.redraw(); this.changed();
  }
  clearSel() { this.sel = null; this.drag = null; if (this.selMenu) this.selMenu.hidden = true; this.drawLive(); }

  /* ----- 레이저 포인터: 저장 안 되고 금방 사라짐 ----- */
  laserLoop() {
    if (this.laserRaf) return;
    const step = () => {
      const t = now(); this.laser = this.laser.filter(q => t - q[2] < 700);
      this.drawLive();
      this.laserRaf = this.laser.length || this.lasering ? raf(step) : null;
    };
    this.laserRaf = raf(step);
  }

  changed() { this.dirty = true; clearTimeout(this.saveT); this.saveT = setTimeout(() => this.flush(), 500); if (this.opts.onChange) this.opts.onChange(); }
  async flush() {
    clearTimeout(this.saveT);
    if (!this.dirty || !this.key) return;
    this.dirty = false;
    const val = { s: this.strokes, updated: Date.now() };
    if (this.strokes.length) await putPage(this.key, val); else await delPage(this.key);
    Sync.pushInk(this.key, val);
  }
  redraw() {
    const c = this.ctx;
    if (c) {
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.clearRect(0, 0, this.cv.width, this.cv.height);
      c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      drawAll(c, this.strokes, this.W, isDark());
    }
    this.drawLive();
  }
  drawLive() {
    const c = this.lctx; if (!c) return;
    const W = this.W;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, this.live.width, this.live.height);
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    const accent = cssVar('--accent') || '#4E3FE5';
    if (this.cur) drawStroke(c, this.cur, W, isDark());
    if (this.lasso && this.lasso.length > 1) {
      c.save(); c.setLineDash([6, 5]); c.lineWidth = 1.6; c.strokeStyle = accent;
      c.beginPath(); c.moveTo(this.lasso[0][0] * W, this.lasso[0][1] * W);
      for (const q of this.lasso) c.lineTo(q[0] * W, q[1] * W);
      c.stroke(); c.restore();
    }
    if (this.sel) {
      const b = this.selBox();
      c.save(); c.globalAlpha = 0.08; c.fillStyle = accent; c.fillRect(b.x0 * W, b.y0 * W, (b.x1 - b.x0) * W, (b.y1 - b.y0) * W);
      c.globalAlpha = 1; c.setLineDash([6, 5]); c.lineWidth = 1.6; c.strokeStyle = accent;
      c.strokeRect(b.x0 * W, b.y0 * W, (b.x1 - b.x0) * W, (b.y1 - b.y0) * W); c.restore();
    }
    if (this.ecur) {
      c.save(); c.lineWidth = 1.2; c.strokeStyle = cssVar('--sub') || '#888'; c.fillStyle = 'rgba(128,128,140,.12)';
      c.beginPath(); c.arc(this.ecur[0] * W, this.ecur[1] * W, (ERASER_R[tool.eraser.si] || ERASER_R[1]) * W, 0, Math.PI * 2); c.fill(); c.stroke(); c.restore();
    }
    if (this.laser.length > 1) {
      const t = now();
      c.save(); c.lineCap = 'round'; c.lineJoin = 'round'; c.shadowColor = '#ff3b30'; c.shadowBlur = 10;
      for (let i = 1; i < this.laser.length; i++) {
        const a = this.laser[i - 1], b = this.laser[i];
        c.globalAlpha = clamp(1 - (t - b[2]) / 700, 0, 1);
        c.strokeStyle = '#ff3b30'; c.lineWidth = 4;
        c.beginPath(); c.moveTo(a[0] * W, a[1] * W); c.lineTo(b[0] * W, b[1] * W); c.stroke();
      }
      c.restore();
    }
  }
  destroy() {
    this.flush();
    clearTimeout(this.holdT);
    if (this.ro) this.ro.disconnect(); else window.removeEventListener('resize', this.onResize);
    window.removeEventListener('scroll', this.onScroll);
    if (this.selMenu) this.selMenu.remove();
    this.host.style.transform = ''; this.host.classList.remove('zoomed');
    this.cv.remove(); this.live.remove(); this.host.classList.remove('inkhost');
  }
}

/* ---------- 도구 막대 (위쪽, GoodNotes 배치) ---------- */
const ICON = {
  pen: '<path d="M4 20l1.2-4.6L15.6 5a2 2 0 012.8 0l.6.6a2 2 0 010 2.8L8.6 18.8z"/><path d="M13.5 7l3.5 3.5"/>',
  hl: '<path d="M5 20h6"/><path d="M8 16l-1.2-3.2 8.7-8.7a1.8 1.8 0 012.5 0l.9.9a1.8 1.8 0 010 2.5L10.2 16z"/>',
  eraser: '<path d="M8 20h11"/><path d="M4.6 14.6l8.9-8.9a2 2 0 012.8 0l2 2a2 2 0 010 2.8L11 17.8H7.8z"/><path d="M9 10.2l4.8 4.8"/>',
  shape: '<rect x="3.5" y="11.5" width="8.5" height="8.5" rx="1.2"/><circle cx="16.5" cy="7.5" r="4"/>',
  lasso: '<path d="M8 15.6C5.1 14.6 3 12.5 3 10c0-3.3 4-6 9-6s9 2.7 9 6-4 6-9 6" stroke-dasharray="2.4 2.6"/><circle cx="7" cy="17.5" r="1.8"/><path d="M6.3 19.2c-.4 1.4-1.4 2.3-2.8 2.5"/>',
  laser: '<path d="M4.5 19.5l7-7"/><circle cx="15" cy="9" r="2.6"/><path d="M15 2.5v2M15 13.5v2M8.5 9h2M19.5 9h2M10.4 4.4l1.4 1.4M18.2 12.2l1.4 1.4M19.6 4.4l-1.4 1.4"/>',
  undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 010 11H11"/>',
  redo: '<path d="M15 14l5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 000 11H13"/>',
  more: '<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>',
  zoom: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5M8 11h6"/>',
  close: '<path d="M15 5l-7 7 7 7"/>',
};
const icon = n => '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' + ICON[n] + '</svg>';
const TOOL_NAME = { pen: '펜', hl: '형광펜', eraser: '지우개', shape: '도형', lasso: '올가미', laser: '레이저 포인터' };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const Toolbar = {
  el: null, pop: null, tip: null, layer: null, onClose: null, popKind: null,
  attach(layer, onClose) {
    this.layer = layer; this.onClose = onClose || null;
    if (!this.el) {
      this.el = document.createElement('div');
      this.el.className = 'inkbar'; this.el.setAttribute('role', 'toolbar'); this.el.setAttribute('aria-label', '필기 도구');
      this.pop = document.createElement('div'); this.pop.className = 'inkpop'; this.pop.hidden = true;
      this.tip = document.createElement('div'); this.tip.className = 'inktip'; this.tip.hidden = true;
      document.body.appendChild(this.el); document.body.appendChild(this.pop); document.body.appendChild(this.tip);
      this.el.addEventListener('click', e => this.click(e));
      this.pop.addEventListener('click', e => this.click(e));
      this.pop.addEventListener('input', e => this.input(e));
      document.addEventListener('pointerdown', e => {
        if (this.popKind && !this.pop.contains(e.target) && !this.el.contains(e.target)) this.closePop();
      }, true);
      document.addEventListener('keydown', e => {
        if (!this.layer || this.el.hidden || !(e.ctrlKey || e.metaKey) || (e.key || '').toLowerCase() !== 'z') return;
        e.preventDefault(); if (e.shiftKey) this.layer.redo(); else this.layer.undo();
      });
    }
    this.el.hidden = false;
    document.body.classList.add('inking');
    this.refresh();
  },
  detach() {
    if (this.el) this.el.hidden = true;
    this.closePop();
    if (this.layer) this.layer.clearSel();
    document.body.classList.remove('inking');
    this.layer = null; this.onClose = null;
  },
  hint(msg) {
    if (!this.tip) return;
    this.tip.textContent = msg; this.tip.hidden = false;
    clearTimeout(this.tipT); this.tipT = setTimeout(() => { this.tip.hidden = true; }, 2200);
  },
  refresh() {
    if (!this.el || this.el.hidden) return;
    const m = tool.mode, L = this.layer;
    const b = (act, label, inner, on, cls) => '<button type="button" class="' + (cls || 'ib') + (on ? ' on' : '') + '" data-act="' + act + '" aria-label="' + esc(label) + '" title="' + esc(label) + '">' + inner + '</button>';
    const tick = t => (t === 'pen' || t === 'shape') ? tool.pen.colors[tool.pen.ci] : t === 'hl' ? tool.hl.colors[tool.hl.ci] : '';
    let h = '<div class="ig ig-l">' + b('close', '필기 끝내기', icon('close') + '<span>끝</span>', false, 'ib closeb') + '</div>';
    h += '<div class="ig ig-tools">' + ['pen', 'hl', 'eraser', 'shape', 'lasso', 'laser'].map(t =>
      b('tool:' + t, TOOL_NAME[t], icon(t) + (tick(t) ? '<i class="tick" style="background:' + tick(t) + '"></i>' : ''), m === t)).join('') + '</div>';
    let o = '';
    if (m === 'pen' || m === 'shape' || m === 'hl') {
      const g = grp(), maxv = m === 'hl' ? 10 : 10;
      o += g.colors.map((c, i) => b('color:' + i, '색 ' + (i + 1) + (g.ci === i ? ' (한 번 더 누르면 색 바꾸기)' : ''), '<i style="background:' + c + '"></i>', g.ci === i, 'cb')).join('');
      o += '<span class="sep"></span>';
      o += g.sizes.map((v, i) => { const d = Math.round(3 + v / maxv * 13); return b('size:' + i, '굵기 ' + (i + 1) + (g.si === i ? ' (한 번 더 누르면 조절)' : ''), '<i style="width:' + d + 'px;height:' + d + 'px"></i>', g.si === i, 'sb'); }).join('');
    } else if (m === 'eraser') {
      o += [8, 13, 19].map((d, i) => b('esize:' + i, '지우개 크기 ' + (i + 1), '<i class="ring" style="width:' + d + 'px;height:' + d + 'px"></i>', tool.eraser.si === i, 'sb')).join('');
      o += '<span class="ohint">' + (tool.eraser.kind === 'part' ? '닿은 부분만' : '획 전체') + (tool.eraser.hlOnly ? ', 형광펜만' : '') + '</span>';
    } else if (m === 'lasso') o += '<span class="ohint">동그라미로 감싸면 선택, 끌어서 옮겨요</span>';
    else if (m === 'laser') o += '<span class="ohint">설명하듯 가리키면 잠깐 뒤 사라져요</span>';
    h += '<div class="ig ig-opt">' + o + '</div>';
    h += '<div class="ig ig-r">' + b('undo', '되돌리기', icon('undo')) + b('redo', '다시 하기', icon('redo'))
      + (L && L.zoom && L.zoom.s > 1.01 ? b('zoomreset', '확대 원래대로', icon('zoom')) : '')
      + b('more', '더보기', icon('more'), this.popKind === 'more') + '</div>';
    this.el.innerHTML = h;
  },
  toggleHtml(key, on, label, sub) {
    return '<button type="button" class="row" data-act="tog:' + key + '"><span>' + label + (sub ? '<small>' + sub + '</small>' : '') + '</span><i class="sw' + (on ? ' on' : '') + '"></i></button>';
  },
  popHtml(kind) {
    const g = grp();
    const pal = (list, cur) => '<div class="pal">' + list.map(c => '<button type="button" data-act="pal:' + c + '" class="' + (c.toLowerCase() === String(cur).toLowerCase() ? 'on' : '') + '" style="background:' + c + '" aria-label="' + c + '"></button>').join('') + '</div>';
    const range = () => '<h4>굵기 <b class="num">' + g.sizes[g.si] + '</b></h4><input type="range" min="1" max="10" step="1" value="' + g.sizes[g.si] + '" data-act="range" aria-label="굵기">'
      + '<canvas class="pv" width="520" height="70" aria-hidden="true"></canvas>';
    const seg = (act, cur, items) => '<div class="seg">' + items.map(([v, l]) => '<button type="button" data-act="' + act + ':' + v + '" class="' + (cur === v ? 'on' : '') + '">' + l + '</button>').join('') + '</div>';
    if (kind === 'pen') return '<h4>펜 종류</h4>' + seg('ptype', tool.pen.type, [['f', '만년필'], ['b', '볼펜'], ['r', '붓펜']])
      + '<h4>색</h4>' + pal(PEN_PALETTE, g.colors[g.ci]) + range()
      + this.toggleHtml('hold', tool.pen.hold, '그리고 잠깐 멈추면 도형으로', '선, 동그라미, 세모, 네모가 반듯해져요');
    if (kind === 'shape') return '<p class="pnote">대충 그리고 펜을 떼면 직선, 동그라미, 세모, 네모로 반듯하게 바뀌어요.</p><h4>색</h4>' + pal(PEN_PALETTE, g.colors[g.ci]) + range();
    if (kind === 'hl') return '<h4>색</h4>' + pal(HL_PALETTE, g.colors[g.ci]) + range()
      + this.toggleHtml('straight', tool.hl.straight, '곧은 선으로만 긋기', '끄면 그리고 잠깐 멈출 때만 곧게');
    if (kind === 'palette') return '<h4>' + (tool.mode === 'hl' ? '형광펜' : '펜') + ' 색 ' + (g.ci + 1) + '번 바꾸기</h4>' + pal(tool.mode === 'hl' ? HL_PALETTE : PEN_PALETTE, g.colors[g.ci]);
    if (kind === 'size') return range();
    if (kind === 'eraser') return '<h4>지우는 방식</h4>' + seg('ekind', tool.eraser.kind, [['part', '정밀 지우개'], ['stroke', '획 지우개']])
      + '<p class="pnote">' + (tool.eraser.kind === 'part' ? '지우개가 닿은 부분만 지워요.' : '닿은 획을 통째로 지워요.') + '</p>'
      + '<h4>크기</h4>' + seg('esize', String(tool.eraser.si), [['0', '작게'], ['1', '보통'], ['2', '크게']])
      + this.toggleHtml('hlOnly', tool.eraser.hlOnly, '형광펜만 지우기', '글씨는 그대로 두고 형광펜만');
    if (kind === 'more') return this.toggleHtml('fingerNav', tool.fingerNav, '펜슬로만 쓰기', '손가락은 넘기기와 스크롤만 해요')
      + this.toggleHtml('twoTapUndo', tool.twoTapUndo, '두 손가락으로 톡 치면 되돌리기', '')
      + '<p class="pnote">두 손가락으로 벌리면 확대(필기 노트), 두 손가락으로 끌면 이동, PC 는 Ctrl+Z 로 되돌리기.</p>'
      + '<button type="button" class="danger" data-act="clearpage">이 쪽 필기 모두 지우기</button>';
    return '';
  },
  drawPreview() {
    const cv = this.pop && this.pop.querySelector('canvas.pv'); if (!cv) return;
    const c = ctx2d(cv); if (!c) return;
    c.clearRect(0, 0, cv.width, cv.height);
    const hl = tool.mode === 'hl', g = grp(), W = cv.width, pts = [];
    for (let i = 0; i <= 40; i++) { const t = i / 40; pts.push([0.06 + t * 0.88, (35 + Math.sin(t * Math.PI * 2) * 14) / W, 0.25 + 0.6 * Math.sin(t * Math.PI)]); }
    drawStroke(c, { c: g.colors[g.ci], w: (hl ? hlW(g.sizes[g.si]) : penW(g.sizes[g.si])) * 1.6, h: hl ? 1 : 0, t: hl ? 'b' : tool.pen.type, p: pts }, W, isDark());
  },
  openPop(kind, rect) {
    this.popKind = kind;
    this.pop.innerHTML = this.popHtml(kind);
    this.pop.hidden = false;
    const pw = this.pop.offsetWidth || 300, bar = this.el.getBoundingClientRect();
    this.pop.style.left = clamp(rect.left + rect.width / 2 - pw / 2, 10, window.innerWidth - pw - 10) + 'px';
    this.pop.style.top = (bar.bottom + 8) + 'px';
    this.drawPreview();
  },
  closePop() { if (this.pop) this.pop.hidden = true; const was = this.popKind; this.popKind = null; if (was === 'more') this.refresh(); },
  input(e) {
    const t = e.target; if (!t || t.dataset.act !== 'range') return;
    const g = grp(); g.sizes[g.si] = +t.value; saveTool();
    const lb = this.pop.querySelector('h4 b'); if (lb) lb.textContent = t.value;
    this.drawPreview(); this.refresh();
  },
  click(e) {
    const btn = e.target.closest('[data-act]'); if (!btn) return;
    e.stopPropagation();
    const [act, val] = btn.dataset.act.split(/:(.*)/);
    if (act === 'range') return;
    const L = this.layer, rect = btn.getBoundingClientRect(), inPop = this.pop.contains(btn);
    const g = grp();
    if (act === 'close') { this.closePop(); const f = this.onClose; if (f) f(); else this.detach(); return; }
    if (act === 'tool') {
      if (tool.mode === val && ['pen', 'hl', 'eraser', 'shape'].includes(val)) { if (this.popKind === val) this.closePop(); else this.openPop(val, rect); return; }
      tool.mode = val; this.closePop(); if (L) L.clearSel();
    } else if (act === 'color') {
      if (g.ci === +val) { if (this.popKind === 'palette') this.closePop(); else this.openPop('palette', rect); return; }
      g.ci = +val; this.closePop();
    } else if (act === 'size') {
      if (g.si === +val) { if (this.popKind === 'size') this.closePop(); else this.openPop('size', rect); return; }
      g.si = +val; this.closePop();
    } else if (act === 'pal') { g.colors[g.ci] = val; if (this.popKind === 'palette') this.closePop(); }
    else if (act === 'ptype') tool.pen.type = val;
    else if (act === 'ekind') tool.eraser.kind = val;
    else if (act === 'esize') tool.eraser.si = +val;
    else if (act === 'tog') {
      if (val === 'hold') tool.pen.hold = !tool.pen.hold;
      else if (val === 'straight') tool.hl.straight = !tool.hl.straight;
      else if (val === 'hlOnly') tool.eraser.hlOnly = !tool.eraser.hlOnly;
      else if (val === 'fingerNav') tool.fingerNav = !tool.fingerNav;
      else if (val === 'twoTapUndo') tool.twoTapUndo = !tool.twoTapUndo;
    } else if (act === 'undo') { if (L) L.undo(); }
    else if (act === 'redo') { if (L) L.redo(); }
    else if (act === 'zoomreset') { if (L) L.resetZoom(); }
    else if (act === 'more') { if (this.popKind === 'more') this.closePop(); else this.openPop('more', rect); saveTool(); this.refresh(); return; }
    else if (act === 'clearpage') { this.closePop(); if (L && L.strokes.length && confirm('이 쪽의 필기를 모두 지울까요? 되돌리기로 살릴 수 있어요.')) L.clear(); }
    saveTool(); this.refresh();
    if (inPop && this.popKind) { const st = this.pop.scrollTop; this.pop.innerHTML = this.popHtml(this.popKind); this.pop.scrollTop = st; this.drawPreview(); }
  },
};

/* 작은 미리보기: 저장된 필기를 작은 캔버스에 그림 */
async function preview(canvas, key) {
  const page = await getPage(key);
  const c = ctx2d(canvas); if (!c) return;
  c.clearRect(0, 0, canvas.width, canvas.height);
  if (!page || !page.s) return;
  drawAll(c, page.s, canvas.width, isDark());
}

window.GNNInk = { Layer, Toolbar, tool, getPage, putPage, delPage, keys, all, preview, Sync, recognize };
})();
