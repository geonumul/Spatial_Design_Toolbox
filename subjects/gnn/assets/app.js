/* flat-restyle v1 */
/* GNN 회독 스터디: 라우터, 길잡이, 회독 플레이어, 정리 슬라이드, 용어 카드, 필기, 문제은행, 오답노트, 동기화 */
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
const norm = s => String(s || '').toLowerCase().replace(/[\s.,()[\]{}\-~'"`:;!?/\\$·–—’”]/g, '');
const pad3 = n => String(n).padStart(3, '0');
const META = window.GNN_META || { weeks: [], decks: {}, units: {}, prereq: {} };
const INK = () => window.GNNInk || null;
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
const KEY = 'gnn2026_site_v1';
const store = (() => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { return {}; } })();
['wrong', 'seen', 'lesson', 'units', 'terms', 'pref', 'mockDone', 'practice'].forEach(k => { store[k] = store[k] || {}; });
store.extra = store.extra || [];
store.notebook = store.notebook || { free: 1 };
if (store.pref.cumulative == null) store.pref.cumulative = false;
function saveNow() { store.updatedAt = Date.now(); try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) { /* 저장 공간 없음 */ } }
let saveT = null;
function save() { clearTimeout(saveT); saveT = setTimeout(() => { saveNow(); syncPushSoon(); }, 250); }
window.addEventListener('pagehide', () => { saveNow(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) { saveNow(); syncPushNow(); } });

/* ---------- 동기화 (설정 페이지에서 켬) ---------- */
let syncReady = false, syncT = null;
const progressData = () => ({ wrong: store.wrong, seen: store.seen, lesson: store.lesson, units: store.units, terms: store.terms, notebook: store.notebook, mockDone: store.mockDone, practice: store.practice, last: store.last || null });
function syncPushSoon() { const I = INK(); if (!SDT_REMOTE() && (!syncReady || !I || !I.Sync.enabled())) return; clearTimeout(syncT); syncT = setTimeout(syncPushNow, 2500); }
const SDT_REMOTE = () => !!(window.SDT && window.SDT.enabled && window.SDT.user);   /* TSG 사이트 안: Google 로그인으로 기록 저장 */
function syncPushNow() {
  if (SDT_REMOTE()) { clearTimeout(syncT); window.SDT.set(KEY + '__progress', { updated: Date.now(), data: progressData() }); return; }
  const I = INK(); if (!syncReady || !I || !I.Sync.enabled()) return; clearTimeout(syncT); I.Sync.push('progress', { updated: Date.now(), data: progressData() });
}
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
  Object.keys(d.terms || {}).forEach(k => { const v = d.terms[k] || {}, l = store.terms[k] || {}; store.terms[k] = { seen: Math.max(v.seen || 0, l.seen || 0), known: !!(v.known || l.known) }; });
  if (d.notebook) store.notebook.free = Math.max(store.notebook.free || 1, d.notebook.free || 1);
  Object.keys(d.mockDone || {}).forEach(k => { if (d.mockDone[k]) store.mockDone[k] = true; });
  Object.keys(d.practice || {}).forEach(k => {
    const v = d.practice[k] || {}, l = store.practice[k] || {};
    const newer = (v.ts || 0) > (l.ts || 0) ? v : l;
    store.practice[k] = Object.assign({}, l, v, { done: !!(v.done || l.done), tries: Math.max(v.tries || 0, l.tries || 0), hints: Math.max(v.hints || 0, l.hints || 0), code: newer.code != null ? newer.code : (l.code != null ? l.code : v.code), ts: Math.max(v.ts || 0, l.ts || 0) });
  });
  if (!store.last && d.last) store.last = d.last;
}
async function syncPull(rerender) {
  if (SDT_REMOTE()) {
    const r = await window.SDT.get(KEY + '__progress');
    if (r && r.data) { mergeProgress(r.data); saveNow(); if (rerender && !P) route(); }
    syncReady = true; syncPushSoon(); return;
  }
  const I = INK(); if (!I) { syncReady = true; return; }
  if (!I.Sync.enabled()) { syncReady = true; return; }
  const r = await I.Sync.pull('progress');
  if (r && r.data) { mergeProgress(r.data); saveNow(); if (rerender && !P) route(); }
  syncReady = true;
  syncPushSoon();
}

/* ---------- 용어 ---------- */
const TERM = {};
let TERM_RE = null, KO_RE = null;
(function initTerms() {
  const T = window.GNN_TERMS || {};
  const ko = [];
  Object.keys(T).forEach(w => (T[w] || []).forEach(t => {
    const k = String(t.en || '').toLowerCase();
    if (k.length >= 2 && !TERM[k]) TERM[k] = Object.assign({ week: w }, t);
    if ((w === 'b' || w === 'c') && t.ko && t.ko.length >= 2 && !/^[A-Za-z]/.test(t.ko)) ko.push([t.ko, k]);
  }));
  const keys = Object.keys(TERM).filter(k => k.length >= 3 || /^[A-Z0-9]+$/.test(TERM[k].en)).sort((a, b) => b.length - a.length).map(k => reEsc(TERM[k].en));
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
  pop.innerHTML = '<b>' + esc(d.en) + ' <span style="font-weight:450;opacity:.85">' + esc(d.ko) + '</span></b>' + esc(d.say) + '<br><span style="opacity:.6;font-size:13px">지금까지 ' + r.seen + '번 봤어요</span>';
  document.body.appendChild(pop);
  const b = t.getBoundingClientRect(), w = Math.min(300, window.innerWidth - 24);
  pop.style.maxWidth = w + 'px';
  pop.style.left = clamp(b.left + window.scrollX, 12 + window.scrollX, window.scrollX + window.innerWidth - w - 12) + 'px';
  pop.style.top = (b.bottom + window.scrollY + 8) + 'px';
}, true);

