/* 필기(손글씨) 레이어, 도구 막대, 기기 간 동기화 */
(function () {
'use strict';

/* ---------- 색: 테마 토큰으로 그려서 어두운 화면에서도 보이게 ---------- */
const COLORS = { ink: '--ink', red: '--coral', blue: '--accent', green: '--teal', hl: '--hl' };
const cssVar = n => (getComputedStyle(document.documentElement).getPropertyValue(n) || '').trim();
const colorOf = c => cssVar(COLORS[c] || COLORS.ink) || '#222';
const SIZES = [0.0024, 0.0040, 0.0066];

/* ---------- 저장: IndexedDB, 안 되면 메모리 ---------- */
const mem = {};
let dbp = null, inkUser = '';
try { if (window.SDT && window.SDT.enabled) inkUser = localStorage.getItem('sdt_uid') || ''; } catch (e) { /* 무시 */ }
const inkDbName = () => 'sdt-ink-' + ((window.SDT_META || {}).key || 'site') + (inkUser ? '-' + inkUser : '');
function setUser(uid) { uid = uid || ''; if (uid === inkUser) return; inkUser = uid; dbp = null; Object.keys(mem).forEach(k => { delete mem[k]; }); }
function idb() {
  if (dbp) return dbp;
  dbp = new Promise(res => {
    const timer = setTimeout(() => res(null), 1500);   // 열리지 않으면 메모리 저장으로
    const done = v => { clearTimeout(timer); res(v); };
    try {
      const r = indexedDB.open(inkDbName(), 1);
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
const tool = { mode: 'pen', color: 'ink', size: 2, fingerNav: false, penSeen: false };
try { Object.assign(tool, JSON.parse(localStorage.getItem('gnn_ink_tool') || '{}')); } catch (e) { /* 기본값 */ }
const saveTool = () => { try { localStorage.setItem('gnn_ink_tool', JSON.stringify(tool)); } catch (e) { /* 무시 */ } };

/* ---------- 동기화: 로그인했을 때만 (assets/sync.js 의 window.SDT, Firestore) ---------- */
const Sync = {
  timers: {},
  ns() { return ((window.SDT_META || {}).key || 'site') + '__'; },
  enabled() { return !!(window.SDT && window.SDT.user); },
  async check() { return this.enabled() ? 'on' : 'off'; },
  async pull(k) { if (!this.enabled()) return null; return window.SDT.get(this.ns() + k); },
  async push(k, value) { if (!this.enabled()) return false; return window.SDT.set(this.ns() + k, value); },
  pullInk(key) { return this.pull('ink:' + key); },
  pushInk(key, val) { clearTimeout(this.timers[key]); this.timers[key] = setTimeout(() => this.push('ink:' + key, val), 900); },
};

/* ---------- 필기 레이어 ---------- */
class Layer {
  constructor(host, opts) {
    this.host = host; this.opts = opts || {};
    host.classList.add('inkhost');
    this.cv = document.createElement('canvas');
    this.cv.className = 'inkcv';
    host.appendChild(this.cv);
    this.ctx = this.cv.getContext ? this.cv.getContext('2d') : null;
    this.strokes = []; this.undone = []; this.key = null; this.enabled = false; this.cur = null;
    this.W = 0; this.H = 0; this.dpr = 1; this.dirty = false; this.seq = 0; this.finger = null;
    this.onResize = () => this.resize();
    if (window.ResizeObserver) { this.ro = new ResizeObserver(this.onResize); this.ro.observe(host); }
    else window.addEventListener('resize', this.onResize);
    this.cv.addEventListener('pointerdown', e => this.down(e));
    this.cv.addEventListener('pointermove', e => this.move(e));
    this.cv.addEventListener('pointerup', e => this.up(e));
    this.cv.addEventListener('pointercancel', e => this.up(e));
    this.cv.addEventListener('contextmenu', e => { if (this.enabled) e.preventDefault(); });
    this.resize();
  }
  setEnabled(on) { this.enabled = !!on; this.cv.classList.toggle('on', this.enabled); }
  async setKey(key) {
    await this.flush();
    const seq = ++this.seq;
    this.key = key || null; this.strokes = []; this.undone = [];
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
    this.cv.width = Math.round(w * dpr); this.cv.height = Math.round(h * dpr);
    this.cv.style.width = w + 'px'; this.cv.style.height = h + 'px';
    this.redraw();
  }
  pt(e) {
    const r = this.cv.getBoundingClientRect();
    const pr = e.pointerType === 'pen' && e.pressure > 0 ? e.pressure : 0.5;
    return [(e.clientX - r.left) / this.W, (e.clientY - r.top) / this.W, pr];
  }
  down(e) {
    if (!this.enabled || !this.key) return;
    if (e.pointerType === 'pen' && !tool.penSeen) { tool.penSeen = true; tool.fingerNav = true; saveTool(); Toolbar.refresh(); }
    e.preventDefault();
    try { this.cv.setPointerCapture(e.pointerId); } catch (err) { /* 무시 */ }
    if (e.pointerType === 'touch' && tool.fingerNav) { this.finger = { id: e.pointerId, y: e.clientY, sx: e.clientX, sy: e.clientY, t: Date.now() }; return; }
    if (tool.mode === 'eraser') { this.erasing = true; this.eraseAt(this.pt(e)); return; }
    const hl = tool.mode === 'hl';
    this.cur = { c: hl ? 'hl' : tool.color, w: hl ? SIZES[2] * 2.6 : (SIZES[tool.size - 1] || SIZES[1]), h: hl ? 1 : 0, p: [this.pt(e)] };
  }
  move(e) {
    if (this.finger && e.pointerId === this.finger.id) {
      if (this.opts.scrollOnFinger) window.scrollBy(0, this.finger.y - e.clientY);
      this.finger.y = e.clientY; return;
    }
    if (this.erasing) { this.eraseAt(this.pt(e)); return; }
    if (!this.cur) return;
    const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
    const pts = this.cur.p;
    for (const ev of evs) {
      const p = this.pt(ev), last = pts[pts.length - 1];
      if (Math.hypot((p[0] - last[0]) * this.W, (p[1] - last[1]) * this.W) < 1.1) continue;
      pts.push(p);
      this.segment(this.cur, pts.length - 1);
    }
  }
  up(e) {
    if (this.finger && e.pointerId === this.finger.id) {
      const f = this.finger; this.finger = null;
      const dx = e.clientX - f.sx, dy = e.clientY - f.sy;
      if (Math.hypot(dx, dy) < 10 && Date.now() - f.t < 600) this.passTap(e.clientX, e.clientY);
      else if (this.opts.onSwipe && Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) this.opts.onSwipe(dx < 0 ? 1 : -1);
      return;
    }
    if (this.erasing) { this.erasing = false; return; }
    if (!this.cur) return;
    const s = this.cur; this.cur = null;
    if (s.p.length === 1) s.p.push([s.p[0][0] + 0.0004, s.p[0][1] + 0.0004, s.p[0][2]]);
    s.p = s.p.map(q => [+q[0].toFixed(4), +q[1].toFixed(4), +q[2].toFixed(2)]);
    this.strokes.push(s); this.undone = [];
    this.redraw(); this.changed();
  }
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
  eraseAt(p) {
    const r = 0.02, n = this.strokes.length;
    this.strokes = this.strokes.filter(s => !s.p.some(q => Math.hypot(q[0] - p[0], q[1] - p[1]) < r));
    if (this.strokes.length !== n) { this.redraw(); this.changed(); }
  }
  undo() { const s = this.strokes.pop(); if (s) { this.undone.push(s); this.redraw(); this.changed(); } }
  redo() { const s = this.undone.pop(); if (s) { this.strokes.push(s); this.redraw(); this.changed(); } }
  clear() { if (!this.strokes.length) return; this.undone = this.strokes.slice().reverse(); this.strokes = []; this.redraw(); this.changed(); }
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
    const c = this.ctx; if (!c) return;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, this.cv.width, this.cv.height);
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    for (const s of this.strokes) this.full(s);
  }
  full(s) {
    const c = this.ctx, W = this.W; if (!c || !s.p.length) return;
    if (s.h) {
      c.save(); c.globalAlpha = 0.32; c.strokeStyle = colorOf('hl'); c.lineWidth = s.w * W; c.lineCap = 'butt'; c.lineJoin = 'round';
      c.beginPath(); c.moveTo(s.p[0][0] * W, s.p[0][1] * W);
      for (let i = 1; i < s.p.length; i++) c.lineTo(s.p[i][0] * W, s.p[i][1] * W);
      c.stroke(); c.restore(); return;
    }
    for (let i = 1; i < s.p.length; i++) this.segment(s, i);
  }
  segment(s, i) {
    const c = this.ctx, W = this.W; if (!c || i < 1) return;
    const a = s.p[i - 1], b = s.p[i];
    c.save();
    if (s.h) { c.globalAlpha = 0.32; c.strokeStyle = colorOf('hl'); c.lineWidth = s.w * W; c.lineCap = 'butt'; }
    else { c.strokeStyle = colorOf(s.c); c.lineWidth = Math.max(0.9, s.w * W * (0.55 + b[2] * 0.9)); c.lineCap = 'round'; }
    c.beginPath(); c.moveTo(a[0] * W, a[1] * W); c.lineTo(b[0] * W, b[1] * W); c.stroke();
    c.restore();
  }
  destroy() {
    this.flush();
    if (this.ro) this.ro.disconnect(); else window.removeEventListener('resize', this.onResize);
    this.cv.remove(); this.host.classList.remove('inkhost');
  }
}

/* ---------- 도구 막대 ---------- */
const ICON = {
  pen: '<path d="M4 20l1.2-4.6L15.6 5a2 2 0 012.8 0l.6.6a2 2 0 010 2.8L8.6 18.8z"/><path d="M13.5 7l3.5 3.5"/>',
  hl: '<path d="M5 19h6"/><path d="M8 15l-1-3 8.5-8.5a1.8 1.8 0 012.5 0l.5.5a1.8 1.8 0 010 2.5L10 15z"/>',
  eraser: '<path d="M8 20h11"/><path d="M4.6 14.6l8.9-8.9a2 2 0 012.8 0l2 2a2 2 0 010 2.8L11 17.8H7.8z"/>',
  undo: '<path d="M9 7L4 12l5 5"/><path d="M4 12h10a6 6 0 010 12"/>',
  redo: '<path d="M15 7l5 5-5 5"/><path d="M20 12H10a6 6 0 000 12"/>',
  trash: '<path d="M5 7h14"/><path d="M9 7V4h6v3"/><path d="M7 7l1 13h8l1-13"/>',
  hand: '<path d="M8 12V5.5a1.5 1.5 0 013 0V11"/><path d="M11 10V4.5a1.5 1.5 0 013 0V11"/><path d="M14 10.5V6a1.5 1.5 0 013 0v7a7 7 0 01-7 7h-.5a6 6 0 01-4.8-2.4L3 14.5a1.5 1.5 0 012.3-1.9L8 15"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
};
const icon = n => '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + ICON[n] + '</svg>';
const Toolbar = {
  el: null, layer: null, onClose: null,
  attach(layer, onClose) {
    this.layer = layer; this.onClose = onClose || null;
    if (!this.el) {
      this.el = document.createElement('div');
      this.el.className = 'inkbar'; this.el.setAttribute('role', 'toolbar'); this.el.setAttribute('aria-label', '필기 도구');
      document.body.appendChild(this.el);
      this.el.addEventListener('click', e => this.click(e));
    }
    this.el.hidden = false;
    document.body.classList.add('inking');
    this.refresh();
  },
  detach() {
    if (this.el) this.el.hidden = true;
    document.body.classList.remove('inking');
    this.layer = null; this.onClose = null;
  },
  refresh() {
    if (!this.el || this.el.hidden) return;
    const btn = (act, label, inner, on, cls) => '<button type="button" class="ib' + (on ? ' on' : '') + (cls ? ' ' + cls : '') + '" data-act="' + act + '" aria-label="' + label + '" title="' + label + '">' + inner + '</button>';
    const sw = ['ink', 'blue', 'red', 'green'].map(c => btn('color:' + c, { ink: '검정', blue: '파랑', red: '빨강', green: '초록' }[c] + ' 펜', '<i class="swatch" style="background:var(' + COLORS[c] + ')"></i>', tool.mode === 'pen' && tool.color === c)).join('');
    const sizes = [1, 2, 3].map(n => btn('size:' + n, '굵기 ' + n, '<i class="dot" style="width:' + (4 + n * 3) + 'px;height:' + (4 + n * 3) + 'px"></i>', tool.size === n && tool.mode === 'pen')).join('');
    this.el.innerHTML = btn('mode:pen', '펜', icon('pen'), tool.mode === 'pen') + sw + '<span class="sep"></span>' + sizes + '<span class="sep"></span>'
      + btn('mode:hl', '형광펜', icon('hl'), tool.mode === 'hl') + btn('mode:eraser', '지우개', icon('eraser'), tool.mode === 'eraser') + '<span class="sep"></span>'
      + btn('undo', '되돌리기', icon('undo')) + btn('redo', '다시 하기', icon('redo')) + btn('clear', '이 쪽 필기 지우기', icon('trash'))
      + '<span class="sep"></span>' + btn('finger', tool.fingerNav ? '손가락은 넘기기 (펜만 필기)' : '손가락으로도 필기', icon('hand'), tool.fingerNav)
      + btn('close', '필기 끝내기', icon('close'), false, 'closeb');
  },
  click(e) {
    const b = e.target.closest('[data-act]'); if (!b) return;
    e.stopPropagation();
    const [act, val] = b.dataset.act.split(':');
    const L = this.layer;
    if (act === 'mode') tool.mode = val;
    else if (act === 'color') { tool.mode = 'pen'; tool.color = val; }
    else if (act === 'size') { tool.mode = 'pen'; tool.size = +val; }
    else if (act === 'undo' && L) L.undo();
    else if (act === 'redo' && L) L.redo();
    else if (act === 'clear' && L) { if (L.strokes.length && confirm('이 쪽의 필기를 모두 지울까요? 되돌리기로 살릴 수 있어요.')) L.clear(); }
    else if (act === 'finger') tool.fingerNav = !tool.fingerNav;
    else if (act === 'close') { const f = this.onClose; if (f) f(); else this.detach(); return; }
    saveTool(); this.refresh();
  },
};

/* 작은 미리보기: 저장된 필기를 작은 캔버스에 그림 */
async function preview(canvas, key) {
  const page = await getPage(key);
  const c = canvas.getContext && canvas.getContext('2d'); if (!c) return;
  const W = canvas.width; c.clearRect(0, 0, canvas.width, canvas.height);
  if (!page || !page.s) return;
  const L = { ctx: c, W, full: Layer.prototype.full, segment: Layer.prototype.segment };
  page.s.forEach(s => L.full(s));
}

window.SDTInk = { Layer, Toolbar, tool, getPage, putPage, delPage, keys, all, preview, Sync, setUser };
})();
