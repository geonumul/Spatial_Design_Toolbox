/* flat-restyle v1 */
/* 회독 스터디 엔진 (과목 공통. 과목 설정은 subjects/<slug>/data/meta.js): 라우터, 길잡이, 회독 플레이어, 정리 슬라이드, 용어 카드, 필기, 문제은행, 오답노트, 동기화 */
(function () {
'use strict';

/* ---------- 유틸 ---------- */
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const reEsc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const hash = s => { let h = 0; for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); };
const norm = s => String(s || '').toLowerCase().replace(/[\s.,()[\]{}\-~'"`:;!?/\\$\u00b7\u2013\u2014’”]/g, '');
const pad3 = n => String(n).padStart(3, '0');
const META = window.SDT_META || { weeks: [], decks: {}, units: {}, prereq: {} };
const INK = () => window.SDTInk || null;
META.passes = META.passes || [{ n: 1, t: '큰 그림', d: '' }, { n: 2, t: '자세히', d: '' }, { n: 3, t: '시험', d: '' }];
META.deckWeek = META.deckWeek || {};
const PAGES = window.SDT_PAGES || {};
const termKey = t => String((t && (t.en || t.ko)) || '').toLowerCase();
const termFace = t => (t && (t.ko || t.en)) || '';
/* 용어 간격 반복: 본 적 있고, 복습 날짜가 없거나 오늘 이전이면 오늘 복습 대상 */
const termDue = t => { const r = store.terms[termKey(t)]; return !!(r && r.seen > 0 && (!r.due || r.due <= dayKey())); };
const srcKind = q => (q && q.src) ? String(q.src).trim().split(/[\s,(]/)[0] : '';
const enCls = x => /^[\x00-\x7F]*$/.test(String(x || '').slice(0, 60)) ? ' en' : '';
const APP = () => $('#app');
function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('on'); clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove('on'), 2200); }
function parseNum(s) {
  s = String(s == null ? '' : s).replace(/\s+/g, '').replace(/−/g, '-');
  if (!s) return NaN;
  const m = s.match(/^([-+]?\d*\.?\d+)\/([-+]?\d*\.?\d+)$/);
  if (m) { const d = parseFloat(m[2]); return d ? parseFloat(m[1]) / d : NaN; }
  return /^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(s) ? parseFloat(s) : NaN;
}
const fmtNum = x => String(Math.round(x * 10000) / 10000);
function renderMath(el) {
  if (!el || !window.renderMathInElement) return;
  try {
    window.renderMathInElement(el, { delimiters: [{ left: '$$', right: '$$', display: true }, { left: '$', right: '$', display: false }],
      throwOnError: false, strict: false, ignoredTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code', 'svg', 'input'] });
  } catch (e) { /* 수식 렌더 실패는 원문 표시 */ }
}
const loaded = {};
function loadScript(src) {
  if (loaded[src]) return loaded[src];
  loaded[src] = new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = src + '?v=' + (META.ver || '');
    s.onload = res;
    s.onerror = () => { delete loaded[src]; rej(new Error(src)); };
    document.head.appendChild(s);
  });
  return loaded[src];
}

/* ---------- 저장 ---------- */
const KEY = META.key || 'sdt_site';
const readStore = k => { try { return JSON.parse(localStorage.getItem(k) || '{}') || {}; } catch (e) { return {}; } };
let LKEY = KEY;   // 로그인하면 KEY@uid
try { const lu = localStorage.getItem('sdt_uid'); if (lu && window.SDT && window.SDT.enabled) LKEY = KEY + '@' + lu; } catch (e) { /* 무시 */ }
const store = {};
function initStore(o) {
  Object.keys(store).forEach(k => { delete store[k]; });
  Object.assign(store, o || {});
  ['wrong', 'seen', 'lesson', 'units', 'terms', 'pref', 'mockDone', 'notesRead', 'games'].forEach(k => { store[k] = store[k] || {}; });
  store.extra = store.extra || [];
  store.notebook = store.notebook || { free: 1 };
  if (store.pref.cumulative == null) store.pref.cumulative = false;
}
initStore(readStore(LKEY));
const dayKey = (d0 = new Date()) => d0.getFullYear() + '-' + String(d0.getMonth() + 1).padStart(2, '0') + '-' + String(d0.getDate()).padStart(2, '0');
function applyPref() {
  const t = store.pref.theme;
  if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t; else delete document.documentElement.dataset.theme;
  const z = +store.pref.zoom || 1; const a = APP(); if (a) a.style.zoom = z === 1 ? '' : String(z);
}
function saveNow() { store.updatedAt = Date.now(); store.days = store.days || {}; store.days[dayKey()] = 1; try { localStorage.setItem(LKEY, JSON.stringify(store)); } catch (e) { /* 저장 공간 없음 */ } }
let saveT = null;
function save() { clearTimeout(saveT); saveT = setTimeout(() => { saveNow(); syncPushSoon(); }, 250); }
window.addEventListener('pagehide', () => { saveNow(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) { saveNow(); syncPushNow(); } });

/* ---------- 동기화 (설정 페이지에서 켬) ---------- */
let syncReady = false, syncT = null;
const progressData = () => ({ wrong: store.wrong, seen: store.seen, lesson: store.lesson, units: store.units, terms: store.terms, notebook: store.notebook, mockDone: store.mockDone, notesRead: store.notesRead, days: store.days || {}, pref: store.pref, games: store.games, last: store.last || null });
function syncPushSoon() { const I = INK(); if (!syncReady || !I || !I.Sync.enabled()) return; clearTimeout(syncT); syncT = setTimeout(syncPushNow, 2500); }
function syncPushNow() { const I = INK(); if (!syncReady || !I || !I.Sync.enabled()) return; clearTimeout(syncT); I.Sync.push('progress', { updated: Date.now(), data: progressData() }); }
function mergeProgress(d) {
  Object.keys(d.seen || {}).forEach(k => { const v = d.seen[k], l = store.seen[k]; if (!l || (v.n || 0) > (l.n || 0)) store.seen[k] = v; });
  Object.keys(d.wrong || {}).forEach(k => { const v = d.wrong[k], l = store.wrong[k]; if (!l || (v.ts || 0) > (l.ts || 0)) store.wrong[k] = v; });
  Object.keys(d.lesson || {}).forEach(deck => {
    const L = store.lesson[deck] = store.lesson[deck] || {};
    Object.keys(d.lesson[deck]).forEach(p => {
      const v = d.lesson[deck][p] || {}, l = L[p] || {};
      L[p] = { i: (v.max || 0) > (l.max || 0) ? v.i : l.i, max: Math.max(v.max || 0, l.max || 0), total: v.total || l.total, done: !!(v.done || l.done) };
    });
  });
  Object.keys(d.units || {}).forEach(k => { const v = d.units[k] || {}, l = store.units[k] || {}; store.units[k] = { i: Math.max(v.i || 0, l.i || 0), done: !!(v.done || l.done) }; });
  Object.keys(d.terms || {}).forEach(k => { const v = d.terms[k] || {}, l = store.terms[k] || {}; store.terms[k] = { seen: Math.max(v.seen || 0, l.seen || 0), known: !!(v.known || l.known), box: Math.max(v.box || 0, l.box || 0), due: (v.due || '') > (l.due || '') ? v.due : l.due }; });
  if (d.notebook) store.notebook.free = Math.max(store.notebook.free || 1, d.notebook.free || 1);
  Object.keys(d.mockDone || {}).forEach(k => { if (d.mockDone[k]) store.mockDone[k] = true; });
  Object.keys(d.notesRead || {}).forEach(k => { const v = d.notesRead[k], l = store.notesRead[k]; if (v && (!l || v < l)) store.notesRead[k] = v; });
  Object.keys(d.days || {}).forEach(k => { store.days = store.days || {}; store.days[k] = 1; });
  if (d.pref) Object.keys(d.pref).forEach(k => { if (store.pref[k] == null) store.pref[k] = d.pref[k]; });
  if (!store.last && d.last) store.last = d.last;
  if (d.games) gMergeGames(d.games);
}
async function syncPull(rerender) {
  const I = INK(); if (!I) { syncReady = true; return; }
  if (!I.Sync.enabled()) { syncReady = true; return; }
  const r = await I.Sync.pull('progress');
  if (r && r.data) mergeProgress(r.data);
  saveNow(); applyPref();
  if (rerender && !P) route();
  syncReady = true;
  syncPushNow();
}
/* 로그인 상태가 바뀌면 그 사람 기록으로 바꿔 끼운다 (assets/sync.js 가 부름) */
function hasProgress(o) { return !!(o && ['seen', 'wrong', 'lesson', 'units', 'notesRead'].some(k => o[k] && Object.keys(o[k]).length)); }
function onAuth(u) {
  const nk = u ? KEY + '@' + u.uid : KEY;
  const I = INK(); if (I && I.setUser) I.setUser(u ? u.uid : '');
  if (nk !== LKEY) {
    saveNow();
    let next = readStore(nk);
    if (u && !hasProgress(next)) {
      const guest = readStore(KEY);
      if (hasProgress(guest) && confirm('로그인 없이 이 기기에서 공부한 기록이 있어요. 내 계정으로 옮길까요?')) { next = guest; try { localStorage.removeItem(KEY); } catch (e) { /* 무시 */ } }
    }
    LKEY = nk; initStore(next); saveNow(); applyPref();
    if (!P) route();
  }
  syncReady = false;
  if (u) syncPull(true); else syncReady = true;
}

/* ---------- 용어 ---------- */
const TERM = {};
let TERM_RE = null, KO_RE = null;
(function initTerms() {
  const T = window.SDT_TERMS || {};
  const ko = [];
  Object.keys(T).forEach(w => (T[w] || []).forEach(t => {
    const k = termKey(t);
    if (k.length >= 2 && !TERM[k]) TERM[k] = Object.assign({ week: w }, t);
    if (t.ko && t.ko.length >= 2 && !/^[A-Za-z0-9]/.test(t.ko)) ko.push([t.ko, k]);
  }));
  const keys = Object.keys(TERM).filter(k => TERM[k].en && (TERM[k].en.length >= 3 || /^[A-Z0-9]+$/.test(TERM[k].en))).sort((a, b) => TERM[b].en.length - TERM[a].en.length).map(k => reEsc(TERM[k].en));
  if (keys.length) TERM_RE = new RegExp('(^|[^A-Za-z])(' + keys.join('|') + ')(?![A-Za-z])', 'gi');
  const seenKo = {};
  const kos = ko.filter(x => { if (seenKo[x[0]]) return false; seenKo[x[0]] = x[1]; return true; }).sort((a, b) => b[0].length - a[0].length);
  if (kos.length) { KO_RE = new RegExp('(' + kos.map(x => reEsc(x[0])).join('|') + ')', 'g'); KO_RE.map = seenKo; }
})();
function fmt(s, terms) {
  const maths = [];
  s = String(s == null ? '' : s).replace(/\$\$[\s\S]+?\$\$|\$[^$\n]+?\$/g, m => ' ' + (maths.push(m) - 1) + ' ');
  let h = esc(s);
  if (terms !== false) {
    if (TERM_RE) h = h.replace(TERM_RE, (m, pre, t) => pre + '<span class="term" data-t="' + esc(t.toLowerCase()) + '">' + t + '</span>');
    if (KO_RE) h = h.replace(/(<span class="term"[^>]*>[^<]*<\/span>)|([^<]+)/g, (m, span, text) => span ? span : text.replace(KO_RE, k => '<span class="term" data-t="' + esc(KO_RE.map[k]) + '">' + k + '</span>'));
  }
  h = h.replace(/\*\*([\s\S]+?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>');
  return h.replace(/ (\d+) /g, (m, i) => esc(maths[+i]));
}
function countTerms(el) {
  const seen = {};
  $$('.term', el).forEach(x => {
    const k = x.dataset.t;
    if (seen[k]) { x.classList.add('again'); return; }
    seen[k] = 1;
  });
  Object.keys(seen).forEach(k => { const r = store.terms[k] || (store.terms[k] = { seen: 0 }); r.seen++; });
  if (Object.keys(seen).length) save();
}
let pop = null;
function closePop() { if (pop) { pop.remove(); pop = null; } }
document.addEventListener('click', ev => {
  const t = ev.target.closest && ev.target.closest('.term');
  if (!t) { closePop(); return; }
  ev.stopPropagation(); ev.preventDefault();
  closePop();
  const d = TERM[t.dataset.t]; if (!d) return;
  const r = store.terms[t.dataset.t] || { seen: 0 };
  pop = document.createElement('div');
  pop.className = 'tpop';
  pop.innerHTML = '<b>' + esc(termFace(d)) + (d.en && d.ko ? ' <span style="font-weight:450;opacity:.85">' + esc(d.en) + '</span>' : '') + '</b>' + esc(d.say) + (d.more ? '<br><span style="opacity:.85;font-size:14px">' + esc(d.more) + '</span>' : '') + '<br><span style="opacity:.6;font-size:13px">지금까지 ' + r.seen + '번 봤어요</span>';
  document.body.appendChild(pop);
  const b = t.getBoundingClientRect(), w = Math.min(300, window.innerWidth - 24);
  pop.style.maxWidth = w + 'px';
  pop.style.left = clamp(b.left + window.scrollX, 12 + window.scrollX, window.scrollX + window.innerWidth - w - 12) + 'px';
  pop.style.top = (b.bottom + window.scrollY + 8) + 'px';
}, true);

/* ---------- 문제은행 ---------- */
const BANK = (window.SDT_BANK || []).concat(store.extra || []);
const TYPE_NAME = { mcq: '객관식', short: '주관식', ox: 'O/X', essay: '서술', calc: '계산' };
const LEVEL_NAME = { basic: '기본', hard: '심화' };
const ESSAY_PASS = 0.7;
BANK.forEach(q => { if (!q.id) q.id = q.type + '_' + hash(q.type + '|' + q.q); if (!q.level) q.level = 'basic'; });
const BY_ID = {}; BANK.forEach(q => { BY_ID[q.id] = q; });
const weekOf = id => META.weeks.find(x => x.id === id);
const weekName = id => { const w = weekOf(id); return w ? w.short : id + '주차'; };
function updateBadges() {
  const wn = Object.keys(store.wrong).filter(k => !store.wrong[k].resolved && BY_ID[k]).length;
  $('#wrongBadge').textContent = wn ? wn : '';
  const ks = Object.keys(store.seen); let ok = 0, att = 0;
  ks.forEach(k => { ok += store.seen[k].ok; att += store.seen[k].n; });
  $('#hstat').textContent = ks.length ? '푼 문제 ' + ks.length + '개, 정답률 ' + Math.round(ok / att * 100) + '%' : '';
}

/* ---------- 라우터 ---------- */
const routes = [
  [/^#?\/?$/, pageHome],
  [/^#\/week\/(\w+)$/, pageWeek],
  [/^#\/lesson\/([A-Za-z]+\d+)\/([0-9])(?:\/(\d+)(\/all)?)?$/, pageLesson],
  [/^#\/unit\/(w\w+?-\d+)(?:\/(\d+)(\/all)?)?$/, pageUnit],
  [/^#\/terms\/(\w+)$/, pageTerms],
  [/^#\/game(?:\/(\w+))?(?:\?(.*))?$/, pageGame],   // 용어 게임
  [/^#\/quiz(?:\?(.*))?$/, pageQuiz],
  [/^#\/mock(?:\?(.*))?$/, pageMock],
  [/^#\/wrong$/, pageWrong],
  [/^#\/notebook/, () => location.replace('#/')],
  [/^#\/settings$/, pageSettings],
  [/^#\/exams$/, () => pageStatic('exams')],
  [/^#\/tips$/, () => pageStatic('tips')],
  [/^#\/note(?:\/([\w-]+))?$/, pageNote],
  [/^#\/time$/, pageTime],
  [/^#\/recall\/([A-Za-z]+\d+)(?:\/([1-4])(?:\/(\d+))?)?$/, pageRecall],   // 가리고 설명하기
];
let cleanup = null, qInk = null;
function route() {
  if (cleanup) { cleanup(); cleanup = null; }
  if (qInk) { qInk.destroy(); qInk = null; }
  if (INK()) INK().Toolbar.detach();
  document.body.classList.remove('playing', 'paper');
  closePop();
  const h = location.hash || '#/';
  for (const [re, fn] of routes) {
    const m = h.match(re);
    if (m) {
      window.scrollTo(0, 0);
      setNav(h);
      fn.apply(null, m.slice(1));
      updateBadges();
      return;
    }
  }
  location.hash = '#/';
}
function setNav(h) {
  let key = 'home';
  const lm = h.match(/^#\/lesson\/([A-Za-z]+\d+)\//);
  const w = h.match(/^#\/(?:week|terms)\/(\w+)/) || (lm ? [0, META.deckWeek[lm[1]] || ''] : null) || h.match(/^#\/unit\/w(\w+?)-/);
  if (w) key = 'w' + w[1];
  else if (/^#\/(quiz|mock)/.test(h)) key = 'quiz';
  else if (/^#\/wrong/.test(h)) key = 'wrong';
  else if (/^#\/notebook/.test(h)) key = 'note';
  else if (/^#\/settings/.test(h)) key = 'set';
  else if (/^#\/game/.test(h)) key = 'game';
  else if (/^#\/exams/.test(h)) key = 'exams';
  else if (/^#\/tips/.test(h)) key = 'tips';
  else if (/^#\/note(\/|$)/.test(h)) key = 'pnote';
  else if (/^#\/time$/.test(h)) key = 'ptime';
  $$('#nav .tab').forEach(t => t.classList.toggle('on', t.dataset.nav === key));
  const on = $('#nav .tab.on'); if (on && on.scrollIntoView) on.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}
const qs = str => { const o = {}; (str || '').split('&').forEach(p => { if (!p) return; const [k, v] = p.split('='); o[decodeURIComponent(k)] = decodeURIComponent(v || ''); }); return o; };

/* ---------- 진행 계산 ---------- */
function lessonProg(deck, pass) {
  const d = META.decks[deck]; const r = (store.lesson[deck] || {})[pass] || {};
  const total = d ? (pass === 0 ? (d.warm || 0) : d.frames[pass - 1]) : 0;
  return { total, max: Math.min(r.max || 0, total), done: !!r.done, i: r.i || 0 };
}
function passState(deck, pass) { const p = lessonProg(deck, pass); return p.done ? 'on' : p.max > 0 ? 'half' : ''; }
function weekQuizStat(week, level) {
  const list = BANK.filter(q => q.part === week && (!level || q.level === level) && q.unit !== '용어');
  let seen = 0; list.forEach(q => { if (store.seen[q.id]) seen++; });
  return { total: list.length, seen };
}
const mins = frames => Math.max(3, Math.round(frames * 9 / 60));
const unitDone = id => !!(store.units[id] || {}).done;
function unitMeta(id) { for (const w of Object.keys(META.units)) { const u = (META.units[w] || []).find(x => x.id === id); if (u) return u; } return null; }

/* ---------- 길잡이: 주차마다 할 일 순서 ---------- */
function weekSteps(week) {
  const w = weekOf(week); if (!w) return [];
  const d = w.deck ? META.decks[w.deck] : null;
  const units = META.units[week] || [];
  const steps = [];
  const nextUnit = list => (list.find(u => !unitDone(u.id)) || list[0]);
  if (week === 'b') {
    units.forEach((u, i) => steps.push({ t: '기초 단원 ' + (i + 1) + ': ' + u.title, d: u.goal, done: unitDone(u.id), href: '#/unit/' + u.id, meta: u.n + '장' }));
    return steps;
  }
  if (w.exam) {
    const ex = BANK.filter(q => q.part === week && q.unit !== '용어');
    const kinds = []; ex.forEach(q => { const k = srcKind(q); if (k && kinds.indexOf(k) < 0) kinds.push(k); });
    kinds.forEach(k => {
      const l = ex.filter(q => srcKind(q) === k), seen = l.filter(q => store.seen[q.id]).length;
      steps.push({ t: k + ' 문제 전부 풀기', d: k === '기출' ? '실제 시험에 나온 문제예요. 틀린 문제는 해설을 꼭 읽어요.' : '시험 범위에서 나올 만한 문제예요.', done: seen >= l.length, href: '#/quiz?week=' + week + '&src=' + encodeURIComponent(k) + '&mode=unseen&n=0&start=1', meta: seen + ' / ' + l.length + '문제' });
    });
    if (ex.length) steps.push({ t: '모의고사', d: '시험지처럼 섞어서 한 번에 풀어요.', done: !!store.mockDone[week], href: '#/mock?week=' + week, meta: '' });
    return steps;
  }
  const pre = (META.prereq[week] || []).map(unitMeta).filter(Boolean);
  if (pre.length) steps.push({ t: '필요한 기초만 먼저', d: '이 주차에 나오는 수학, 딥러닝 기초예요. 이미 알면 건너뛰어도 돼요.', done: pre.every(u => unitDone(u.id)), href: '#/unit/' + nextUnit(pre).id, chips: pre, meta: pre.length + '개 단원' });
  const lp = (n, t, desc) => { if (d && d.frames[n - 1]) steps.push({ t, d: desc, done: lessonProg(w.deck, n).done, href: '#/lesson/' + w.deck + '/' + n, meta: '약 ' + mins(d.frames[n - 1]) + '분', prog: lessonProg(w.deck, n) }); };
  const passStep = n => { const p = META.passes.find(x => x.n === n); if (p) lp(n, n + '회독: ' + p.t, p.d); };
  if (d && d.warm) steps.push({ t: '0회독: 용어 먼저', d: '이번 강의에 나오는 용어를 슬라이드 순서대로 미리 한 번씩 봐요. 외우려 하지 말고 눈에 익히기만 해요.', done: lessonProg(w.deck, 0).done, href: '#/lesson/' + w.deck + '/0', meta: '약 ' + mins(d.warm) + '분', prog: lessonProg(w.deck, 0) });
  passStep(1);
  if (units.length) steps.push({ t: '정리 슬라이드: 단원 1부터 ' + units.length + '까지', d: '강의를 주제별로 나눈 요약이에요. 단원마다 내용이 달라요. 차례로 한 번씩 봐요.', done: units.every(u => unitDone(u.id)), href: '#/unit/' + nextUnit(units).id, meta: units.filter(u => unitDone(u.id)).length + ' / ' + units.length + ' 단원' });
  else noteSecsOf(week).forEach(id => steps.push({ t: '정리노트 읽기: ' + noteTitle(id), d: '쉬운 설명으로 감을 잡고 원문으로 확인해요. 끝까지 읽거나 "다 읽었어요" 를 누르면 표시돼요.', done: noteRead(id), href: '#/note/' + id, meta: noteRead(id) ? '읽음' : '' }));
  const qstep = (level, t, desc) => { const s = weekQuizStat(week, level); if (!s.total) return; const goal = Math.min(20, s.total); steps.push({ t, d: desc, done: s.seen >= goal, href: '#/quiz?week=' + week + '&level=' + level + '&mode=unseen&n=20&start=1', meta: s.seen + ' / ' + goal + '문제' }); };
  qstep('basic', '기본 문제 20개', '시험과 같은 난이도예요. 틀려도 괜찮아요. 오답노트에 쌓여요.');
  const examPass = (META.passes.find(x => /기출/.test(x.t)) || {}).n;
  META.passes.filter(x => x.n > 1).forEach(x => { passStep(x.n); if (x.n === examPass) qstep('hard', '심화 문제 20개', '한 단계 어렵게 만든 문제예요.'); });
  if (!examPass) qstep('hard', '심화 문제 20개', '한 단계 어렵게 만든 문제예요.');
  if (weekQuizStat(week).total) steps.push({ t: '오답 다시 풀고 모의고사', d: '틀린 것만 다시 풀고, 서술과 계산 한 쌍씩 시험지처럼.', done: !!store.mockDone[week], href: '#/mock?week=' + week, meta: '' });
  recallStep(w, steps);   // 가리고 설명하기: 기출 다음 마지막 순서
  return steps;
}
function guideCard(week, big) {
  const steps = weekSteps(week); if (!steps.length) return '';
  const cur = steps.findIndex(s => !s.done);
  const done = steps.filter(s => s.done).length;
  let h = '<section class="guide' + (big ? ' big' : '') + '"><div class="gtop"><div><div class="eyebrow">공부 길잡이</div><h2>' + (cur < 0 ? '이 주차는 다 끝냈어요' : '지금 할 차례') + '</h2></div><span class="gcount num">' + done + ' / ' + steps.length + ' 완료</span></div>';
  if (cur >= 0) h += '<a class="gnow" href="' + esc(steps[cur].href) + '"><span class="gn">' + (cur + 1) + '</span><span class="gt"><b>' + esc(steps[cur].t) + '</b><small>' + esc(steps[cur].d) + '</small></span><span class="go">시작</span></a>';
  h += '<ol class="gsteps">' + steps.map((s, i) => '<li class="' + (s.done ? 'done' : i === cur ? 'cur' : '') + '"><a href="' + esc(s.href) + '"><i></i><span><b>' + esc(s.t) + '</b>' + (s.meta ? '<em class="num">' + esc(s.meta) + '</em>' : '') + '</span></a>'
    + (s.chips ? '<div class="gchips">' + s.chips.map(u => '<a class="chip' + (unitDone(u.id) ? ' on' : '') + '" href="#/unit/' + u.id + '">' + esc(u.title.split(':')[0]) + '</a>').join('') + '</div>' : '') + '</li>').join('') + '</ol></section>';
  return h;
}
const ORDER = META.weeks.map(w => w.id);
function overallNext() {
  for (const wk of ORDER) {
    if (!weekOf(wk)) continue;
    const steps = weekSteps(wk), i = steps.findIndex(s => !s.done);
    if (i >= 0) return { week: wk, step: steps[i] };
  }
  return null;
}

/* ---------- 홈 ---------- */
function pageHome() {
  const nx = overallNext();
  const dueAll = Object.keys(TERM).filter(k => termDue(TERM[k])).length;
  let h = '<section class="intro"><div><div class="eyebrow">' + esc(META.eyebrow || META.name || '') + '</div>'
    + '<h1>' + (nx ? esc(weekName(nx.week)) + '<br>' + esc(nx.step.t) : '남은 건<br>모의고사예요') + '</h1>'
    + '<p>' + esc(META.intro || '위에서부터 순서대로 가면 돼요. 각 주차 안에서는 길잡이가 지금 할 일을 하나씩 알려 줘요. 모르는 용어는 눌러서 뜻을 봐요.') + '</p>'
    + '<div class="cta">' + (nx ? '<a class="btn primary" href="' + esc(nx.step.href) + '">이어서 하기</a>' : '<a class="btn primary" href="#/mock">모의고사</a>')
    + (dueAll ? '<a class="btn" href="#/terms/all">오늘의 용어 복습 ' + dueAll + '개</a>' : '')
    + (store.last ? '<a class="btn" href="' + esc(store.last.href) + '">마지막으로 본 곳</a>' : '') + '</div></div>'
    + '<div class="pathcard"><div class="pc-h"><span>' + esc(META.pathLabel || '공부 순서') + '</span><span class="num">' + overallPct() + '% 진행</span></div>' + weekPathSvg() + '</div></section>';
  h += '<h2 class="sec">주차별로 공부하기</h2><div class="weekcards">';
  META.weeks.forEach(w => {
    const d = w.deck ? META.decks[w.deck] : null;
    const steps = weekSteps(w.id), done = steps.filter(s => s.done).length;
    const st2 = weekQuizStat(w.id);
    h += '<a class="wcard' + (w.id === 'b' ? ' basics' : '') + '" href="#/week/' + w.id + '"><div class="wk">' + esc(w.short) + '</div><div class="wt">' + esc(w.title) + '</div>'
      + '<div class="wtopics">' + esc(w.topics) + '</div><div class="wfoot">'
      + (steps.length ? '<div class="stepbar" aria-label="길잡이 진행">' + steps.map(s => '<i class="' + (s.done ? 'on' : '') + '"></i>').join('') + '</div><span class="num">길잡이 ' + done + ' / ' + steps.length + '</span>' : '')
      + (d && st2.total ? '<span class="num">문제 ' + st2.seen + ' / ' + st2.total + ' 풀이</span>' : '') + '</div></a>';
  });
  h += '</div>';
  h += '<h2 class="sec">문제 진행</h2><div class="card"><div class="plangrid">' + planGrid() + '</div></div>';
  const nAll = Object.keys(META.noteTitles || {});
  h += '<h2 class="sec">도구</h2><div class="toolrow">'
    + (hasLazy('note') ? '<a class="tool" href="#/note"><b>정리노트</b><span>쉬운 설명과 원문, 읽음 ' + nAll.filter(noteRead).length + ' / ' + nAll.length + '</span></a>' : '')
    + (hasLazy('time') ? '<a class="tool" href="#/time"><b>연표</b><span>양식 흐름도와 사건별 연표</span></a>' : '')
    + '<a class="tool" href="#/terms/all"><b>용어 카드</b><span>전 주차 용어 ' + Object.keys(TERM).length + '개' + (dueAll ? ', 오늘 복습 ' + dueAll + '개' : '') + '</span></a>'
    + (gPool('all').length ? '<a class="tool" href="#/game"><b>용어 게임</b><span>짝 맞추기, 뜻 고르기, 60초 스피드 퀴즈</span></a>' : '')
    + '<a class="tool" href="#/mock"><b>모의고사</b><span>시험지처럼 섞어서</span></a>'
    + '<a class="tool" href="#/wrong"><b>오답노트</b><span>틀린 문제만 다시</span></a>'
    + (PAGES.exams ? '<a class="tool" href="#/exams"><b>기출 분석</b><span>' + esc(META.examsDesc || '시험 모양과 자주 나온 주제') + '</span></a>' : '')
    + (PAGES.tips ? '<a class="tool" href="#/tips"><b>답안 팁</b><span>' + esc(META.tipsDesc || '외우는 요령, 답안 쓰는 틀') + '</span></a>' : '')
    + '<a class="tool" href="#/settings"><b>설정</b><span>로그인, 보기 설정</span></a>'
    + '<a class="tool" href="../../index.html"><b>다른 과목</b><span>과목 선택 화면으로</span></a></div>';
  APP().innerHTML = h;
  renderMath(APP());
}
function overallPct() {
  let tot = 0, got = 0;
  META.weeks.forEach(w => { const s = weekSteps(w.id); tot += s.length; got += s.filter(x => x.done).length; });
  return tot ? Math.round(got / tot * 100) : 0;
}
function weekPathSvg() {
  const labels = META.weeks.map(w => w.id === 'b' ? '기초' : w.exam ? '기출' : String(w.short || w.id).replace('주차', '주')).concat([META.examLabel || '시험']), ids = META.weeks.map(w => w.id).concat(['exam']);
  const n = labels.length, W = 480, x0 = 22, dx = (W - 44) / (n - 1);
  let s = '<svg class="weekpath" viewBox="0 0 ' + W + ' 70" role="img" aria-label="주차 진행 경로">';
  for (let i = 1; i < n; i++) s += '<line class="wp-e' + (weekOf(ids[i - 1]) && weekOf(ids[i]) ? ' on' : '') + '" x1="' + (x0 + dx * (i - 1)) + '" y1="26" x2="' + (x0 + dx * i) + '" y2="26"/>';
  for (let i = 0; i < n; i++) {
    const w = weekOf(ids[i]), steps = w ? weekSteps(ids[i]) : [], started = steps.some(x => x.done);
    s += '<circle class="wp-n' + (w ? ' on' : '') + (ids[i] === 'exam' ? ' exam' : '') + '" cx="' + (x0 + dx * i) + '" cy="26" r="' + (started ? 10 : 8) + '"/>'
      + '<text x="' + (x0 + dx * i) + '" y="60" text-anchor="middle"' + (w ? ' class="on"' : '') + '>' + labels[i] + '</text>';
  }
  return s + '</svg>';
}
function planGrid() {
  let h = '<div class="ph"></div><div class="ph">기본 (시험 난이도)</div><div class="ph">심화 (한 단계 위)</div>';
  META.weeks.filter(w => weekQuizStat(w.id, 'basic').total || weekQuizStat(w.id, 'hard').total).forEach(w => {
    h += '<div class="pn">' + esc(w.short + ' ' + w.title) + '</div>';
    ['basic', 'hard'].forEach(lv => {
      const s = weekQuizStat(w.id, lv), pct = s.total ? Math.round(s.seen / s.total * 100) : 0;
      h += '<div class="pcell ' + lv + (s.total && s.seen === s.total ? ' done' : '') + '"><div class="pt"><span class="num"><b>' + s.seen + '</b> / ' + s.total + '문항</span></div>'
        + '<div class="pbar"><i style="width:' + pct + '%"></i></div>'
        + (s.total ? '<a class="btn sm' + (lv === 'basic' ? ' primary' : '') + '" href="#/quiz?week=' + w.id + '&level=' + lv + '&mode=unseen&start=1">' + (s.seen && s.seen < s.total ? '이어서 풀기' : s.seen ? '다시 풀기' : '풀기') + '</a>' : '<span class="muted" style="font-size:13px">문제 없음</span>') + '</div>';
    });
  });
  return h;
}

/* ---------- 주차 페이지 ---------- */
const PASS_INFO = META.passes;
function pageWeek(week) {
  const w = weekOf(week);
  if (!w) { location.hash = '#/'; return; }
  const d = w.deck ? META.decks[w.deck] : null;
  let h = '<a class="back" href="#/">홈</a><div class="whead"><div class="eyebrow">' + esc(w.short) + '</div><h1>' + esc(w.title) + '</h1><p>' + esc(w.topics) + '</p></div>';
  h += guideCard(week, true);
  if (d) {
    h += '<h2 class="sec">강의 회독 <small>같은 강의를 ' + PASS_INFO.length + '번, 갈수록 깊게</small></h2>';
    if (d.have) {
      h += '<div class="ptiles">' + (d.warm ? [{ n: 0, t: '용어 먼저', d: '슬라이드마다 나오는 용어를 미리 눈에 익혀요' }] : []).concat(PASS_INFO).map(p => {
        const r = lessonProg(w.deck, p.n), pct = r.total ? Math.round((r.done ? r.total : r.max) / r.total * 100) : 0;
        const cls = r.total === 0 ? ' off' : r.done ? ' done' : '';
        return '<a class="ptile' + cls + '" href="#/lesson/' + w.deck + '/' + p.n + '"><span class="pn">' + (p.n ? p.n + '회독' : '0회독') + '</span><span class="pt">' + p.t + '</span><span class="pd">' + p.d + '</span>'
          + '<span class="pf"><span class="num">' + (r.done ? '다 봤어요' : r.max ? pct + '% 봤어요' : r.total ? '약 ' + mins(r.total) + '분' : '내용 없음') + '</span><span class="pbar"><i style="width:' + pct + '%"></i></span></span></a>';
      }).join('') + '</div>';
      h += '<div class="pillrow">' + (d.pdf ? '<a class="btn sm" href="' + esc(d.pdf) + '" target="_blank" rel="noopener">강의안 PDF</a>' : '') + '<button class="chip' + (store.pref.cumulative ? ' on' : '') + '" id="cumChip" type="button">쌓아서 보기: ' + (store.pref.cumulative ? '앞 회독 내용도 함께' : '이번 회독 내용만') + '</button>'
        + (d.have < d.total ? '<span class="muted" style="font-size:13.5px">지금 ' + d.have + ' / ' + d.total + '장까지 준비됨. 나머지는 만드는 중</span>' : '') + '</div>';
    } else h += '<div class="soon">회독 슬라이드를 만드는 중이에요. 준비되면 여기에 나타나요.</div>';
  }
  const units = META.units[week] || [], nsec = units.length ? [] : noteSecsOf(week);
  if (nsec.length) h += '<h2 class="sec">정리노트 <small>항목을 누르면 그 부분을 읽어요</small></h2>';
  else if (!w.exam || units.length) h += '<h2 class="sec">' + (week === 'b' ? '기초 단원' : '정리 슬라이드') + ' <small>' + (week === 'b' ? '차례로 보면 돼요' : '주제별 요약, 단원마다 내용이 달라요') + '</small></h2>';
  if (units.length) {
    h += '<div class="unitgrid">' + units.map((u, i) => {
      const r = store.units[u.id] || {};
      return '<a class="ucard' + (r.done ? ' done' : '') + '" href="#/unit/' + u.id + '"><span class="uid">단원 ' + (i + 1) + (r.done ? ', 다 봤어요' : '') + '</span><span class="ut">' + fmt(u.title, false) + '</span><span class="ug">' + fmt(u.goal, false) + '</span>'
        + '<span class="uterms">' + u.terms.slice(0, 4).map(t => '<span>' + esc(t) + '</span>').join('') + '</span><span class="ustate"><span>' + u.n + '장</span><span>' + (!r.done && r.i ? (r.i + 1) + '장까지 봄' : '') + '</span></span></a>';
    }).join('') + '</div>';
  } else if (nsec.length) {
    h += '<div class="unitgrid">' + nsec.map((id, i) => '<a class="ucard' + (noteRead(id) ? ' done' : '') + '" href="#/note/' + esc(id) + '"><span class="uid">항목 ' + (i + 1) + (noteRead(id) ? ', 읽었어요' : '') + '</span><span class="ut">' + esc(noteTitle(id)) + '</span></a>').join('') + '</div>'
      + '<div class="termbar" style="margin-top:12px"><div><b>정리노트 전체</b><div class="muted">쉬운 설명만, 원문만 골라 보기, 목차에서 한 항목만 보기</div></div><div class="btnrow" style="margin:0"><a class="btn" href="#/note">정리노트 열기</a>'
      + (hasLazy('time') ? '<a class="btn" href="#/time">연표</a>' : '') + '</div></div>';
  } else if (!w.exam) h += '<div class="soon">만드는 중이에요.</div>';
  const wt = termsOfWeek(week), known = wt.filter(t => (store.terms[termKey(t)] || {}).known).length;
  if (wt.length) h += '<div class="termbar"><div><b>용어 카드</b><div class="muted">이 주차 용어 ' + wt.length + '개, 외운 것 ' + known + '개' + (wt.filter(termDue).length ? ', 오늘 복습할 것 ' + wt.filter(termDue).length + '개' : '') + '</div></div><div class="btnrow" style="margin:0"><a class="btn" href="#/terms/' + week + '">카드 넘기기</a><a class="btn" href="#/quiz?week=' + week + '&unit=' + encodeURIComponent('용어') + '&start=1">용어 퀴즈</a>' + (gPool(week).length ? '<a class="btn" href="#/game?week=' + week + '">용어 게임</a>' : '') + '</div></div>';
  const sb = weekQuizStat(week, 'basic'), sh = weekQuizStat(week, 'hard');
  if (sb.total || sh.total) {
    h += '<h2 class="sec">문제 풀기</h2><div class="qbtns">'
      + '<a class="qbtn" href="#/quiz?week=' + week + '&level=basic&mode=unseen&start=1"><b>기본 문제</b><span class="num">시험 난이도, ' + sb.seen + ' / ' + sb.total + ' 풀이</span></a>'
      + '<a class="qbtn hard" href="#/quiz?week=' + week + '&level=hard&mode=unseen&start=1"><b>심화 문제</b><span class="num">한 단계 위, ' + sh.seen + ' / ' + sh.total + ' 풀이</span></a>'
      + (BANK.some(x => x.part === week && srcKind(x) === '기출') ? '<a class="qbtn" href="#/quiz?week=' + week + '&src=' + encodeURIComponent('기출') + '&n=0&start=1"><b>기출만</b><span>실제 시험에 나온 문제</span></a>' : '')
      + (BANK.some(x => x.part === week && x.type === 'calc') ? '<a class="qbtn" href="#/quiz?week=' + week + '&type=calc&start=1"><b>계산만</b><span>시험 계산 문제 연습</span></a>' : '')
      + '<a class="qbtn" href="#/mock?week=' + week + '"><b>이 주차 모의고사</b><span>시험지처럼 섞어서</span></a></div>';
  }
  h += recallTiles(week);   // 가리고 설명하기
  APP().innerHTML = h;
  renderMath(APP());
  const cc = $('#cumChip');
  if (cc) cc.addEventListener('click', () => { store.pref.cumulative = !store.pref.cumulative; save(); pageWeek(week); });
}
function termsOfWeek(week) {
  if (week === 'all') return Object.keys(TERM).map(k => TERM[k]);
  return ((window.SDT_TERMS || {})[week] || []).filter(t => termKey(t).length >= 2);
}

/* ---------- 플레이어 ---------- */
let P = null;
function playerShell(opts) {
  return '<div id="player" class="on">'
    + '<div class="ptop"><a class="btn sm" href="' + esc(opts.backHref) + '">목록</a><div class="ptitle" id="ptitle"></div><div class="pchips">' + (opts.chips || '')
    + '<button class="chip auto' + (store.pref.auto ? ' on' : '') + '" id="autoChip" type="button">' + (store.pref.auto ? '자동 재생 중' : '자동 재생') + '</button></div></div>'
    + '<div class="stage" id="pstage"><div class="slide" id="pslide"></div></div>'
    + '<div class="sprog"><i id="sprogBar"></i></div>'
    + '<div class="pbar2"><button class="btn" id="pPrev" type="button">이전</button><svg class="trail" id="trail" aria-hidden="true"></svg><button class="pcount num" id="pcount" type="button" title="눌러서 쪽 번호로 이동"></button><button class="btn primary" id="pNext" type="button">다음</button></div>'
    + '<div class="hint" id="phint">화면을 누르면 다음, 왼쪽 가장자리를 누르면 이전. 옆으로 밀어도 넘어가요.</div></div>';
}
function navTap(x) {
  const r = $('#pstage').getBoundingClientRect();
  if (x - r.left < r.width * 0.22) pPrev(); else pNext();
}
function startPlayer(opts) {
  APP().innerHTML = playerShell(opts);
  document.body.classList.add('playing');
  P = { frames: opts.frames, i: clamp(opts.start || 0, 0, opts.frames.length - 1), step: 0, steps: 0, r: null, timer: null, opts, answered: true, showAll: !!opts.showAll, ink: null };
  const stage = $('#pstage');
  $('#pcount').addEventListener('click', e => { e.stopPropagation(); pJumpOpen(); });
  $('#pNext').addEventListener('click', e => { e.stopPropagation(); pNext(); });
  $('#pPrev').addEventListener('click', e => { e.stopPropagation(); pPrev(); });
  stage.addEventListener('click', e => {
    if (P && P.ink && P.ink.enabled) return;
    if (e.target.closest('button,a,input,textarea,.term,pre,.schoices,.tpop,details')) return;
    navTap(e.clientX);
  });
  let sx = null, sy = null;
  stage.addEventListener('touchstart', e => { const t = e.touches[0]; sx = t.clientX; sy = t.clientY; }, { passive: true });
  stage.addEventListener('touchend', e => {
    if (sx == null) return;
    const t = e.changedTouches[0], dx = t.clientX - sx, dy = t.clientY - sy; sx = null;
    if (P && P.ink && P.ink.enabled) return;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) { e.preventDefault(); dx < 0 ? pNext() : pPrev(); }
  });
  $('#autoChip').addEventListener('click', () => {
    store.pref.auto = !store.pref.auto; save();
    const c = $('#autoChip'); c.classList.toggle('on', store.pref.auto); c.textContent = store.pref.auto ? '자동 재생 중' : '자동 재생';
    schedule();
  });
  const key = e => {
    if (/INPUT|TEXTAREA/.test((e.target || {}).tagName || '')) return;
    if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') { e.preventDefault(); pNext(); }
    else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); pPrev(); }
  };
  document.addEventListener('keydown', key);
  const onResize = () => drawTrail();
  window.addEventListener('resize', onResize);
  cleanup = () => {
    document.removeEventListener('keydown', key); window.removeEventListener('resize', onResize);
    if (P) { clearTimeout(P.timer); if (P.ink) P.ink.destroy(); }
    P = null;
  };
  pShow(P.i, 'none');
}
/* 쪽 번호 적어서 바로 이동 */
function pJumpOpen() {
  if (!P) return;
  const btn = $('#pcount'); if (!btn || $('#pjump')) return;
  const paged = P.frames.some(f => f._p);
  const pages = paged ? [...new Set(P.frames.filter(f => f._p).map(f => f._p))] : null;
  const lo = paged ? Math.min(...pages) : 1, hi = paged ? Math.max(...pages) : P.frames.length;
  const box = document.createElement('form');
  box.id = 'pjump'; box.className = 'pjump';
  box.innerHTML = '<input type="text" inputmode="numeric" pattern="[0-9]*" enterkeyhint="go" autocomplete="off" aria-label="' + (paged ? '이동할 쪽 번호' : '이동할 장면 번호') + ' (' + lo + '~' + hi + ')" placeholder="' + (paged ? '쪽' : '번호') + '"><span class="pjt">/ ' + hi + '</span>';
  btn.after(box); btn.hidden = true;
  const inp = $('input', box); inp.focus();
  const close = () => { box.remove(); btn.hidden = false; };
  box.addEventListener('click', e => e.stopPropagation());
  inp.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Escape') close(); });
  inp.addEventListener('blur', () => setTimeout(() => { if (document.activeElement && box.contains(document.activeElement)) return; close(); }, 150));
  box.addEventListener('submit', e => {
    e.preventDefault();
    const n = Math.round(+String(inp.value).replace(/[^0-9]/g, ''));
    if (!n || n < lo || n > hi) { toast(lo + '부터 ' + hi + ' 사이 숫자를 적어요'); inp.select(); return; }
    let idx;
    if (paged) {
      const cur = P.frames[P.i] || {};
      idx = P.frames.findIndex(f => f._p === n && f._pass === cur._pass);
      if (idx > 0 && P.frames[idx - 1]._p === n && !P.frames[idx - 1]._pass) idx--;   // 쪽 첫 장면(슬라이드, 부분씩 읽기)부터
      if (idx < 0) idx = P.frames.findIndex(f => f._p === n);
      if (idx < 0) idx = P.frames.findIndex(f => f._p > n);
    } else idx = n - 1;
    close();
    if (idx >= 0 && P) {
      pShow(idx, idx < P.i ? 'prev' : 'next');
      if (P.step && !P.showAll) { P.step = 0; pApply(); schedule(); }   // 뒤쪽 쪽으로 가도 그 쪽 처음 단계부터
    }
  });
}
function toggleInk() {
  if (!P || !P.ink) return;
  const on = !P.ink.enabled;
  P.ink.setEnabled(on);
  const c = $('#inkChip'); c.classList.toggle('on', on); c.textContent = on ? '필기 중' : '필기';
  $('#phint').textContent = on ? '필기 중이에요. 펜슬로만 쓰기를 켜면 손가락으로 넘겨요. 두 손가락으로 톡 치면 되돌리기.' : '화면을 누르면 다음, 왼쪽 가장자리를 누르면 이전. 옆으로 밀어도 넘어가요.';
  if (on) { INK().Toolbar.attach(P.ink, toggleInk); if (!P.ink.key) toast('이 장면에는 필기할 수 없어요'); }
  else INK().Toolbar.detach();
  schedule();
}
function pShow(i, dir) {
  clearTimeout(P.timer);
  P.i = i;
  const f = P.frames[i], el = $('#pslide');
  const r = renderFrame(f, P);
  P.r = r; P.steps = r.steps || 0; P.answered = f.kind !== 'check';
  el.className = 'slide noanim';
  el.innerHTML = r.html;
  if (r.after) r.after(el);
  P.step = dir === 'prev' || P.showAll ? P.steps : 0;
  pApply();
  renderMath(el);
  countTerms(el);
  void el.offsetWidth;
  el.classList.remove('noanim');
  if (dir === 'next' || dir === 'prev') {
    el.classList.add(dir === 'next' ? 'in-next' : 'in-prev');
    const st = el.closest('.stage');
    if (st && typeof window.scrollBy === 'function') {
      const r = st.getBoundingClientRect(), top = viewTop();
      if (r.top < top - 4 || r.top > window.innerHeight * 0.45) { try { window.scrollBy({ top: r.top - top }); } catch (e) { /* 무시 */ } }
    }
  }
  $('#ptitle').innerHTML = P.opts.title(f, i);
  $('#pcount').textContent = (i + 1) + ' / ' + P.frames.length;
  $('#sprogBar').style.width = Math.round((i + 1) / P.frames.length * 100) + '%';
  drawTrail();
  if (P.ink) P.ink.setKey(P.opts.inkKey ? P.opts.inkKey(f) : null);
  P.opts.onProgress(i);
  schedule();
}
function pApply(fromUser) {
  const el = $('#pslide');
  $$('[data-s]', el).forEach(e => { e.classList.toggle('hide', +e.dataset.s > P.step); });
  if (P.r && P.r.onStep) P.r.onStep(P.step, el);
  if (fromUser) {
    const fresh = $$('[data-s="' + P.step + '"]', el);
    const target = $('#cnow', el) || fresh[fresh.length - 1];
    setTimeout(() => keepVisible(target), 60);
  }
}
/* 새로 나타난 내용이 화면 밖이면 그만큼만 스크롤 (머리글과 필기 막대 아래, 화면 아래 사이에 오게) */
function viewTop() {
  const hdr = $('#hdr'), bar = $('.inkbar');
  let t = 0;
  if (hdr) t = Math.max(t, hdr.getBoundingClientRect().bottom);
  if (bar && !bar.hidden) t = Math.max(t, bar.getBoundingClientRect().bottom);
  return Math.max(0, t) + 10;
}
function keepVisible(t) {
  if (!t || !t.getBoundingClientRect || typeof window.scrollBy !== 'function') return;
  const r = t.getBoundingClientRect(); if (!r.height) return;
  const top = viewTop(), bottom = window.innerHeight - 14;
  let dy = 0;
  if (r.bottom > bottom) dy = r.bottom - bottom;
  if (r.top - dy < top) dy = r.top - top;
  if (Math.abs(dy) > 4) { try { window.scrollBy({ top: dy, behavior: 'smooth' }); } catch (e) { /* 스크롤 불가 환경 */ } }
}
function pNext() {
  if (!P) return;
  closePop();
  if (P.step < P.steps) { P.step++; pApply(true); schedule(); return; }
  if (P.i < P.frames.length - 1) { pShow(P.i + 1, 'next'); return; }
  P.opts.onEnd();
}
function pPrev() {
  if (!P) return;
  closePop();
  if (P.step > 0 && !P.showAll) { P.step--; pApply(true); schedule(); return; }
  if (P.i > 0) pShow(P.i - 1, 'prev');
}
function schedule() {
  if (!P) return;
  clearTimeout(P.timer);
  if (!store.pref.auto || (P.ink && P.ink.enabled)) return;
  const f = P.frames[P.i];
  if (f.kind === 'check' && !P.answered) return;
  if (f.kind === 'end' || f.kind === 'recall') return;   // 가리고 설명하기는 자동으로 넘기지 않는다
  const el = $('#pslide');
  const vis = $$('[data-s]', el).filter(e => +e.dataset.s === P.step);
  const text = vis.length ? vis.map(e => e.textContent).join(' ') : el.textContent;
  const ms = (clamp(1500 + text.length * 60, 2200, 11000) + (f.kind === 'slideimg' || f.kind === 'walk' || f.kind === 'walksum' ? 1500 : 0)) * (+store.pref.speed || 1);
  P.timer = setTimeout(pNext, ms);
}
function drawTrail() {
  const svg = $('#trail'); if (!svg || !P) return;
  const groups = P.opts.groups;
  const W = Math.max(120, Math.round(svg.getBoundingClientRect().width || 300)), H = 28;
  svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
  if (!groups || !groups.length) { svg.innerHTML = ''; return; }
  const gi = Math.max(0, groups.findIndex(g => P.i >= g.start && P.i <= g.end));
  const win = clamp(Math.floor(W / 30), 5, 17);
  const from = clamp(gi - Math.floor(win / 2), 0, Math.max(0, groups.length - win)), to = Math.min(groups.length, from + win);
  const n = to - from, dx = n > 1 ? (W - 24) / (n - 1) : 0;
  let s = '';
  for (let k = from + 1; k < to; k++) s += '<line class="' + (k <= gi ? 'on' : '') + '" x1="' + (12 + dx * (k - from - 1)) + '" y1="14" x2="' + (12 + dx * (k - from)) + '" y2="14"/>';
  for (let k = from; k < to; k++) s += '<circle class="' + (k < gi ? 'on' : k === gi ? 'cur' : '') + '" cx="' + (12 + dx * (k - from)) + '" cy="14" r="' + (k === gi ? 8 : 5.5) + '"/>';
  svg.innerHTML = s;
}

/* ---------- 프레임 그리기 ---------- */
const S = (n, html, tag, cls) => '<' + (tag || 'div') + ' class="bld' + (cls ? ' ' + cls : '') + '" data-s="' + n + '">' + html + '</' + (tag || 'div') + '>';
function prepSvg(el) {
  $$('svg *', el).forEach(node => {
    const c = node.getAttribute('class') || '';
    const m = c.match(/\bb(\d)\b/);
    if (m) { node.classList.add('bld'); node.setAttribute('data-s', m[1]); }
  });
}
/* 용어 카드를 한 장씩: 용어가 먼저 나오고 (짐작), 한 번 더 누르면 뜻. 지나간 카드는 한 줄로 접혀 위에 쌓인다.
   단계 = 용어마다 2개 (0단계에 첫 용어가 보이므로 steps = 2n - 1) */
function termSteps(f, kicker, lead, more) {
  const ts = f.terms || [], n = ts.length;
  return {
    html: '<div class="review tstep"><div class="sk">' + kicker + ' <span class="tsn num"></span></div><h2 class="sh">' + lead + '</h2><div class="tlist">'
      + ts.map((t, i) => '<div class="tcard bld" data-s="' + (2 * i) + '"><div class="tface"><span class="ren">' + esc(termFace(t)) + '</span>' + (t.en && t.ko ? '<small>' + esc(t.en) + '</small>' : '') + '</div>'
        + '<div class="tguess">뜻을 먼저 짐작해 보고 누르세요</div>'
        + S(2 * i + 1, '<p class="tsay">' + esc(t.say) + '</p>' + (more && t.more ? '<details class="tmore"><summary>더 보기</summary><p>' + esc(t.more) + '</p></details>' : ''), 'div', 'tmean') + '</div>').join('') + '</div></div>',
    steps: Math.max(0, 2 * n - 1),
    onStep: (s, el) => {
      const cur = Math.min(n - 1, Math.floor(s / 2));
      $$('.tcard', el).forEach((c, i) => { c.classList.toggle('cur', i === cur); c.classList.toggle('past', i < cur); c.classList.toggle('open', s >= 2 * i + 1); });
      const k = $('.tsn', el); if (k) k.textContent = n > 1 ? (cur + 1) + ' / ' + n : '';
    },
    after: () => { ts.forEach(t => { const r = store.terms[termKey(t)] || (store.terms[termKey(t)] = { seen: 0 }); r.seen++; }); save(); },
  };
}
/* 슬라이드 부분씩 읽기: 글이 많은 슬라이드를 한 부분씩 크게 잘라 보여 주고, 아래에 그 부분 설명과 어디쯤인지 보여 주는 작은 그림.
   parts: [{c: 잘라 보일 칸, b: 짚을 상자, r: 칸 가로/세로 비, img, say} | {head: 1, ...} | {full: 1}]  (tools/walk_build.py) */
function walkSay(q, k, m, o) {
  if (q.full) return '<div class="wk-tx"><b class="wk-lab">전체 한 번 보기</b><p class="wk-tip">방금 하나씩 읽은 ' + m + '부분이 슬라이드 전체에서 어디에 있었는지 봐요.</p></div>';
  if (q.head) return '<div class="wk-tx"><b class="wk-lab">제목부터 읽어요</b><p>' + fmt(o.title) + '</p><p class="wk-tip">이 쪽은 ' + m + '부분으로 나눠서 한 부분씩 크게 보여 줘요. 누르면 다음 부분이에요.</p></div>';
  const say = String(q.say || ''), mm = say.match(/^([^:*$\n]{1,34}):\s*([\s\S]+)$/);
  return '<span class="wk-k num">' + k + '</span><div class="wk-tx">' + (!say ? '<p class="wk-tip">이 부분은 슬라이드 글을 직접 읽어 봐요.</p>' : mm ? '<b class="wk-lab">' + fmt(mm[1]) + '</b><p>' + fmt(mm[2]) + '</p>' : '<p>' + fmt(say) + '</p>') + '</div>';
}
function walkFrame(o) {
  const parts = o.parts, m = parts.filter(q => !q.full && !q.head).length;
  const pct = v => (Math.round(v * 10000) / 100) + '%';
  let k = 0;
  const nums = parts.map(q => q.full || q.head ? 0 : ++k);
  const view = parts.map((q, i) => {
    if (q.full) return '<div class="wk-part full" data-i="' + i + '"><img src="' + esc(o.slide) + '" alt="" loading="lazy" decoding="async"></div>';
    const c = q.c, b = q.b, small = b && !q.head && (b[2] * b[3]) / (c[2] * c[3]) < 0.62;
    const r = +q.r || 1.414;   // --nw: 그림 제 크기(더 키우면 흐려짐), --cw: 좁은 화면에서 가로로 긴 부분은 이 너비로 두고 옆으로 밀어 본다
    return '<div class="wk-part" data-i="' + i + '"><div class="wk-scroll"><div class="wk-crop" style="--r:' + r + ';--nw:' + Math.round(c[2] * 1800) + ';--cw:' + (r >= 1.8 && c[2] > 0.5 ? Math.round(c[2] * 900) : 0) + '"><img src="' + esc(q.img) + '" alt="" loading="lazy" decoding="async">'
      + (small ? '<i class="wk-hl" style="left:' + pct((b[0] - c[0]) / c[2]) + ';top:' + pct((b[1] - c[1]) / c[3]) + ';width:' + pct(b[2] / c[2]) + ';height:' + pct(b[3] / c[3]) + '"></i>' : '') + '</div></div><div class="wk-swipe">옆으로 밀면 나머지 글이 보여요</div></div>';
  }).join('');
  const map = '<div class="wk-map" aria-hidden="true"><img src="' + esc(o.slide) + '" alt="" loading="lazy" decoding="async">'
    + parts.map((q, i) => q.full ? '' : '<i class="wk-mb" data-i="' + i + '" style="left:' + pct(q.b[0]) + ';top:' + pct(q.b[1]) + ';width:' + pct(q.b[2]) + ';height:' + pct(q.b[3]) + '"></i>').join('') + '</div>';
  return {
    html: '<div class="walk"><div class="wk-top"><span class="sk">' + esc(o.kicker) + '</span><span class="wk-n num"></span></div>' + (o.head ? '<h2 class="sh">' + fmt(o.head) + '</h2>' : '')
      + '<div class="wk-view">' + view + '</div><div class="wk-foot">' + map + '<div class="wk-says">' + parts.map((q, i) => S(i, walkSay(q, nums[i], m, o), 'div', 'wk-say')).join('') + '</div></div></div>',
    steps: parts.length - 1,
    onStep: (s, el) => {
      $$('.wk-part', el).forEach((x, i) => { x.classList.toggle('on', i === s); const sc = $('.wk-scroll', x); if (i === s && sc) x.classList.toggle('scrolls', sc.scrollWidth > sc.clientWidth + 4); });
      $$('.wk-say', el).forEach((x, i) => x.classList.toggle('gone', i < s));
      $$('.wk-mb', el).forEach(x => { const i = +x.dataset.i; x.classList.toggle('cur', i === s); x.classList.toggle('past', i < s); });
      const q = parts[s] || {}, w = $('.walk', el);
      if (w) w.classList.toggle('atfull', !!q.full);
      const n = $('.wk-n', el); if (n) n.textContent = q.full ? '전체' : q.head ? '제목' : nums[s] + ' / ' + m + ' 부분';
    },
    after: el => {
      $$('.wk-scroll', el).forEach(sc => ['touchstart', 'touchend'].forEach(ev => sc.addEventListener(ev, e => { if (sc.scrollWidth > sc.clientWidth + 4) e.stopPropagation(); }, { passive: true })));
    },
  };
}
/* 2회독부터: 부분씩 넘기지 않고 슬라이드 한 장에 번호를 붙여 한눈에 정리 */
function walkSumFrame(o) {
  const parts = (o.parts || []).filter(q => q && q.b && !q.full && !q.head);
  const pct = v => (Math.round(v * 10000) / 100) + '%';
  const first = s => { const m = String(s || '').match(/^[\s\S]*?[.?!](?=\s|$)/); return m ? m[0] : String(s || ''); };
  const item = (q, i) => {
    const say = String(q.say || ''), mm = say.match(/^([^:*$\n]{1,34}):\s*([\s\S]+)$/);
    const body = !say ? '<span class="muted">슬라이드 글을 직접 읽어 봐요.</span>' : mm ? '<b>' + fmt(mm[1]) + '</b> ' + fmt(first(mm[2])) : fmt(first(say));
    return '<li><span class="wk-k num">' + (i + 1) + '</span><div>' + body + '</div></li>';
  };
  return {
    html: '<div class="wsum"><div class="wk-top"><span class="sk">' + esc(o.kicker) + '</span><span class="wk-n num">' + parts.length + '부분 한눈에</span></div>'
      + '<div class="ws-grid"><div class="ws-slide"><img src="' + esc(o.slide) + '" alt="" loading="lazy" decoding="async">'
      + parts.map((q, i) => '<i class="ws-b" style="left:' + pct(q.b[0]) + ';top:' + pct(q.b[1]) + ';width:' + pct(q.b[2]) + ';height:' + pct(q.b[3]) + '"><b>' + (i + 1) + '</b></i>').join('')
      + '</div><ol class="ws-list">' + parts.map(item).join('') + '</ol></div></div>',
    steps: 0,
  };
}
function renderFrame(f, st) {
  const k = f.kind;
  const head = x => x ? '<h2 class="sh">' + fmt(x) + '</h2>' : '';
  const items = (arr, cls) => '<ul class="sl-items' + (cls ? ' ' + cls : '') + '">' + (arr || []).map((x, i) => S(i + 1, fmt(x), 'li')).join('') + '</ul>';
  const lines = x => Array.isArray(x) ? x : String(x || '').split('\n');
  switch (k) {
    case 'recall':
      return recallFrame(f);
    case 'slideimg':
      return { html: '<div class="simg"><img src="' + esc(f.src) + '" alt="' + esc(f.alt) + '" decoding="async"><div class="scap">' + fmt(f.cap, false) + '</div></div>', steps: 0 };
    case 'title':
      return { html: '<div class="sk">' + esc(f.eyebrow || '새 단원') + '</div><h1 class="sbig">' + fmt(f.big) + '</h1><p class="ssub">' + fmt(f.sub) + '</p>', steps: 0 };
    case 'goal':
      return { html: '<div class="sk">오늘 알아낼 것</div>' + items(f.items, 'ok'), steps: (f.items || []).length };
    case 'points':
      return { html: head(f.head) + items(f.items), steps: (f.items || []).length };
    case 'warn':
      return { html: '<div class="sk" style="color:var(--amber)">헷갈리기 쉬운 점</div>' + head(f.head) + items(f.items, 'swarn'), steps: (f.items || []).length };
    case 'recap':
      return { html: '<div class="sk" style="color:var(--ok)">다시 한 번</div>' + items(f.items, 'ok'), steps: (f.items || []).length };
    case 'say':
      return { html: '<div class="sayl">' + (f.lines || []).map((x, i) => S(i, fmt(x), 'p')).join('') + '</div>', steps: Math.max(0, (f.lines || []).length - 1) };
    case 'analogy':
      return { html: '<div class="sk">비유로 보면</div>' + head(f.head) + '<div class="scene">' + fmt(f.scene) + '</div><div class="pairs">'
        + (f.map || []).map((p, i) => S(i + 1, '<span class="pa">' + fmt(p[0]) + '</span><span class="arr">=</span><span class="pb">' + fmt(p[1]) + '</span>', 'div', 'pair')).join('') + '</div>', steps: (f.map || []).length };
    case 'formula': {
      const n = (f.parts || []).length;
      return { html: head(f.head) + '<div class="fbig">$$' + esc(f.tex) + '$$</div><div class="parts">'
        + (f.parts || []).map((p, i) => S(i + 1, '<span class="ps">$' + esc(p.sym) + '$</span><span>' + fmt(p.say) + '</span>', 'div', 'part')).join('') + '</div>'
        + S(n + 1, fmt(f.whole), 'div', 'whole'), steps: n + 1 };
    }
    case 'steps': {
      const n = (f.steps || []).length;
      return { html: head(f.head) + (f.given ? '<div class="sgiven">' + fmt(f.given) + '</div>' : '') + '<ol class="sl-steps">'
        + (f.steps || []).map((x, i) => S(i + 1, fmt(x), 'li')).join('') + '</ol>' + S(n + 1, '답: ' + fmt(f.answer), 'div', 'sanswer'), steps: n + 1 };
    }
    case 'figure':
      return { html: head(f.head) + '<div class="sfig">' + (f.svg || '') + '<div class="cap">' + fmt(f.caption) + '</div></div>', steps: f.builds > 1 ? f.builds : (/\bb1\b/.test(f.svg || '') ? 1 : 0), after: prepSvg };
    case 'compare':
      return { html: head(f.head) + '<div class="stbl"><table><thead><tr>' + (f.cols || []).map(c => '<th>' + fmt(c) + '</th>').join('') + '</tr></thead><tbody>'
        + (f.rows || []).map((r, i) => S(i + 1, r.map(c => '<td>' + fmt(c) + '</td>').join(''), 'tr')).join('') + '</tbody></table></div>', steps: (f.rows || []).length };
    case 'english':
      return { html: '<div class="sk">' + esc(META.sentLabel || '시험 답안에 쓸 문장') + '</div>' + head(f.head) + '<p class="sen">' + fmt(f.en) + '</p>' + S(1, '<p class="sko">' + fmt(f.ko) + '</p>' + (f.tip ? '<p class="stip">' + fmt(f.tip) + '</p>' : '')), steps: 1 };
    case 'check':
      return {
        html: '<div class="sk">확인 퀴즈</div><p class="sq">' + fmt(f.q) + '</p><div class="schoices">' + (f.choices || []).map((c, i) => '<button type="button" data-i="' + i + '">' + fmt(c) + '</button>').join('') + '</div><div class="swhy" id="swhy" hidden></div>',
        steps: 0,
        after: el => {
          $$('.schoices button', el).forEach(b => b.addEventListener('click', e => {
            e.stopPropagation();
            if (st.answered) return;
            st.answered = true;
            const i = +b.dataset.i, ok = i === f.a;
            $$('.schoices button', el).forEach(x => { if (+x.dataset.i === f.a) x.classList.add('correct'); else if (x === b) x.classList.add('wrong'); x.disabled = true; });
            const w = $('#swhy', el); w.hidden = false; w.innerHTML = '<b>' + (ok ? '맞아요. ' : '아쉬워요. ') + '</b>' + fmt(f.why); renderMath(w); countTerms(w);
            schedule();
          }));
        },
      };
    case 'walksum': {
      const w = f.walk || {};
      return walkSumFrame({ parts: w.parts || [], slide: f.src, kicker: 'p.' + f._p + ' 한눈에 정리' });
    }
    case 'walk': {
      const w = f.walk || {};
      return walkFrame({ parts: (w.head ? [Object.assign({ head: 1 }, w.head)] : []).concat(w.parts || [], [{ full: 1 }]), slide: f.src, title: f._t, kicker: 'p.' + f._p + ' 부분씩 읽기' });
    }
    case 'look': {
      const boxes = f.boxes || [];
      if (boxes.length && boxes.every(b => b.img && b.c)) return walkFrame({ parts: boxes.map(b => ({ b: [b.x, b.y, b.w, b.h], c: b.c, r: b.r, img: b.img, say: b.say })), slide: st.opts.imgOf(f), title: f._t, head: f.head, kicker: '슬라이드를 짚어 읽어요' });
      return {
        html: head(f.head) + '<div class="lookwrap"><img src="' + esc(st.opts.imgOf(f)) + '" alt="" decoding="async">'
          + boxes.map((b, i) => '<div class="lbox bld" data-s="' + (i + 1) + '" style="left:' + (b.x * 100) + '%;top:' + (b.y * 100) + '%;width:' + (b.w * 100) + '%;height:' + (b.h * 100) + '%"><em>' + (i + 1) + '</em></div>').join('')
          + '</div><ol class="lsay">' + boxes.map((b, i) => S(i + 1, '<b class="k">' + (i + 1) + '</b><span>' + fmt(b.say) + '</span>', 'li')).join('') + '</ol>',
        steps: boxes.length,
        onStep: (s, el) => {
          $$('.lbox', el).forEach((x, i) => { x.classList.toggle('cur', i + 1 === s); x.classList.toggle('past', i + 1 < s); });
          $$('.lsay li', el).forEach((x, i) => x.classList.toggle('dim', i + 1 < s));
        },
      };
    }
    case 'prof':
      return { html: '<div class="voice prof"><div class="vl">교수님 수업에서, ' + esc(f.when) + '</div>' + lines(f.lines).map((x, i) => S(i, fmt(x), 'p')).join('') + '</div>', steps: Math.max(0, lines(f.lines).length - 1) };
    case 'bg':
    case 'mining':
      return { html: '<div class="voice mining"><div class="vl">' + esc(META.bgLabel || '배경 지식') + ', ' + esc(f.src) + '</div>' + lines(f.lines).map((x, i) => S(i, fmt(x), 'p')).join('') + '</div>', steps: Math.max(0, lines(f.lines).length - 1) };
    case 'exam': {
      const n = (f.solve || []).length;
      return { html: '<div class="exq"><span class="exsrc">' + esc(f.src) + '</span><p class="exen">' + fmt(f.q) + '</p>' + S(1, fmt(f.qko), 'p', 'exko')
        + '<ol class="sl-steps">' + (f.solve || []).map((x, i) => S(i + 2, fmt(x), 'li')).join('') + '</ol>' + S(n + 2, '답: ' + fmt(f.answer), 'div', 'sanswer') + '</div>', steps: n + 2 };
    }
    case 'code': {
      const ls = String(f.code || '').split('\n');
      const says = f.lines || [];
      return {
        html: '<div class="codewrap">' + head(f.head) + '<div class="cfile">' + esc(f.file) + (ls.length > 14 ? '<span class="chint">코드 칸은 따로 스크롤돼요</span>' : '') + '</div><pre class="code" id="pcode">'
          + ls.map((l, i) => '<span class="cl" data-l="' + (i + 1) + '">' + (esc(l) || ' ') + '</span>').join('') + '</pre>'
          + '<div class="cnow" id="cnow"></div>'
          + (f.link ? '<div class="clink">' + fmt(f.link) + '</div>' : '')
          + '<details class="call"><summary>줄 설명 전체 보기 (' + says.length + '개)</summary><ol class="csay">' + says.map((x, i) => '<li><span class="ln">' + x.from + (x.to !== x.from ? '~' + x.to : '') + '줄</span>' + fmt(x.say) + '</li>').join('') + '</ol></details></div>',
        steps: says.length,
        onStep: (s, el) => {
          const pre = $('#pcode', el), cur = says[s - 1], cn = $('#cnow', el);
          pre.classList.toggle('focus', !!cur);
          $$('.cl', pre).forEach(c => { const n = +c.dataset.l; c.classList.toggle('hl', !!cur && n >= cur.from && n <= cur.to); });
          $$('.csay li', el).forEach((li, i) => li.classList.toggle('cur', i + 1 === s));
          cn.innerHTML = cur ? '<span class="ln">' + cur.from + (cur.to !== cur.from ? '~' + cur.to : '') + '줄 (' + s + ' / ' + says.length + ')</span>' + fmt(cur.say)
            : '<span class="muted">화면을 누를 때마다 코드의 줄 묶음이 하나씩 밝아지고 여기에 설명이 나와요.</span>';
          renderMath(cn);
          const hl = $$('.cl.hl', pre);
          let top = 0;
          if (hl.length) {
            const a = hl[0].offsetTop, b = hl[hl.length - 1].offsetTop + hl[hl.length - 1].offsetHeight;
            top = b - a > pre.clientHeight - 24 ? a - 8 : (a + b) / 2 - pre.clientHeight / 2;
          }
          top = Math.max(0, top);
          if (typeof pre.scrollTo === 'function') { try { pre.scrollTo({ top, behavior: 'smooth' }); } catch (e) { pre.scrollTop = top; } } else pre.scrollTop = top;
        },
      };
    }
    case 'pyterm':
      return { html: '<div class="pyt"><div class="sk">파이썬 한 걸음</div><div class="pyn">' + fmt(f.name) + '</div><div class="pys">' + lines(f.say).map(x => fmt(x)).join('<br>') + '</div><pre class="code">'
        + String(f.example || '').split('\n').map(l => '<span class="cl">' + (esc(l) || ' ') + '</span>').join('') + '</pre>' + (f.out ? S(1, esc(f.out), 'div', 'pyout') : '') + '</div>', steps: f.out ? 1 : 0 };
    case 'warm':
      return termSteps(f, '이 슬라이드에 나오는 용어', '소리 내어 한 번 읽고 뜻을 짐작해 본 다음 누르면 뜻이 나와요.', true);
    case 'review':
      return termSteps(f, '기억나요?', '앞에서 본 용어예요. 뜻을 먼저 떠올린 다음 눌러 보세요.', false);
    case 'end':
      return { html: '<div class="endf"><div class="sk" style="color:var(--ok)">끝까지 왔어요</div><h1 class="sbig">' + fmt(f.big) + '</h1><p class="ssub">' + fmt(f.sub) + '</p><div class="btnrow">'
        + f.links.map((l, i) => '<a class="btn' + (i === 0 ? ' primary' : '') + '" href="' + esc(l[1]) + '">' + esc(l[0]) + '</a>').join('') + '</div></div>', steps: 0 };
    default:
      return { html: '<p class="muted">알 수 없는 장면</p>', steps: 0 };
  }
}

/* ---------- 강의 회독 ---------- */
async function pageLesson(deck, passStr, jump, all) {
  const pass = +passStr;
  const week = (META.weeks.find(w => w.deck === deck) || {}).id;
  APP().innerHTML = '<div class="empty"><b>회독 슬라이드를 불러오는 중</b></div>';
  try { await loadScript('data/lesson_' + deck + '.js'); } catch (e) { APP().innerHTML = '<div class="empty"><b>아직 준비되지 않았어요</b><a class="btn" href="#/week/' + week + '">돌아가기</a></div>'; return; }
  const L = (window.SDT_LESSONS || {})[deck];
  if (!L) { APP().innerHTML = '<div class="empty"><b>아직 준비되지 않았어요</b><a class="btn" href="#/week/' + week + '">돌아가기</a></div>'; return; }
  const cum = !!store.pref.cumulative;
  const frames = [], groups = [];
  const deckTitle = (META.decks[deck] || {}).title || deck;
  if (pass === 0) {
    L.slides.forEach(s => {
      const ts = (s.terms || []).map(x => TERM[String(x).toLowerCase()]).filter(Boolean).filter((t, j, a) => a.indexOf(t) === j);
      if (!ts.length) return;
      const start = frames.length;
      frames.push({ kind: 'slideimg', src: 'img/' + deck + '/p' + pad3(s.p) + '.jpg', alt: 'p.' + s.p + ' ' + s.title, cap: 'p.' + s.p + '  ' + s.title, _p: s.p, _t: s.title });
      frames.push({ kind: 'warm', terms: ts, _p: s.p, _t: s.title, _pass: 0, _ix: 0 });
      groups.push({ start, end: frames.length - 1, p: s.p });
    });
  } else L.slides.forEach(s => {
    const layers = cum ? PASS_INFO.map(x => x.n).filter(n => n <= pass) : [pass];
    const content = [];
    let walked = false;   // 부분 읽기로 옮긴 look 프레임은 첫 장면(부분씩 읽기)에 들어 있다
    layers.forEach(n => (s['pass' + n] || []).forEach((f, ix) => { if (f.walked) walked = true; else content.push(Object.assign({ _pass: n, _ix: ix }, f)); }));
    if (!content.length && !walked) return;
    const start = frames.length;
    const src = 'img/' + deck + '/p' + pad3(s.p) + '.jpg';
    frames.push(s.walk ? { kind: pass === 1 ? 'walk' : 'walksum', walk: s.walk, src, _p: s.p, _t: s.title } : { kind: 'slideimg', src, alt: 'p.' + s.p + ' ' + s.title, cap: 'p.' + s.p + '  ' + s.title, _p: s.p, _t: s.title });
    content.forEach(f => { f._p = s.p; f._t = s.title; frames.push(f); });
    groups.push({ start, end: frames.length - 1, p: s.p });
  });
  if (!frames.length) { APP().innerHTML = '<div class="empty"><b>이 회독에는 내용이 없어요</b><a class="btn" href="#/week/' + week + '">돌아가기</a></div>'; return; }
  const maxPass = Math.max.apply(null, PASS_INFO.map(x => x.n));
  const np = pass < maxPass ? pass + 1 : null;
  frames.push({ kind: 'end', big: deckTitle + ' ' + (pass ? pass + '회독' : '용어 먼저') + ' 끝', sub: pass === 0 ? '용어를 한 번씩 봤어요. 이제 1회독에서 이 용어들이 어떻게 쓰이는지 봐요.' : pass === 1 ? '큰 그림을 잡았어요. 길잡이 다음 순서는 정리 슬라이드예요.' : np ? '한 층 더 깊게 봤어요. ' + np + '회독에서 한 번 더 들어가요.' : '끝까지 봤어요. 문제로 확인해요.',
    links: [['길잡이로 돌아가기', '#/week/' + week], np ? [np + '회독 바로 시작', '#/lesson/' + deck + '/' + np] : ['모의고사', '#/mock?week=' + week]] });
  groups.push({ start: frames.length - 1, end: frames.length - 1 });
  store.lesson[deck] = store.lesson[deck] || {};
  const rec = store.lesson[deck][pass] = store.lesson[deck][pass] || {};
  const passChips = (L.slides.some(x => (x.terms || []).length) ? [0] : []).concat(PASS_INFO.map(x => x.n)).map(n => '<a class="chip' + (n === pass ? ' on' : '') + '" href="#/lesson/' + deck + '/' + n + '">' + (n ? n + '회독' : '용어 먼저') + '</a>').join('');
  startPlayer({
    frames, groups, start: jump != null ? +jump : rec.i && rec.i < frames.length - 1 ? rec.i : 0, showAll: !!all,
    backHref: '#/week/' + week,
    chips: passChips,
    imgOf: f => 'img/' + deck + '/p' + pad3(f._p) + '.jpg',
    inkKey: f => f.kind === 'end' ? null : f.kind === 'slideimg' ? 'slide/' + deck + '/p' + pad3(f._p) : f.kind === 'walk' ? 'walk/' + deck + '/p' + pad3(f._p) : 'lesson/' + deck + '/p' + pad3(f._p) + '/' + f._pass + '/' + f._ix,
    title: f => esc(deckTitle) + ' ' + (pass ? pass + '회독' : '용어 먼저') + ' <small>' + (f._p ? 'p.' + f._p + ' ' + esc(f._t || '') : '마무리') + (cum && f._pass ? ', ' + f._pass + '회독 내용' : '') + '</small>',
    onProgress: i => {
      rec.i = i; rec.max = Math.max(rec.max || 0, i + 1); rec.total = frames.length;
      if (i === frames.length - 1) rec.done = true;
      store.last = { href: '#/lesson/' + deck + '/' + pass, label: deckTitle + ' ' + pass + '회독' };
      save();
    },
    onEnd: () => { location.hash = '#/week/' + week; },
  });
  if (jump == null && rec.i && rec.i > 0 && rec.i < frames.length - 1) toast('지난번 본 곳(' + (rec.i + 1) + '번째 장면)부터 이어서 봐요');
}

/* ---------- 정리 슬라이드, 기초 단원 ---------- */
async function pageUnit(uid, jump, all) {
  const week = (uid.match(/^w(\w+?)-\d+$/) || [])[1];
  APP().innerHTML = '<div class="empty"><b>슬라이드를 불러오는 중</b></div>';
  try { await loadScript('data/notes_w' + week + '.js'); } catch (e) { APP().innerHTML = '<div class="empty"><b>아직 준비되지 않았어요</b><a class="btn" href="#/week/' + week + '">돌아가기</a></div>'; return; }
  const N = (window.SDT_NOTES || {})[week];
  const idx = N ? N.units.findIndex(u => u.id === uid) : -1;
  if (idx < 0) { location.hash = '#/week/' + week; return; }
  const u = N.units[idx];
  const frames = [];
  u.slides.forEach((s, i) => {
    frames.push(Object.assign({ _si: i }, s, s.kind === 'title' ? { eyebrow: (N.title || '') + ', 단원 ' + (idx + 1) } : {}));
    if (i === 0) {
      const prev = [];
      N.units.slice(0, idx).forEach(x => (x.terms || []).forEach(t => prev.push(t)));
      if (!prev.length) { const oi = ORDER.indexOf(week); const pw = oi > 0 ? ORDER[oi - 1] : null; if (pw) ((window.SDT_TERMS || {})[pw] || []).forEach(t => prev.push(t)); }
      const pick = prev.filter((t, j, a) => a.findIndex(y => termKey(y) === termKey(t)) === j)
        .sort((a, b) => ((store.terms[termKey(a)] || {}).seen || 0) - ((store.terms[termKey(b)] || {}).seen || 0)).slice(0, 4);
      if (pick.length) frames.push({ kind: 'review', terms: pick });
    }
  });
  const nextU = N.units[idx + 1];
  frames.push({ kind: 'end', big: '단원 ' + (idx + 1) + ' 끝', sub: nextU ? '다음 단원은 "' + nextU.title + '" 이에요.' : '이 주차 단원을 다 봤어요. 길잡이 다음 순서로 가요.',
    links: [nextU ? ['다음 단원 보기', '#/unit/' + nextU.id] : ['길잡이로 돌아가기', '#/week/' + week], ['용어 카드', '#/terms/' + week], nextU ? ['길잡이로 돌아가기', '#/week/' + week] : ['홈', '#/']] });
  const rec = store.units[uid] = store.units[uid] || {};
  startPlayer({
    frames, groups: frames.map((f, i) => ({ start: i, end: i })), start: jump != null ? +jump : rec.i && rec.i < frames.length - 1 ? rec.i : 0, showAll: !!all,
    backHref: '#/week/' + week,
    chips: '',
    imgOf: () => '',
    inkKey: f => f._si == null ? null : 'unit/' + uid + '/' + f._si,
    title: () => esc(u.title) + ' <small>' + esc(N.title || '') + ', 단원 ' + (idx + 1) + ' / ' + N.units.length + '</small>',
    onProgress: i => { rec.i = i; if (i === frames.length - 1) rec.done = true; store.last = { href: '#/unit/' + uid, label: u.title.slice(0, 20) }; save(); },
    onEnd: () => { location.hash = nextU ? '#/unit/' + nextU.id : '#/week/' + week; },
  });
}

/* ---------- 용어 카드 ---------- */
function pageTerms(week) {
  const all = termsOfWeek(week);
  const back = week === 'all' ? '#/' : '#/week/' + week;
  if (!all.length) { APP().innerHTML = '<a class="back" href="' + back + '">돌아가기</a><div class="empty"><b>아직 용어가 없어요</b></div>'; return; }
  let mode = all.some(termDue) ? 'due' : 'all', dir = 'en', list = [], i = 0, flipped = false;
  const build = () => { list = shuffle(all.filter(t => mode === 'all' || (mode === 'due' ? termDue(t) : !(store.terms[termKey(t)] || {}).known)).slice()); i = 0; flipped = false; };
  const draw = () => {
    const known = all.filter(t => (store.terms[termKey(t)] || {}).known).length;
    let h = '<a class="back" href="' + back + '">' + (week === 'all' ? '홈' : esc(weekName(week))) + '</a><div class="whead"><div class="eyebrow">용어 카드</div><h1>' + (week === 'all' ? '전 주차 용어' : esc(weekName(week)) + ' 용어') + '</h1><p class="num">' + all.length + '개 중 외운 것 ' + known + '개. 카드를 누르면 뒤집혀요.</p></div>'
      + '<div class="pillrow"><button class="chip' + (mode === 'due' ? ' on' : '') + '" data-m="due" type="button">오늘 복습 ' + all.filter(termDue).length + '개</button><button class="chip' + (mode === 'all' ? ' on' : '') + '" data-m="all" type="button">전부</button><button class="chip' + (mode === 'left' ? ' on' : '') + '" data-m="left" type="button">아직 못 외운 것</button>'
      + '<button class="chip' + (dir === 'en' ? ' on' : '') + '" data-d="en" type="button">용어 보고 뜻</button><button class="chip' + (dir === 'ko' ? ' on' : '') + '" data-d="ko" type="button">뜻 보고 용어</button></div>';
    if (!list.length) h += '<div class="empty"><b>다 외웠어요</b>"전부"를 눌러 한 번 더 넘겨 봐도 좋아요.</div>';
    else {
      const t = list[i], r = store.terms[termKey(t)] || { seen: 0 };
      const front = dir === 'en' ? '<div class="fen">' + esc(termFace(t)) + '</div>' + (t.en && t.ko ? '<div class="funit">' + esc(t.en) + '</div>' : '') : '<div class="fsay">' + esc(t.say) + '</div>';
      const backS = '<div class="fen">' + esc(termFace(t)) + '</div>' + (t.en && t.ko ? '<div class="fko">' + esc(t.en) + '</div>' : '') + '<div class="fsay">' + esc(t.say) + '</div>' + (t.more ? '<div class="funit" style="max-width:40ch">' + esc(t.more) + '</div>' : '');
      h += '<div class="flash" style="margin-top:14px"><div class="fcard' + (flipped ? ' flipped' : '') + '" id="fcard" role="button" tabindex="0">' + (flipped ? backS : front + '<div class="funit">눌러서 확인</div>')
        + '<div class="funit num">' + (i + 1) + ' / ' + list.length + ', 지금까지 ' + r.seen + '번 봤어요</div></div></div>'
        + '<div class="btnrow" style="justify-content:center"><button class="btn" id="fAgain" type="button">다시 볼래요</button><button class="btn primary" id="fKnow" type="button">알아요</button></div>';
    }
    APP().innerHTML = h;
    $$('[data-m]').forEach(b => b.addEventListener('click', () => { mode = b.dataset.m; build(); draw(); }));
    $$('[data-d]').forEach(b => b.addEventListener('click', () => { dir = b.dataset.d; flipped = false; draw(); }));
    const fc = $('#fcard');
    if (!fc) return;
    const flip = () => { flipped = !flipped; if (flipped) { const k = termKey(list[i]); const r = store.terms[k] || (store.terms[k] = { seen: 0 }); r.seen++; save(); } draw(); };
    fc.addEventListener('click', flip);
    fc.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flip(); } });
    const step = know => {
      const k = termKey(list[i]); const r = store.terms[k] || (store.terms[k] = { seen: 0 });
      r.known = know; if (!flipped) r.seen++;
      r.box = know ? Math.min(5, (r.box || 0) + 1) : 1;
      { const dd = new Date(); dd.setDate(dd.getDate() + (know ? [1, 2, 4, 7, 15][r.box - 1] : 0)); r.due = dayKey(dd); }
      save();
      if (!know) list.push(list[i]);
      i++; flipped = false;
      if (i >= list.length) { build(); toast(mode === 'due' ? '오늘 복습을 다 했어요' : '한 바퀴 돌았어요. 섞어서 다시 시작해요'); if (mode === 'due') { mode = 'all'; build(); } }
      draw();
    };
    $('#fKnow').addEventListener('click', () => step(true));
    $('#fAgain').addEventListener('click', () => step(false));
  };
  build(); draw();
}

/* ---------- 용어 게임 ----------
   #/game?week=all|<주차>            게임 고르기
   #/game/<mode>?week=..&only=missed  match 짝 맞추기, pick 이름 보고 뜻, name 뜻 보고 이름 (type=1 직접 쓰기), explain 뜻 설명하기, speed 스피드 퀴즈
   기록: store.games = { best: { 'mode:범위': { right, n, time, ts } }, missed: { 용어키: { n, ts } }, ts }
   뜻 설명하기의 자기 평가는 store.terms (용어 카드 복습 날짜)에 들어간다. 펫 코인은 주지 않는다. */
const GAME_MIN = { match: 3, pick: 4, name: 4, explain: 1, speed: 4 };
const GAME_ORDER = ['match', 'pick', 'name', 'explain', 'speed'];
const GAME_ICO = {
  match: '<rect x="2.5" y="5" width="7.5" height="14" rx="2"/><rect x="14" y="5" width="7.5" height="14" rx="2"/><path d="M10 12h4"/>',
  pick: '<rect x="4" y="3.5" width="16" height="17" rx="2.5"/><path d="M8.5 12.5l2.5 2.5 4.5-5"/>',
  name: '<circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l5 5"/><path d="M8.5 9a2 2 0 1 1 2.6 1.9c-.5.2-.6.5-.6 1v.3"/>',
  explain: '<path d="M4 5h16v11H10l-4.5 3.5V16H4z"/><path d="M8 9.5h8M8 12.5h5"/>',
  speed: '<circle cx="12" cy="13.5" r="7.5"/><path d="M12 9.5v4l2.5 2M9.5 2.5h5"/>',
};
const GAME_T = { match: '짝 맞추기', pick: '이름 보고 뜻 고르기', name: '뜻 보고 이름 고르기', name1: '뜻 보고 이름 쓰기', explain: '뜻 설명하기', speed: '스피드 퀴즈' };
const gKey = t => String((t && (t.en || t.ko)) || '').toLowerCase();
const gFace = t => (t && (t.ko || t.en)) || '';
const gSub = t => (t && t.ko && t.en && norm(t.ko) !== norm(t.en)) ? t.en : '';
const gDay = (d0 = new Date()) => d0.getFullYear() + '-' + String(d0.getMonth() + 1).padStart(2, '0') + '-' + String(d0.getDate()).padStart(2, '0');
const gIco = m => '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + GAME_ICO[m] + '</svg>';
const gPairs = () => (window.innerWidth || 1024) < 700 ? 6 : 8;
function gGames() { const g = store.games || (store.games = {}); g.best = g.best || {}; g.missed = g.missed || {}; return g; }
/* 범위 안에서 뜻이 있는 용어만, 같은 키는 한 번만 */
function gPool(scope) {
  const seen = {}, out = [];
  (termsOfWeek(scope) || []).forEach(t => {
    const k = gKey(t);
    if (k.length < 2 || seen[k] || !String(t.say || '').trim()) return;
    seen[k] = 1; out.push(Object.assign({ week: scope }, t, { _k: k }));
  });
  return out;
}
function gScopes() { return META.weeks.map(w => [w.id, w.short, gPool(w.id).length]).filter(x => x[2] > 0); }
function gBetter(key, a, b) {
  if (!b) return true; if (!a) return false;
  const m = key.split(':')[0];
  if (m === 'explain') return (a.ts || 0) > (b.ts || 0);
  if (m === 'match') return (a.time || 1e9) < (b.time || 1e9);
  if (m === 'speed') return (a.right || 0) > (b.right || 0);
  const ra = (a.right || 0) / (a.n || 1), rb = (b.right || 0) / (b.n || 1);
  return ra > rb || (ra === rb && (a.n || 0) > (b.n || 0));
}
function gMergeGames(d) {
  if (!d) return;
  const G = gGames();
  Object.keys(d.best || {}).forEach(k => { if (gBetter(k, d.best[k], G.best[k])) G.best[k] = d.best[k]; });
  if ((d.ts || 0) > (G.ts || 0)) { G.missed = Object.assign({}, d.missed || {}); G.ts = d.ts; }
}
function gBestText(key) {
  const b = gGames().best[key]; if (!b) return '';
  const m = key.split(':')[0];
  if (m === 'match') return '최고 기록 ' + b.time + '초' + (b.miss ? ', 틀린 횟수 ' + b.miss : '');
  if (m === 'speed') return '최고 기록 60초에 ' + b.right + '개';
  if (m === 'explain') return '지난번 알았다 ' + b.right + ' / ' + b.n;
  return '최고 기록 ' + b.right + ' / ' + b.n;
}
function gMissSave(t) { const G = gGames(), o = G.missed[t._k] || { n: 0 }; o.n++; o.ts = Date.now(); G.missed[t._k] = o; G.ts = Date.now(); save(); }
function gHitSave(t) { const G = gGames(); if (G.missed[t._k]) { delete G.missed[t._k]; G.ts = Date.now(); save(); } }
function gOptions(ans, pool, n) {
  const used = [norm(ans.say), norm(gFace(ans))], out = [ans];
  const same = shuffle(pool.filter(x => x.week === ans.week)), other = shuffle(pool.filter(x => x.week !== ans.week));
  same.concat(other).forEach(x => {
    if (out.length >= n || x._k === ans._k || used.indexOf(norm(x.say)) >= 0 || used.indexOf(norm(gFace(x))) >= 0) return;
    out.push(x); used.push(norm(x.say), norm(gFace(x)));
  });
  return shuffle(out);
}
/* 직접 쓰기 채점: 띄어쓰기, 대소문자, 문장부호 무시. 괄호 안 말, 슬래시로 나눈 말도 정답. 6글자 넘으면 한 글자 오타까지 */
function gLev(a, b) {
  if (Math.abs(a.length - b.length) > 1) return 2;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[b.length];
}
function gTypeOk(mine, t) {
  const m = norm(mine); if (!m) return false;
  const forms = [];
  [t.ko, t.en].forEach(s => {
    if (!s) return; s = String(s);
    forms.push(s, s.replace(/\([^)]*\)/g, ''));
    (s.match(/\(([^)]*)\)/g) || []).forEach(p => forms.push(p.slice(1, -1)));
    s.split(/[\/,]/).forEach(p => forms.push(p));
  });
  return forms.map(norm).filter(Boolean).some(a => a === m || (a.length >= 6 && gLev(a, m) <= 1));
}
let gTimers = [], gCur = null;
function gStop() { gTimers.forEach(x => { clearTimeout(x); clearInterval(x); }); gTimers = []; gCur = null; keyHandler(null); }
const gScopeName = s => s === 'all' ? '전체 용어' : weekName(s) + ' 용어';

function pageGame(mode, query) {
  const q = qs(query);
  const scope = q.week && q.week !== 'all' && weekOf(q.week) ? q.week : 'all';
  cleanup = gStop;
  if (mode && GAME_MIN[mode]) gPlay(mode, scope, q);
  else gHub(scope);
}
function gHub(scope) {
  gStop();
  const all = gPool('all'), pool = gPool(scope), G = gGames();
  const back = scope === 'all' ? '<a class="back" href="#/">홈</a>' : '<a class="back" href="#/week/' + esc(scope) + '">' + esc(weekName(scope)) + '</a>';
  if (!all.length) { APP().innerHTML = back + '<div class="empty"><b>아직 용어가 없어요</b>용어가 들어오면 여기서 게임을 할 수 있어요.</div>'; return; }
  const missed = pool.filter(t => G.missed[t._k]);
  let h = back + '<div class="whead"><div class="eyebrow">용어 게임</div><h1>용어 게임</h1><p>' + esc(gScopeName(scope)) + ' ' + pool.length + '개로 해요. 틀린 용어는 모아 뒀다가 따로 다시 풀 수 있어요.</p></div>';
  const scopes = gScopes();
  if (scopes.length > 1) h += '<div class="pillrow gscope"><span class="muted">범위</span><a class="chip' + (scope === 'all' ? ' on' : '') + '" href="#/game?week=all">전체 ' + all.length + '</a>' + scopes.map(x => '<a class="chip' + (scope === x[0] ? ' on' : '') + '" href="#/game?week=' + esc(x[0]) + '">' + esc(x[1]) + ' ' + x[2] + '</a>').join('') + '</div>';
  if (missed.length) {
    h += '<div class="gmiss"><div><b>헷갈렸던 용어 ' + missed.length + '개</b><div class="muted">게임에서 틀린 용어예요. 맞히면 목록에서 빠져요.</div></div><div class="btnrow" style="margin:0">'
      + (pool.length >= GAME_MIN.pick ? '<a class="btn" href="#/game/pick?week=' + esc(scope) + '&only=missed">뜻 고르기로 다시</a>' : '')
      + '<a class="btn" href="#/game/explain?week=' + esc(scope) + '&only=missed">설명하기로 다시</a><button class="btn sm" id="gClearMiss" type="button">목록 비우기</button></div></div>';
  }
  const pairs = Math.min(gPairs(), pool.length), nq = Math.min(10, pool.length);
  const desc = {
    match: '용어 하나, 뜻 하나를 눌러 짝을 지어요. 한 판에 ' + pairs + '쌍이고, 빨리 끝낼수록 기록이 좋아요.',
    pick: '용어를 보고 맞는 뜻을 4개 중에서 골라요. 한 판에 ' + nq + '문제예요.',
    name: '뜻을 읽고 어떤 용어인지 4개 중에서 골라요. 고르기가 쉬우면 직접 써서 맞혀 봐요.',
    explain: '용어만 보고 내 말로 먼저 설명해요. 뜻을 확인하고 얼마나 알았는지 고르면 용어 카드 복습에 반영돼요.',
    speed: '60초 동안 몇 개나 맞히는지 봐요. 용어 보고 뜻, 뜻 보고 용어가 섞여 나와요.',
  };
  const shown = GAME_ORDER.filter(m => pool.length >= GAME_MIN[m]);
  h += '<div class="gmodes">' + shown.map((m, i) => {
    const bestKey = m + ':' + scope, bt = gBestText(bestKey), bt1 = m === 'name' ? gBestText('name1:' + scope) : '';
    const href = '#/game/' + m + '?week=' + esc(scope);
    return '<div class="gmode c' + (GAME_ORDER.indexOf(m) + 1) + '" data-mode="' + m + '"><span class="gico">' + gIco(m) + '</span><b>' + esc(m === 'name' ? '뜻 보고 이름 고르기' : GAME_T[m]) + '</b><p>' + desc[m] + '</p>'
      + '<span class="gbest' + (bt || bt1 ? ' on' : '') + '">' + esc(bt || (m === 'explain' ? '아직 안 해 봤어요' : '아직 기록이 없어요')) + (bt1 ? '<br>직접 쓰기 ' + esc(bt1) : '') + '</span>'
      + '<div class="btnrow"><a class="btn primary" href="' + href + '">' + (m === 'name' ? '4개 중 고르기' : '시작') + '</a>' + (m === 'name' ? '<a class="btn" href="' + href + '&type=1">직접 써서 맞히기</a>' : '') + '</div></div>';
  }).join('') + '</div>';
  if (!pool.length) h += '<div class="empty"><b>이 범위에는 용어가 없어요</b><a href="#/game?week=all">전체 용어로 하기</a></div>';
  else if (shown.length < GAME_ORDER.length) h += '<p class="muted gnote">이 범위는 용어가 ' + pool.length + '개뿐이라 몇 가지 게임은 숨겼어요. 범위를 넓히면 다 할 수 있어요.</p>';
  APP().innerHTML = h;
  const cm = $('#gClearMiss');
  if (cm) cm.addEventListener('click', () => { if (!confirm('헷갈렸던 용어 목록을 비울까요?')) return; missed.forEach(t => { delete G.missed[t._k]; }); G.ts = Date.now(); save(); gHub(scope); toast('목록을 비웠어요'); });
}
function gPlay(mode, scope, q, list) {
  gStop();
  const pool = gPool(scope);
  const replay = !!list || q.only === 'missed';
  let terms = list ? list.slice() : q.only === 'missed' ? pool.filter(t => gGames().missed[t._k]) : pool.slice();
  const typing = mode === 'name' && q.type === '1';
  const R = { mode, scope, q, pool, terms, replay, typing, miss: [], missK: {}, key: (typing ? 'name1' : mode) + ':' + scope, title: GAME_T[typing ? 'name1' : mode] };
  gCur = R;
  if (pool.length < GAME_MIN[mode] || !terms.length) {
    APP().innerHTML = '<a class="back" href="#/game?week=' + esc(scope) + '">게임 고르기</a><div class="empty"><b>' + (pool.length < GAME_MIN[mode] ? '이 게임을 하기엔 용어가 모자라요' : '다시 풀 용어가 없어요') + '</b>' + (pool.length < GAME_MIN[mode] ? '용어가 ' + GAME_MIN[mode] + '개는 있어야 해요. 지금은 ' + pool.length + '개예요.' : '헷갈렸던 용어를 다 맞혔어요.') + '</div>';
    return;
  }
  ({ match: gMatch, pick: gChoice, name: typing ? gTyping : gChoice, explain: gExplain, speed: gSpeed })[mode](R);
}
const gLive = R => gCur === R;
const gLater = (R, fn, ms) => { gTimers.push(setTimeout(() => { if (gLive(R)) fn(); }, ms)); };
function gMiss(R, t) { if (!R.missK[t._k]) { R.missK[t._k] = 1; R.miss.push(t); } gMissSave(t); }
function gHit(R, t) { if (!R.missK[t._k]) gHitSave(t); }
function gHead(R, stats) {
  return '<a class="back" href="#/game?week=' + esc(R.scope) + '">게임 고르기</a><div class="gtitle"><div><div class="eyebrow">' + esc(gScopeName(R.scope)) + (R.replay ? ', 헷갈린 것만' : '') + '</div><h1>' + esc(R.title) + '</h1></div><div class="gstats">' + (stats || '') + '</div></div>';
}
const gStat = (id, label, v) => '<span class="gstat">' + label + '<b class="num" id="' + id + '">' + v + '</b></span>';
function gSaveBest(R, rec) {
  if (R.replay) return { isNew: false, text: '' };
  const G = gGames(), prev = G.best[R.key]; rec.ts = Date.now();
  const isNew = R.mode === 'explain' ? false : gBetter(R.key, rec, prev) && !!prev;
  if (R.mode === 'explain' || gBetter(R.key, rec, prev)) G.best[R.key] = rec;
  save();
  return { isNew, first: !prev, text: R.mode === 'explain' ? '' : !prev ? '첫 기록이에요' : isNew ? '' : gBestText(R.key) };
}
function gResult(R, o) {
  gStop(); gCur = R;
  const miss = R.miss;
  let h = gHead(R) + '<div class="card result gresult"><div class="big num">' + o.big + '</div><p>' + o.line + '</p>'
    + (o.best ? '<p class="gbestline">' + o.best + '</p>' : '')
    + '<div class="btnrow">' + (miss.length ? '<button class="btn primary" id="gReMiss" type="button">헷갈린 ' + miss.length + '개만 다시</button>' : '')
    + '<button class="btn' + (miss.length ? '' : ' primary') + '" id="gReAll" type="button">한 판 더</button><a class="btn" href="#/game?week=' + esc(R.scope) + '">다른 게임</a></div></div>';
  if (miss.length) h += '<h2 class="sec">헷갈린 용어 <small>' + miss.length + '개</small></h2><div class="gmisslist">' + miss.map(t => '<div class="gmissitem"><b>' + esc(gFace(t)) + (gSub(t) ? ' <small>' + esc(gSub(t)) + '</small>' : '') + '</b><span>' + fmt(t.say, false) + '</span></div>').join('') + '</div>';
  else h += '<p class="muted gnote" style="text-align:center">틀린 용어가 없어요.</p>';
  APP().innerHTML = h; renderMath(APP()); window.scrollTo(0, 0);
  const again = () => gPlay(R.mode, R.scope, R.q, R.replay && R.q.only !== 'missed' ? R.terms : null);
  $('#gReAll').addEventListener('click', again);
  const rm = $('#gReMiss'); if (rm) rm.addEventListener('click', () => gPlay(R.mode, R.scope, R.q, miss.slice()));
  keyHandler(k => { if (k === 'Enter') again(); });
}

/* 1. 짝 맞추기 */
function gMatch(R) {
  const n = Math.min(gPairs(), R.pool.length), used = {}, set = [];
  const take = t => { const a = 's' + norm(t.say), b = 'f' + norm(gFace(t)); if (set.length >= n || used[a] || used[b] || set.indexOf(t) >= 0) return; used[a] = used[b] = 1; set.push(t); };
  shuffle(R.terms.slice()).forEach(take);
  if (set.length < Math.min(3, n)) shuffle(R.pool.slice()).forEach(t => { if (set.length < Math.min(R.replay ? 3 : n, n)) take(t); });
  const L = shuffle(set.slice()), M = shuffle(set.slice());
  const t0 = Date.now();
  let left = set.length, mistakes = 0, sel = { term: null, mean: null }, busy = false;
  APP().innerHTML = gHead(R, gStat('gLeft', '남은 짝', left) + gStat('gMist', '틀린 횟수', 0) + gStat('gTime', '시간', '0초'))
    + '<p class="muted gtip">왼쪽 용어와 오른쪽 뜻을 하나씩 눌러요.</p><div class="gmatch"><div class="gcol">'
    + L.map(t => '<button class="gtile gterm" data-k="' + esc(t._k) + '" type="button"><b>' + esc(gFace(t)) + '</b>' + (gSub(t) ? '<small>' + esc(gSub(t)) + '</small>' : '') + '</button>').join('')
    + '</div><div class="gcol">' + M.map(t => '<button class="gtile gmean" data-k="' + esc(t._k) + '" type="button"><span>' + fmt(t.say, false) + '</span></button>').join('') + '</div></div>';
  renderMath(APP());
  const byK = {}; set.forEach(t => { byK[t._k] = t; });
  const secs = () => Math.max(1, Math.round((Date.now() - t0) / 1000));
  gTimers.push(setInterval(() => { const e = $('#gTime'); if (e && gLive(R)) e.textContent = Math.floor((Date.now() - t0) / 1000) + '초'; }, 250));
  const tap = b => {
    if (busy || b.classList.contains('gone')) return;
    const side = b.classList.contains('gterm') ? 'term' : 'mean';
    if (sel[side] === b) { b.classList.remove('sel'); sel[side] = null; return; }
    if (sel[side]) sel[side].classList.remove('sel');
    sel[side] = b; b.classList.add('sel');
    if (!sel.term || !sel.mean) return;
    const a = sel.term, m = sel.mean; sel = { term: null, mean: null };
    if (a.dataset.k === m.dataset.k) {
      const t = byK[a.dataset.k]; gHit(R, t);
      [a, m].forEach(x => { x.classList.remove('sel'); x.classList.add('good'); x.disabled = true; });
      gLater(R, () => [a, m].forEach(x => x.classList.add('gone')), 260);
      gLater(R, () => [a, m].forEach(x => x.classList.add('out')), 560);
      left--; $('#gLeft').textContent = left;
      if (!left) {
        const time = secs();
        gLater(R, () => {
          const b0 = gSaveBest(R, { right: set.length, n: set.length, time, miss: mistakes });
          gResult(R, { big: time + '<small>초</small>', line: set.length + '쌍을 ' + (mistakes ? mistakes + '번 틀리고' : '한 번도 안 틀리고') + ' 다 맞혔어요.', best: b0.isNew ? '새 최고 기록이에요' : b0.text });
        }, 520);
      }
    } else {
      mistakes++; $('#gMist').textContent = mistakes;
      gMiss(R, byK[a.dataset.k]); gMiss(R, byK[m.dataset.k]);
      busy = true; [a, m].forEach(x => { x.classList.remove('sel'); x.classList.add('bad'); });
      gLater(R, () => { [a, m].forEach(x => x.classList.remove('bad')); busy = false; }, 450);
    }
  };
  $$('.gtile').forEach(b => b.addEventListener('click', () => tap(b)));
}

/* 2, 3. 이름 보고 뜻 고르기, 뜻 보고 이름 고르기 */
function gChoice(R) {
  const list = shuffle(R.terms.slice()).slice(0, R.replay ? 20 : 10);
  const askName = R.mode === 'pick';
  let i = 0, right = 0;
  const show = () => {
    if (!gLive(R)) return;
    if (i >= list.length) {
      const b0 = gSaveBest(R, { right, n: list.length });
      gResult(R, { big: right + '<small> / ' + list.length + '</small>', line: right === list.length ? '다 맞혔어요.' : list.length + '문제 중 ' + right + '문제 맞혔어요.', best: b0.isNew ? '새 최고 기록이에요' : b0.text });
      return;
    }
    const t = list[i], opts = gOptions(t, R.pool, 4);
    const prompt = askName ? '<div class="gprompt"><b>' + esc(gFace(t)) + '</b>' + (gSub(t) ? '<small>' + esc(gSub(t)) + '</small>' : '') + '</div>' : '<div class="gprompt say">' + fmt(t.say, false) + '</div>';
    APP().innerHTML = gHead(R, gStat('gRight', '맞힌 개수', right))
      + '<div class="card gcard"><div class="qmeta"><span>' + (askName ? '이 용어의 뜻은?' : '이 뜻을 가진 용어는?') + '</span><span class="num">' + (i + 1) + ' / ' + list.length + '</span></div><div class="progress"><i style="width:' + Math.round(i / list.length * 100) + '%"></i></div>'
      + prompt + '<div class="choices">' + opts.map((o, k) => '<button class="ch" data-k="' + esc(o._k) + '" type="button"><b>' + (k + 1) + '</b><span>' + (askName ? fmt(o.say, false) : esc(gFace(o)) + (gSub(o) ? ' <small class="muted">' + esc(gSub(o)) + '</small>' : '')) + '</span></button>').join('') + '</div>'
      + '<div class="expl" id="gExpl"></div><div class="btnrow" id="gAfter" style="display:none"><button class="btn primary" id="gNext" type="button">' + (i + 1 >= list.length ? '결과 보기' : '다음') + '</button><span class="muted gkeys gkbd">Enter로 넘어가요</span></div></div>';
    renderMath(APP());
    let done = false;
    const pick = b => {
      if (done) return; done = true;
      const ok = b.dataset.k === t._k;
      $$('.ch').forEach(x => { x.disabled = true; if (x.dataset.k === t._k) x.classList.add('correct'); else if (x === b) x.classList.add('wrong'); });
      if (ok) { right++; gHit(R, t); } else gMiss(R, t);
      $('#gRight').textContent = right;
      const e = $('#gExpl'); e.className = 'expl on ' + (ok ? 'good' : 'bad');
      e.innerHTML = '<span class="lbl">' + (ok ? '맞았어요' : '아쉬워요') + '</span><b>' + esc(gFace(t)) + '</b>' + (gSub(t) ? ' (' + esc(gSub(t)) + ')' : '') + ': ' + fmt(t.say, false) + (t.more ? '<br><span class="muted">' + fmt(t.more, false) + '</span>' : '');
      renderMath(e); $('#gAfter').style.display = 'flex';
    };
    $$('.ch').forEach(b => b.addEventListener('click', () => pick(b)));
    $('#gNext').addEventListener('click', () => { i++; show(); });
    keyHandler(k => { if (done) { if (k === 'Enter') { i++; show(); } return; } const n = parseInt(k, 10); const bs = $$('.ch'); if (n >= 1 && n <= bs.length) pick(bs[n - 1]); });
  };
  show();
}

/* 3-1. 뜻 보고 이름 쓰기 */
function gTyping(R) {
  const list = shuffle(R.terms.slice()).slice(0, R.replay ? 20 : 10);
  let i = 0, right = 0;
  const show = () => {
    if (!gLive(R)) return;
    if (i >= list.length) {
      const b0 = gSaveBest(R, { right, n: list.length });
      gResult(R, { big: right + '<small> / ' + list.length + '</small>', line: right === list.length ? '다 맞혔어요. 직접 써서 다 맞히다니 대단해요.' : list.length + '문제 중 ' + right + '문제 맞혔어요.', best: b0.isNew ? '새 최고 기록이에요' : b0.text });
      return;
    }
    const t = list[i];
    APP().innerHTML = gHead(R, gStat('gRight', '맞힌 개수', right))
      + '<div class="card gcard"><div class="qmeta"><span>이 뜻을 가진 용어를 써요</span><span class="num">' + (i + 1) + ' / ' + list.length + '</span></div><div class="progress"><i style="width:' + Math.round(i / list.length * 100) + '%"></i></div>'
      + '<div class="gprompt say">' + fmt(t.say, false) + '</div>'
      + '<input type="text" id="gAns" placeholder="한글이나 영어로 써요" autocomplete="off" autocapitalize="off" spellcheck="false">'
      + '<div class="muted gkeys" style="margin-top:6px">띄어쓰기와 대소문자는 달라도 괜찮아요.</div>'
      + '<div class="btnrow" id="gPre"><button class="btn primary" id="gChk" type="button">확인</button><button class="btn" id="gSkip" type="button">모르겠어요</button></div>'
      + '<div class="expl" id="gExpl"></div><div class="btnrow" id="gAfter" style="display:none"></div></div>';
    renderMath(APP());
    const inp = $('#gAns'); try { inp.focus(); } catch (e) { /* 무시 */ }
    let done = false, verdict = false;
    const answer = ok => {
      const e = $('#gExpl'); e.className = 'expl on ' + (ok ? 'good' : 'bad');
      e.innerHTML = '<span class="lbl">' + (ok ? '맞았어요' : '아쉬워요') + '</span>정답: <b>' + esc(gFace(t)) + '</b>' + (gSub(t) ? ' (' + esc(gSub(t)) + ')' : '') + (t.more ? '<br><span class="muted">' + fmt(t.more, false) + '</span>' : '');
      renderMath(e);
      $('#gAfter').innerHTML = (!ok && inp.value.trim() ? '<button class="btn sm" id="gOk" type="button">맞게 쓴 것 같아요</button>' : '') + '<button class="btn primary" id="gNext" type="button">' + (i + 1 >= list.length ? '결과 보기' : '다음') + '</button>';
      $('#gAfter').style.display = 'flex';
      $('#gNext').addEventListener('click', () => { i++; show(); });
      const go = $('#gOk'); if (go) go.addEventListener('click', () => { verdict = true; right++; R.miss = R.miss.filter(x => x !== t); delete R.missK[t._k]; gHitSave(t); $('#gRight').textContent = right; answer(true); toast('맞은 걸로 할게요'); });
    };
    const check = skip => {
      if (done) return; done = true;
      verdict = !skip && gTypeOk(inp.value, t);
      inp.disabled = true; $('#gPre').style.display = 'none';
      if (verdict) { right++; gHit(R, t); } else gMiss(R, t);
      $('#gRight').textContent = right;
      answer(verdict);
    };
    $('#gChk').addEventListener('click', () => check(false));
    $('#gSkip').addEventListener('click', () => check(true));
    keyHandler(k => { if (k !== 'Enter') return; if (!done) check(false); else { i++; show(); } });
  };
  show();
}

/* 4. 뜻 설명하기: 자기 평가를 용어 카드 복습 기록(store.terms)에 넣는다 */
function gExplain(R) {
  const today = gDay();
  const rec = t => store.terms[t._k] || {};
  const rank = t => { const r = rec(t); return r.seen > 0 && r.due && r.due <= today ? 0 : !r.known ? 1 : 2; };
  const list = shuffle(R.terms.slice()).sort((a, b) => rank(a) - rank(b)).slice(0, R.replay ? 20 : 10);
  const cnt = [0, 0, 0];
  let i = 0;
  const show = () => {
    if (!gLive(R)) return;
    if (i >= list.length) {
      gSaveBest(R, { right: cnt[2], n: list.length });
      gResult(R, { big: cnt[2] + '<small> / ' + list.length + '</small>', line: '알았다 ' + cnt[2] + ', 애매했다 ' + cnt[1] + ', 몰랐다 ' + cnt[0] + '. 고른 대로 용어 카드 복습 날짜를 정해 뒀어요.' });
      return;
    }
    const t = list[i];
    APP().innerHTML = gHead(R, gStat('gDone', '알았다', cnt[2]))
      + '<div class="card gcard"><div class="qmeta"><span>이 용어를 내 말로 설명해요</span><span class="num">' + (i + 1) + ' / ' + list.length + '</span></div><div class="progress"><i style="width:' + Math.round(i / list.length * 100) + '%"></i></div>'
      + '<div class="gprompt"><b>' + esc(gFace(t)) + '</b>' + (gSub(t) ? '<small>' + esc(gSub(t)) + '</small>' : '') + '</div>'
      + '<textarea id="gMine" rows="3" placeholder="써도 되고 소리 내어 말해도 돼요"></textarea>'
      + '<div class="btnrow" id="gPre"><button class="btn primary" id="gReveal" type="button">뜻 보기</button></div>'
      + '<div id="gAfter" style="display:none"><div class="gmodel"><span class="eyebrow">뜻</span><div class="gsay">' + fmt(t.say, false) + '</div>' + (t.more ? '<div class="muted gmore">' + fmt(t.more, false) + '</div>' : '') + '<div class="gmine" id="gMineShow" hidden></div></div>'
      + '<p class="muted gkeys" style="margin:14px 0 0">얼마나 알았나요?<span class="gkbd"> 숫자 키 1, 2, 3으로 골라도 돼요.</span></p><div class="grate"><button class="r2" data-r="2" type="button"><b>1</b>알았다</button><button class="r1" data-r="1" type="button"><b>2</b>애매했다</button><button class="r0" data-r="0" type="button"><b>3</b>몰랐다</button></div></div></div>';
    renderMath(APP());
    let open = false;
    const reveal = () => {
      if (open) return; open = true;
      const mine = $('#gMine').value.trim(); $('#gMine').disabled = true; $('#gMine').hidden = true;
      if (mine) { const m = $('#gMineShow'); m.hidden = false; m.innerHTML = '<span class="eyebrow">내 설명</span><div>' + esc(mine) + '</div>'; }
      $('#gPre').style.display = 'none'; $('#gAfter').style.display = 'block';
      const k = t._k, r = store.terms[k] || (store.terms[k] = { seen: 0 }); r.seen = (r.seen || 0) + 1; save();
    };
    const rate = v => {
      if (!open) return;
      const r = store.terms[t._k] || (store.terms[t._k] = { seen: 1 });
      let days = 0;
      if (v === 2) { r.known = true; r.box = Math.min(5, (r.box || 0) + 1); days = [1, 2, 4, 7, 15][r.box - 1]; gHit(R, t); }
      else if (v === 1) { r.known = false; r.box = 1; days = 1; gMiss(R, t); }
      else { r.known = false; r.box = 1; days = 0; gMiss(R, t); }
      const dd = new Date(); dd.setDate(dd.getDate() + days); r.due = gDay(dd);
      cnt[v]++; save(); i++; show();
    };
    $('#gReveal').addEventListener('click', reveal);
    $$('.grate button').forEach(b => b.addEventListener('click', () => rate(+b.dataset.r)));
    keyHandler(k => { if (!open) { if (k === 'Enter') reveal(); return; } if (k === '1') rate(2); else if (k === '2') rate(1); else if (k === '3') rate(0); });
  };
  show();
}

/* 5. 스피드 퀴즈: 60초 */
function gSpeed(R) {
  const DUR = 60000;
  APP().innerHTML = gHead(R) + '<div class="card gcard gready"><div class="gprompt"><b>60초</b><small>시작을 누르면 바로 시간이 흘러요</small></div><p>용어 보고 뜻, 뜻 보고 용어가 섞여 나와요. 틀려도 점수는 안 깎여요.<span class="gkbd"> 숫자 키 1~4로 골라도 돼요.</span></p>'
    + (gBestText(R.key) && !R.replay ? '<p class="gbestline">' + esc(gBestText(R.key)) + '</p>' : '') + '<div class="btnrow" style="justify-content:center"><button class="btn primary" id="gGo" type="button">시작</button></div></div>';
  let started = false;
  const start = () => {
    if (!gLive(R) || started) return; started = true;
    const end = Date.now() + DUR;
    let right = 0, tried = 0, prev = null, lock = false, over = false;
    APP().innerHTML = gHead(R, gStat('gSec', '남은 시간', '60초') + gStat('gRight', '맞힌 개수', 0))
      + '<div class="gclock" id="gClock"><i style="width:100%"></i></div><div class="card gcard" id="gQ"></div>';
    const finish = () => {
      if (over) return; over = true;
      const b0 = gSaveBest(R, { right, n: tried });
      gResult(R, { big: right + '<small>개</small>', line: '60초 동안 ' + tried + '문제를 풀고 ' + right + '개 맞혔어요.', best: b0.isNew ? '새 최고 기록이에요' : b0.text });
    };
    const tick = () => {
      if (!gLive(R) || over) return;
      const rem = end - Date.now();
      if (rem <= 0) { finish(); return; }
      const c = $('#gClock'); if (c) { c.firstChild.style.width = (rem / DUR * 100).toFixed(1) + '%'; c.classList.toggle('low', rem < 10000); }
      const s = $('#gSec'); if (s) s.textContent = Math.ceil(rem / 1000) + '초';
    };
    const next = () => {
      if (!gLive(R) || over) return;
      if (end - Date.now() <= 0) { finish(); return; }
      let t = R.terms[Math.floor(Math.random() * R.terms.length)];
      if (R.terms.length > 1) { let g = 0; while (t === prev && g++ < 8) t = R.terms[Math.floor(Math.random() * R.terms.length)]; }
      prev = t; lock = false;
      const askName = Math.random() < 0.5, opts = gOptions(t, R.pool, 4);
      $('#gQ').innerHTML = (askName ? '<div class="gprompt sm"><b>' + esc(gFace(t)) + '</b>' + (gSub(t) ? '<small>' + esc(gSub(t)) + '</small>' : '') + '</div>' : '<div class="gprompt say sm">' + fmt(t.say, false) + '</div>')
        + '<div class="choices">' + opts.map((o, k) => '<button class="ch" data-k="' + esc(o._k) + '" type="button"><b>' + (k + 1) + '</b><span>' + (askName ? fmt(o.say, false) : esc(gFace(o))) + '</span></button>').join('') + '</div>';
      renderMath($('#gQ'));
      const pick = b => {
        if (lock || over) return; lock = true; tried++;
        const ok = b.dataset.k === t._k;
        $$('#gQ .ch').forEach(x => { x.disabled = true; if (x.dataset.k === t._k) x.classList.add('correct'); else if (x === b) x.classList.add('wrong'); });
        if (ok) { right++; gHit(R, t); } else gMiss(R, t);
        $('#gRight').textContent = right;
        gLater(R, next, ok ? 280 : 700);
      };
      $$('#gQ .ch').forEach(b => b.addEventListener('click', () => pick(b)));
      keyHandler(k => { const n = parseInt(k, 10), bs = $$('#gQ .ch'); if (n >= 1 && n <= bs.length) pick(bs[n - 1]); });
    };
    gTimers.push(setInterval(tick, 100));
    next();
  };
  $('#gGo').addEventListener('click', start);
  keyHandler(k => { if (k === 'Enter') start(); });
}

/* ---------- 필기 노트 ---------- */
async function pageNotebook() {
  const I = INK();
  const keys = I ? await I.keys() : [];
  const free = store.notebook.free || 1;
  let h = '<a class="back" href="#/">홈</a><div class="whead"><div class="eyebrow">손글씨</div><h1>필기 노트</h1><p>애플펜슬로 쓰면 펜만 필기되고 손가락으로는 넘겨요. PC에서는 마우스로 써요. 회독 화면이나 문제 화면에서도 "필기" 버튼으로 바로 쓸 수 있어요.</p></div>';
  h += '<h2 class="sec">빈 노트 <small>모눈종이</small></h2><div class="pagegrid">';
  for (let n = 1; n <= free; n++) h += '<a class="pagecard" href="#/notebook/free/' + n + '"><canvas width="240" height="340" data-key="free/' + n + '"></canvas><span>' + n + '쪽</span></a>';
  h += '<button class="pagecard add" id="addPage" type="button"><span class="plus">+</span><span>새 쪽</span></button></div>';
  h += '<h2 class="sec">슬라이드에 필기 <small>슬라이드 그림 아래에 여백이 있어요</small></h2><div class="toolrow">';
  Object.keys(META.decks).forEach(deck => {
    const d = META.decks[deck]; if (!d) return;
    const cnt = keys.filter(k => k.indexOf('page/' + deck + '/') === 0).length;
    h += '<a class="tool" href="#/notebook/' + deck + '"><b>' + esc(d.title) + '</b><span class="num">슬라이드 ' + d.total + '장, 필기한 쪽 ' + cnt + '개</span></a>';
  });
  h += '</div>';
  const other = keys.filter(k => /^(slide|lesson|unit|q)\//.test(k)).length;
  if (other) h += '<p class="muted" style="margin-top:14px">회독, 정리 슬라이드, 문제 화면에 남긴 필기 ' + other + '쪽은 그 화면을 다시 열면 그대로 보여요.</p>';
  APP().innerHTML = h;
  if (I) $$('canvas[data-key]').forEach(c => I.preview(c, c.dataset.key));
  $('#addPage').addEventListener('click', () => { store.notebook.free = free + 1; save(); location.hash = '#/notebook/free/' + (free + 1); });
}
function paperPage(opts) {
  const I = INK();
  document.body.classList.add('paper');
  let h = '<div class="ptop"><a class="btn sm" href="' + esc(opts.back) + '">목록</a><div class="ptitle">' + opts.title + '</div><div class="pchips">' + (opts.chips || '') + '</div></div>'
    + '<div class="paperwrap"><div class="' + opts.cls + '" id="paper">' + (opts.inner || '') + '</div></div>'
    + '<div class="pbar2"><a class="btn' + (opts.prev ? '' : ' disabled') + '" href="' + esc(opts.prev || '#') + '">이전 쪽</a><span class="pcount num" style="flex:1;text-align:center">' + esc(opts.count || '') + '</span><a class="btn primary' + (opts.next ? '' : ' disabled') + '" href="' + esc(opts.next || '#') + '">다음 쪽</a></div>';
  APP().innerHTML = h;
  if (!I) { toast('이 브라우저에서는 필기를 쓸 수 없어요'); return; }
  const layer = new I.Layer($('#paper'), { scrollOnFinger: true, zoomable: true });
  layer.setEnabled(true);
  layer.setKey(opts.key);
  I.Toolbar.attach(layer, () => { location.hash = opts.back; });
  cleanup = () => { layer.destroy(); I.Toolbar.detach(); };
}
function pageFreePage(nStr) {
  const n = +nStr, free = store.notebook.free || 1;
  if (n > free) { store.notebook.free = n; save(); }
  paperPage({
    back: '#/notebook', key: 'free/' + n, cls: 'nbpage', title: '빈 노트 <small>' + n + '쪽</small>',
    prev: n > 1 ? '#/notebook/free/' + (n - 1) : '', next: '#/notebook/free/' + (n + 1), count: n + ' / ' + Math.max(n, free) + '쪽',
  });
}
async function pageDeckPages(deck) {
  const d = META.decks[deck]; if (!d) { location.hash = '#/notebook'; return; }
  const I = INK(), keys = I ? await I.keys() : [];
  let h = '<a class="back" href="#/notebook">필기 노트</a><div class="whead"><div class="eyebrow">슬라이드에 필기</div><h1>' + esc(d.title) + '</h1><p>쪽을 누르면 슬라이드 그림과 필기 여백이 열려요.</p></div><div class="thumbgrid">';
  for (let p = 1; p <= d.total; p++) {
    const has = keys.indexOf('page/' + deck + '/p' + pad3(p)) >= 0;
    h += '<a class="thumb' + (has ? ' has' : '') + '" href="#/notebook/' + deck + '/' + p + '"><img loading="lazy" decoding="async" src="img/' + deck + '/p' + pad3(p) + '.jpg" alt="p.' + p + '"><span class="num">p.' + p + (has ? ', 필기 있음' : '') + '</span></a>';
  }
  APP().innerHTML = h + '</div>';
}
function pageSlidePage(deck, pStr) {
  const d = META.decks[deck], p = +pStr; if (!d) { location.hash = '#/notebook'; return; }
  paperPage({
    back: '#/notebook/' + deck, key: 'page/' + deck + '/p' + pad3(p), cls: 'nbslide', title: esc(d.title) + ' <small>p.' + p + '</small>',
    inner: '<img src="img/' + deck + '/p' + pad3(p) + '.jpg" alt="p.' + p + '" draggable="false"><div class="ruled"></div>',
    prev: p > 1 ? '#/notebook/' + deck + '/' + (p - 1) : '', next: p < d.total ? '#/notebook/' + deck + '/' + (p + 1) : '', count: 'p.' + p + ' / ' + d.total,
  });
}

/* ---------- 설정: 동기화, 백업 ---------- */
async function pageSettings() {
  const I = INK(), A = window.SDT;
  const inkKeys = I ? await I.keys() : [];
  const u = A && A.user;
  let h = '<a class="back" href="#/">홈</a><div class="whead"><div class="eyebrow">설정</div><h1>로그인과 기록</h1><p>로그인하면 공부 기록, 오답노트, 필기가 내 계정에 저장돼서 PC, 아이패드, 휴대폰 어디서든 이어져요. 로그인하지 않으면 이 기기에만 저장돼요.</p></div>';
  h += '<div class="card stack" style="margin-top:16px"><div class="row" style="justify-content:space-between"><b style="font-size:18px">계정</b><span class="state ' + (u ? 'ok' : 'warn') + '">' + (!A || !A.enabled ? '로그인 쓸 수 없음' : u ? '로그인됨' : '로그인 안 됨') + '</span></div>';
  if (A && A.enabled && u) h += '<p style="margin:0">' + esc(u.displayName || u.email || '내 계정') + ' 님으로 로그인했어요. 기록은 자동으로 저장돼요.</p><div class="row"><button class="btn" id="syncNow" type="button">지금 맞추기</button><button class="btn" id="logoutBtn" type="button">로그아웃</button><span class="muted" id="syncMsg" style="font-size:14px"></span></div>';
  else if (A && A.enabled) h += '<div class="row"><button class="btn primary" id="loginBtn" type="button">Google 계정으로 로그인</button></div><p class="muted" style="margin:0;font-size:14px">카카오톡 안에서 열었다면 외부 브라우저로 다시 열려요.</p>';
  else h += '<p class="muted" style="margin:0;font-size:14px">사이트 주소 https://geonumul.github.io/Toolbox_Group_Study/ 로 열면 로그인할 수 있어요. 파일로 열면 이 기기에만 저장돼요.</p>';
  h += '</div>';
  // 내 공부 한눈에
  const ks = Object.keys(store.seen); let okN = 0, attN = 0;
  ks.forEach(k => { okN += store.seen[k].ok || 0; attN += store.seen[k].n || 0; });
  const openWrong = Object.keys(store.wrong).filter(k => !store.wrong[k].resolved && BY_ID[k]).length;
  let passDone = 0, passTot = 0, unitTot = 0, unitDoneN = 0;
  Object.keys(META.decks).forEach(dk => (META.decks[dk].frames || []).forEach((n, i) => { if (n) { passTot++; if (((store.lesson[dk] || {})[i + 1] || {}).done) passDone++; } }));
  Object.keys(META.units).forEach(wk => (META.units[wk] || []).forEach(un => { unitTot++; if (unitDone(un.id)) unitDoneN++; }));
  const knownN = Object.keys(store.terms).filter(k => store.terms[k].known).length;
  const dayN = Object.keys(store.days || {}).length;
  let streak = 0; { const d0 = new Date(); while ((store.days || {})[dayKey(d0)]) { streak++; d0.setDate(d0.getDate() - 1); } }
  const box = (n, l) => '<div class="box"><div class="n num">' + n + '</div><div class="l">' + l + '</div></div>';
  h += '<div class="card stack"><b style="font-size:18px">내 공부 한눈에</b><div class="sum" style="margin:0">'
    + box(ks.length, '푼 문제') + box(attN ? Math.round(okN / attN * 100) + '%' : '-', '정답률') + box(openWrong, '남은 오답')
    + box(passDone + ' / ' + passTot, '끝낸 회독') + box(unitDoneN + ' / ' + unitTot, '본 단원') + box(knownN, '외운 용어')
    + box(streak + '일', '연속 공부') + box(dayN + '일', '공부한 날') + '</div>'
    + (store.last ? '<div class="row"><a class="btn sm" href="' + esc(store.last.href) + '">마지막으로 본 곳: ' + esc(store.last.label) + '</a></div>' : '') + '</div>';
  // 보기 설정
  const opt = (a, v, label, cur) => '<button class="chip' + (String(cur) === String(v) ? ' on' : '') + '" data-' + a + '="' + v + '" type="button">' + label + '</button>';
  const th = store.pref.theme || 'system', zm = +store.pref.zoom || 1, sp = +store.pref.speed || 1, cu = !!store.pref.cumulative;
  h += '<div class="card stack"><b style="font-size:18px">보기 설정</b>'
    + '<div class="row"><span class="cap">화면</span>' + opt('pt', 'system', '기기 설정 따라', th) + opt('pt', 'light', '밝게', th) + opt('pt', 'dark', '어둡게', th) + '</div>'
    + '<div class="row"><span class="cap">글자 크기</span>' + opt('pz', 1, '보통', zm) + opt('pz', 1.1, '크게', zm) + opt('pz', 1.2, '아주 크게', zm) + '</div>'
    + '<div class="row"><span class="cap">자동 재생</span>' + opt('ps', 1.5, '느리게', sp) + opt('ps', 1, '보통', sp) + opt('ps', 0.7, '빠르게', sp) + '</div>'
    + '<div class="row"><span class="cap">회독</span>' + opt('pc', 'false', '이번 회독 내용만', cu) + opt('pc', 'true', '앞 회독 내용도 함께', cu) + '</div>'
    + '<p class="muted" style="margin:0;font-size:14px">로그인하면 이 설정도 계정에 저장돼요.</p></div>';
  // 기록 정리
  h += '<div class="card stack"><b style="font-size:18px">기록 정리</b><p class="muted" style="margin:0">시험 전에 처음부터 다시 해 보고 싶을 때 골라서 지워요. 지운 기록은 되돌릴 수 없어요.</p>'
    + '<div class="row"><button class="btn sm" data-reset="seen" type="button">정답률 기록</button><button class="btn sm" data-reset="lesson" type="button">회독, 단원 진도</button><button class="btn sm" data-reset="terms" type="button">외운 용어 표시</button><button class="btn sm danger" data-reset="wrong" type="button">오답노트</button></div></div>';
  h += '<div class="card stack"><b style="font-size:18px">필기</b><div class="row"><button class="chip' + (I && I.tool.fingerNav ? ' on' : '') + '" id="fingerChip" type="button">' + (I && I.tool.fingerNav ? '손가락은 넘기기, 펜만 필기' : '손가락으로도 필기') + '</button></div><p class="muted" style="margin:0;font-size:14px">애플펜슬을 한 번 쓰면 자동으로 "펜만 필기"로 바뀌어요.</p></div>';
  APP().innerHTML = h;
  const setPref = (k, v) => { store.pref[k] = v; saveNow(); syncPushSoon(); applyPref(); pageSettings(); };
  $$('[data-pt]').forEach(b => b.addEventListener('click', () => setPref('theme', b.dataset.pt)));
  $$('[data-pz]').forEach(b => b.addEventListener('click', () => setPref('zoom', +b.dataset.pz)));
  $$('[data-ps]').forEach(b => b.addEventListener('click', () => setPref('speed', +b.dataset.ps)));
  $$('[data-pc]').forEach(b => b.addEventListener('click', () => setPref('cumulative', b.dataset.pc === 'true')));
  $$('[data-reset]').forEach(b => b.addEventListener('click', () => {
    const k = b.dataset.reset, name = { seen: '정답률 기록', lesson: '회독, 단원 진도', terms: '외운 용어 표시', wrong: '오답노트' }[k];
    if (!confirm(name + '을 지울까요? 되돌릴 수 없어요.')) return;
    if (k === 'lesson') { store.lesson = {}; store.units = {}; }
    else if (k === 'terms') Object.keys(store.terms).forEach(t => { store.terms[t].known = false; });
    else store[k] = {};
    saveNow(); syncPushNow(); updateBadges(); toast('지웠어요'); pageSettings();
  }));
  const lb = $('#loginBtn'); if (lb) lb.addEventListener('click', () => A.login());
  const ob = $('#logoutBtn'); if (ob) ob.addEventListener('click', () => { A.logout().then(() => toast('로그아웃했어요')); });
  const sn = $('#syncNow');
  if (sn) sn.addEventListener('click', async () => {
    const msg = m => { $('#syncMsg').textContent = m; };
    msg('맞추는 중'); await syncPull(false); syncPushNow();
    const all = I ? await I.all() : {}; let n = 0;
    for (const k of Object.keys(all)) { if (await I.Sync.push('ink:' + k, all[k])) n++; }
    msg('기록과 필기 ' + n + '쪽을 맞췄어요');
  });
  $('#fingerChip').addEventListener('click', () => { if (!I) return; I.tool.fingerNav = !I.tool.fingerNav; if (I.saveTool) I.saveTool(); pageSettings(); });
  $('#expAll') && $('#expAll').addEventListener('click', async () => {
    const data = JSON.stringify({ app: KEY, at: new Date().toISOString(), store: progressData(), extra: store.extra, ink: I ? await I.all() : {} });
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([data], { type: 'application/json' })); a.download = (META.name || '공부') + '_기록_' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500); toast('기록 파일을 저장했어요');
  });
  $('#impAll') && $('#impAll').addEventListener('click', () => $('#impFile').click());
  $('#impFile') && $('#impFile').addEventListener('change', function () {
    const f = this.files[0]; if (!f) return; const r = new FileReader();
    r.onload = async () => {
      try {
        const d = JSON.parse(r.result);
        mergeProgress(d.store || d);
        if (Array.isArray(d.extra)) store.extra = store.extra.concat(d.extra);
        if (d.ink && I) for (const k of Object.keys(d.ink)) { const loc = await I.getPage(k); if (!loc || (d.ink[k].updated || 0) > (loc.updated || 0)) await I.putPage(k, d.ink[k]); }
        saveNow(); syncPushSoon(); toast('기록을 불러왔어요'); pageSettings();
      } catch (e) { toast('이 파일은 공부 기록 형식이 아니에요'); }
    };
    r.readAsText(f); this.value = '';
  });
}

/* ---------- 문제 풀기 ---------- */
const st = { type: 'all', level: 'all', scope: 'all', unit: '', src: '', n: 20, mode: 'all', deck: [], pos: 0, cur: null, session: null, mock: null };
let _kh = null;
document.addEventListener('keydown', ev => {
  if (!_kh) return; const t = ev.target;
  if (t && (t.tagName === 'TEXTAREA' || (t.tagName === 'INPUT' && ev.key !== 'Enter'))) return;
  if (ev.key === 'Enter' || /^[1-9oOxX]$/.test(ev.key)) _kh(ev.key);
});
const keyHandler = fn => { _kh = fn; };
function pool() {
  return BANK.filter(q => {
    if (st.type !== 'all' && q.type !== st.type) return false;
    if (st.scope !== 'all' && q.part !== st.scope) return false;
    if (st.level !== 'all' && q.level !== st.level) return false;
    if (st.unit && q.unit !== st.unit) return false;
    if (!st.unit && q.unit === '용어') return false;
    if (st.src && srcKind(q) !== st.src) return false;
    if (st.mode === 'wrong') { const w = store.wrong[q.id]; return !!(w && !w.resolved); }
    if (st.mode === 'unseen') return !store.seen[q.id];
    return true;
  });
}
function chipRow(cap, attr, opts, cur) {
  return '<div class="row"><span class="cap">' + cap + '</span>' + opts.map(o => '<button class="chip' + (String(o[0]) === String(cur) ? ' on' : '') + '" data-' + attr + '="' + esc(o[0]) + '" type="button">' + esc(o[1]) + '</button>').join('') + '</div>';
}
function pageQuiz(query) {
  const q = qs(query);
  st.type = q.type || 'all'; st.level = q.level || 'all'; st.scope = q.week || 'all'; st.mode = q.mode || 'all'; st.unit = q.unit || ''; st.src = q.src || ''; st.n = q.n ? +q.n : 20;
  const weekOpts = [['all', '전체']].concat(META.weeks.filter(w => BANK.some(x => x.part === w.id)).map(w => [w.id, w.short]));
  const srcOpts = [['', '전체']].concat(Array.from(new Set(BANK.map(srcKind).filter(Boolean))).map(k => [k, k + '만']));
  const h = '<div class="whead" style="padding-top:22px"><div class="eyebrow">문제은행</div><h1>문제 풀기</h1><p>객관식, O/X, 주관식, 서술, 계산이 섞여 나와요. 서술은 직접 써 보고 모범답안 항목과 대조해요. "필기"를 눌러 문제 위에 바로 써도 돼요.</p></div>'
    + '<div class="card" id="setup" style="margin-top:14px">'
    + chipRow('유형', 'type', [['all', '전체 섞기'], ['mcq', '객관식'], ['ox', 'O/X'], ['short', '주관식'], ['essay', '서술'], ['calc', '계산']], st.type)
    + chipRow('난이도', 'level', [['all', '전체'], ['basic', '기본'], ['hard', '심화']], st.level)
    + chipRow('범위', 'scope', weekOpts, st.scope)
    + chipRow('문항 수', 'n', [[10, '10'], [20, '20'], [40, '40'], [0, '전부']], st.n)
    + chipRow('모드', 'mode', [['all', '모든 문제'], ['wrong', '오답만'], ['unseen', '아직 안 푼 문제']], st.mode)
    + (srcOpts.length > 1 ? chipRow('출처', 'src', srcOpts, st.src) : '')
    + (st.unit ? '<div class="row"><span class="cap">단원</span><button class="chip on" id="unitChip" type="button">' + esc(st.unit) + ' (누르면 해제)</button></div>' : '')
    + '<div class="btnrow" style="margin-top:16px"><button class="btn primary" id="startBtn" type="button">시작하기</button><a class="btn" href="#/mock' + (st.scope !== 'all' ? '?week=' + st.scope : '') + '">모의고사</a><button class="btn" id="resetBtn" type="button">푼 기록 초기화</button></div>'
    + '<div class="stat" id="setupStat"></div></div><div id="qstage"></div>';
  APP().innerHTML = h;
  const bind = (attr, key, num) => $$('[data-' + attr + ']').forEach(b => b.addEventListener('click', () => {
    $$('[data-' + attr + ']').forEach(x => x.classList.remove('on')); b.classList.add('on');
    st[key] = num ? +b.dataset[attr] : b.dataset[attr]; updateStat();
  }));
  bind('type', 'type'); bind('level', 'level'); bind('scope', 'scope'); bind('n', 'n', true); bind('mode', 'mode'); bind('src', 'src');
  const uc = $('#unitChip'); if (uc) uc.addEventListener('click', () => { st.unit = ''; uc.parentNode.remove(); updateStat(); });
  $('#startBtn').addEventListener('click', () => startDeck(pool()));
  $('#resetBtn').addEventListener('click', () => {
    if (!confirm('푼 문제 기록(정답률)을 지웁니다. 오답노트는 남아요. 계속할까요?')) return;
    store.seen = {}; saveNow(); updateStat(); updateBadges(); $('#qstage').innerHTML = ''; toast('기록을 지웠어요');
  });
  updateStat();
  cleanup = () => keyHandler(null);
  if (q.start === '1') {
    if (!pool().length && st.mode === 'unseen') { st.mode = 'all'; $$('[data-mode]').forEach(x => x.classList.toggle('on', x.dataset.mode === 'all')); toast('다 풀었어요. 전체에서 섞어서 낼게요'); }
    startDeck(pool());
  }
}
function updateStat() {
  const p = pool(); const c = { calc: 0, essay: 0, mcq: 0, short: 0, ox: 0 }; p.forEach(q => { c[q.type]++; });
  let m = '출제 가능 ' + p.length + '문항 (계산 ' + c.calc + ', 서술 ' + c.essay + ', 객관식 ' + c.mcq + ', 주관식 ' + c.short + ', O/X ' + c.ox + ')';
  if (st.n > 0 && p.length > st.n) m += ' 중 ' + st.n + '문항';
  const el = $('#setupStat'); if (el) el.textContent = m;
}
function startDeck(list, keepOrder, mockLabel) {
  if (window.SDTPet && !window.SDTPet.canStart(list)) return;
  st.mock = mockLabel || null;
  st.deck = keepOrder ? list.slice() : shuffle(list.slice());
  if (st.n > 0 && !keepOrder) st.deck = st.deck.slice(0, st.n);
  st.pos = 0; st.session = { total: st.deck.length, right: 0, wrongIds: [], essaySum: 0, essayN: 0, byType: {} };
  if (!st.deck.length) { toast('조건에 맞는 문제가 없어요'); return; }
  qNext();
}
let selfGrade = false;   // 스스로 '맞은 걸로' 바꾼 답이면 펫 코인을 주지 않는다
function record(q, ok, mine, missing) {
  const petReview = !!(store.wrong[q.id] && !store.wrong[q.id].resolved);
  const s = store.seen[q.id] || { n: 0, ok: 0 }; s.n++; if (ok) s.ok++; store.seen[q.id] = s;
  const bt = st.session.byType[q.type] || (st.session.byType[q.type] = { n: 0, ok: 0 }); bt.n++; if (ok) bt.ok++;
  if (ok) { st.session.right++; if (store.wrong[q.id]) { store.wrong[q.id].resolved = true; store.wrong[q.id].ts = Date.now(); } }
  else {
    const w = store.wrong[q.id] || { count: 0 }; w.count++; w.lastAnswer = String(mine || '').slice(0, 600); w.missing = missing || null; w.resolved = false; w.ts = Date.now();
    store.wrong[q.id] = w; st.session.wrongIds.push(q.id);
  }
  store.last = { href: '#/quiz?week=' + q.part + '&level=' + q.level + '&mode=unseen&start=1', label: weekName(q.part) + ' ' + (LEVEL_NAME[q.level] || '') + ' 문제' };
  save(); updateBadges(); updateStat();
  if (window.SDTPet) window.SDTPet.onAnswer(q, ok, { review: petReview, self: selfGrade });
  selfGrade = false;
}
function unrecord(q, wasOk) {
  const s = store.seen[q.id]; if (s) { s.n--; if (wasOk) s.ok--; if (s.n <= 0) delete store.seen[q.id]; }
  const bt = st.session.byType[q.type]; if (bt) { bt.n--; if (wasOk) bt.ok--; }
  if (!wasOk) { st.session.wrongIds.pop(); const w = store.wrong[q.id]; if (w) { w.count--; if (w.count <= 0) delete store.wrong[q.id]; } }
  else st.session.right--;
  if (window.SDTPet) window.SDTPet.onUndo(q, wasOk);
}
function stageEl() { return $('#qstage'); }
function qNext() {
  if (qInk) { qInk.destroy(); qInk = null; if (INK()) INK().Toolbar.detach(); }
  if (st.pos >= st.deck.length) { qResult(); return; }
  st.cur = st.deck[st.pos]; st.pos++;
  const q = st.cur;
  ({ mcq: rMcq, short: rShort, ox: rOx, calc: rCalc, essay: rEssay })[q.type](q);
  const s = stageEl(); countTerms(s);
  const y = s.getBoundingClientRect().top + window.pageYOffset - 80; window.scrollTo({ top: y, behavior: 'smooth' });
}
function qHead(q) {
  const pct = Math.round((st.pos - 1) / st.deck.length * 100);
  const mock = st.mock && st.mock[q.id] ? '<span class="mocklbl">' + esc(st.mock[q.id]) + '</span>' : '';
  return '<div class="qmeta"><span>' + mock + '<span class="tag ' + q.type + '">' + TYPE_NAME[q.type] + '</span>' + (q.src ? '<span class="tag src">' + esc(srcKind(q) || q.src) + '</span>' : '') + '<span class="lvl ' + esc(q.level) + '">' + (LEVEL_NAME[q.level] || '') + '</span>' + esc(weekName(q.part)) + ', ' + esc(q.unit || '') + (q.slides ? ' <span class="muted">(' + esc(q.slides) + ')</span>' : '') + '</span>'
    + '<span class="row" style="margin:0;gap:8px"><span class="num">' + st.pos + ' / ' + st.deck.length + '</span>' + '</span></div><div class="progress"><i style="width:' + pct + '%"></i></div>';
}
const nextBtn = id => '<button class="btn primary" id="' + id + '" type="button">' + (st.pos >= st.deck.length ? '결과 보기' : '다음 문제') + '</button>';
const srcLine = q => q.src ? '<div class="muted" style="font-size:13px;margin-top:8px">출처: ' + esc(q.src) + '</div>' : '';
function mount(h) {
  const s = stageEl(); s.innerHTML = h; renderMath(s);
  const btn = null, card = null, I = null;
  if (btn && card && I && st.cur) {
    const layer = new I.Layer(card, { scrollOnFinger: true });
    layer.setKey('q/' + st.cur.id);
    qInk = layer;
    const off = () => { layer.setEnabled(false); btn.classList.remove('primary'); btn.textContent = '필기'; I.Toolbar.detach(); };
    btn.addEventListener('click', ev => {
      ev.stopPropagation();
      if (layer.enabled) { off(); return; }
      layer.setEnabled(true); btn.classList.add('primary'); btn.textContent = '필기 끄기'; I.Toolbar.attach(layer, off);
    });
  }
  return s;
}
function rMcq(q) {
  const idx = shuffle(q.c.map((_, i) => i));
  const s = mount('<div class="card">' + qHead(q) + '<div class="qtext">' + fmt(q.q) + '</div><div class="choices">' + idx.map((oi, k) => '<button class="ch" data-oi="' + oi + '" type="button"><b>' + (k + 1) + '</b><span>' + fmt(q.c[oi]) + '</span></button>').join('') + '</div><div class="expl" id="expl"></div><div class="btnrow" id="after" style="display:none">' + nextBtn('nx') + '</div></div>');
  let done = false;
  const pick = b => {
    if (done) return; done = true;
    const p = +b.dataset.oi, ok = p === q.a;
    $$('.ch', s).forEach(x => { x.disabled = true; const oi = +x.dataset.oi; if (oi === q.a) x.classList.add('correct'); else if (x === b) x.classList.add('wrong'); });
    const e = $('#expl', s); e.className = 'expl on ' + (ok ? 'good' : 'bad');
    e.innerHTML = '<span class="lbl">' + (ok ? '정답' : '오답') + '</span>' + (ok ? '' : '정답은 ' + fmt(q.c[q.a]) + '. ') + fmt(q.e || '') + srcLine(q);
    renderMath(e); countTerms(e); record(q, ok, q.c[p]); $('#after', s).style.display = 'flex';
  };
  $$('.ch', s).forEach(b => b.addEventListener('click', () => pick(b)));
  $('#nx', s).addEventListener('click', qNext);
  keyHandler(k => { if (done) { if (k === 'Enter') qNext(); return; } const n = parseInt(k, 10); const bs = $$('.ch', s); if (n >= 1 && n <= bs.length) pick(bs[n - 1]); });
}
function rOx(q) {
  const s = mount('<div class="card">' + qHead(q) + '<div class="qtext">' + fmt(q.q) + '</div><div class="oxrow"><button class="oxbtn" data-v="1" type="button">O<small>맞다</small></button><button class="oxbtn" data-v="0" type="button">X<small>틀리다</small></button></div><div class="expl" id="expl"></div><div class="btnrow" id="after" style="display:none">' + nextBtn('nx') + '</div></div>');
  let done = false;
  const pick = b => {
    if (done) return; done = true;
    const v = b.dataset.v === '1', ok = v === q.a;
    $$('.oxbtn', s).forEach(x => { x.disabled = true; if ((x.dataset.v === '1') === q.a) x.classList.add('correct'); else if (x === b) x.classList.add('wrong'); });
    const e = $('#expl', s); e.className = 'expl on ' + (ok ? 'good' : 'bad');
    e.innerHTML = '<span class="lbl">' + (ok ? '정답' : '오답') + '</span>' + (ok ? '' : '정답은 ' + (q.a ? 'O' : 'X') + '. ') + fmt(q.e || '') + srcLine(q);
    renderMath(e); countTerms(e); record(q, ok, v ? 'O' : 'X'); $('#after', s).style.display = 'flex';
  };
  $$('.oxbtn', s).forEach(b => b.addEventListener('click', () => pick(b)));
  $('#nx', s).addEventListener('click', qNext);
  keyHandler(k => { if (done) { if (k === 'Enter') qNext(); return; } if (/^[oO1]$/.test(k)) pick($$('.oxbtn', s)[0]); if (/^[xX2]$/.test(k)) pick($$('.oxbtn', s)[1]); });
}
function shortMatch(mine, q) {
  if (q.num) { const v = parseNum(mine), a = parseNum(q.a[0]); const tol = typeof q.tol === 'number' ? q.tol : 0.01; return !isNaN(v) && Math.abs(v - a) <= tol + 1e-9; }
  const m = norm(mine); if (!m) return false;
  return q.a.some(ans => { const a = norm(ans); if (!a) return false; if (m === a) return true; return a.length >= 3 && (m.indexOf(a) >= 0 || (m.length >= 3 && a.indexOf(m) >= 0 && m.length >= a.length * 0.6)); });
}
function overrideRow() { return '<span class="muted" style="font-size:13.5px">자동 채점이 틀렸다면:</span><button class="btn sm" id="markOk" type="button">맞은 걸로</button><button class="btn sm" id="markNo" type="button">틀린 걸로</button>'; }
function rShort(q) {
  const s = mount('<div class="card">' + qHead(q) + '<div class="qtext">' + fmt(q.q) + '</div><input type="text" id="ans" placeholder="답을 입력하고 확인" autocomplete="off" autocapitalize="off" spellcheck="false"><div class="btnrow"><button class="btn primary" id="chk" type="button">정답 확인</button></div><div class="expl" id="expl"></div><div class="btnrow" id="after" style="display:none">' + overrideRow() + nextBtn('nx') + '</div></div>');
  let done = false, verdict = null, mine = '';
  const show = ok => { const e = $('#expl', s); e.className = 'expl on ' + (ok ? 'good' : 'bad'); e.innerHTML = '<span class="lbl">' + (ok ? '정답' : '오답') + '</span>정답: <b>' + fmt(q.a[0]) + '</b>' + (q.a.length > 1 ? ' <span class="muted">(허용: ' + fmt(q.a.slice(1).join(', ')) + ')</span>' : '') + '<br>' + fmt(q.e || '') + srcLine(q); renderMath(e); };
  const check = () => { if (done) return; done = true; mine = $('#ans', s).value.trim(); $('#ans', s).disabled = true; verdict = shortMatch(mine, q); show(verdict); record(q, verdict, mine || '(빈 답)'); $('#after', s).style.display = 'flex'; };
  const override = ok => { if (!done || verdict === ok) return; unrecord(q, verdict); verdict = ok; selfGrade = true; show(ok); record(q, ok, mine || '(빈 답)'); toast(ok ? '맞은 걸로 기록했어요' : '틀린 걸로 기록했어요'); };
  $('#chk', s).addEventListener('click', check);
  $('#ans', s).addEventListener('keydown', ev => { if (ev.key === 'Enter') { ev.stopPropagation(); ev.preventDefault(); check(); } });
  $('#markOk', s).addEventListener('click', () => override(true));
  $('#markNo', s).addEventListener('click', () => override(false));
  $('#nx', s).addEventListener('click', qNext);
  keyHandler(k => { if (done && k === 'Enter') qNext(); });
}
function rCalc(q) {
  let h = '<div class="card">' + qHead(q) + '<div class="qtext' + enCls(q.q) + '">' + fmt(q.q) + '</div>';
  if (q.qko) h += '<div class="qko"><span class="lbl">' + (enCls(q.q) ? '한국어' : '풀어 쓰면') + '</span>' + fmt(q.qko) + '</div>';
  if (q.fig) h += '<div class="figbox">' + q.fig + '</div>';
  if (q.given) h += '<div class="given">' + fmt(q.given) + '</div>';
  h += '<div class="blanks">' + q.blanks.map((b, i) => '<label class="blank"><span class="bl">' + fmt(b.label) + '</span><input type="text" autocomplete="off" autocapitalize="off" spellcheck="false" data-i="' + i + '" placeholder="숫자, 분수 가능"><em></em></label>').join('') + '</div>'
    + '<div class="muted" style="font-size:13px;margin-top:6px">소수나 분수(0.25, 1/4)로 입력해요. 허용 오차 안이면 정답.</div>'
    + '<div class="btnrow" id="pre"><button class="btn primary" id="chk" type="button">채점하기</button><button class="btn" id="hint" type="button">풀이 한 단계씩 보기</button><button class="btn" id="giveup" type="button">모르겠어요, 풀이 보기</button></div>'
    + '<div class="expl" id="expl"></div><ol class="steps" id="steps"></ol><div class="final" id="final" style="display:none"></div>'
    + '<div class="btnrow" id="after" style="display:none">' + overrideRow() + nextBtn('nx') + '</div></div>';
  const s = mount(h);
  let done = false, verdict = null, mine = '', shown = 0;
  const showFinal = () => { const f = $('#final', s); if (f.style.display !== 'none') return; f.innerHTML = (q.answer ? '<span class="lbl">최종 답</span>' + fmt(q.answer) : '') + (q.e ? '<div style="margin-top:8px">' + fmt(q.e) + '</div>' : '') + srcLine(q); f.style.display = 'block'; renderMath(f); };
  const showStep = () => { if (shown >= q.steps.length) return false; const li = document.createElement('li'); li.innerHTML = fmt(q.steps[shown]); $('#steps', s).appendChild(li); renderMath(li); shown++; if (shown >= q.steps.length) { $('#hint', s).disabled = true; showFinal(); } return true; };
  const check = giveup => {
    if (done) return; done = true;
    let okN = 0; const vals = [];
    $$('.blank input', s).forEach(inp => {
      const b = q.blanks[+inp.dataset.i], v = parseNum(inp.value), tol = typeof b.tol === 'number' ? b.tol : 0.01;
      const ok = !giveup && !isNaN(v) && Math.abs(v - b.ans) <= tol + 1e-9; if (ok) okN++;
      vals.push(inp.value.trim() || '_'); inp.disabled = true;
      const lab = inp.parentNode; lab.classList.add(ok ? 'correct' : 'wrong'); lab.querySelector('em').textContent = ok ? '정답' : '정답 ' + fmtNum(b.ans);
    });
    verdict = okN === q.blanks.length; mine = vals.join(', ');
    const e = $('#expl', s); e.className = 'expl on ' + (verdict ? 'good' : 'bad');
    e.innerHTML = '<span class="lbl">' + (verdict ? '정답' : '오답') + '</span>' + q.blanks.length + '칸 중 ' + okN + '칸 맞았어요. 아래 풀이를 한 줄씩 따라가 보세요.';
    while (showStep()) { /* 전부 펼침 */ }
    showFinal(); $('#pre', s).style.display = 'none';
    record(q, verdict, mine); $('#after', s).style.display = 'flex';
  };
  const override = ok => { if (!done || verdict === ok) return; unrecord(q, verdict); verdict = ok; selfGrade = true; record(q, ok, mine); toast(ok ? '맞은 걸로 기록했어요' : '틀린 걸로 기록했어요'); const e = $('#expl', s); e.className = 'expl on ' + (ok ? 'good' : 'bad'); $('.lbl', e).textContent = ok ? '정답' : '오답'; };
  $('#chk', s).addEventListener('click', () => check(false));
  $('#giveup', s).addEventListener('click', () => check(true));
  $('#hint', s).addEventListener('click', showStep);
  $$('.blank input', s).forEach(inp => inp.addEventListener('keydown', ev => {
    if (ev.key !== 'Enter') return; ev.stopPropagation(); ev.preventDefault();
    const all = $$('.blank input', s), k = all.indexOf(inp); if (k < all.length - 1) all[k + 1].focus(); else check(false);
  }));
  $('#markOk', s).addEventListener('click', () => override(true));
  $('#markNo', s).addEventListener('click', () => override(false));
  $('#nx', s).addEventListener('click', qNext);
  keyHandler(k => { if (done && k === 'Enter') qNext(); });
}
function rEssay(q) {
  let h = '<div class="card">' + qHead(q) + '<div class="qtext' + enCls(q.q) + '">' + fmt(q.q) + '</div>' + (q.qko ? '<div class="qko"><span class="lbl">' + (enCls(q.q) ? '한국어' : '풀어 쓰면') + '</span>' + fmt(q.qko) + '</div>' : '')
    + '<textarea id="ans" placeholder="시험처럼 답안을 써 보세요. 다 쓰면 모범답안 항목과 대조해요."></textarea>'
    + '<div class="btnrow"><button class="btn primary" id="showKey" type="button">모범답안 보기</button><button class="btn" id="skip" type="button">건너뛰기</button></div><div class="keylist" id="keylist">';
  if (q.answer) h += '<div class="model"><span class="lbl">모범답안</span>' + fmt(q.answer) + (q.answer_ko ? '<div class="ko">' + fmt(q.answer_ko) + '</div>' : '') + '</div>';
  h += '<h4>답안에 들어가야 할 핵심 항목 ' + q.points.length + '개. 내가 쓴 항목을 눌러 체크해요. 70% 이상이면 통과.</h4>'
    + q.points.map((p, i) => '<label class="kitem" data-i="' + i + '"><input type="checkbox"><span>' + fmt(p) + '</span></label>').join('')
    + '<div class="score" id="score">체크 0 / ' + q.points.length + '</div><div class="btnrow"><button class="btn sm" id="allC" type="button">전부 체크</button><button class="btn sm" id="noneC" type="button">전부 해제</button><button class="btn primary" id="grade" type="button">채점하고 다음 문제</button></div>' + srcLine(q) + '</div></div>';
  const s = mount(h);
  const checked = () => $$('.kitem input', s).filter(i => i.checked).length;
  const upd = () => { const n = checked(), t = q.points.length, r = n / t; let m = '체크 ' + n + ' / ' + t; if (n === t) m += ', 전부 썼어요'; else if (r >= ESSAY_PASS) m += ', 통과 (빠진 항목 한 번 더 읽기)'; else if (n > 0) m += ', 오답노트에 기록돼요'; $('#score', s).textContent = m; };
  $('#showKey', s).addEventListener('click', () => { $('#keylist', s).classList.add('on'); countTerms($('#keylist', s)); $('#keylist', s).scrollIntoView({ behavior: 'smooth', block: 'nearest' }); });
  $('#skip', s).addEventListener('click', qNext);
  $$('.kitem', s).forEach(el => el.addEventListener('change', () => { el.classList.toggle('checked', el.querySelector('input').checked); upd(); }));
  $('#allC', s).addEventListener('click', () => { $$('.kitem', s).forEach(el => { el.querySelector('input').checked = true; el.classList.add('checked'); }); upd(); });
  $('#noneC', s).addEventListener('click', () => { $$('.kitem', s).forEach(el => { el.querySelector('input').checked = false; el.classList.remove('checked'); }); upd(); });
  $('#grade', s).addEventListener('click', () => {
    const n = checked(), t = q.points.length, r = n / t, ok = r >= ESSAY_PASS;
    const missing = []; $$('.kitem', s).forEach((el, i) => { if (!el.querySelector('input').checked) missing.push(q.points[i]); });
    st.session.essaySum += r; st.session.essayN++;
    record(q, ok, $('#ans', s).value.trim() || '(답안 없음)', missing); qNext();
  });
  keyHandler(null);
}
function qResult() {
  if (window.SDTPet) window.SDTPet.onSetEnd(st.session);
  const ss = st.session, pct = ss.total ? Math.round(ss.right / ss.total * 100) : 0;
  if (st.mock) { store.mockDone[st.scope] = true; save(); }
  let h = '<div class="card result"><div class="muted" style="font-weight:450">' + (st.mock ? '모의고사 결과' : '이번 세트 결과') + '</div><div class="big num">' + pct + '<small>%</small></div><p>' + ss.total + '문항 중 ' + ss.right + '문항 통과' + (ss.essayN ? ', 서술 평균 포함률 ' + Math.round(ss.essaySum / ss.essayN * 100) + '%' : '') + '</p><div class="bytype">'
    + Object.keys(ss.byType).map(t => '<span class="num">' + TYPE_NAME[t] + ' ' + ss.byType[t].ok + ' / ' + ss.byType[t].n + '</span>').join('') + '</div>';
  if (ss.wrongIds.length) h += '<div style="text-align:left;max-width:640px;margin:0 auto 16px"><b style="font-size:14px">틀린 문제 ' + ss.wrongIds.length + '개</b><ul style="margin-top:6px;font-size:14.5px">' + ss.wrongIds.map(id => { const q = BY_ID[id]; return q ? '<li><span class="tag ' + q.type + '">' + TYPE_NAME[q.type] + '</span>' + fmt(q.type === 'essay' && q.qko ? q.qko : q.q) + '</li>' : ''; }).join('') + '</ul></div>';
  const back = st.scope !== 'all' ? '#/week/' + st.scope : '#/';
  h += '<div class="btnrow">' + (ss.wrongIds.length ? '<button class="btn primary" id="againWrong" type="button">방금 틀린 것만 다시</button>' : '') + '<button class="btn' + (ss.wrongIds.length ? '' : ' primary') + '" id="againNew" type="button">같은 조건으로 새로 뽑기</button><a class="btn" href="' + back + '">길잡이로 돌아가기</a></div></div>';
  const s = mount(h); keyHandler(null);
  const ids = ss.wrongIds.slice(), mock = st.mock;
  if (ids.length) $('#againWrong', s).addEventListener('click', () => { const n = st.n; st.n = 0; startDeck(ids.map(i => BY_ID[i]).filter(Boolean)); st.n = n; });
  $('#againNew', s).addEventListener('click', () => { if (mock) startMock(); else startDeck(pool()); });
}

/* ---------- 모의고사 ---------- */
function pageMock(query) {
  const q = qs(query);
  st.scope = q.week || 'all'; st.level = q.level || 'all'; st.type = 'all'; st.mode = 'all'; st.unit = ''; st.n = 0;
  const weekOpts = [['all', '전체']].concat(META.weeks.filter(w => weekQuizStat(w.id).total).map(w => [w.id, w.short]));
  APP().innerHTML = '<div class="whead" style="padding-top:22px"><div class="eyebrow">시험지처럼</div><h1>모의고사</h1><p>' + esc(META.mockDesc || '시험지처럼 여러 유형이 섞여 나와요. 먼저 오답노트에서 틀린 것을 다시 풀고 오면 좋아요.') + '</p></div>'
    + '<div class="card" style="margin-top:14px">' + chipRow('범위', 'scope', weekOpts, st.scope) + chipRow('난이도', 'level', [['all', '전체'], ['basic', '기본'], ['hard', '심화']], st.level)
    + '<div class="btnrow"><button class="btn primary" id="mockGo" type="button">모의고사 시작</button><a class="btn" href="#/wrong">오답노트 먼저</a></div></div><div id="qstage"></div>';
  $$('[data-scope]').forEach(b => b.addEventListener('click', () => { $$('[data-scope]').forEach(x => x.classList.remove('on')); b.classList.add('on'); st.scope = b.dataset.scope; }));
  $$('[data-level]').forEach(b => b.addEventListener('click', () => { $$('[data-level]').forEach(x => x.classList.remove('on')); b.classList.add('on'); st.level = b.dataset.level; }));
  $('#mockGo').addEventListener('click', startMock);
  cleanup = () => keyHandler(null);
}
function startMock() {
  if (META.mock) {
    const base = BANK.filter(q => (st.scope === 'all' || q.part === st.scope) && (st.level === 'all' || q.level === st.level) && q.unit !== '용어');
    const deck = [], label = {};
    Object.keys(META.mock).forEach(t => { shuffle(base.filter(q => q.type === t)).slice(0, META.mock[t]).forEach(q => deck.push(q)); });
    if (deck.length < 5) { toast('모의고사를 만들 문제가 부족해요. 범위를 넓혀 보세요'); return; }
    deck.forEach((q, i) => { label[q.id] = '모의고사 ' + (i + 1) + '번'; });
    toast(deck.length + '문항으로 시작해요');
    startDeck(deck, true, label);
    return;
  }
  const list = BANK.filter(q => (st.scope === 'all' || q.part === st.scope) && (st.level === 'all' || q.level === st.level) && q.model && (q.type === 'calc' || q.type === 'essay'));
  const models = {};
  list.forEach(q => { const m = models[q.model] || (models[q.model] = { calc: [], essay: [], part: q.part }); m[q.type].push(q); });
  let keys = Object.keys(models).filter(k => models[k].calc.length && models[k].essay.length);
  if (keys.length < 2) { toast('모의고사를 만들 모델이 부족해요. 범위나 난이도를 넓혀 보세요'); return; }
  keys = shuffle(keys).slice(0, 12).sort((a, b) => (models[a].part > models[b].part ? 1 : models[a].part < models[b].part ? -1 : 0) || (a > b ? 1 : -1));
  const deck = [], label = {};
  keys.forEach((k, i) => {
    const e = shuffle(models[k].essay.slice())[0], c = shuffle(models[k].calc.slice())[0];
    deck.push(e); label[e.id] = '모의고사 ' + (i + 1) + '번 (' + k + ') a';
    deck.push(c); label[c.id] = '모의고사 ' + (i + 1) + '번 (' + k + ') b';
  });
  toast(keys.length + '개 모델, ' + deck.length + '문항으로 시작해요');
  startDeck(deck, true, label);
}

/* ---------- 오답노트 ---------- */
const wf = { type: 'all', resolved: false };
function pageWrong() {
  APP().innerHTML = '<div class="whead" style="padding-top:22px"><div class="eyebrow">다시 보기</div><h1>오답노트</h1><p>틀린 문제, 70% 미만으로 쓴 서술, 한 칸이라도 틀린 계산이 쌓여요. 다시 풀어 맞히면 해결로 바뀌어요.</p></div>'
    + '<div class="sum" id="wsum" style="margin-top:14px"></div><div class="card" id="weakCard" style="display:none"><b>자주 틀리는 단원</b><div class="weak" id="weak"></div></div>'
    + '<div class="row" style="margin-top:16px"><span class="cap">유형</span>' + [['all', '전체'], ['calc', '계산'], ['essay', '서술'], ['mcq', '객관식'], ['short', '주관식'], ['ox', 'O/X']].map(o => '<button class="chip' + (wf.type === o[0] ? ' on' : '') + '" data-wtype="' + o[0] + '" type="button">' + o[1] + '</button>').join('')
    + '<button class="chip' + (wf.resolved ? ' on' : '') + '" id="showResolved" type="button">해결된 것도 보기</button></div>'
    + '<div class="btnrow" style="margin-bottom:16px"><button class="btn primary" id="retryWrong" type="button">오답만 다시 풀기</button><button class="btn danger" id="clearWrong" type="button">오답 전부 비우기</button></div>'
    + '<div id="wlist" class="stack"></div><div id="qstage"></div>';
  $$('[data-wtype]').forEach(b => b.addEventListener('click', () => { wf.type = b.dataset.wtype; pageWrong(); }));
  $('#showResolved').addEventListener('click', () => { wf.resolved = !wf.resolved; pageWrong(); });
  $('#retryWrong').addEventListener('click', () => {
    const l = wrongItems().filter(x => !x.w.resolved && (wf.type === 'all' || x.q.type === wf.type)).map(x => x.q);
    if (!l.length) { toast('다시 풀 오답이 없어요'); return; }
    $('#wlist').innerHTML = ''; const n = st.n; st.n = 0; startDeck(l); st.n = n;
  });
  $('#clearWrong').addEventListener('click', () => { if (!confirm('오답노트를 전부 비웁니다. 계속할까요?')) return; store.wrong = {}; saveNow(); syncPushSoon(); pageWrong(); updateBadges(); });
  renderWrongList();
  cleanup = () => keyHandler(null);
}
function wrongItems() {
  return Object.keys(store.wrong).map(id => BY_ID[id] ? { q: BY_ID[id], w: store.wrong[id] } : null).filter(Boolean)
    .sort((a, b) => (a.w.resolved - b.w.resolved) || (b.w.count - a.w.count) || (b.w.ts - a.w.ts));
}
function renderWrongList() {
  const items = wrongItems(), open = items.filter(x => !x.w.resolved);
  const c = { calc: 0, essay: 0, mcq: 0, short: 0, ox: 0 }; open.forEach(x => { c[x.q.type]++; });
  $('#wsum').innerHTML = '<div class="box"><div class="n num">' + open.length + '</div><div class="l">남은 오답</div></div>' + ['calc', 'essay', 'mcq', 'short', 'ox'].map(t => '<div class="box"><div class="n num">' + c[t] + '</div><div class="l">' + TYPE_NAME[t] + '</div></div>').join('');
  const units = {}; open.forEach(x => { const u = weekName(x.q.part) + ' ' + (x.q.unit || ''); units[u] = (units[u] || 0) + x.w.count; });
  const uk = Object.keys(units).sort((a, b) => units[b] - units[a]).slice(0, 6);
  if (uk.length) { const mx = units[uk[0]]; $('#weakCard').style.display = 'block'; $('#weak').innerHTML = uk.map(u => '<div><span>' + esc(u) + '</span><span class="bar"><i style="width:' + Math.round(units[u] / mx * 100) + '%"></i></span><span class="muted num">' + units[u] + '회</span></div>').join(''); }
  const list = items.filter(x => (wf.type === 'all' || x.q.type === wf.type) && (wf.resolved || !x.w.resolved));
  if (!list.length) { $('#wlist').innerHTML = '<div class="empty"><b>' + (items.length ? '조건에 맞는 오답이 없어요' : '아직 오답이 없어요') + '</b>문제를 풀면 틀린 문항이 여기에 쌓여요.</div>'; return; }
  $('#wlist').innerHTML = list.map(x => {
    const q = x.q, w = x.w;
    let h = '<div class="witem' + (w.resolved ? ' resolved' : '') + '" data-id="' + esc(q.id) + '"><span class="tag ' + q.type + '">' + TYPE_NAME[q.type] + '</span>' + (q.src ? '<span class="tag src">' + esc(srcKind(q) || q.src) + '</span>' : '') + '<span class="lvl ' + esc(q.level) + '">' + (LEVEL_NAME[q.level] || '') + '</span><span class="muted" style="font-size:12.5px">' + esc(weekName(q.part)) + ', ' + esc(q.unit || '') + '</span><div class="wq">' + fmt(q.q) + '</div>';
    if (q.type === 'essay') {
      if (q.qko) h += '<div class="wline"><b>뜻</b>' + fmt(q.qko) + '</div>';
      h += '<div class="wline"><b>내 답안</b><span class="mine">' + esc((w.lastAnswer || '').slice(0, 240)) + '</span></div>';
      if (w.missing && w.missing.length) h += '<div class="wline"><b>빠진 항목</b></div><ul>' + w.missing.map(m => '<li>' + fmt(m) + '</li>').join('') + '</ul>';
      if (q.answer) h += '<details><summary>모범답안</summary><div class="model">' + fmt(q.answer) + (q.answer_ko ? '<div class="ko">' + fmt(q.answer_ko) + '</div>' : '') + '</div></details>';
    } else if (q.type === 'calc') {
      h += '<div class="wline"><b>내 답</b><span class="mine">' + esc(w.lastAnswer || '') + '</span></div><div class="wline"><b>정답</b><span class="ans">' + q.blanks.map(b => fmt(b.label) + ' = ' + fmtNum(b.ans)).join(', ') + '</span></div>'
        + '<details><summary>단계별 풀이</summary><ol class="steps">' + q.steps.map(x2 => '<li>' + fmt(x2) + '</li>').join('') + '</ol>' + (q.e ? '<div class="final">' + fmt(q.e) + '</div>' : '') + '</details>';
    } else {
      const ans = q.type === 'mcq' ? q.c[q.a] : q.type === 'ox' ? (q.a ? 'O' : 'X') : q.a[0];
      h += '<div class="wline"><b>내 답</b><span class="mine">' + fmt(w.lastAnswer || '') + '</span></div><div class="wline"><b>정답</b><span class="ans">' + fmt(ans) + '</span></div>' + (q.e ? '<div class="wline"><b>해설</b>' + fmt(q.e) + '</div>' : '');
    }
    return h + '<div class="wfoot"><button class="btn sm" data-act="one" type="button">이 문제 풀기</button><button class="btn sm" data-act="res" type="button">' + (w.resolved ? '다시 열기' : '해결됨으로') + '</button><button class="btn sm danger" data-act="del" type="button">삭제</button><span class="cnt num">' + w.count + '번 틀림</span></div></div>';
  }).join('');
  renderMath($('#wlist'));
  $$('.witem [data-act]').forEach(b => b.addEventListener('click', () => {
    const id = b.closest('.witem').dataset.id, w = store.wrong[id];
    if (b.dataset.act === 'del') { delete store.wrong[id]; save(); renderWrongList(); updateBadges(); }
    else if (b.dataset.act === 'res') { w.resolved = !w.resolved; save(); renderWrongList(); updateBadges(); }
    else { $('#wlist').innerHTML = ''; const n = st.n; st.n = 0; startDeck([BY_ID[id]]); st.n = n; }
  }));
}

/* ---------- 가리고 설명하기 (RECALL 블록 시작): 슬라이드의 중요한 말을 단계별로 가리고 혼자 설명하기.
   데이터는 data/recall_<덱>.js (tools/recall_build.py -> build_site.py). 기록은 store.recall[덱] = { s1: {i, max, done}, s2, s3, secs: {번호: 시각} }
   바깥에 붙인 곳: routes 의 #/recall, weekSteps 끝의 recallStep, pageWeek 끝의 recallTiles, renderFrame 의 case 'recall', schedule 의 자동 넘김 제외 ---------- */
const RC_NAME = ['', '1단계', '2단계', '3단계', '마지막 단계'];
const RC_TITLE = ['', '핵심 말만 가리기', '더 가리기', '많이 가리기', '소단원 이름만'];
const RC_DESC = ['', '정말 중요한 말만 쪽마다 몇 개씩 가렸어요.', '1단계의 두 배쯤 가렸어요.', '세 배쯤 가렸어요. 제목 속 말도 가려요.', '소단원 이름만 보고 흐름 전체를 설명해요.'];
const recallInfo = deck => ((META.decks || {})[deck] || {}).recall || null;
const recallData = deck => (window.SDT_RECALL || window.GNN_RECALL || {})[deck] || null;
function recallRec(deck) { store.recall = store.recall || {}; return (store.recall[deck] = store.recall[deck] || {}); }
function recallDone(deck, n) {
  const r = (store.recall || {})[deck] || {}, info = recallInfo(deck);
  if (n === 4) return !!(info && info.secs && Object.keys(r.secs || {}).length >= info.secs);
  return !!(r['s' + n] || {}).done;
}
function recallNext(deck) { return [1, 2, 3, 4].find(n => !recallDone(deck, n)) || 1; }
/* 길잡이 마지막 순서 (잠그지 않고 기출 다음에 둔다) */
function recallStep(w, steps) {
  const info = w && w.deck ? recallInfo(w.deck) : null; if (!info) return;
  const got = [1, 2, 3, 4].filter(n => recallDone(w.deck, n)).length;
  steps.push({ t: '가리고 설명하기', d: '기출까지 풀고 나서 해요. 슬라이드의 중요한 말을 가려 두고 혼자 설명해 봐요. 마지막에는 소단원 이름만 보고 설명해요.', done: got === 4, href: '#/recall/' + w.deck + '/' + recallNext(w.deck), meta: got + ' / 4단계' });
}
/* 주차 페이지의 단계 타일 */
function recallTiles(week) {
  const w = weekOf(week), info = w && w.deck ? recallInfo(w.deck) : null; if (!info) return '';
  const r = (store.recall || {})[w.deck] || {};
  return '<h2 class="sec">가리고 설명하기 <small>기출까지 풀고 나서 해요</small></h2><div class="ptiles rctiles">' + [1, 2, 3, 4].map(n => {
    const dn = recallDone(w.deck, n), s = r['s' + n] || {}, said = Object.keys(r.secs || {}).length;
    const state = dn ? '다 했어요' : n < 4 ? (s.max ? s.max + '쪽까지 봤어요' : '가린 말 ' + info.n[n - 1] + '개') : (said ? said + ' / ' + info.secs + ' 설명했어요' : '소단원 ' + info.secs + '개');
    return '<a class="ptile' + (dn ? ' done' : '') + '" href="#/recall/' + w.deck + '/' + n + '"><span class="pn">' + RC_NAME[n] + '</span><span class="pt">' + RC_TITLE[n] + '</span><span class="pd">' + RC_DESC[n] + '</span><span class="pf"><span class="num">' + esc(state) + '</span></span></a>';
  }).join('') + '</div>';
}
async function pageRecall(deck, stageStr, subStr) {
  const w = META.weeks.find(x => x.deck === deck), week = w ? w.id : '';
  const back = week ? '#/week/' + week : '#/';
  const d = META.decks[deck];
  if (!d || !recallInfo(deck)) { location.replace(back); return; }
  if (!stageStr) { location.replace('#/recall/' + deck + '/' + recallNext(deck)); return; }
  $$('#nav .tab').forEach(t => t.classList.toggle('on', t.dataset.nav === 'w' + week));
  if (!recallData(deck)) {
    APP().innerHTML = '<div class="empty"><b>슬라이드를 불러오는 중</b></div>';
    try { await loadScript('data/recall_' + deck + '.js'); } catch (e) { /* 아래에서 안내 */ }
    if ((location.hash || '').indexOf('#/recall/' + deck + '/') !== 0) return;   // 불러오는 사이 다른 화면으로 갔으면 그만
  }
  const R = recallData(deck);
  if (!R) { APP().innerHTML = '<div class="empty"><b>아직 준비되지 않았어요</b><a class="btn" href="' + back + '">돌아가기</a></div>'; return; }
  const stage = +stageStr, rec = recallRec(deck);
  const chips = [1, 2, 3, 4].map(n => '<a class="chip' + (n === stage ? ' on' : '') + '" href="#/recall/' + deck + '/' + n + '">' + RC_NAME[n] + '</a>').join('');
  const secs = [];
  (R.sections || []).forEach(c => (c.items || []).forEach(it => secs.push(it)));
  if (stage === 4 && !subStr) { recallList(deck, d, R, chips, back); return; }
  let from = 1, to = R.pages.length, sec = null, k = 0;
  if (stage === 4) {
    k = +subStr; sec = secs[k - 1];
    if (!sec) { location.replace('#/recall/' + deck + '/4'); return; }
    from = sec.p[0]; to = sec.p[1]; rec.lastSec = k; save();
  }
  const frames = [];
  for (let p = from; p <= to; p++) frames.push({ kind: 'recall', deck, ar: R.ar, _p: p, lv: stage < 4 ? stage : 0, masks: stage < 4 ? (R.pages[p - 1] || []).filter(m => m[4] <= stage) : [] });
  if (stage < 4) frames.push({ kind: 'end', big: '가리고 설명하기 ' + RC_NAME[stage] + ' 끝', sub: stage < 3 ? '가린 말을 떠올리며 설명이 됐나요? 다음 단계는 더 많이 가려요.' : '이제 소단원 이름만 보고 흐름 전체를 설명해 봐요.', links: [[RC_NAME[stage + 1] + ' 시작', '#/recall/' + deck + '/' + (stage + 1)], ['길잡이로 돌아가기', back]] });
  else frames.push({ kind: 'end', big: sec.t, sub: '내가 설명한 흐름과 맞았나요? 목록에서 "설명했어요"를 눌러 표시해요.', links: [['소단원 목록으로', '#/recall/' + deck + '/4'], secs[k] ? ['다음 소단원 원래 슬라이드', '#/recall/' + deck + '/4/' + (k + 1)] : ['길잡이로 돌아가기', back]] });
  const r = stage < 4 ? (rec['s' + stage] = rec['s' + stage] || {}) : null;
  const start = r && r.i && r.i < frames.length - 1 ? r.i : 0;
  startPlayer({
    frames, groups: frames.map((f, i) => ({ start: i, end: i })), start,
    backHref: stage === 4 ? '#/recall/' + deck + '/4' : back,
    chips,
    imgOf: () => '',
    inkKey: () => null,
    title: f => esc(d.title) + ' <small>가리고 설명하기 ' + RC_NAME[stage] + (sec ? ', ' + esc(sec.t) : '') + (f._p ? ', p.' + f._p : '') + '</small>',
    onProgress: i => {
      if (!r) return;
      const f = frames[i];
      r.i = i; if (f._p) r.max = Math.max(r.max || 0, f._p);
      if (i === frames.length - 1) r.done = true;
      store.last = { href: '#/recall/' + deck + '/' + stage, label: d.title + ' 가리고 설명하기' };
      save();
    },
    onEnd: () => { location.hash = back; },
  });
  const ac = $('#autoChip'); if (ac) ac.hidden = true;
  const hint = $('#phint');
  if (hint) hint.textContent = stage < 4 ? '가린 칸을 누르면 말이 보이고, 한 번 더 누르면 다시 가려요. 쪽은 아래 버튼, 옆으로 밀기, 방향키로 넘겨요. 가운데 쪽 번호를 누르면 원하는 쪽으로 가요.' : '가리지 않은 원래 슬라이드예요. 내가 설명한 흐름과 맞는지 확인해요.';
  if (start > 0) toast('지난번 본 곳(p.' + frames[start]._p + ')부터 이어서 봐요');
}
/* 마지막 단계: 소단원 이름만 */
function recallList(deck, d, R, chips, back) {
  const rec = recallRec(deck); rec.secs = rec.secs || {};
  let k = 0;
  let h = '<a class="back" href="' + back + '">주차로 돌아가기</a><div class="whead"><div class="eyebrow">가리고 설명하기, 마지막 단계</div><h1>' + esc(d.title) + '</h1>'
    + '<p>소단원 이름만 보고, 그 안에서 배운 내용을 순서대로 소리 내어 설명해요. 다 말했으면 원래 슬라이드를 열어 맞는지 확인하고 "설명했어요"를 눌러요.</p></div>'
    + '<div class="pillrow">' + chips + '</div><div class="rclist">';
  (R.sections || []).forEach(c => {
    h += '<section class="rcch"><h2 class="sec">' + esc(c.t) + '</h2><ol class="rcsecs">';
    (c.items || []).forEach(it => {
      k++;
      const on = !!rec.secs[k], pr = 'p.' + it.p[0] + (it.p[1] > it.p[0] ? '~' + it.p[1] : '');
      h += '<li class="rcsec' + (on ? ' done' : '') + '" id="rcs' + k + '"><span class="rcno num">' + k + '</span><span class="rcname">' + esc(it.t) + '</span><span class="rcact">'
        + '<a class="btn sm" href="#/recall/' + deck + '/4/' + k + '">원래 슬라이드 <span class="num">' + pr + '</span></a>'
        + '<button class="chip rcsaid' + (on ? ' on' : '') + '" type="button" data-k="' + k + '" aria-pressed="' + on + '">' + (on ? '설명했어요' : '설명했으면 눌러요') + '</button></span></li>';
    });
    h += '</ol></section>';
  });
  APP().innerHTML = h + '</div>';
  $$('.rcsaid').forEach(b => b.addEventListener('click', () => {
    const kk = b.dataset.k, on = !rec.secs[kk];
    if (on) rec.secs[kk] = Date.now(); else delete rec.secs[kk];
    save();
    b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); b.textContent = on ? '설명했어요' : '설명했으면 눌러요';
    b.closest('.rcsec').classList.toggle('done', on);
    const info = recallInfo(deck);
    if (on && info && Object.keys(rec.secs).length === info.secs) toast('소단원을 전부 설명했어요');
  }));
  const last = rec.lastSec && $('#rcs' + rec.lastSec);
  if (last && last.scrollIntoView) { try { last.scrollIntoView({ block: 'center' }); } catch (e) { /* 무시 */ } }
}
/* 플레이어 장면: 슬라이드 그림 위에 가린 칸 */
function recallFrame(f) {
  const ms = f.masks || [];
  const pct = x => (Math.round(x * 100000) / 1000) + '%';
  const html = '<div class="rcwrap" style="--ar:' + (+f.ar || 1.414) + '"><div class="rcimg"><img src="img/' + esc(f.deck) + '/p' + pad3(f._p) + '.jpg" alt="p.' + f._p + ' 슬라이드" decoding="async" draggable="false">'
    + ms.map(m => '<button type="button" class="rcm" style="left:' + pct(m[0]) + ';top:' + pct(m[1]) + ';width:' + pct(m[2]) + ';height:' + pct(m[3]) + '" aria-pressed="false" aria-label="가린 말, 누르면 보여요" data-t="' + esc(m[5] || '') + '"></button>').join('')
    + '</div><div class="rcbar"><span class="rccap num">p.' + f._p + (f.lv ? (ms.length ? ', 가린 말 ' + ms.length + '개 중 <b class="rcopen">0</b>개 봤어요' : ', 이 쪽은 가린 말이 없어요') : '') + '</span>'
    + (ms.length ? '<button type="button" class="btn sm rcall">전부 보기</button>' : '') + '</div></div>';
  return {
    html, steps: 0,
    after: el => {
      const box = $('.rcimg', el); if (!box) return;
      const btns = $$('.rcm', box), all = $('.rcall', el), cnt = $('.rcopen', el);
      const set = (b, on) => { b.classList.toggle('open', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); b.setAttribute('aria-label', on ? b.dataset.t + ', 누르면 다시 가려요' : '가린 말, 누르면 보여요'); };
      const sync = () => { const n = btns.filter(b => b.classList.contains('open')).length; if (cnt) cnt.textContent = n; if (all) all.textContent = n === btns.length ? '다시 가리기' : '전부 보기'; };
      box.addEventListener('click', e => { e.stopPropagation(); const b = e.target.closest('.rcm'); if (!b) return; set(b, !b.classList.contains('open')); sync(); });
      btns.forEach(b => b.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') e.stopPropagation(); }));
      const bar = $('.rcbar', el); if (bar) bar.addEventListener('click', e => e.stopPropagation());
      if (all) all.addEventListener('click', e => { e.stopPropagation(); const open = btns.some(b => !b.classList.contains('open')); btns.forEach(b => set(b, open)); sync(); });
    },
  };
}
/* ---------- (RECALL 블록 끝) ---------- */

/* ---------- 기출 분석, 답안 팁 ---------- */
function pageStatic(name) {
  const html = (window.SDT_PAGES || {})[name] || '<div class="empty"><b>준비 중</b></div>';
  APP().innerHTML = '<div class="wrap" id="' + name + '">' + html + '</div>';
  renderMath(APP());
  countTerms(APP());
}

/* ---------- 정리노트, 연표 (meta.lazyPages 에 있을 때만. data/page_<이름>.js 를 그 화면을 열 때 읽는다) ---------- */
function hasLazy(name) { return (META.lazyPages || []).indexOf(name) >= 0; }
function noteSecsOf(week) { return hasLazy('note') ? ((META.noteSections || {})[week] || []) : []; }
function noteTitle(id) { return (META.noteTitles || {})[id] || id; }
function noteRead(id) { return !!(store.notesRead && store.notesRead[id]); }
async function lazyPage(name) {
  if ((window.SDT_PAGES_LAZY || {})[name] == null) { try { await loadScript('data/page_' + name + '.js'); } catch (e) { /* 아래에서 준비 중 안내 */ } }
  return (window.SDT_PAGES_LAZY || {})[name];
}
const lazyMissing = () => '<div class="empty"><b>아직 준비되지 않았어요</b><a class="btn" href="#/">홈으로</a></div>';
let noteRoot = null;   // 그림이 든 큰 페이지라 한 번 만든 화면을 다시 붙여 쓴다
const noteSecs = root => Array.from(root.children).filter(el => el.tagName === 'SECTION' && el.id);
const noteSec = (root, id) => noteSecs(root).find(s => s.id === id) || null;
const hdrH = () => { const hd = $('#hdr'); return hd ? hd.offsetHeight : 0; };
let noteIgnoreScroll = 0;
function noteScrollTo(el) {
  if (!el) return;
  noteIgnoreScroll = Date.now() + 900;
  window.scrollTo({ top: Math.max(0, el.getBoundingClientRect().top + window.pageYOffset - hdrH() - 12), behavior: 'auto' });
}
function markNoteRead(id) {
  if (!id || noteRead(id)) return;
  store.notesRead[id] = Date.now();
  save();
  if (noteRoot) noteSync(noteRoot);
  toast(noteTitle(id) + ', 다 읽었어요');
  window.dispatchEvent(new CustomEvent('sdt:read', { detail: { id: id } }));
}
function buildNote(html) {
  const box = document.createElement('div');
  box.innerHTML = html;
  const root = box.querySelector('section#note') || box;
  root.id = 'note';
  root.classList.remove('panel');
  $$('.notebar, .onlybar', root).forEach(el => el.remove());
  const oldToc = root.querySelector('#toc'); if (oldToc) oldToc.remove();
  let toc = '';
  Array.from(root.children).forEach(el => {
    if (el.tagName === 'H1' && el.classList.contains('part')) toc += '<span class="tocpart">' + esc(el.textContent) + '</span>';
    else if (el.tagName === 'SECTION' && el.id) {
      const h2 = el.querySelector('h2');
      toc += '<button class="tocbtn" type="button" data-go="' + esc(el.id) + '">' + esc(h2 ? h2.textContent : noteTitle(el.id)) + '</button>';
      const rb = document.createElement('div');
      rb.className = 'readbar';
      rb.innerHTML = '<button class="btn sm readbtn" type="button" data-read="' + esc(el.id) + '">다 읽었어요</button><button class="btn sm onlynext" type="button" data-only="next">다음 항목</button>';
      el.appendChild(rb);
    }
  });
  const chip = (attr, val, label) => '<button class="chip" type="button" ' + attr + '="' + val + '">' + label + '</button>';
  const head = document.createElement('div');
  head.className = 'notehead';
  head.innerHTML = '<div class="whead"><div class="eyebrow">' + esc(META.name || '') + '</div><h1>정리노트</h1><p>쉬운 설명으로 감을 잡고, 원문으로 시험에 쓸 문장을 확인해요. 항목 끝까지 읽거나 "다 읽었어요" 를 누르면 읽음으로 표시돼요.</p></div>'
    + '<div class="notebar"><span class="nlbl">보기</span>' + chip('data-nmode', 'both', '쉬운 설명 + 원문') + chip('data-nmode', 'easy', '쉬운 설명만') + chip('data-nmode', 'orig', '원문만')
    + '<span class="nlbl">목차 누르면</span>' + chip('data-tocmode', 'go', '그 자리로 이동') + chip('data-tocmode', 'only', '그 항목만 보기') + '<span class="nprog num"></span></div>'
    + '<nav id="toc" aria-label="정리노트 목차"><span class="lbl">목차</span>' + toc + '</nav>'
    + '<div class="onlybar"><button class="btn sm" type="button" data-only="prev">이전</button><b class="onlyname"></b><button class="btn sm" type="button" data-only="next">다음</button><button class="btn sm" type="button" data-only="all">전체 보기</button></div>';
  root.insertBefore(head, root.firstChild);
  root.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b || !root.contains(b)) return;
    if (b.dataset.nmode) { store.pref.noteView = b.dataset.nmode; save(); noteSync(root); }
    else if (b.dataset.tocmode) {
      store.pref.noteToc = b.dataset.tocmode; save();
      if (b.dataset.tocmode === 'go') noteShowAll(root);
      else { const h = hdrH(); const cur = noteSecs(root).find(s => s.getBoundingClientRect().bottom > h + 40) || noteSecs(root)[0]; if (cur) noteShowOnly(root, cur.id, true); }
      noteSync(root);
    } else if (b.dataset.go) {
      const id = b.dataset.go;
      if (store.pref.noteToc === 'only') { noteShowOnly(root, id, true); noteScrollTo(root.querySelector('.onlybar')); }
      else { noteShowAll(root); noteScrollTo(noteSec(root, id)); noteSetHash(id); }
    } else if (b.dataset.only) {
      if (b.dataset.only === 'all') { noteShowAll(root); noteSetHash(''); return; }
      const secs = noteSecs(root), i = secs.findIndex(s => s.id === (root.dataset.cur || '')), own = b.closest('section');
      const from = root.classList.contains('only') || !own ? i : secs.indexOf(own);
      const n = from + (b.dataset.only === 'next' ? 1 : -1);
      if (n < 0 || n >= secs.length) return;
      if (root.classList.contains('only')) { noteShowOnly(root, secs[n].id, true); noteScrollTo(root.querySelector('.onlybar')); }
      else { noteScrollTo(secs[n]); noteSetHash(secs[n].id); }
    } else if (b.dataset.read) markNoteRead(b.dataset.read);
  });
  return root;
}
function noteSetHash(id) {
  const h = '#/note' + (id ? '/' + id : '');
  if (location.hash !== h && history.replaceState) history.replaceState(null, '', h);
  if (id) { store.last = { href: h, label: '정리노트 ' + noteTitle(id).slice(0, 20) }; save(); }
}
function noteShowAll(root) {
  root.classList.remove('only');
  delete root.dataset.cur;
  Array.from(root.children).forEach(el => el.classList.remove('show'));
  $$('.tocbtn', root).forEach(x => x.classList.remove('on'));
  $$('[data-only]', root).forEach(x => { x.disabled = false; });
}
function noteShowOnly(root, id, setHash) {
  const el = noteSec(root, id); if (!el) return;
  root.classList.add('only');
  root.dataset.cur = id;
  Array.from(root.children).forEach(c => c.classList.remove('show'));
  el.classList.add('show');
  let p = el.previousElementSibling;
  while (p && !(p.tagName === 'H1' && p.classList.contains('part'))) p = p.previousElementSibling;
  if (p) p.classList.add('show');
  $$('.tocbtn', root).forEach(x => x.classList.toggle('on', x.dataset.go === id));
  const h2 = el.querySelector('h2'), nm = root.querySelector('.onlyname');
  if (nm) nm.textContent = h2 ? h2.textContent : noteTitle(id);
  const secs = noteSecs(root), i = secs.indexOf(el);
  $$('.onlybar [data-only="prev"]', root).forEach(x => { x.disabled = i <= 0; });
  $$('[data-only="next"]', root).forEach(x => { x.disabled = i >= secs.length - 1; });
  if (setHash) noteSetHash(id);
}
function noteSync(root) {
  const v = store.pref.noteView || 'both', tm = store.pref.noteToc || 'go';
  root.classList.toggle('easyonly', v === 'easy');
  root.classList.toggle('origonly', v === 'orig');
  $$('[data-nmode]', root).forEach(b => b.classList.toggle('on', b.dataset.nmode === v));
  $$('[data-tocmode]', root).forEach(b => b.classList.toggle('on', b.dataset.tocmode === tm));
  $$('.tocbtn', root).forEach(b => b.classList.toggle('read', noteRead(b.dataset.go)));
  $$('[data-read]', root).forEach(b => { const r = noteRead(b.dataset.read); b.classList.toggle('done', r); b.textContent = r ? '읽음으로 표시됨' : '다 읽었어요'; });
  const ids = noteSecs(root).map(s => s.id), pg = root.querySelector('.nprog');
  if (pg) pg.textContent = '읽음 ' + ids.filter(noteRead).length + ' / ' + ids.length;
}
async function pageNote(sid) {
  if (!noteRoot) APP().innerHTML = '<div class="empty"><b>정리노트 불러오는 중</b>그림이 많아서 조금 걸려요.</div>';
  const html = noteRoot ? '' : await lazyPage('note');
  if (!/^#\/note(\/|$)/.test(location.hash || '')) return;
  if (!noteRoot) {
    if (html == null) { APP().innerHTML = lazyMissing(); return; }
    noteRoot = buildNote(html);
  }
  const root = noteRoot;
  APP().innerHTML = '';
  const wrap = document.createElement('div');
  wrap.className = 'wrap notewrap';
  wrap.appendChild(root);
  APP().appendChild(wrap);
  noteSync(root);
  const target = sid ? noteSec(root, sid) : null;
  if (target && store.pref.noteToc === 'only') { noteShowOnly(root, sid, true); noteIgnoreScroll = Date.now() + 900; }
  else {
    noteShowAll(root);
    if (target) {
      noteSetHash(sid);
      requestAnimationFrame(() => noteScrollTo(target));
      const y0 = { v: -1 };
      setTimeout(() => { y0.v = window.pageYOffset; }, 60);
      setTimeout(() => { if (root.isConnected && Math.abs(window.pageYOffset - y0.v) < 2) noteScrollTo(target); }, 450);   // 위쪽 그림이 늦게 뜨면 한 번 더 맞춘다
    } else noteIgnoreScroll = Date.now() + 600;
  }
  /* 항목 끝(읽음 막대)이 화면 아래쪽에 들어오면 읽음 */
  let tick = null;
  const check = () => {
    tick = null;
    if (Date.now() < noteIgnoreScroll || !root.isConnected) return;
    const vh = window.innerHeight || 0;
    $$('.readbar', root).forEach(rb => {
      const id = rb.querySelector('[data-read]').dataset.read;
      if (noteRead(id)) return;
      const r = rb.getBoundingClientRect();
      if (r.height > 0 && r.top >= vh * 0.25 && r.bottom <= vh) markNoteRead(id);
    });
  };
  const onScroll = () => { if (!tick) tick = setTimeout(check, 180); };
  window.addEventListener('scroll', onScroll, { passive: true });
  if (cleanup) cleanup();
  cleanup = () => { window.removeEventListener('scroll', onScroll); clearTimeout(tick); };
}
async function pageTime() {
  if (!(window.SDT_PAGES_LAZY || {}).time) APP().innerHTML = '<div class="empty"><b>연표 불러오는 중</b>잠시만요.</div>';
  const html = await lazyPage('time');
  if ((location.hash || '') !== '#/time') return;
  if (html == null) { APP().innerHTML = lazyMissing(); return; }
  APP().innerHTML = '<div class="wrap timewrap">' + html + '</div>';
  const sec = $('#time'); if (sec) sec.classList.remove('panel');
  initTime(APP());
}
function initTime(root) {
  const dn = root.querySelector('#timeData'); if (!dn) return;
  let D; try { D = JSON.parse(dn.textContent); } catch (e) { return; }
  const TL = D.timeline || [], FLOW = D.flow || [], KEYS = D.keyYears || {}, CATS = D.cats || [];
  const A = (D.range || [1850, 1940])[0], B = (D.range || [1850, 1940])[1], W = (B - A) || 1;
  const bare = s => String(s || '').replace(/\s/g, '');
  const ccls = c => { const i = CATS.map(bare).indexOf(bare(c)); return 'tc' + (i < 0 ? 'x' : i % 10); };
  const flow = root.querySelector('#flow');
  if (flow) {
    let h = '<div class="axis">';
    for (let y = A; y <= B; y += 10) h += '<span style="left:' + ((y - A) / W * 100) + '%">' + y + '</span>';
    h += '</div>';
    FLOW.forEach(f => {
      const l = (f.s - A) / W * 100, w = (f.e - f.s) / W * 100, pl = (f.p[0] - A) / W * 100, pw = (f.p[1] - f.p[0]) / W * 100;
      h += '<div class="frow ' + ccls(f.c) + '"><div class="fl">' + esc(f.n) + '</div><div class="ft"><div class="bar" style="left:' + l + '%;width:' + w + '%"></div><div class="bar peak" style="left:' + pl + '%;width:' + Math.max(pw, 1.2) + '%"></div>'
        + '<span class="yl num" style="right:' + (100 - l) + '%;margin-right:6px">' + f.s + '</span><span class="yl num" style="left:' + (l + w) + '%;margin-left:6px">' + f.e + '</span></div></div>';
    });
    flow.innerHTML = h;
  }
  const tf = { cat: 'all', key: false };
  const render = () => {
    const tl = root.querySelector('#tl'); if (!tl) return;
    let h = '', era = null;
    TL.forEach(e => {
      const yk = (String(e.y).match(/\d{4}/) || [''])[0], key = KEYS[yk];
      const vis = (tf.cat === 'all' || (e.cats || []).indexOf(tf.cat) >= 0) && (!tf.key || key);
      if (e.era !== era) { era = e.era; h += '<div class="era" data-era>' + esc(era) + '</div>'; }
      h += '<div class="tev' + (key ? ' key' : '') + (vis ? '' : ' hide') + '"><div class="yr num">' + esc(e.y) + '</div><div class="dot"></div><div class="tc"><ul>'
        + (e.items || []).map(it => '<li>' + esc(it) + '</li>').join('') + '</ul>' + (e.who ? '<div class="who">' + esc(e.who) + '</div>' : '') + '<div class="cats">'
        + (e.cats || []).map(c => '<span class="' + ccls(c) + '">' + esc(c) + '</span>').join('') + (key ? '<span class="keylbl">기준점, ' + esc(key) + '</span>' : '') + '</div></div></div>';
    });
    tl.innerHTML = h;
    $$('.era', tl).forEach(el => { let n = el.nextElementSibling, any = false; while (n && !n.hasAttribute('data-era')) { if (!n.classList.contains('hide')) any = true; n = n.nextElementSibling; } el.hidden = !any; });
  };
  const cats = root.querySelector('#tcats');
  if (cats) {
    cats.innerHTML = '<button class="chip on" type="button" data-tcat="all">전체</button>' + CATS.map(c => '<button class="chip cat ' + ccls(c) + '" type="button" data-tcat="' + esc(c) + '"><i></i>' + esc(c) + '</button>').join('');
    cats.addEventListener('click', e => { const b = e.target.closest('[data-tcat]'); if (!b) return; $$('[data-tcat]', cats).forEach(x => x.classList.toggle('on', x === b)); tf.cat = b.dataset.tcat; render(); });
  }
  const ok = root.querySelector('#onlyKey');
  if (ok) { ok.setAttribute('role', 'button'); ok.tabIndex = 0; ok.addEventListener('click', () => { tf.key = !tf.key; ok.classList.toggle('on', tf.key); render(); }); }
  const dt = root.querySelector('details.adv table');
  if (dt && !dt.parentElement.classList.contains('tblwrap')) { const wr = document.createElement('div'); wr.className = 'tblwrap'; dt.parentElement.insertBefore(wr, dt); wr.appendChild(dt); }
  render();
}

/* ---------- 시작 ---------- */
$('#topBtn').addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
window.addEventListener('scroll', () => { $('#hdr').classList.toggle('scrolled', window.scrollY > 8); }, { passive: true });
window.addEventListener('hashchange', route);
applyPref();
/* 메뉴 줄: 마우스 휠을 옆으로 스크롤로 */
(function () { const nv = document.getElementById('nav'); if (!nv) return; nv.addEventListener('wheel', e => { if (nv.scrollWidth > nv.clientWidth + 2 && Math.abs(e.deltaY) > Math.abs(e.deltaX)) { nv.scrollLeft += e.deltaY; e.preventDefault(); } }, { passive: false }); })();
window.SDTApp = { get store() { return store; }, save, toast, startDeck, BANK, BY_ID, weekName, META };
route();
if (window.SDT) window.SDT.onAuth(onAuth); else syncReady = true;
})();