/* ---------- 문제은행 ---------- */
const BANK = (window.GNN_BANK || []).concat(store.extra || []);
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
  [/^#\/lesson\/(L\d)\/([1-4])(?:\/(\d+)(\/all)?)?$/, pageLesson],
  [/^#\/unit\/(w\w+?-\d+)(?:\/(\d+)(\/all)?)?$/, pageUnit],
  [/^#\/practice\/([\w\-]+)(?:\/(\d+))?$/, pagePractice],
  [/^#\/terms\/(\w+)$/, pageTerms],
  [/^#\/quiz(?:\?(.*))?$/, pageQuiz],
  [/^#\/mock(?:\?(.*))?$/, pageMock],
  [/^#\/wrong$/, pageWrong],
  [/^#\/notebook/, () => location.replace('#/')],
  [/^#\/settings$/, pageSettings],
  [/^#\/exams$/, () => pageStatic('exams')],
  [/^#\/tips$/, () => pageStatic('tips')],
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
  const w = h.match(/^#\/(?:week|terms)\/(\w+)/) || h.match(/^#\/lesson\/L(\d)/) || h.match(/^#\/unit\/w(\w+?)-/) || h.match(/^#\/practice\/(c)\d/) || h.match(/^#\/practice\/w(\d)-/);
  if (w) key = 'w' + w[1];
  else if (/^#\/(quiz|mock)/.test(h)) key = 'quiz';
  else if (/^#\/wrong/.test(h)) key = 'wrong';
  else if (/^#\/notebook/.test(h)) key = 'note';
  else if (/^#\/settings/.test(h)) key = 'set';
  else if (/^#\/exams/.test(h)) key = 'exams';
  else if (/^#\/tips/.test(h)) key = 'tips';
  $$('#nav .tab').forEach(t => t.classList.toggle('on', t.dataset.nav === key));
  const on = $('#nav .tab.on'); if (on && on.scrollIntoView) on.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}
const qs = str => { const o = {}; (str || '').split('&').forEach(p => { if (!p) return; const [k, v] = p.split('='); o[decodeURIComponent(k)] = decodeURIComponent(v || ''); }); return o; };

/* ---------- 진행 계산 ---------- */
function lessonProg(deck, pass) {
  const d = META.decks[deck]; const r = (store.lesson[deck] || {})[pass] || {};
  const total = d ? d.frames[pass - 1] : 0;
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
  if (week === 'c') {
    units.forEach((u, i) => {
      steps.push({ t: '코딩 단원 ' + (i + 1) + ': ' + u.title, d: u.goal, done: unitDone(u.id), href: '#/unit/' + u.id, meta: u.n + '장' });
      const ps = practiceOfUnit(u.id);
      if (ps) steps.push(practiceStep(ps));
    });
    (META.practice || []).filter(p => p.track === 'c' && !units.some(u => u.id === p.unit)).forEach(p => steps.push(practiceStep(p)));
    return steps;
  }
  const pre = (META.prereq[week] || []).map(unitMeta).filter(Boolean);
  if (pre.length) steps.push({ t: '필요한 기초만 먼저', d: '이 주차에 나오는 수학, 딥러닝 기초예요. 이미 알면 건너뛰어도 돼요.', done: pre.every(u => unitDone(u.id)), href: '#/unit/' + nextUnit(pre).id, chips: pre, meta: pre.length + '개 단원' });
  const lp = (n, t, desc) => { if (d && d.frames[n - 1]) steps.push({ t, d: desc, done: lessonProg(w.deck, n).done, href: '#/lesson/' + w.deck + '/' + n, meta: '약 ' + mins(d.frames[n - 1]) + '분', prog: lessonProg(w.deck, n) }); };
  lp(1, '1회독: 큰 그림', '강의 슬라이드를 쉬운 말로 한 번 쭉 넘겨 봐요. 이해 안 돼도 그냥 넘어가요.');
  if (units.length) steps.push({ t: '정리 슬라이드: 단원 1부터 ' + units.length + '까지', d: '강의를 주제별로 나눈 요약이에요. 단원마다 내용이 달라요. 차례로 한 번씩 봐요.', done: units.every(u => unitDone(u.id)), href: '#/unit/' + nextUnit(units).id, meta: units.filter(u => unitDone(u.id)).length + ' / ' + units.length + ' 단원' });
  const qstep = (level, t, desc) => { const s = weekQuizStat(week, level); if (!s.total) return; const goal = Math.min(20, s.total); steps.push({ t, d: desc, done: s.seen >= goal, href: '#/quiz?week=' + week + '&level=' + level + '&mode=unseen&n=20&start=1', meta: s.seen + ' / ' + goal + '문제' }); };
  qstep('basic', '기본 문제 20개', '기출과 같은 난이도예요. 틀려도 괜찮아요. 오답노트에 쌓여요.');
  lp(2, '2회독: 자세히', '슬라이드를 짚어 가며 수식, 그림, 손계산, 교수님 설명까지.');
  lp(3, '3회독: 기출', '실제 기출 문제와 퀴즈, 외울 영어 문장.');
  qstep('hard', '심화 문제 20개', '올해 어려워진다고 해서 한 단계 올린 문제예요.');
  const cpre = ((META.codeprereq || {})[week] || []).map(unitMeta).filter(Boolean);
  if (cpre.length && d && d.frames[3]) steps.push({ t: '코드 보기 전에 코딩 기초', d: '파이썬, 클래스, 파이토치를 0부터 보고 직접 짜 봐요. 이미 알면 건너뛰어도 돼요.', done: cpre.every(u => unitDone(u.id)), href: '#/unit/' + nextUnit(cpre).id, chips: cpre, meta: cpre.length + '개 단원' });
  lp(4, '4회독: 코드', '실습 노트북 코드를 식과 짝지어 한 줄씩.');
  const wps = (META.practice || []).filter(p => p.track === week);
  if (wps.length) {
    const got = wps.reduce((a, p) => a + p.ids.filter(prDone).length, 0), tot = wps.reduce((a, p) => a + p.n, 0);
    steps.push({ t: '노트북 코드 직접 다시 짜기', d: '수업 실습 노트북 코드를 따라 치고, 빈칸 채우고, 고치고, 직접 짜요.', done: got >= tot, href: '#/practice/' + (wps.find(p => !p.ids.every(prDone)) || wps[0]).id, psets: wps, meta: got + ' / ' + tot + '개' });
  }
  if (weekQuizStat(week).total) steps.push({ t: '오답 다시 풀고 모의고사', d: '틀린 것만 다시 풀고, 서술과 계산 한 쌍씩 시험지처럼.', done: !!store.mockDone[week], href: '#/mock?week=' + week, meta: '' });
  return steps;
}
function guideCard(week, big) {
  const steps = weekSteps(week); if (!steps.length) return '';
  const cur = steps.findIndex(s => !s.done);
  const done = steps.filter(s => s.done).length;
  let h = '<section class="guide' + (big ? ' big' : '') + '"><div class="gtop"><div><div class="eyebrow">공부 길잡이</div><h2>' + (cur < 0 ? '이 주차는 다 끝냈어요' : '지금 할 차례') + '</h2></div><span class="gcount num">' + done + ' / ' + steps.length + ' 완료</span></div>';
  if (cur >= 0) h += '<a class="gnow" href="' + esc(steps[cur].href) + '"><span class="gn">' + (cur + 1) + '</span><span class="gt"><b>' + esc(steps[cur].t) + '</b><small>' + esc(steps[cur].d) + '</small></span><span class="go">시작</span></a>';
  h += '<ol class="gsteps">' + steps.map((s, i) => '<li class="' + (s.done ? 'done' : i === cur ? 'cur' : '') + '"><a href="' + esc(s.href) + '"><i></i><span><b>' + esc(s.t) + '</b>' + (s.meta ? '<em class="num">' + esc(s.meta) + '</em>' : '') + '</span></a>'
    + (s.chips ? '<div class="gchips">' + s.chips.map(u => '<a class="chip' + (unitDone(u.id) ? ' on' : '') + '" href="#/unit/' + u.id + '">' + esc(u.title.split(':')[0]) + '</a>').join('') + '</div>' : '')
    + (s.psets ? '<div class="gchips">' + s.psets.map(p => '<a class="chip' + (p.ids.every(prDone) ? ' on' : '') + '" href="#/practice/' + p.id + '">' + esc(p.title) + '</a>').join('') + '</div>' : '') + '</li>').join('') + '</ol></section>';
  return h;
}
const ORDER = ['b', '1', '2', '3'];
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
  let h = '<section class="intro"><div><div class="eyebrow">그래프 신경망 2026 가을</div>'
    + '<h1>' + (nx ? esc(weekName(nx.week)) + '<br>' + esc(nx.step.t) : '남은 건<br>모의고사예요') + '</h1>'
    + '<p>기초 다지기, 1주차, 2주차, 3주차 순서예요. 각 주차 안에서는 길잡이가 지금 할 일을 하나씩 알려 줘요. 모르는 용어는 눌러서 뜻을 봐요.</p>'
    + '<div class="cta">' + (nx ? '<a class="btn primary" href="' + esc(nx.step.href) + '">이어서 하기</a>' : '<a class="btn primary" href="#/mock">모의고사</a>')
    + (store.last ? '<a class="btn" href="' + esc(store.last.href) + '">마지막으로 본 곳</a>' : '') + '</div></div>'
    + '<div class="pathcard"><div class="pc-h"><span>기초, 1~7주차, 8주차 중간고사</span><span class="num">' + overallPct() + '% 진행</span></div>' + weekPathSvg() + '</div></section>';
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
  h += '<h2 class="sec">도구</h2><div class="toolrow">'
    + '<a class="tool" href="#/week/c"><b>코딩 기초</b><span>파이썬, 클래스, 파이토치를 직접 쳐 보며</span></a>'
    + '<a class="tool" href="#/terms/all"><b>용어 카드</b><span>전 주차 용어 ' + Object.keys(TERM).length + '개</span></a>'
    + '<a class="tool" href="#/mock"><b>모의고사</b><span>모델마다 서술 + 계산 한 쌍</span></a>'
    + '<a class="tool" href="#/wrong"><b>오답노트</b><span>틀린 문제만 다시</span></a>'
    + '<a class="tool" href="#/exams"><b>기출 분석</b><span>2023~2025 모델별 출제표</span></a>'
    + '<a class="tool" href="#/tips"><b>답안 팁</b><span>계산 순서, 영어 문장 틀</span></a>'
    + '<a class="tool" href="#/settings"><b>설정</b><span>PC와 아이패드 기록 맞추기</span></a></div>';
  APP().innerHTML = h;
  renderMath(APP());
}
function overallPct() {
  let tot = 0, got = 0;
  META.weeks.forEach(w => { const s = weekSteps(w.id); tot += s.length; got += s.filter(x => x.done).length; });
  return tot ? Math.round(got / tot * 100) : 0;
}
function weekPathSvg() {
  const labels = ['기초', '1주', '2주', '3주', '4주', '5주', '6주', '7주', '중간'], ids = ['b', '1', '2', '3', '4', '5', '6', '7', 'exam'];
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
  let h = '<div class="ph"></div><div class="ph">기본 (기출 난이도)</div><div class="ph">심화 (한 단계 위)</div>';
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
const PASS_INFO = [
  { n: 1, t: '큰 그림', d: '쉬운 말로 이 강의가 무슨 이야기인지만' },
  { n: 2, t: '자세히', d: '슬라이드를 짚으며 수식, 그림, 손계산, 교수님 설명' },
  { n: 3, t: '기출', d: '실제 기출 문제, 확인 퀴즈, 외울 영어 문장' },
  { n: 4, t: '코드', d: '실습 노트북 코드를 식과 짝지어 한 줄씩' },
];
function pageWeek(week) {
  const w = weekOf(week);
  if (!w) { location.hash = '#/'; return; }
  const d = w.deck ? META.decks[w.deck] : null;
  let h = '<a class="back" href="#/">홈</a><div class="whead"><div class="eyebrow">' + esc(w.short) + '</div><h1>' + esc(w.title) + '</h1><p>' + esc(w.topics) + '</p></div>';
  h += guideCard(week, true);
  if (d) {
    h += '<h2 class="sec">강의 회독 <small>같은 강의를 네 번, 갈수록 깊게</small></h2>';
    if (d.have) {
      h += '<div class="ptiles">' + PASS_INFO.map(p => {
        const r = lessonProg(w.deck, p.n), pct = r.total ? Math.round((r.done ? r.total : r.max) / r.total * 100) : 0;
        const cls = r.total === 0 ? ' off' : r.done ? ' done' : '';
        return '<a class="ptile' + cls + '" href="#/lesson/' + w.deck + '/' + p.n + '"><span class="pn">' + p.n + '회독</span><span class="pt">' + p.t + '</span><span class="pd">' + p.d + '</span>'
          + '<span class="pf"><span class="num">' + (r.done ? '다 봤어요' : r.max ? pct + '% 봤어요' : r.total ? '약 ' + mins(r.total) + '분' : '내용 없음') + '</span><span class="pbar"><i style="width:' + pct + '%"></i></span></span></a>';
      }).join('') + '</div>';
      h += '<div class="pillrow"><button class="chip' + (store.pref.cumulative ? ' on' : '') + '" id="cumChip" type="button">쌓아서 보기: ' + (store.pref.cumulative ? '앞 회독 내용도 함께' : '이번 회독 내용만') + '</button>'
        + (d.have < d.total ? '<span class="muted" style="font-size:13.5px">지금 ' + d.have + ' / ' + d.total + '장까지 준비됨. 나머지는 만드는 중</span>' : '') + '</div>';
    } else h += '<div class="soon">회독 슬라이드를 만드는 중이에요. 준비되면 여기에 나타나요.</div>';
  }
  const units = META.units[week] || [];
  h += '<h2 class="sec">' + (week === 'b' ? '기초 단원' : week === 'c' ? '코딩 단원' : '정리 슬라이드') + ' <small>' + (week === 'b' || week === 'c' ? '차례로 보면 돼요' : '주제별 요약, 단원마다 내용이 달라요') + '</small></h2>';
  if (units.length) {
    h += '<div class="unitgrid">' + units.map((u, i) => {
      const r = store.units[u.id] || {};
      return '<a class="ucard' + (r.done ? ' done' : '') + '" href="#/unit/' + u.id + '"><span class="uid">단원 ' + (i + 1) + (r.done ? ', 다 봤어요' : '') + '</span><span class="ut">' + fmt(u.title, false) + '</span><span class="ug">' + fmt(u.goal, false) + '</span>'
        + '<span class="uterms">' + u.terms.slice(0, 4).map(t => '<span>' + esc(t) + '</span>').join('') + '</span><span class="ustate"><span>' + u.n + '장</span><span>' + (!r.done && r.i ? (r.i + 1) + '장까지 봄' : '') + '</span></span></a>';
    }).join('') + '</div>';
  } else h += '<div class="soon">만드는 중이에요.</div>';
  const psets = (META.practice || []).filter(p => p.track === week);
  if (psets.length) {
    h += '<h2 class="sec">직접 짜 보기 <small>편집기에 직접 치고 채점해요' + (week === 'c' ? '' : ', 수업 노트북 코드로') + '</small></h2><div class="unitgrid">' + psets.map(p => {
      const dn = p.ids.filter(prDone).length;
      return '<a class="ucard' + (dn === p.n ? ' done' : '') + '" href="#/practice/' + p.id + '"><span class="uid">' + esc(p.id) + (p.colab ? ', Colab 포함' : '') + '</span><span class="ut">' + esc(p.title) + '</span><span class="ug">' + fmt(p.intro, false) + '</span><span class="ustate"><span>실습 ' + p.n + '개</span><span>' + dn + '개 통과</span></span></a>';
    }).join('') + '</div>';
  }
  const wt = termsOfWeek(week), known = wt.filter(t => (store.terms[t.en.toLowerCase()] || {}).known).length;
  if (wt.length) h += '<div class="termbar"><div><b>용어 카드</b><div class="muted">이 주차 용어 ' + wt.length + '개, 외운 것 ' + known + '개</div></div><div class="btnrow" style="margin:0"><a class="btn" href="#/terms/' + week + '">카드 넘기기</a><a class="btn" href="#/quiz?week=' + week + '&unit=' + encodeURIComponent('용어') + '&start=1">용어 퀴즈</a></div></div>';
  const sb = weekQuizStat(week, 'basic'), sh = weekQuizStat(week, 'hard');
  if (sb.total || sh.total) {
    h += '<h2 class="sec">문제 풀기</h2><div class="qbtns">'
      + '<a class="qbtn" href="#/quiz?week=' + week + '&level=basic&mode=unseen&start=1"><b>기본 문제</b><span class="num">기출 난이도, ' + sb.seen + ' / ' + sb.total + ' 풀이</span></a>'
      + '<a class="qbtn hard" href="#/quiz?week=' + week + '&level=hard&mode=unseen&start=1"><b>심화 문제</b><span class="num">한 단계 위, ' + sh.seen + ' / ' + sh.total + ' 풀이</span></a>'
      + '<a class="qbtn" href="#/quiz?week=' + week + '&type=calc&start=1"><b>계산만</b><span>시험 계산 문제 연습</span></a>'
      + '<a class="qbtn" href="#/mock?week=' + week + '"><b>이 주차 모의고사</b><span>서술 + 계산 한 쌍씩</span></a></div>';
  }
  APP().innerHTML = h;
  renderMath(APP());
  const cc = $('#cumChip');
  if (cc) cc.addEventListener('click', () => { store.pref.cumulative = !store.pref.cumulative; save(); pageWeek(week); });
}
function termsOfWeek(week) {
  if (week === 'all') return Object.keys(TERM).map(k => TERM[k]);
  return ((window.GNN_TERMS || {})[week] || []).filter(t => t.en && t.en.length >= 2);
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
    if (e.target.closest('button,a,input,textarea,.term,pre,.schoices,.tpop')) return;
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
  box.innerHTML = '<label>' + (paged ? '쪽' : '장면') + ' <input type="number" inputmode="numeric" min="' + lo + '" max="' + hi + '" placeholder="' + lo + '~' + hi + '"></label><button class="btn sm primary" type="submit">이동</button>';
  btn.after(box); btn.hidden = true;
  const inp = $('input', box); inp.focus();
  const close = () => { box.remove(); btn.hidden = false; };
  box.addEventListener('click', e => e.stopPropagation());
  inp.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Escape') close(); });
  inp.addEventListener('blur', () => setTimeout(() => { if (document.activeElement && box.contains(document.activeElement)) return; close(); }, 150));
  box.addEventListener('submit', e => {
    e.preventDefault();
    const n = Math.round(+inp.value);
    if (!n || n < lo || n > hi) { toast(lo + '부터 ' + hi + ' 사이 숫자를 적어요'); inp.select(); return; }
    let idx;
    if (paged) {
      const cur = P.frames[P.i] || {};
      idx = P.frames.findIndex(f => f._p === n && f._pass === cur._pass);
      if (idx < 0) idx = P.frames.findIndex(f => f._p === n);
      if (idx < 0) idx = P.frames.findIndex(f => f._p > n);
    } else idx = n - 1;
    close();
    if (idx >= 0 && P) pShow(idx, idx < P.i ? 'prev' : 'next');
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
  if (f.kind === 'end') return;
  const el = $('#pslide');
  const vis = $$('[data-s]', el).filter(e => +e.dataset.s === P.step);
  const text = vis.length ? vis.map(e => e.textContent).join(' ') : el.textContent;
  const ms = clamp(1500 + text.length * 60, 2200, 11000) + (f.kind === 'slideimg' ? 1500 : 0);
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
function renderFrame(f, st) {
  const k = f.kind;
  const head = x => x ? '<h2 class="sh">' + fmt(x) + '</h2>' : '';
  const items = (arr, cls) => '<ul class="sl-items' + (cls ? ' ' + cls : '') + '">' + (arr || []).map((x, i) => S(i + 1, fmt(x), 'li')).join('') + '</ul>';
  const lines = x => Array.isArray(x) ? x : String(x || '').split('\n');
  switch (k) {
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
      return { html: '<div class="sk">시험에 쓰는 영어 문장</div>' + head(f.head) + '<p class="sen">' + fmt(f.en) + '</p>' + S(1, '<p class="sko">' + fmt(f.ko) + '</p>' + (f.tip ? '<p class="stip">' + fmt(f.tip) + '</p>' : '')), steps: 1 };
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
    case 'look': {
      const boxes = f.boxes || [];
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
    case 'mining':
      return { html: '<div class="voice mining"><div class="vl">지난 학기 그래프 마이닝, ' + esc(f.src) + '</div>' + lines(f.lines).map((x, i) => S(i, fmt(x), 'p')).join('') + '</div>', steps: Math.max(0, lines(f.lines).length - 1) };
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
    case 'review':
      return { html: '<div class="review"><div class="sk">기억나요?</div><h2 class="sh">앞에서 본 용어예요. 뜻을 먼저 떠올린 다음 눌러 보세요.</h2><div class="rcards">'
        + f.terms.map((t, i) => '<div class="rcard"><span class="ren">' + esc(t.en) + '</span>' + S(i + 1, '<b>' + esc(t.ko) + '</b><br>' + esc(t.say), 'span', 'rko') + '</div>').join('') + '</div></div>', steps: f.terms.length,
        after: () => { f.terms.forEach(t => { const r = store.terms[t.en.toLowerCase()] || (store.terms[t.en.toLowerCase()] = { seen: 0 }); r.seen++; }); save(); } };
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
  const L = (window.GNN_LESSONS || {})[deck];
  if (!L) { APP().innerHTML = '<div class="empty"><b>아직 준비되지 않았어요</b><a class="btn" href="#/week/' + week + '">돌아가기</a></div>'; return; }
  const cum = !!store.pref.cumulative;
  const frames = [], groups = [];
  const deckTitle = (META.decks[deck] || {}).title || deck;
  L.slides.forEach(s => {
    const layers = cum ? [1, 2, 3, 4].filter(n => n <= pass) : [pass];
    const content = [];
    layers.forEach(n => (s['pass' + n] || []).forEach((f, ix) => content.push(Object.assign({ _pass: n, _ix: ix }, f))));
    if (!content.length) return;
    const start = frames.length;
    frames.push({ kind: 'slideimg', src: 'img/' + deck + '/p' + pad3(s.p) + '.jpg', alt: 'p.' + s.p + ' ' + s.title, cap: 'p.' + s.p + '  ' + s.title, _p: s.p, _t: s.title });
    content.forEach(f => { f._p = s.p; f._t = s.title; frames.push(f); });
    groups.push({ start, end: frames.length - 1, p: s.p });
  });
  if (!frames.length) { APP().innerHTML = '<div class="empty"><b>이 회독에는 내용이 없어요</b><a class="btn" href="#/week/' + week + '">돌아가기</a></div>'; return; }
  const np = pass < 4 ? pass + 1 : null;
  frames.push({ kind: 'end', big: deckTitle + ' ' + pass + '회독 끝', sub: pass === 1 ? '큰 그림을 잡았어요. 길잡이 다음 순서는 정리 슬라이드예요.' : pass === 2 ? '자세한 내용까지 봤어요. 3회독에서 기출과 퀴즈로 확인해요.' : pass === 3 ? '기출 감각을 익혔어요. 심화 문제에 도전해요.' : '코드까지 연결했어요. 모의고사로 마무리해요.',
    links: [['길잡이로 돌아가기', '#/week/' + week], np ? [np + '회독 바로 시작', '#/lesson/' + deck + '/' + np] : (META.practice || []).some(p => p.track === week) ? ['노트북 코드 직접 짜기', '#/practice/' + (META.practice || []).find(p => p.track === week).id] : ['모의고사', '#/mock?week=' + week]] });
  groups.push({ start: frames.length - 1, end: frames.length - 1 });
  store.lesson[deck] = store.lesson[deck] || {};
  const rec = store.lesson[deck][pass] = store.lesson[deck][pass] || {};
  const passChips = [1, 2, 3, 4].map(n => '<a class="chip' + (n === pass ? ' on' : '') + '" href="#/lesson/' + deck + '/' + n + '">' + n + '회독</a>').join('');
  startPlayer({
    frames, groups, start: jump != null ? +jump : rec.i && rec.i < frames.length - 1 ? rec.i : 0, showAll: !!all,
    backHref: '#/week/' + week,
    chips: passChips,
    imgOf: f => 'img/' + deck + '/p' + pad3(f._p) + '.jpg',
    inkKey: f => f.kind === 'end' ? null : f.kind === 'slideimg' ? 'slide/' + deck + '/p' + pad3(f._p) : 'lesson/' + deck + '/p' + pad3(f._p) + '/' + f._pass + '/' + f._ix,
    title: f => esc(deckTitle) + ' ' + pass + '회독 <small>' + (f._p ? 'p.' + f._p + ' ' + esc(f._t || '') : '마무리') + (cum && f._pass ? ', ' + f._pass + '회독 내용' : '') + '</small>',
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
  const N = (window.GNN_NOTES || {})[week];
  const idx = N ? N.units.findIndex(u => u.id === uid) : -1;
  if (idx < 0) { location.hash = '#/week/' + week; return; }
  const u = N.units[idx];
  const frames = [];
  u.slides.forEach((s, i) => {
    frames.push(Object.assign({ _si: i }, s, s.kind === 'title' ? { eyebrow: (N.title || '') + ', 단원 ' + (idx + 1) } : {}));
    if (i === 0) {
      const prev = [];
      N.units.slice(0, idx).forEach(x => (x.terms || []).forEach(t => prev.push(t)));
      if (!prev.length) { const oi = ORDER.indexOf(week); const pw = oi > 0 ? ORDER[oi - 1] : null; if (pw) ((window.GNN_TERMS || {})[pw] || []).forEach(t => prev.push(t)); }
      const pick = prev.filter((t, j, a) => a.findIndex(y => y.en === t.en) === j)
        .sort((a, b) => ((store.terms[a.en.toLowerCase()] || {}).seen || 0) - ((store.terms[b.en.toLowerCase()] || {}).seen || 0)).slice(0, 4);
      if (pick.length) frames.push({ kind: 'review', terms: pick });
    }
  });
  const nextU = N.units[idx + 1];
  const ps = practiceOfUnit(uid);
  frames.push({ kind: 'end', big: '단원 ' + (idx + 1) + ' 끝', sub: ps ? '이제 방금 배운 걸 편집기에 직접 쳐 봐요. 보기만 하면 손이 기억하지 못해요.' : nextU ? '다음 단원은 "' + nextU.title + '" 이에요.' : '이 주차 단원을 다 봤어요. 길잡이 다음 순서로 가요.',
    links: (ps ? [['직접 짜 보기 시작', '#/practice/' + ps.id]] : []).concat([nextU ? ['다음 단원 보기', '#/unit/' + nextU.id] : ['길잡이로 돌아가기', '#/week/' + week], ['용어 카드', '#/terms/' + week], nextU ? ['길잡이로 돌아가기', '#/week/' + week] : ['홈', '#/']]).slice(0, 3) });
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

/* ---------- 직접 짜 보기 (코딩 실습) ---------- */
const PYODIDE = 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/';
const LEVEL_KO = { type: '따라 치기', blank: '빈칸 채우기', fix: '고치기', write: '직접 짜기' };
const prDone = id => !!(store.practice[id] || {}).done;
const practiceOfUnit = uid => (META.practice || []).find(p => p.unit === uid) || null;
function practiceStep(p) {
  const dn = p.ids.filter(prDone).length;
  return { t: '직접 짜 보기: ' + p.title, d: '편집기에 직접 치고 채점해요. 따라 치기, 빈칸, 고치기, 직접 짜기 순서예요.', done: dn >= p.n, href: '#/practice/' + p.id, meta: dn + ' / ' + p.n + '개' };
}
const colabUrl = sid => 'https://colab.research.google.com/github/' + (META.repo || '') + '/blob/main/subjects/gnn/practice/' + sid + '.ipynb';
function fmtc(s) {
  return String(s == null ? '' : s).split(/(`[^`\n]+`)/).map(part => /^`[^`]+`$/.test(part) ? '<code>' + esc(part.slice(1, -1)) + '</code>' : fmt(part)).join('');
}
/* 채점기: 사이트와 practice_check.py 가 같은 순서로 실행 (내 코드 -> __out__ -> tests) */
const PY_RUNNER = [
  'import sys, io, json, contextlib, traceback',
  'def __gnn_run(code, tests, grade):',
  '    ns = {"__name__": "__main__"}',
  '    buf = io.StringIO()',
  '    res = {"ok": False, "stage": "", "msg": "", "out": "", "line": 0, "etype": ""}',
  '    try:',
  '        with contextlib.redirect_stdout(buf):',
  '            exec(compile(code, "<내 코드>", "exec"), ns)',
  '    except BaseException as e:',
  '        res["stage"] = "code"; res["etype"] = type(e).__name__; res["msg"] = str(e)',
  '        ls = [f.lineno for f in traceback.extract_tb(e.__traceback__) if f.filename == "<내 코드>"]',
  '        if isinstance(e, SyntaxError): ls = [e.lineno or 0]',
  '        res["line"] = ls[-1] if ls else 0',
  '        res["out"] = buf.getvalue()[-20000:]',
  '        return json.dumps(res, ensure_ascii=False)',
  '    res["out"] = buf.getvalue()[-20000:]',
  '    if not grade:',
  '        res["ok"] = True',
  '        return json.dumps(res, ensure_ascii=False)',
  '    ns["__out__"] = buf.getvalue()',
  '    try:',
  '        with contextlib.redirect_stdout(io.StringIO()):',
  '            exec(compile(tests, "<채점>", "exec"), ns)',
  '        res["ok"] = True',
  '    except AssertionError as e:',
  '        res["stage"] = "test"; res["msg"] = str(e)',
  '    except BaseException as e:',
  '        res["stage"] = "test_error"; res["etype"] = type(e).__name__; res["msg"] = str(e)',
  '    return json.dumps(res, ensure_ascii=False)',
].join('\n');
const Py = {
  w: null, ready: null, seq: 0, wait: {}, state: 'off', pk: false,
  start() {
    if (this.ready) return this.ready;
    if (!window.Worker || !window.Blob || !window.URL || !URL.createObjectURL) { this.state = 'none'; return Promise.reject(new Error('이 브라우저는 실행기를 지원하지 않아요')); }
    const src = "self.importScripts('" + PYODIDE + "pyodide.js');\n"
      + "let py = null;\n"
      + "const ready = (async () => { py = await loadPyodide({ indexURL: '" + PYODIDE + "' }); py.runPython(" + JSON.stringify(PY_RUNNER) + "); })();\n"
      + "ready.then(() => self.postMessage({ boot: true }), e => self.postMessage({ boot: false, err: String(e) }));\n"
      + "self.onmessage = async ev => { const d = ev.data; try { await ready; await py.loadPackagesFromImports(d.code + '\\n' + (d.tests || '')); const fn = py.globals.get('__gnn_run'); const r = fn(d.code, d.tests || '', !!d.grade); fn.destroy(); self.postMessage({ id: d.id, res: JSON.parse(r) }); } catch (e) { self.postMessage({ id: d.id, err: String(e) }); } };\n";
    this.w = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })));
    this.state = 'loading';
    this.ready = new Promise((res, rej) => {
      this.w.onmessage = ev => {
        const d = ev.data;
        if (d.boot !== undefined) { if (d.boot) { this.state = 'ready'; res(); } else { this.state = 'fail'; this.ready = null; rej(new Error(d.err)); } return; }
        const cb = this.wait[d.id]; if (cb) { delete this.wait[d.id]; cb(d); }
      };
      this.w.onerror = e => { this.state = 'fail'; this.ready = null; rej(new Error(e.message || '실행기 오류')); };
    });
    return this.ready;
  },
  kill() {
    if (this.w) this.w.terminate();
    this.w = null; this.ready = null; this.state = 'off'; this.pk = false;
    const cbs = Object.values(this.wait); this.wait = {}; cbs.forEach(cb => cb({ err: 'stopped' }));
  },
  async run(code, tests, grade, ms) {
    try { await this.start(); } catch (e) { return { err: String(e.message || e) }; }
    const id = ++this.seq;
    return new Promise(res => {
      const t = setTimeout(() => { if (this.wait[id]) { delete this.wait[id]; this.kill(); res({ timeout: true }); } }, ms || 12000);
      this.wait[id] = d => { clearTimeout(t); res(d); };
      this.w.postMessage({ id, code, tests, grade });
    });
  },
};
const PY_ERR = {
  SyntaxError: '문법 오류예요. 콜론(:), 괄호와 따옴표 짝, 쉼표를 확인해요.',
  IndentationError: '들여쓰기 오류예요. 같은 묶음 안의 줄은 스페이스 4칸씩 똑같이 들여써요.',
  TabError: '탭과 스페이스가 섞였어요. 스페이스 4칸으로 맞춰요.',
  NameError: '그런 이름이 없어요. 오타인지, 만들기 전에 먼저 썼는지 확인해요.',
  TypeError: '자료형이 맞지 않아요. 숫자와 문자열을 더했거나, 함수에 넘긴 값 개수가 다를 수 있어요.',
  IndexError: '번호(인덱스)가 범위를 벗어났어요. 0부터 시작하고, 마지막 번호는 길이 - 1 이에요.',
  KeyError: '딕셔너리에 그 키가 없어요. 키 이름과 따옴표를 확인해요.',
  AttributeError: '그 객체에 그런 속성이나 메서드가 없어요. 이름 오타나 self. 빠짐을 확인해요.',
  ValueError: '값이 알맞지 않아요. 모양(shape)이나 바꾸려는 값을 확인해요.',
  ZeroDivisionError: '0으로 나누었어요.',
  ModuleNotFoundError: '그 모듈은 여기서 쓸 수 없어요. PyTorch 는 Colab 실습에서 써요.',
  RecursionError: '함수가 자기 자신을 끝없이 불렀어요.',
  UnboundLocalError: '함수 안에서 값을 넣기 전에 그 변수를 썼어요.',
};
async function pagePractice(sid, nStr) {
  const meta = (META.practice || []).find(p => p.id === sid);
  const back = '#/week/' + (meta ? meta.track : 'c');
  APP().innerHTML = '<div class="empty"><b>실습을 불러오는 중</b></div>';
  try { await loadScript('data/practice_' + sid + '.js'); } catch (e) { APP().innerHTML = '<div class="empty"><b>아직 준비되지 않았어요</b><a class="btn" href="' + back + '">돌아가기</a></div>'; return; }
  const S = (window.GNN_PRACTICE || {})[sid];
  if (!S || !(S.exercises || []).length) { APP().innerHTML = '<div class="empty"><b>아직 준비되지 않았어요</b><a class="btn" href="' + back + '">돌아가기</a></div>'; return; }
  if (nStr == null) practiceIndex(S);
  else practiceExercise(S, clamp(+nStr, 1, S.exercises.length) - 1);
}
function practiceIndex(S) {
  const ex = S.exercises, done = ex.filter(e => prDone(e.id)).length, first = ex.findIndex(e => !prDone(e.id));
  const unit = S.unit ? unitMeta(S.unit) : null;
  let h = '<a class="back" href="#/week/' + esc(S.track) + '">' + esc(weekName(S.track)) + '</a><div class="whead"><div class="eyebrow">직접 짜 보기, ' + esc(S.id) + '</div><h1>' + esc(S.title) + '</h1><p>' + fmtc(S.intro) + '</p></div>';
  h += '<div class="card prhow"><b>이렇게 해요</b><ol>'
    + '<li><b>따라 치기</b>: 보이는 코드를 복사하지 말고 직접 쳐요. 손이 기억해요.</li>'
    + '<li><b>빈칸 채우기</b>: <code>___</code> 자리만 채워요.</li>'
    + '<li><b>고치기</b>: 틀린 곳을 찾아 고쳐요.</li>'
    + '<li><b>직접 짜기</b>: 주석에 적힌 순서대로 처음부터 짜요.</li></ol>'
    + '<p class="muted">[실행]은 결과만 보여 주고, [채점]은 맞았는지 확인해요. 에러가 나는 건 정상이에요. 빨간 안내를 읽고 고치면 돼요. 막히면 힌트를 한 단계씩 열어요.</p></div>';
  h += '<div class="btnrow"><a class="btn primary" href="#/practice/' + S.id + '/' + ((first < 0 ? 0 : first) + 1) + '">' + (done === 0 ? '1번부터 시작' : first < 0 ? '처음부터 다시' : (first + 1) + '번부터 이어서') + '</a>'
    + (unit ? '<a class="btn" href="#/unit/' + unit.id + '">설명 슬라이드 다시 보기</a>' : '')
    + (ex.some(e => e.run === 'colab') ? '<a class="btn" target="_blank" rel="noopener" href="' + colabUrl(S.id) + '">Colab 노트북 열기</a>' : '') + '</div>';
  h += '<div class="prlist">' + ex.map((e, i) => '<a class="pritem' + (prDone(e.id) ? ' done' : '') + '" href="#/practice/' + S.id + '/' + (i + 1) + '"><span class="prn num">' + (i + 1) + '</span><span class="prt"><b>' + esc(e.title) + '</b><small>' + esc(LEVEL_KO[e.level] || '') + (e.run === 'colab' ? ', Colab' : '') + '</small></span><span class="prs">' + (prDone(e.id) ? '통과' : '') + '</span></a>').join('') + '</div>';
  APP().innerHTML = h;
  renderMath(APP());
  store.last = { href: '#/practice/' + S.id, label: S.title }; save();
}
function practiceExercise(S, i) {
  const e = S.exercises[i], n = S.exercises.length;
  const rec = store.practice[e.id] = store.practice[e.id] || {};
  const colab = e.run === 'colab';
  const startCode = e.level === 'type' ? '' : (e.given || '');
  const passedCount = () => S.exercises.filter(x => prDone(x.id)).length;
  let h = '<div class="ptop"><a class="btn sm" href="#/practice/' + S.id + '">목록</a><div class="ptitle">' + esc(S.title) + ' <small>' + (i + 1) + ' / ' + n + '</small></div><div class="pchips"><span class="chip">' + esc(LEVEL_KO[e.level] || '') + '</span>' + (colab ? '<span class="chip">Colab</span>' : '') + '</div></div>';
  h += '<div class="prwrap"><section class="card prtask"><h1 class="prh">' + esc(e.title) + (rec.done ? ' <span class="prbadge">통과</span>' : '') + '</h1><div class="prgoal">' + fmtc(e.goal) + '</div>'
    + ((e.explain || []).length ? '<ul class="prexp">' + e.explain.map(x => '<li>' + fmtc(x) + '</li>').join('') + '</ul>' : '')
    + (e.level === 'type' && e.show ? '<div class="pl">보고 따라 치기 (복사하지 말고 직접 쳐요)</div><pre class="code noselect">' + esc(e.show) + '</pre>' : '')
    + (e.source ? '<div class="muted prsrc">원본: ' + esc(e.source) + '</div>' : '')
    + '<div id="prHints"></div></section>';
  if (!colab) {
    h += '<section class="card predit"><div class="edhead"><span>내 코드</span><span class="muted" id="pyState"></span></div>'
      + '<div class="edbox"><pre class="gutter" id="gut" aria-hidden="true"></pre><textarea id="ed" class="ed" spellcheck="false" autocapitalize="off" autocomplete="off" autocorrect="off" wrap="off" aria-label="코드 편집기"></textarea></div>'
      + '<div class="keybar" id="keybar">' + ['Tab', '내어쓰기', ':', '(', ')', '[', ']', '{', '}', '_', '=', "'", '"', '#', ',', '.', '+', '*'].map(k => '<button type="button" data-k="' + esc(k) + '">' + esc(k) + '</button>').join('') + '</div>'
      + '<div class="btnrow prbtns"><button class="btn" id="bRun" type="button">실행</button><button class="btn primary" id="bGrade" type="button">채점</button><button class="btn" id="bHint" type="button">힌트</button><button class="btn" id="bReset" type="button">처음 코드로</button><button class="btn" id="bSol" type="button">정답 보기</button></div>'
      + '<div id="pyOut" class="pyoutbox"></div></section>';
  } else {
    const ci = S.exercises.filter(x => x.run === 'colab').indexOf(e) + 1;
    h += '<section class="card predit"><div class="edhead"><span>PyTorch 가 필요해서 Google Colab 에서 해요</span></div>'
      + '<ol class="colabhow"><li><b>Colab 에서 열기</b>를 누르면 이 세트의 노트북이 새 탭에 열려요 (구글 로그인 필요).</li><li>노트북에서 <b>' + ci + '. ' + esc(e.title) + '</b> 를 찾아요.</li><li><b>내 코드 칸</b>을 채워 실행(Shift+Enter)하고, 바로 아래 <b>채점 칸</b>을 실행해요.</li><li><code>통과!</code> 가 나오면 여기서 <b>통과했어요</b>를 눌러요.</li></ol>'
      + (e.given ? '<div class="pl">시작 코드</div><pre class="code">' + esc(e.given) + '</pre>' : '')
      + '<div class="btnrow prbtns"><a class="btn primary" target="_blank" rel="noopener" href="' + colabUrl(S.id) + '">Colab 에서 열기</a><button class="btn" id="bDone" type="button">' + (rec.done ? '통과 표시 취소' : '통과했어요') + '</button><button class="btn" id="bHint" type="button">힌트</button><button class="btn" id="bSol" type="button">정답 보기</button></div>'
      + '<details class="prtests"><summary>채점 칸 코드 보기</summary><pre class="code">' + esc(e.tests) + '</pre></details><div id="pyOut" class="pyoutbox"></div></section>';
  }
  h += '</div><div class="pbar2"><a class="btn' + (i > 0 ? '' : ' disabled') + '" href="#/practice/' + S.id + '/' + i + '">이전</a><span class="pcount num" id="prCount" style="flex:1;text-align:center">' + passedCount() + ' / ' + n + ' 통과</span><a class="btn primary' + (i < n - 1 ? '' : ' disabled') + '" href="#/practice/' + S.id + '/' + (i + 2) + '">다음</a></div>';
  APP().innerHTML = h;
  renderMath(APP());
  store.last = { href: '#/practice/' + S.id + '/' + (i + 1), label: S.title }; save();

  const hints = e.hints || [];
  let shown = rec.hints || 0;
  const drawHints = () => {
    $('#prHints').innerHTML = hints.slice(0, shown).map((x, k) => '<div class="prhint"><b>힌트 ' + (k + 1) + '</b> ' + fmtc(x) + '</div>').join('');
    const b = $('#bHint'); b.textContent = shown >= hints.length ? '힌트 다 봤어요' : '힌트 ' + (shown + 1) + ' / ' + hints.length; b.disabled = shown >= hints.length;
  };
  drawHints();
  $('#bHint').addEventListener('click', () => { shown = Math.min(hints.length, shown + 1); rec.hints = Math.max(rec.hints || 0, shown); save(); drawHints(); });
  const out = $('#pyOut');
  $('#bSol').addEventListener('click', () => {
    if (!rec.done && !(rec.tries >= 1) && !confirm('한 번은 직접 해 보고 보는 게 좋아요. 그래도 정답을 볼까요?')) return;
    rec.sawSolution = true; save();
    out.innerHTML = '<div class="pyres"><b>정답 코드</b><pre class="code">' + esc(e.solution) + '</pre><div class="muted">이해했으면 편집기를 비우고 정답을 안 보고 다시 쳐 봐요. 그래야 내 것이 돼요.</div></div>';
  });
  const passHtml = () => '<div class="pyres good"><b>통과!</b><div>' + fmtc(e.after || '잘했어요.') + '</div>'
    + (e.level === 'type' ? '<div class="muted">한 번 더: 위 코드를 안 보고 다시 쳐 보면 훨씬 오래 기억해요.</div>' : '')
    + '<div class="btnrow">' + (i < n - 1 ? '<a class="btn primary" href="#/practice/' + S.id + '/' + (i + 2) + '">다음 문제</a>' : '<a class="btn primary" href="#/practice/' + S.id + '">세트 끝, 목록으로</a>') + '</div></div>';
  if (colab) {
    $('#bDone').addEventListener('click', () => {
      rec.done = !rec.done; rec.ts = Date.now(); save();
      if (rec.done) { toast('통과!'); out.innerHTML = passHtml(); $('#bDone').textContent = '통과 표시 취소'; }
      else { out.innerHTML = ''; $('#bDone').textContent = '통과했어요'; }
      $('#prCount').textContent = passedCount() + ' / ' + n + ' 통과';
    });
    return;
  }
  const ed = $('#ed'), gut = $('#gut');
  ed.value = rec.code != null && rec.code !== '' ? rec.code : startCode;
  let errLine = 0, codeT = null;
  const drawGutter = () => {
    const cnt = ed.value.split('\n').length; let g = '';
    for (let k = 1; k <= cnt; k++) g += (k === errLine ? '<span class="err">' + k + '</span>' : k) + '\n';
    gut.innerHTML = g; gut.scrollTop = ed.scrollTop;
  };
  const onEdit = () => { drawGutter(); clearTimeout(codeT); codeT = setTimeout(() => { rec.code = ed.value; save(); }, 400); };
  ed.addEventListener('input', onEdit);
  ed.addEventListener('scroll', () => { gut.scrollTop = ed.scrollTop; });
  const insert = txt => { const s = ed.selectionStart, t = ed.selectionEnd; ed.setRangeText(txt, s, t, 'end'); ed.focus(); onEdit(); };
  const dedent = () => {
    const s = ed.selectionStart, v = ed.value, ls = v.lastIndexOf('\n', s - 1) + 1, m = v.slice(ls).match(/^ {1,4}/);
    if (m) { ed.setRangeText('', ls, ls + m[0].length, 'preserve'); ed.selectionStart = ed.selectionEnd = Math.max(ls, s - m[0].length); onEdit(); }
    ed.focus();
  };
  const busy = (b, msg) => { $('#bRun').disabled = b; $('#bGrade').disabled = b; $('#pyState').textContent = msg || ''; };
  const exec = async grade => {
    rec.code = ed.value; save();
    if (/___/.test(ed.value)) {
      const ln = ed.value.split('\n').findIndex(l => l.includes('___')) + 1;
      errLine = ln; drawGutter();
      out.innerHTML = '<div class="pyres bad"><b>빈칸이 남아 있어요, ' + ln + '번째 줄</b><div><code>___</code> 자리를 알맞은 코드로 바꾼 다음 눌러요. 막히면 힌트를 열어요.</div></div>';
      return;
    }
    if (!ed.value.trim()) { out.innerHTML = '<div class="pyres bad"><b>아직 코드가 없어요</b><div>' + (e.level === 'type' ? '위에 보이는 코드를 보면서 편집기에 직접 쳐요.' : '주석에 적힌 순서대로 코드를 써요.') + '</div></div>'; return; }
    const heavy = /^\s*(import|from)\s+(numpy|networkx|scipy)/m.test(ed.value + '\n' + (grade ? e.tests : ''));
    const cold = Py.state !== 'ready' || (heavy && !Py.pk);
    busy(true, Py.state !== 'ready' ? '파이썬 준비 중 (처음 한 번 10~30초)' : heavy && !Py.pk ? 'numpy 같은 도구 불러오는 중' : '실행 중');
    out.innerHTML = '<div class="pyres muted">실행 중이에요...</div>';
    const r = await Py.run(ed.value, grade ? e.tests : '', grade, cold ? 120000 : 12000);
    if (heavy && r.res) Py.pk = true;
    busy(false, '');
    errLine = r.res && r.res.stage === 'code' ? r.res.line : 0; drawGutter();
    let o = '';
    if (r.timeout) o = '<div class="pyres bad"><b>너무 오래 걸려서 멈췄어요</b><div>끝나지 않는 반복(while)이 있는지 확인해요. 실행기는 다시 준비돼요.</div></div>';
    else if (r.err) o = '<div class="pyres bad"><b>실행기를 준비하지 못했어요</b><div>인터넷 연결을 확인하고 다시 눌러 보세요.</div><small>' + esc(r.err) + '</small></div>';
    else {
      const x = r.res;
      if (x.out) o += '<div class="pyout2"><div class="pl">출력</div><pre>' + esc(x.out) + '</pre></div>';
      if (x.stage === 'code') o += '<div class="pyres bad"><b>' + esc(x.etype) + (x.line ? ', ' + x.line + '번째 줄' : '') + '</b><div>' + esc(PY_ERR[x.etype] || '실행 중에 오류가 났어요. 아래 영어 메시지의 마지막 부분을 읽어 봐요.') + '</div><small>' + esc(x.msg) + '</small></div>';
      else if (!grade) { if (!x.out) o += '<div class="pyres">실행됐어요. 출력(print)은 없어요.</div>'; }
      else if (x.ok) o += passHtml();
      else if (x.stage === 'test') o += '<div class="pyres bad"><b>아직이에요</b><div>' + esc(x.msg || '채점 조건을 아직 만족하지 못했어요. 문제를 다시 읽고 힌트를 열어 봐요.') + '</div></div>';
      else o += '<div class="pyres bad"><b>채점하다 오류가 났어요</b><div>문제에서 말한 변수, 함수, 클래스 이름과 똑같이 만들었는지 확인해요.</div><small>' + esc(x.etype + ': ' + x.msg) + '</small></div>';
      if (grade) {
        rec.tries = (rec.tries || 0) + 1;
        if (x.ok && !rec.done) { rec.done = true; rec.ts = Date.now(); const hh = $('.prh'); if (hh) hh.insertAdjacentHTML('beforeend', ' <span class="prbadge">통과</span>'); }
        save(); $('#prCount').textContent = passedCount() + ' / ' + n + ' 통과';
      }
    }
    out.innerHTML = o;
    renderMath(out);
    if (out.scrollIntoView && window.innerWidth < 900) out.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  };
  ed.addEventListener('keydown', ev => {
    if ((ev.ctrlKey || ev.metaKey) && ev.key === 'Enter') { ev.preventDefault(); exec(!ev.shiftKey); return; }
    if (ev.key === 'Tab') { ev.preventDefault(); if (ev.shiftKey) dedent(); else insert('    '); return; }
    if (ev.key === 'Enter' && !ev.isComposing) {
      ev.preventDefault();
      const s = ed.selectionStart, v = ed.value, ls = v.lastIndexOf('\n', s - 1) + 1, line = v.slice(ls, s);
      let ind = (line.match(/^ */) || [''])[0];
      if (/:\s*(#.*)?$/.test(line)) ind += '    ';
      insert('\n' + ind);
    }
  });
  $('#keybar').addEventListener('pointerdown', ev => { if (ev.target.closest('button')) ev.preventDefault(); });
  $('#keybar').addEventListener('click', ev => {
    const b = ev.target.closest('button'); if (!b) return;
    const k = b.dataset.k;
    if (k === 'Tab') insert('    '); else if (k === '내어쓰기') dedent(); else insert(k);
  });
  $('#bRun').addEventListener('click', () => exec(false));
  $('#bGrade').addEventListener('click', () => exec(true));
  $('#bReset').addEventListener('click', () => { if (ed.value !== startCode && !confirm('지금 코드를 지우고 처음 코드로 돌릴까요?')) return; ed.value = startCode; errLine = 0; onEdit(); out.innerHTML = ''; });
  drawGutter();
  if (window.Worker && Py.state === 'off') {
    const st = $('#pyState'); if (st) st.textContent = '파이썬 준비 중';
    Py.start().then(() => { const s2 = $('#pyState'); if (s2 && s2.textContent === '파이썬 준비 중') s2.textContent = '파이썬 준비됨'; }, () => { const s2 = $('#pyState'); if (s2) s2.textContent = '실행기 준비 실패, 인터넷 확인'; });
  }
}

/* ---------- 용어 카드 ---------- */
function pageTerms(week) {
  const all = termsOfWeek(week);
  const back = week === 'all' ? '#/' : '#/week/' + week;
  if (!all.length) { APP().innerHTML = '<a class="back" href="' + back + '">돌아가기</a><div class="empty"><b>아직 용어가 없어요</b></div>'; return; }
  let mode = 'all', dir = 'en', list = [], i = 0, flipped = false;
  const build = () => { list = shuffle(all.filter(t => mode === 'all' || !(store.terms[t.en.toLowerCase()] || {}).known).slice()); i = 0; flipped = false; };
  const draw = () => {
    const known = all.filter(t => (store.terms[t.en.toLowerCase()] || {}).known).length;
    let h = '<a class="back" href="' + back + '">' + (week === 'all' ? '홈' : esc(weekName(week))) + '</a><div class="whead"><div class="eyebrow">용어 카드</div><h1>' + (week === 'all' ? '전 주차 용어' : esc(weekName(week)) + ' 용어') + '</h1><p class="num">' + all.length + '개 중 외운 것 ' + known + '개. 카드를 누르면 뒤집혀요.</p></div>'
      + '<div class="pillrow"><button class="chip' + (mode === 'all' ? ' on' : '') + '" data-m="all" type="button">전부</button><button class="chip' + (mode === 'left' ? ' on' : '') + '" data-m="left" type="button">아직 못 외운 것</button>'
      + '<button class="chip' + (dir === 'en' ? ' on' : '') + '" data-d="en" type="button">영어 보고 뜻</button><button class="chip' + (dir === 'ko' ? ' on' : '') + '" data-d="ko" type="button">뜻 보고 영어</button></div>';
    if (!list.length) h += '<div class="empty"><b>다 외웠어요</b>"전부"를 눌러 한 번 더 넘겨 봐도 좋아요.</div>';
    else {
      const t = list[i], r = store.terms[t.en.toLowerCase()] || { seen: 0 };
      const front = dir === 'en' ? '<div class="fen">' + esc(t.en) + '</div>' : '<div class="fko">' + esc(t.ko) + '</div><div class="fsay">' + esc(t.say) + '</div>';
      const backS = '<div class="fen">' + esc(t.en) + '</div><div class="fko">' + esc(t.ko) + '</div><div class="fsay">' + esc(t.say) + '</div>';
      h += '<div class="flash" style="margin-top:14px"><div class="fcard' + (flipped ? ' flipped' : '') + '" id="fcard" role="button" tabindex="0">' + (flipped ? backS : front + '<div class="funit">눌러서 확인</div>')
        + '<div class="funit num">' + (i + 1) + ' / ' + list.length + ', 지금까지 ' + r.seen + '번 봤어요</div></div></div>'
        + '<div class="btnrow" style="justify-content:center"><button class="btn" id="fAgain" type="button">다시 볼래요</button><button class="btn primary" id="fKnow" type="button">알아요</button></div>';
    }
    APP().innerHTML = h;
    $$('[data-m]').forEach(b => b.addEventListener('click', () => { mode = b.dataset.m; build(); draw(); }));
    $$('[data-d]').forEach(b => b.addEventListener('click', () => { dir = b.dataset.d; flipped = false; draw(); }));
    const fc = $('#fcard');
    if (!fc) return;
    const flip = () => { flipped = !flipped; if (flipped) { const k = list[i].en.toLowerCase(); const r = store.terms[k] || (store.terms[k] = { seen: 0 }); r.seen++; save(); } draw(); };
    fc.addEventListener('click', flip);
    fc.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flip(); } });
    const step = know => {
      const k = list[i].en.toLowerCase(); const r = store.terms[k] || (store.terms[k] = { seen: 0 });
      r.known = know; if (!flipped) r.seen++; save();
      if (!know) list.push(list[i]);
      i++; flipped = false;
      if (i >= list.length) { build(); toast('한 바퀴 돌았어요. 섞어서 다시 시작해요'); }
      draw();
    };
    $('#fKnow').addEventListener('click', () => step(true));
    $('#fAgain').addEventListener('click', () => step(false));
  };
  build(); draw();
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
  ['L0', 'L1', 'L2', 'L3'].forEach(deck => {
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
function pageSettingsLogin() {
  const A = window.SDT, u = A && A.user, I = INK();
  let h = '<a class="back" href="#/">홈</a><div class="whead"><div class="eyebrow">설정</div><h1>로그인</h1><p>PC, 아이패드, 휴대폰에서 같은 기록으로 이어 보려면 Google 계정으로 로그인해요.</p></div>';
  h += '<div class="card stack" style="margin-top:16px"><div class="row" style="justify-content:space-between"><b style="font-size:18px">계정</b><span class="state ' + (u ? 'ok' : 'warn') + '">' + (!A.enabled ? '로그인 쓸 수 없음' : u ? '로그인됨' : '로그인 안 함') + '</span></div>';
  if (A.enabled && u) h += '<p style="margin:0">' + esc(u.displayName || u.email || '내 계정') + ' 님으로 로그인했어요. 기록은 알아서 저장돼요.</p><div class="row"><button class="btn" id="loSync" type="button">지금 맞추기</button><button class="btn" id="loOut" type="button">로그아웃</button></div>';
  else if (A.enabled) h += '<div class="row"><button class="btn primary" id="loIn" type="button">Google 계정으로 로그인</button></div>';
  else h += '<p class="muted" style="margin:0;font-size:14px">사이트 주소로 열면 로그인할 수 있어요. 파일로 열면 이 기기에만 저장돼요.</p>';
  h += '</div><div class="card stack"><b style="font-size:18px">필기</b><div class="row"><button class="chip' + (I && I.tool.fingerNav ? ' on' : '') + '" id="fingerChip" type="button">' + (I && I.tool.fingerNav ? '손가락은 넘기기, 펜만 필기' : '손가락으로도 필기') + '</button></div></div>';
  APP().innerHTML = h;
  const on = (id, fn) => { const el = $(id); if (el) el.addEventListener('click', fn); };
  on('#loIn', () => A.login());
  on('#loOut', () => A.logout().then(() => { toast('로그아웃했어요'); pageSettingsLogin(); }));
  on('#loSync', async () => { await syncPull(false); syncPushNow(); toast('기록을 맞췄어요'); });
  on('#fingerChip', () => { if (!I) return; I.tool.fingerNav = !I.tool.fingerNav; pageSettingsLogin(); });
}
async function pageSettings() {
  if (window.SDT) { pageSettingsLogin(); return; }
  const I = INK();
  const state = I ? await I.Sync.check() : 'local';
  const label = { on: ['켜짐', 'ok'], nokey: ['비밀번호를 넣어 주세요', 'warn'], bad_key: ['비밀번호가 달라요', 'no'], not_configured: ['Vercel 설정이 아직이에요', 'warn'], offline: ['인터넷 연결을 확인해 주세요', 'warn'], local: ['내 PC 파일로 열어서 동기화는 꺼져 있어요', 'warn'] }[state] || ['확인 못 함', 'warn'];
  const inkKeys = I ? await I.keys() : [];
  let h = '<a class="back" href="#/">홈</a><div class="whead"><div class="eyebrow">설정</div><h1>기록 맞추기</h1><p>공부 기록과 필기는 기본으로 이 기기에만 저장돼요. 아래 동기화를 켜면 PC, 아이패드, 휴대폰이 같은 기록을 써요.</p></div>';
  h += '<div class="card stack" style="margin-top:16px"><div class="row" style="justify-content:space-between"><b style="font-size:18px">동기화</b><span class="state ' + label[1] + '">' + label[0] + '</span></div>'
    + '<label for="syncKey" class="muted" style="font-size:14px">비밀번호 (Vercel 에 넣은 SYNC_KEY 와 같게)</label>'
    + '<div class="row"><input type="text" id="syncKey" autocomplete="off" autocapitalize="off" spellcheck="false" value="' + esc(I ? I.Sync.key() : '') + '" style="flex:1;min-width:0"><button class="btn primary" id="syncSave" type="button">저장하고 확인</button></div>'
    + '<div class="row"><button class="btn" id="syncNow" type="button">지금 맞추기</button><span class="muted" id="syncMsg" style="font-size:14px"></span></div>'
    + '<details class="adv"><summary>처음 한 번만: Vercel 에서 켜는 방법</summary><ol class="proc" style="margin-top:10px">'
    + '<li>Vercel 에서 이 프로젝트를 열고 <b>Storage</b> 탭, <b>Create Database</b>, <b>Upstash for Redis</b> (무료 요금제) 를 만든 뒤 이 프로젝트에 <b>Connect</b> 해요.</li>'
    + '<li><b>Settings</b>, <b>Environment Variables</b> 에서 이름 <code>SYNC_KEY</code>, 값은 나만 아는 비밀번호로 추가해요.</li>'
    + '<li><b>Deployments</b> 에서 맨 위 배포의 메뉴를 눌러 <b>Redeploy</b> 해요.</li>'
    + '<li>각 기기에서 이 화면에 같은 비밀번호를 넣고 "저장하고 확인"을 눌러요. 상태가 "켜짐"이면 끝이에요.</li></ol></details></div>';
  h += '<div class="card stack"><b style="font-size:18px">백업 파일</b><p class="muted" style="margin:0">동기화를 안 쓸 때 기기를 옮기는 방법이에요. 필기도 함께 담겨요.</p>'
    + '<div class="row"><button class="btn" id="expAll" type="button">기록 파일로 저장</button><button class="btn" id="impAll" type="button">기록 파일 불러오기</button><input type="file" id="impFile" accept=".json,application/json" hidden></div>'
    + '<p class="muted num" style="margin:0;font-size:14px">푼 문제 ' + Object.keys(store.seen).length + '개, 필기한 쪽 ' + inkKeys.length + '개</p></div>';
  h += '<div class="card stack"><b style="font-size:18px">필기</b><div class="row"><button class="chip' + (I && I.tool.fingerNav ? ' on' : '') + '" id="fingerChip" type="button">' + (I && I.tool.fingerNav ? '손가락은 넘기기, 펜만 필기' : '손가락으로도 필기') + '</button></div><p class="muted" style="margin:0;font-size:14px">애플펜슬을 한 번 쓰면 자동으로 "펜만 필기"로 바뀌어요.</p></div>';
  APP().innerHTML = h;
  const msg = m => { $('#syncMsg').textContent = m; };
  $('#syncSave').addEventListener('click', async () => {
    if (!I) return; I.Sync.setKey($('#syncKey').value.trim());
    const s = await I.Sync.check();
    if (s === 'on') { toast('동기화를 켰어요'); await syncPull(false); syncPushNow(); }
    pageSettings();
  });
  $('#syncNow').addEventListener('click', async () => {
    if (!I || !I.Sync.enabled()) { msg('먼저 비밀번호를 저장해 주세요'); return; }
    msg('맞추는 중'); await syncPull(false); syncPushNow();
    const all = await I.all(); let n = 0;
    for (const k of Object.keys(all)) { if (await I.Sync.push('ink:' + k, all[k])) n++; }
    msg('기록과 필기 ' + n + '쪽을 맞췄어요');
  });
  $('#fingerChip').addEventListener('click', () => { if (!I) return; I.tool.fingerNav = !I.tool.fingerNav; try { localStorage.setItem('gnn_ink_tool', JSON.stringify(I.tool)); } catch (e) { /* 무시 */ } pageSettings(); });
  $('#expAll').addEventListener('click', async () => {
    const data = JSON.stringify({ app: 'gnn2026', at: new Date().toISOString(), store: progressData(), extra: store.extra, ink: I ? await I.all() : {} });
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([data], { type: 'application/json' })); a.download = 'GNN_기록_' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500); toast('기록 파일을 저장했어요');
  });
  $('#impAll').addEventListener('click', () => $('#impFile').click());
  $('#impFile').addEventListener('change', function () {
    const f = this.files[0]; if (!f) return; const r = new FileReader();
    r.onload = async () => {
      try {
        const d = JSON.parse(r.result);
        mergeProgress(d.store || d);
        if (Array.isArray(d.extra)) store.extra = store.extra.concat(d.extra);
        if (d.ink && I) for (const k of Object.keys(d.ink)) { const loc = await I.getPage(k); if (!loc || (d.ink[k].updated || 0) > (loc.updated || 0)) await I.putPage(k, d.ink[k]); }
        saveNow(); toast('기록을 불러왔어요'); pageSettings();
      } catch (e) { toast('이 파일은 공부 기록 형식이 아니에요'); }
    };
    r.readAsText(f); this.value = '';
  });
}

/* ---------- 문제 풀기 ---------- */
const st = { type: 'all', level: 'all', scope: 'all', unit: '', n: 20, mode: 'all', deck: [], pos: 0, cur: null, session: null, mock: null };
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
  st.type = q.type || 'all'; st.level = q.level || 'all'; st.scope = q.week || 'all'; st.mode = q.mode || 'all'; st.unit = q.unit || ''; st.n = q.n ? +q.n : 20;
  const weekOpts = [['all', '전체']].concat(META.weeks.filter(w => BANK.some(x => x.part === w.id)).map(w => [w.id, w.short]));
  const h = '<div class="whead" style="padding-top:22px"><div class="eyebrow">문제은행</div><h1>문제 풀기</h1><p>계산은 칸마다 채점하고 풀이를 한 단계씩 보여 줘요. 서술은 영어로 써 보고 모범답안과 대조해요. 계산할 때는 "필기"를 눌러 문제 위에 바로 써도 돼요.</p></div>'
    + '<div class="card" id="setup" style="margin-top:14px">'
    + chipRow('유형', 'type', [['all', '전체 섞기'], ['calc', '계산'], ['essay', '서술(영어)'], ['mcq', '객관식'], ['short', '주관식'], ['ox', 'O/X']], st.type)
    + chipRow('난이도', 'level', [['all', '전체'], ['basic', '기본'], ['hard', '심화']], st.level)
    + chipRow('범위', 'scope', weekOpts, st.scope)
    + chipRow('문항 수', 'n', [[10, '10'], [20, '20'], [40, '40'], [0, '전부']], st.n)
    + chipRow('모드', 'mode', [['all', '모든 문제'], ['wrong', '오답만'], ['unseen', '아직 안 푼 문제']], st.mode)
    + (st.unit ? '<div class="row"><span class="cap">단원</span><button class="chip on" id="unitChip" type="button">' + esc(st.unit) + ' (누르면 해제)</button></div>' : '')
    + '<div class="btnrow" style="margin-top:16px"><button class="btn primary" id="startBtn" type="button">시작하기</button><a class="btn" href="#/mock' + (st.scope !== 'all' ? '?week=' + st.scope : '') + '">모의고사</a><button class="btn" id="resetBtn" type="button">푼 기록 초기화</button></div>'
    + '<div class="stat" id="setupStat"></div></div><div id="qstage"></div>';
  APP().innerHTML = h;
  const bind = (attr, key, num) => $$('[data-' + attr + ']').forEach(b => b.addEventListener('click', () => {
    $$('[data-' + attr + ']').forEach(x => x.classList.remove('on')); b.classList.add('on');
    st[key] = num ? +b.dataset[attr] : b.dataset[attr]; updateStat();
  }));
  bind('type', 'type'); bind('level', 'level'); bind('scope', 'scope'); bind('n', 'n', true); bind('mode', 'mode');
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
  if (window.SDTPet) window.SDTPet.onAnswer(q, ok, { review: petReview });
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
  return '<div class="qmeta"><span>' + mock + '<span class="tag ' + q.type + '">' + TYPE_NAME[q.type] + '</span><span class="lvl ' + esc(q.level) + '">' + (LEVEL_NAME[q.level] || '') + '</span>' + esc(weekName(q.part)) + ', ' + esc(q.unit || '') + (q.slides ? ' <span class="muted">(' + esc(q.slides) + ')</span>' : '') + '</span>'
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
  const override = ok => { if (!done || verdict === ok) return; unrecord(q, verdict); verdict = ok; show(ok); record(q, ok, mine || '(빈 답)'); toast(ok ? '맞은 걸로 기록했어요' : '틀린 걸로 기록했어요'); };
  $('#chk', s).addEventListener('click', check);
  $('#ans', s).addEventListener('keydown', ev => { if (ev.key === 'Enter') { ev.stopPropagation(); ev.preventDefault(); check(); } });
  $('#markOk', s).addEventListener('click', () => override(true));
  $('#markNo', s).addEventListener('click', () => override(false));
  $('#nx', s).addEventListener('click', qNext);
  keyHandler(k => { if (done && k === 'Enter') qNext(); });
}
function rCalc(q) {
  let h = '<div class="card">' + qHead(q) + '<div class="qtext en">' + fmt(q.q) + '</div>';
  if (q.qko) h += '<div class="qko"><span class="lbl">한국어</span>' + fmt(q.qko) + '</div>';
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
  const override = ok => { if (!done || verdict === ok) return; unrecord(q, verdict); verdict = ok; record(q, ok, mine); toast(ok ? '맞은 걸로 기록했어요' : '틀린 걸로 기록했어요'); const e = $('#expl', s); e.className = 'expl on ' + (ok ? 'good' : 'bad'); $('.lbl', e).textContent = ok ? '정답' : '오답'; };
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
  let h = '<div class="card">' + qHead(q) + '<div class="qtext en">' + fmt(q.q) + '</div>' + (q.qko ? '<div class="qko"><span class="lbl">한국어</span>' + fmt(q.qko) + '</div>' : '')
    + '<textarea id="ans" placeholder="시험처럼 영어로 써 보세요. 막히면 한국어로라도. 다 쓰면 모범답안과 대조해요."></textarea>'
    + '<div class="btnrow"><button class="btn primary" id="showKey" type="button">모범답안 보기</button><button class="btn" id="skip" type="button">건너뛰기</button></div><div class="keylist" id="keylist">';
  if (q.answer) h += '<div class="model"><span class="lbl">모범답안 (영어)</span>' + fmt(q.answer) + (q.answer_ko ? '<div class="ko">' + fmt(q.answer_ko) + '</div>' : '') + '</div>';
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
  APP().innerHTML = '<div class="whead" style="padding-top:22px"><div class="eyebrow">시험지처럼</div><h1>모의고사</h1><p>교수님 시험처럼 모델마다 서술(a)과 계산(b)이 한 쌍으로 나와요. 최대 12개 모델. 먼저 오답노트에서 틀린 것을 다시 풀고 오면 좋아요.</p></div>'
    + '<div class="card" style="margin-top:14px">' + chipRow('범위', 'scope', weekOpts, st.scope) + chipRow('난이도', 'level', [['all', '전체'], ['basic', '기본'], ['hard', '심화']], st.level)
    + '<div class="btnrow"><button class="btn primary" id="mockGo" type="button">모의고사 시작</button><a class="btn" href="#/wrong">오답노트 먼저</a></div></div><div id="qstage"></div>';
  $$('[data-scope]').forEach(b => b.addEventListener('click', () => { $$('[data-scope]').forEach(x => x.classList.remove('on')); b.classList.add('on'); st.scope = b.dataset.scope; }));
  $$('[data-level]').forEach(b => b.addEventListener('click', () => { $$('[data-level]').forEach(x => x.classList.remove('on')); b.classList.add('on'); st.level = b.dataset.level; }));
  $('#mockGo').addEventListener('click', startMock);
  cleanup = () => keyHandler(null);
}
function startMock() {
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
    let h = '<div class="witem' + (w.resolved ? ' resolved' : '') + '" data-id="' + esc(q.id) + '"><span class="tag ' + q.type + '">' + TYPE_NAME[q.type] + '</span><span class="lvl ' + esc(q.level) + '">' + (LEVEL_NAME[q.level] || '') + '</span><span class="muted" style="font-size:12.5px">' + esc(weekName(q.part)) + ', ' + esc(q.unit || '') + '</span><div class="wq">' + fmt(q.q) + '</div>';
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

/* ---------- 기출 분석, 답안 팁 ---------- */
function pageStatic(name) {
  const html = (window.GNN_PAGES || {})[name] || '<div class="empty"><b>준비 중</b></div>';
  APP().innerHTML = '<div class="wrap" id="' + name + '">' + html + '</div>';
  renderMath(APP());
  countTerms(APP());
}

/* ---------- 시작 ---------- */
$('#topBtn').addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
window.addEventListener('scroll', () => { $('#hdr').classList.toggle('scrolled', window.scrollY > 8); }, { passive: true });
window.addEventListener('hashchange', route);
/* 메뉴 줄: 마우스 휠을 옆으로 스크롤로 */
(function () { const nv = document.getElementById('nav'); if (!nv) return; nv.addEventListener('wheel', e => { if (nv.scrollWidth > nv.clientWidth + 2 && Math.abs(e.deltaY) > Math.abs(e.deltaX)) { nv.scrollLeft += e.deltaY; e.preventDefault(); } }, { passive: false }); })();
window.SDTApp = { get store() { return store; }, save, toast, startDeck, BANK, BY_ID, weekName, META };
if (window.SDT) window.SDT.onAuth(u => { if (u) syncPull(true); });
route();
syncPull(true);
})();
