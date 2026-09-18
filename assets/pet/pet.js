/* 몽글 펫: 사이트 어디서나 같이 다니는 내 펫
   - 처음에 동물을 고르고 이름을 지어 줘요. 퀴즈를 맞히면 간식 돈이 조금씩 모여요(모으기 어렵게).
   - 사료, 간식, 장난감, 옷, 장기(앉아, 손, 빙글빙글, 윙크 애교 ...). 레벨 대신 "친해진 정도"로 자라요.
   - 하트 벌칙(틀리면 하트가 줄고 0이면 새 문제 잠김)은 meta.pet 을 켠 과목(근현대)만.
   - 펫 이름은 모두 달라야 해요 (pet3Names/{이름 열쇠}). 데려올 때와 이름, 동물을 바꿀 때 로그인해 있으면 이름 자리를 잡아요.
   - 로그인하면 pet3Presence/{uid} 를 1분마다 갱신. 데스크톱 펫 프로그램은 서로 친구인 사람 것만 읽어 깨어 있는 펫은 걷고, 아니면 자게 그린다.
   - 내 펫 페이지(pet/)의 "친구" 칸: 친구 펫 이름으로 요청, 수락, 끊기, 콕 찌르기. 서로 친구 추가한 사람끼리만 펫이 같이 나오고 채팅한다.
   - 2026-09-17 모두 새로 시작: 예전 "sdt_pet_v2", pet__state, petCodes/petFriends/... 는 읽지 않는다.
   저장: localStorage "sdt_pet_v3", 로그인하면 Firebase users/{uid}/stores/pet3__state 에도 저장 (데스크톱 펫 프로그램도 같은 문서를 읽고 쓴다) */
(function () {
'use strict';

const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const now = () => Date.now();
const dayKey = t => { const d = new Date(t || now()); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const dayDiff = (a, b) => Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 86400000);
const app = () => window.SDTApp || null;
const META = () => window.SDT_META || {};
const strict = () => !!META().pet;          // 하트가 0이면 새 문제를 잠그는 과목 (근현대)
const LKEY = 'sdt_pet_v3';
const OLD_KEYS = ['sdt_pet_v2'];         // 예전 펫 (모두 새로 시작해서 지운다)
const REMOTE = 'pet3__state';
const VER = 3;
const PAGE = () => !!document.getElementById('petPage');

const RULE = { heartsMax: 5, heartRegenMin: 30, goal: 10, coin: 3, reviewBonus: 2, love: 2, goalCoins: 10, bossN: 15, bossPass: 12, bossCoins: 60 };

/* ---------- 동물 ---------- */
const SPECIES = [
  { id: 'puppy', animal: '강아지', name: '콩이', body: '#FFF3DE', belly: '#FFFFFF', ear: 'puppy', inner: '#C9956B', mouth: 'bear', patch: '#E3B58B' },
  { id: 'cat', animal: '고양이', name: '나비', body: '#FFE1BD', belly: '#FFF6EA', ear: 'cat', inner: '#FFB8B8', mouth: 'cat', mark: '#F5B97F' },
  { id: 'capybara', animal: '카피바라', name: '카피', body: '#BC8A5F', belly: '#DDB088', ear: 'none', inner: '#8A6248', mouth: 'capy', capy: true },
  { id: 'guinea', animal: '기니피그', name: '뭉치', body: '#FFFDF8', belly: '#FFFFFF', ear: 'petal', inner: '#F4B9A8', mouth: 'guinea', potato: true, patch: '#EFA35E', patch2: '#7A5642' },
  { id: 'lizard', animal: '도마뱀', name: '초롱', body: '#8FD77A', belly: '#D9F5C5', ear: 'none', inner: '#8FD77A', mouth: 'smile', tail: 'lizard', eyesUp: true, spots: '#6BBF5A' },
  { id: 'otter', animal: '해달', name: '조개', body: '#B89478', belly: '#F2E4D6', ear: 'small', inner: '#9C7A60', mouth: 'bear', face: '#F2E4D6', faceRy: 20, shell: true },
];
const SP = {}; SPECIES.forEach(s => { SP[s.id] = s; });

/* 옷장 */
const WEAR = [
  { id: 'none', slot: 'head', name: '없음', cost: 0 },
  { id: 'ribbon', slot: 'head', name: '리본', cost: 90 },
  { id: 'flower', slot: 'head', name: '꽃 핀', cost: 90 },
  { id: 'beret', slot: 'head', name: '베레모', cost: 160 },
  { id: 'crown', slot: 'head', name: '작은 왕관', cost: 300 },
  { id: 'nothing', slot: 'neck', name: '없음', cost: 0 },
  { id: 'scarf', slot: 'neck', name: '목도리', cost: 120 },
  { id: 'bow', slot: 'neck', name: '나비넥타이', cost: 120 },
  { id: 'plain', slot: 'face', name: '없음', cost: 0 },
  { id: 'glasses', slot: 'face', name: '동그란 안경', cost: 140 },
];
const TRICKS = [
  // 하루 새 문제 20개쯤 풀면 3주 안팎에 다 배우도록 (2026-09-17 조정: 값 합계 920 -> 600, 배고픔 4 -> 2.5, 심심함 3 -> 2 per 시간)
  { id: 'sit', name: '앉아', need: 20, cost: 30, anim: 'sit', say: '앉았어요, 칭찬해 줘요' },
  { id: 'paw', name: '손', need: 50, cost: 45, anim: 'paw', say: '손! 여기요' },
  { id: 'spin', name: '빙글빙글', need: 90, cost: 60, anim: 'spin', say: '빙글빙글, 어지러워' },
  { id: 'wink', name: '윙크 애교', need: 140, cost: 80, anim: 'wink', say: '뿅, 반했죠?' },
  { id: 'jump', name: '점프', need: 200, cost: 100, anim: 'jump', say: '높이 뛰었어요' },
  { id: 'roll', name: '데굴데굴', need: 280, cost: 125, anim: 'roll', say: '데굴데굴 굴렀어요' },
  { id: 'dance', name: '엉덩이 춤', need: 380, cost: 160, anim: 'dance', say: '신난다 신난다' },
];
const FOODS = [
  { id: 'meal', name: '사료', cost: 12, food: 30, fun: 4, love: 1, say: '냠냠, 배불러요' },
  { id: 'snack', name: '간식', cost: 25, food: 12, fun: 18, love: 4, say: '간식이다! 고마워요' },
  { id: 'play', name: '장난감', cost: 40, food: -6, fun: 35, love: 6, say: '한 번 더 던져 줘요' },
];
const GROW = [{ at: 0, name: '아기', scale: 0.82 }, { at: 60, name: '꼬마', scale: 0.92 }, { at: 200, name: '어린이', scale: 1 }];
const growOf = love => { let g = GROW[0]; GROW.forEach(x => { if (love >= x.at) g = x; }); return g; };

/* CARE-BEGIN: 돌보기 규칙 (사이트와 펫 프로그램이 같이 씀. 펫 프로그램은 tools/sync-art.js 가 src/care.js 로 복사)
   모든 수치는 careTs 부터 지난 시간으로 계산해서 어느 기기에서 보든 같다.
   배부름 food(시간당 -2.5), 기분 fun(-2), 목마름 water(-3, 물은 공짜), 깨끗함 clean(-1, 씻기기 공짜),
   밤(22시~7시)에는 졸려요. 재우면 sleepTs, 아침 7시까지 잔다. 하루 넘게 안 오면 보고 싶었어요.
   돌보지 않아도 펫이나 간식 돈을 잃지 않는다: 슬픈 얼굴, 느린 걸음, 배고프거나 목마르면(10 이하) 장기를 안 한다. */
const CARE = { food: 2.5, fun: 2, water: 3, clean: 1, low: 35, dirty: 30, hungry: 10, thirsty: 10, sad: 15, nightFrom: 22, nightTo: 7, sleepMs: 10 * 3600000, missMs: 24 * 3600000, askGapMs: 25 * 60000 };
const careClamp = (x, a, b) => Math.max(a, Math.min(b, x));
const careDay = t => { const d = new Date(t); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const careNight = t => { const h = new Date(t).getHours(); return h >= CARE.nightFrom || h < CARE.nightTo; };
// 자고 있나: 밤에 재웠고 아직 아침이 안 됐으면
function careAsleep(s, t) {
  if (!s.sleepTs || t - s.sleepTs > CARE.sleepMs) return false;
  const wake = new Date(s.sleepTs); if (wake.getHours() >= CARE.nightTo) wake.setDate(wake.getDate() + 1); wake.setHours(CARE.nightTo, 0, 0, 0);
  return t < wake.getTime();
}
// 시간이 지난 만큼 줄인다 (하트는 30분마다 하나씩 찬다)
function careTick(s, t) {
  if (typeof s.water !== 'number') s.water = 80;
  if (typeof s.clean !== 'number') s.clean = 80;
  if (s.hearts < RULE.heartsMax) {
    const step = RULE.heartRegenMin * 60000, n = Math.floor((t - (s.heartTs || t)) / step);
    if (n > 0) { s.hearts = Math.min(RULE.heartsMax, s.hearts + n); s.heartTs = s.hearts >= RULE.heartsMax ? t : s.heartTs + n * step; }
  } else s.heartTs = t;
  const h = (t - (s.careTs || t)) / 3600000;
  if (h > 0.05) {
    const slow = careAsleep(s, t) ? 0.4 : 1;   // 자는 동안은 천천히 줄어든다
    s.food = careClamp(s.food - h * CARE.food * slow, 0, 100); s.fun = careClamp(s.fun - h * CARE.fun * slow, 0, 100);
    s.water = careClamp(s.water - h * CARE.water * slow, 0, 100); s.clean = careClamp(s.clean - h * CARE.clean, 0, 100);
    s.careTs = t;
  }
  return s;
}
function careMood(s, t) {
  if (careAsleep(s, t)) return 'sleep';
  return (s.food <= CARE.hungry || s.water <= CARE.thirsty || s.fun <= CARE.sad) ? 'sad' : 'normal';
}
// 지금 원하는 것 (급한 순서). 각 { id, text, action, urgent }
function careNeeds(s, t) {
  if (!s || !s.adopted) return [];
  const out = [];
  const asleep = careAsleep(s, t);
  if (s.seenTs && t - s.seenTs > CARE.missMs) out.push({ id: 'miss', text: '보고 싶었어요! 쓰다듬어 줘요', action: 'pet', urgent: true });
  if (asleep) return out;
  if (s.water <= CARE.low) out.push({ id: 'thirsty', text: '목말라요, 물 주세요', action: 'water', urgent: s.water <= CARE.thirsty });
  if (s.food <= CARE.low) out.push({ id: 'hungry', text: '배고파요, 밥 주세요', action: 'feed', urgent: s.food <= CARE.hungry });
  if (s.fun <= CARE.low) out.push({ id: 'bored', text: '심심해요, 놀아 줘요', action: 'play', urgent: s.fun <= CARE.sad });
  if (s.clean <= CARE.dirty) out.push({ id: 'dirty', text: '꼬질꼬질해요, 씻겨 줘요', action: 'bath', urgent: s.clean <= 10 });
  if (careNight(t) && !(s.sleepTs && t - s.sleepTs < CARE.sleepMs)) out.push({ id: 'sleepy', text: '졸려요, 재워 주세요', action: 'sleep', urgent: false });
  return out.sort((a, b) => Number(b.urgent) - Number(a.urgent));
}
// 방해 금지: s.dnd = { on, from, to } (시). 그 시간에는 조르지 않는다
function careQuiet(s, t) {
  const d = s && s.dnd; if (!d || !d.on) return false;
  const h = new Date(t).getHours(), a = Number(d.from), b = Number(d.to);
  return a === b ? false : a < b ? (h >= a && h < b) : (h >= a || h < b);
}
// 돌보기 한 번. 돌려주는 값 { ok, msg, anim, learned }
function careDo(s, kind, arg, t) {
  careTick(s, t);
  const day = careDay(t);
  if (kind === 'feed') {
    const f = FOODS.find(x => x.id === arg); if (!f) return { ok: false, msg: '' };
    if (s.coins < f.cost) return { ok: false, msg: '코인이 모자라요. 문제를 맞히면 모여요' };
    s.coins -= f.cost; s.food = careClamp(s.food + f.food, 0, 100); s.fun = careClamp(s.fun + f.fun, 0, 100); s.love += f.love;
    return { ok: true, msg: f.say, anim: 'eat' };
  }
  if (kind === 'water') {
    const before = s.water;
    s.water = 100;
    if (before <= 60 && (!s.waterTs || t - s.waterTs > 20 * 60000)) s.love += 1;
    s.waterTs = t;
    return { ok: true, msg: before >= 90 ? '지금은 목 안 말라요' : '꿀꺽꿀꺽, 시원해요', anim: 'drink' };
  }
  if (kind === 'bath') {
    const before = s.clean;
    s.clean = 100;
    if (before <= 60) { s.love += 1; s.fun = careClamp(s.fun + 5, 0, 100); }
    return { ok: true, msg: before >= 90 ? '벌써 뽀송뽀송해요' : '보글보글, 뽀송뽀송해졌어요', anim: 'bath' };
  }
  if (kind === 'sleep') {
    if (!careNight(t)) return { ok: false, msg: '아직 안 졸려요. 밤이 되면 재워 주세요' };
    s.sleepTs = t;
    return { ok: true, msg: '잘 자요, 내일 봐요', anim: 'sleep' };
  }
  if (kind === 'wake') { s.sleepTs = 0; return { ok: true, msg: '으음, 잘 잤어요', anim: 'hop' }; }
  if (kind === 'pet') {
    s.petDay = s.petDay || {};
    if ((s.petDay[day] || 0) < 10) { s.petDay[day] = (s.petDay[day] || 0) + 1; s.love += 1; s.fun = careClamp(s.fun + 2, 0, 100); }
    s.seenTs = t;
    return { ok: true, msg: '', anim: 'love' };
  }
  if (kind === 'trick') {
    const k = TRICKS.find(x => x.id === arg); if (!k) return { ok: false, msg: '' };
    s.tricks = s.tricks || {};
    if (s.food <= CARE.hungry || s.water <= CARE.thirsty) return { ok: false, msg: '배고프고 목말라서 장기를 못 해요. 밥이랑 물 먼저 주세요' };
    if (careAsleep(s, t)) return { ok: false, msg: '쿨쿨 자고 있어요' };
    let learned = false;
    if (!s.tricks[arg]) {
      if (s.love < k.need) return { ok: false, msg: '더 친해지면 배울 수 있어요' };
      if (s.coins < k.cost) return { ok: false, msg: '연습용 간식 돈 ' + k.cost + '개가 필요해요' };
      s.coins -= k.cost; s.tricks[arg] = day; s.love += 5; learned = true;
    }
    return { ok: true, msg: k.say, anim: 'trick', learned };
  }
  if (kind === 'wear') {
    const it = WEAR.find(x => x.id === arg); if (!it) return { ok: false, msg: '' };
    s.owned = s.owned || {}; s.wear = s.wear || {};
    let bought = false;
    if (!s.owned[arg]) {
      if (s.coins < it.cost) return { ok: false, msg: '코인 ' + it.cost + '개가 필요해요' };
      s.coins -= it.cost; s.owned[arg] = 1; bought = true;
    }
    s.wear[it.slot] = arg;
    return { ok: true, msg: bought ? it.name + ' 샀어요!' : '', anim: 'hop' };
  }
  return { ok: false, msg: '' };
}
/* CARE-END */

/* 개인기 자세: 부위(꼬리, 뒷발, 몸, 머리, 앞발)를 따로 움직여 실제 자세를 그린다.
   값: all(펫 전체), body(몸, 발 높이 기준 크기), head(머리), hindL/hindR(뒷발), armL/armR(앞발), tail
   각 부위 { dx, dy, r(도), s(크기), sx, sy }. mood 는 표정, back 은 뒤돌아본 모습, wink 는 한쪽 눈 감기,
   upside 는 배를 보이고 누운 모습(입을 뒤집어 웃게), heart 는 머리 옆 하트, air 는 그림자를 작게 */
const PET_POSES = {
  none: {},
  sit: { body: { sy: 0.9 }, head: { dy: 7 }, hindL: { dx: -8, dy: 1, r: -38 }, hindR: { dx: 8, dy: 1, r: 38 }, armL: { dx: 7, dy: 8 }, armR: { dx: -7, dy: 8 }, mood: 'happy' },
  paw: { body: { sy: 0.9 }, head: { dy: 7, r: -7 }, hindL: { dx: -8, dy: 1, r: -38 }, hindR: { dx: 8, dy: 1, r: 38 }, armL: { dx: 7, dy: 8 }, armR: { dx: 13, dy: -22, r: -40, s: 1.3 }, mood: 'normal', blush: true },
  side: { all: { sx: 0.66 }, head: { dx: 13 }, tail: { dx: -6 }, armL: { dx: 8 }, armR: { dx: 8 }, mood: 'normal' },
  back: { back: true, mood: 'normal' },
  side2: { all: { sx: 0.66 }, head: { dx: -13 }, tail: { dx: 6 }, armL: { dx: -8 }, armR: { dx: -8 }, mood: 'normal' },
  wink: { head: { r: -11, dx: -2 }, armL: { dx: 5, dy: -10, r: 30 }, wink: true, blush: true, heart: true, mood: 'normal' },
  crouch: { all: { sx: 1.12, sy: 0.84 }, armL: { dy: 3 }, armR: { dy: 3 }, mood: 'happy' },
  air: { all: { dy: -24 }, hindL: { dx: -4, dy: 6, r: 22, sy: 1.25 }, hindR: { dx: 4, dy: 6, r: -22, sy: 1.25 }, armL: { dx: -14, dy: -18, r: 45 }, armR: { dx: 14, dy: -18, r: -45 }, mood: 'happy', air: true },
  roll1: { all: { r: -90, dx: 8, dy: 8 }, armL: { dy: -6 }, armR: { dy: -6 }, mood: 'happy' },
  roll2: { all: { r: 180, dy: -4 }, hindL: { r: -25 }, hindR: { r: 25 }, armL: { dx: -4, dy: -3, r: -30 }, armR: { dx: 4, dy: -3, r: 30 }, upside: true, mood: 'normal' },
  roll3: { all: { r: 180, dy: -4 }, hindL: { r: 20, dy: -3 }, hindR: { r: -20, dy: -3 }, armL: { dx: 3, dy: -6, r: 25 }, armR: { dx: -3, dy: -6, r: -25 }, upside: true, mood: 'normal' },
  roll4: { all: { r: 90, dx: -8, dy: 8 }, armL: { dy: -6 }, armR: { dy: -6 }, mood: 'happy' },
  danceL: { body: { r: -10 }, tail: { r: -18 }, hindL: { dy: -6, r: -12 }, armR: { dx: 4, dy: -12, r: -35 }, head: { dx: -3, r: 6 }, mood: 'happy' },
  danceR: { body: { r: 10 }, tail: { r: 18 }, hindR: { dy: -6, r: 12 }, armL: { dx: -4, dy: -12, r: 35 }, head: { dx: 3, r: -6 }, mood: 'happy' },
};
/* 개인기마다 자세 순서 [자세, 밀리초]. 사이트와 펫 프로그램이 같이 쓴다 */
const TRICK_FRAMES = {
  sit: [['crouch', 160], ['sit', 1500]],
  paw: [['sit', 380], ['paw', 1300], ['sit', 300]],
  spin: [['side', 130], ['back', 170], ['side2', 130], ['none', 120], ['side', 130], ['back', 170], ['side2', 130], ['none', 200]],
  wink: [['none', 150], ['wink', 1500]],
  jump: [['crouch', 260], ['air', 420], ['crouch', 170], ['none', 150], ['crouch', 200], ['air', 420], ['crouch', 170], ['none', 200]],
  roll: [['crouch', 180], ['roll1', 220], ['roll2', 300], ['roll3', 300], ['roll2', 300], ['roll3', 300], ['roll4', 220], ['none', 250]],
  dance: [['danceL', 230], ['danceR', 230], ['danceL', 230], ['danceR', 230], ['danceL', 230], ['danceR', 230], ['none', 200]],
};

/* ---------- 그림 (동글동글 벡터) ---------- */
function petSvg(pet, opt) {
  opt = opt || {};
  const sp = SP[pet.sp] || SPECIES[0];
  const P = PET_POSES[opt.pose || (opt.trick === 'wink' ? 'wink' : '')] || PET_POSES.none;
  const posed = P !== PET_POSES.none;
  const mood = posed && P.mood && opt.mood !== 'sleep' ? P.mood : (opt.mood || 'normal');   // normal, happy, sad, sleep
  const back = !!P.back, wink = !!P.wink;
  const w = pet.wear || {};
  const B = sp.body, L = sp.belly, O = '#5B4A48', INK = '#3A2E2C';
  const kind = sp.capy ? 'capy' : sp.potato ? 'potato' : 'round';
  // 부위 기준점: 뒷발, 앞발, 머리 돌리는 점
  const RIG = {
    round: { hindL: [44, 108], hindR: [76, 108], armL: [46, 99], armR: [74, 99], head: [60, 84], tail: [84, 100] },
    potato: { hindL: [30, 108], hindR: [90, 108], armL: [48, 110], armR: [72, 110], head: [60, 76], tail: [60, 100] },
    capy: { hindL: [83, 104], hindR: [97, 104], armL: [43, 104], armR: [61, 104], head: [58, 96], tail: [108, 90] },
  }[kind];
  const n = v => Math.round(v * 100) / 100;
  const tf = (a, t) => {
    if (!t) return '';
    const s = t.s || 1, sx = n((t.sx || 1) * s), sy = n((t.sy || 1) * s);
    return 'translate(' + n(a[0] + (t.dx || 0)) + ' ' + n(a[1] + (t.dy || 0)) + ') rotate(' + (t.r || 0) + ') scale(' + sx + ' ' + sy + ') translate(' + (-a[0]) + ' ' + (-a[1]) + ')';
  };
  const grp = (a, t, inner) => (inner ? (t ? '<g transform="' + tf(a, t) + '">' + inner + '</g>' : inner) : '');

  /* 얼굴 */
  const EY = kind === 'capy' ? 49 : sp.eyesUp ? 40 : 57;
  const EX = kind === 'capy' ? [44, 72] : sp.eyesUp ? [44, 76] : [46, 74];
  const arc = (x, y, up) => '<path d="M' + (x - 6) + ' ' + y + ' Q' + x + ' ' + (up ? y - 8 : y + 5) + ' ' + (x + 6) + ' ' + y + '" stroke="' + INK + '" stroke-width="3" fill="none" stroke-linecap="round"/>';
  const openEye = x => {
    if (kind === 'capy') return '<ellipse cx="' + x + '" cy="49" rx="3.4" ry="3.9" fill="' + INK + '"/><circle cx="' + (x + 1.3) + '" cy="47.6" r="1.3" fill="#FFF"/>';
    if (sp.eyesUp) { const px = x + (x < 60 ? 1 : -1); return '<circle cx="' + x + '" cy="40" r="11" fill="#FFFFFF" stroke="' + O + '" stroke-width="2.4"/><circle cx="' + px + '" cy="41" r="4.6" fill="' + INK + '"/><circle cx="' + (px + 1.4) + '" cy="39" r="1.6" fill="#FFF"/>'; }
    return '<ellipse cx="' + x + '" cy="57" rx="5.2" ry="6.4" fill="' + INK + '"/><circle cx="' + (x + 1.8) + '" cy="54.4" r="2" fill="#FFF"/><circle cx="' + (x - 1.4) + '" cy="59.6" r="1" fill="#FFF"/>';
  };
  let eyes;
  const ay = kind === 'capy' ? 50 : 59;
  if (mood === 'sleep') eyes = arc(EX[0], ay - 1, false) + arc(EX[1], ay - 1, false);
  else if (mood === 'happy') eyes = arc(EX[0], ay + 1, true) + arc(EX[1], ay + 1, true);
  else {
    const useUp = sp.eyesUp && mood !== 'sad';
    const ex = useUp ? EX : kind === 'capy' ? EX : [46, 74];
    const oe = x => (useUp || kind === 'capy' ? openEye(x) : '<ellipse cx="' + x + '" cy="57" rx="5.2" ry="6.4" fill="' + INK + '"/><circle cx="' + (x + 1.8) + '" cy="54.4" r="2" fill="#FFF"/><circle cx="' + (x - 1.4) + '" cy="59.6" r="1" fill="#FFF"/>');
    eyes = '<g class="pet-eyes">' + oe(ex[0]) + (wink ? arc(ex[1], (useUp ? 41 : kind === 'capy' ? 50 : 58), true) : oe(ex[1])) + '</g>';
    if (mood === 'sad') eyes += kind === 'capy'
      ? '<path d="M37 42 L48 44" stroke="' + INK + '" stroke-width="2" stroke-linecap="round"/><path d="M79 42 L68 44" stroke="' + INK + '" stroke-width="2" stroke-linecap="round"/><path d="M76 54 Q78 59 75.5 61 Q73 59 76 54Z" fill="#8FD0FF"/>'
      : '<path d="M38 47 L50 50" stroke="' + INK + '" stroke-width="2.2" stroke-linecap="round"/><path d="M82 47 L70 50" stroke="' + INK + '" stroke-width="2.2" stroke-linecap="round"/><path d="M78 64 Q80 70 77 72 Q74 70 78 64Z" fill="#8FD0FF"/>';
  }
  let mouth, mc = [60, 67];
  if (kind === 'capy') { mc = [58, 84]; mouth = mood === 'sad' ? '<path d="M53 88 Q58 84.5 63 88" stroke="#6E4B38" stroke-width="2" fill="none" stroke-linecap="round"/>' : '<path d="M58 80 L58 83 M52.5 83 Q55.3 87 58 83 Q60.7 87 63.5 83" stroke="#6E4B38" stroke-width="2" fill="none" stroke-linecap="round"/>'; }
  else if (mood === 'sad' && sp.mouth !== 'beak') mouth = '<path d="M55 71 Q60 66 65 71" stroke="' + O + '" stroke-width="2.2" fill="none" stroke-linecap="round"/>';
  else if (sp.mouth === 'smile') { mc = [60, 71]; mouth = '<path d="M38 66 Q60 84 82 66" stroke="' + O + '" stroke-width="2.6" fill="#E86A7A" stroke-linecap="round" stroke-linejoin="round"/><path d="M40 66 Q60 72 80 66" fill="' + B + '"/>'; }
  else if (sp.mouth === 'guinea') { mc = [60, 68]; mouth = '<path d="M56.5 65.5 Q60 63 63.5 65.5 Q60 69.5 56.5 65.5Z" fill="#F48FA8"/><path d="M60 68 L60 70.5 M54 70 Q57 74 60 70.5 Q63 74 66 70" stroke="' + O + '" stroke-width="2" fill="none" stroke-linecap="round"/>'; }
  else if (sp.mouth === 'beak') mouth = '<path d="M54 64 Q60 60 66 64 Q60 71 54 64Z" fill="#FFA24A" stroke="' + O + '" stroke-width="1.8" stroke-linejoin="round"/>';
  else if (sp.mouth === 'cat') { mc = [60, 66]; mouth = '<path d="M60 64 l-2.4 2" stroke="' + O + '" stroke-width="2"/><path d="M54 66 Q57 70 60 66 Q63 70 66 66" stroke="' + O + '" stroke-width="2.2" fill="none" stroke-linecap="round"/><ellipse cx="60" cy="63" rx="2.6" ry="1.8" fill="#FF8FA3"/>'; }
  else if (sp.mouth === 'bear') mouth = '<ellipse cx="60" cy="67" rx="10" ry="7.5" fill="' + L + '"/><ellipse cx="60" cy="64" rx="3.4" ry="2.4" fill="' + INK + '"/><path d="M56 69 Q60 73 64 69" stroke="' + INK + '" stroke-width="2" fill="none" stroke-linecap="round"/>';
  else { mc = [60, 66]; mouth = '<ellipse cx="60" cy="64" rx="2.4" ry="1.8" fill="#FF8FA3"/><path d="M56 67 Q58 70 60 67 Q62 70 64 67" stroke="' + O + '" stroke-width="2" fill="none" stroke-linecap="round"/>'; }
  if (P.upside) mouth = '<g transform="rotate(180 ' + mc[0] + ' ' + mc[1] + ')">' + mouth + '</g>';
  const blushY = kind === 'capy' ? 58 : 68, blushX = kind === 'capy' ? [33, 83] : [38, 82];
  const blush = '<ellipse cx="' + blushX[0] + '" cy="' + blushY + '" rx="6.5" ry="4" fill="#FF9EB5" opacity="' + (P.blush ? '.9' : '.55') + '"/><ellipse cx="' + blushX[1] + '" cy="' + blushY + '" rx="6.5" ry="4" fill="#FF9EB5" opacity="' + (P.blush ? '.9' : '.55') + '"/>';

  /* 옷 */
  let hat = '';
  if (w.head === 'ribbon') hat = '<g transform="translate(78 26) rotate(18)"><path d="M0 0 L-13 -8 L-13 8 Z" fill="#FF7FA6" stroke="' + O + '" stroke-width="2"/><path d="M0 0 L13 -8 L13 8 Z" fill="#FF7FA6" stroke="' + O + '" stroke-width="2"/><circle r="4.2" fill="#FF5C8D" stroke="' + O + '" stroke-width="2"/></g>';
  else if (w.head === 'flower') hat = '<g transform="translate(80 30)">' + [0, 72, 144, 216, 288].map(a => '<circle cx="' + (6 * Math.cos(a * Math.PI / 180)).toFixed(1) + '" cy="' + (6 * Math.sin(a * Math.PI / 180)).toFixed(1) + '" r="5" fill="#FFFFFF" stroke="' + O + '" stroke-width="1.6"/>').join('') + '<circle r="3.8" fill="#FFD34D"/></g>';
  else if (w.head === 'beret') hat = '<path d="M34 34 Q44 14 76 18 Q92 22 86 32 Q60 40 34 34Z" fill="#E5566D" stroke="' + O + '" stroke-width="2.2"/><circle cx="60" cy="17" r="3" fill="' + O + '"/>';
  else if (w.head === 'crown') hat = '<path d="M44 26 L48 12 L56 22 L60 8 L64 22 L72 12 L76 26 Z" fill="#FFD34D" stroke="' + O + '" stroke-width="2.2" stroke-linejoin="round"/><circle cx="60" cy="20" r="2.6" fill="#FF7FA6"/>';
  let neck = '';
  if (w.neck === 'scarf') neck = '<path d="M36 84 Q60 94 84 84 L84 92 Q60 102 36 92 Z" fill="#6EC6FF" stroke="' + O + '" stroke-width="2"/><path d="M72 92 L78 108 L68 106 Z" fill="#6EC6FF" stroke="' + O + '" stroke-width="2"/>';
  else if (w.neck === 'bow') neck = '<g transform="translate(60 88)"><path d="M0 0 L-12 -7 L-12 7 Z" fill="#7C6BFF" stroke="' + O + '" stroke-width="2"/><path d="M0 0 L12 -7 L12 7 Z" fill="#7C6BFF" stroke="' + O + '" stroke-width="2"/><circle r="3.6" fill="#5B4AE8"/></g>';
  const glasses = w.face === 'glasses' ? '<circle cx="46" cy="57" r="10" fill="none" stroke="' + O + '" stroke-width="2.4"/><circle cx="74" cy="57" r="10" fill="none" stroke="' + O + '" stroke-width="2.4"/><path d="M56 57 L64 57" stroke="' + O + '" stroke-width="2.4"/>' : '';
  const heart = P.heart ? '<path d="M97 30 C93 26 88 29 91 34 L97 40 L103 34 C106 29 101 26 97 30Z" fill="#FF6B8B" stroke="#E0456A" stroke-width="1.4"/>' : '';

  /* 부위 */
  let tail = '', hindL = '', hindR = '', body = '', head = '', armL = '', armR = '';
  if (kind === 'round') {
    let ears = '';
    if (sp.ear === 'cat') ears = '<path d="M30 38 L34 12 L52 28 Z" fill="' + B + '" stroke="' + O + '" stroke-width="2.4" stroke-linejoin="round"/><path d="M36 30 L37 19 L46 27 Z" fill="' + sp.inner + '"/><path d="M90 38 L86 12 L68 28 Z" fill="' + B + '" stroke="' + O + '" stroke-width="2.4" stroke-linejoin="round"/><path d="M84 30 L83 19 L74 27 Z" fill="' + sp.inner + '"/>';
    else if (sp.ear === 'puppy') ears = '<ellipse cx="28" cy="50" rx="9" ry="18" fill="' + sp.inner + '" stroke="' + O + '" stroke-width="2.4" transform="rotate(18 28 50)"/><ellipse cx="92" cy="50" rx="9" ry="18" fill="' + sp.inner + '" stroke="' + O + '" stroke-width="2.4" transform="rotate(-18 92 50)"/>';
    else if (sp.ear === 'small') ears = '<ellipse cx="34" cy="34" rx="7" ry="6" fill="' + sp.inner + '" stroke="' + O + '" stroke-width="2.4"/><ellipse cx="86" cy="34" rx="7" ry="6" fill="' + sp.inner + '" stroke="' + O + '" stroke-width="2.4"/>';
    if (sp.tail === 'lizard') tail = '<path d="M80 102 Q104 108 110 92 Q114 82 106 80" fill="none" stroke="' + O + '" stroke-width="9" stroke-linecap="round"/><path d="M80 102 Q104 108 110 92 Q114 82 106 80" fill="none" stroke="' + B + '" stroke-width="5.5" stroke-linecap="round"/>';
    const foot = (x, y) => '<ellipse cx="' + x + '" cy="' + y + '" rx="8" ry="5" fill="' + B + '" stroke="' + O + '" stroke-width="2.2"/>';
    const paw = (x, y) => '<ellipse cx="' + x + '" cy="' + y + '" rx="6.5" ry="5.5" fill="' + B + '" stroke="' + O + '" stroke-width="2.2"/><path d="M' + (x - 2.2) + ' ' + (y + 1) + ' v2 M' + (x + 2.2) + ' ' + (y + 1) + ' v2" stroke="' + O + '" stroke-width="1.2" stroke-linecap="round" opacity=".5"/>';
    hindL = foot(44, 108); hindR = foot(76, 108);
    armL = paw(46, 99); armR = paw(74, 99);
    const spotsLow = sp.spots ? '<circle cx="50" cy="96" r="3" fill="' + sp.spots + '"/><circle cx="70" cy="90" r="2.4" fill="' + sp.spots + '"/>' : '';
    const spotsTop = sp.spots ? '<circle cx="38" cy="52" r="3" fill="' + sp.spots + '"/><circle cx="84" cy="54" r="2.6" fill="' + sp.spots + '"/>' : '';
    body = '<ellipse cx="60" cy="92" rx="26" ry="20" fill="' + B + '" stroke="' + O + '" stroke-width="2.4"/>'
      + (back ? (sp.tail ? '' : '<circle cx="60" cy="100" r="6" fill="' + B + '" stroke="' + O + '" stroke-width="2.2"/>') : '<ellipse cx="60" cy="96" rx="15" ry="12" fill="' + L + '"/>')
      + spotsLow + (back ? '' : neck);
    const faceMask = sp.face ? '<ellipse cx="60" cy="' + (sp.faceRy ? 64 : 60) + '" rx="28" ry="' + (sp.faceRy || 24) + '" fill="' + sp.face + '"/>' : '';
    const patch = (sp.patch ? '<ellipse cx="' + (back ? 46 : 74) + '" cy="54" rx="11" ry="10" fill="' + sp.patch + '" opacity=".75"/>' : '');
    const mark = sp.mark ? '<path d="M52 30 Q54 36 56 30 M58 29 Q60 35 62 29 M64 30 Q66 36 68 30" stroke="' + sp.mark + '" stroke-width="2.6" fill="none" stroke-linecap="round"/>' : '';
    const shell = sp.shell && !back ? '<g transform="translate(60 96)"><path d="M-10 4 Q0 -12 10 4 Z" fill="#FFC8B0" stroke="' + O + '" stroke-width="1.8" stroke-linejoin="round"/><path d="M-4 3 L-2 -5 M2 3 L2 -6 M6 3 L5 -4" stroke="#E09A80" stroke-width="1.2"/></g>' : '';
    if (sp.shell && !back) armL = armL + shell;   // 조개는 앞발로 들고 있다
    head = ears + '<ellipse cx="60" cy="58" rx="' + (sp.headRx || 34) + '" ry="' + (sp.headRy || 30) + '" fill="' + B + '" stroke="' + O + '" stroke-width="2.4"/>'
      + (back ? patch + mark + spotsTop + (neck ? '<g transform="translate(0 -2)">' + neck + '</g>' : '') : faceMask + patch + mark + spotsTop + blush + eyes + mouth + glasses)
      + hat;
  } else if (kind === 'potato') {
    const blob = 'M60 40 C93 40 113 57 114 79 C115 101 94 111 60 111 C26 111 5 101 6 79 C7 57 27 40 60 40 Z';
    const foot = (x, y, rx, ry, sw) => '<ellipse cx="' + x + '" cy="' + y + '" rx="' + rx + '" ry="' + ry + '" fill="#F7C8B8" stroke="' + O + '" stroke-width="' + sw + '"/>';
    hindL = foot(30, 108, 6.5, 4, 2); hindR = foot(90, 108, 6.5, 4, 2);
    armL = foot(48, 110.5, 5, 3, 1.8); armR = foot(72, 110.5, 5, 3, 1.8);
    const mir = back ? ' transform="translate(120 0) scale(-1 1)"' : '';
    body = '<path d="' + blob + '" fill="' + B + '"/>'
      + '<g' + mir + '><path d="M6 79 C7 57 27 40 52 40.5 C54 52 50 62 42 72 C32 82 19 86 6.5 86 Z" fill="' + sp.patch + '"/>'
      + '<path d="M68 40.5 C93 41 113 57 114 79 C114 84 113.5 88 112 92 C100 88 88 80 80 70 C72 60 68 50 68 40.5 Z" fill="' + sp.patch2 + '"/>'
      + '<path d="M88 96 C97 94 106 90 111 86 C110 98 100 106 88 109 C86 104 86 100 88 96 Z" fill="' + sp.patch + '" opacity=".9"/></g>'
      + (back ? '' : '<ellipse cx="60" cy="99" rx="24" ry="9" fill="' + L + '" opacity=".9"/><ellipse cx="60" cy="76" rx="16" ry="11" fill="#FFEFE2"/>')
      + '<path d="' + blob + '" fill="none" stroke="' + O + '" stroke-width="2.4"/>'
      + (back ? '' : neck);
    const ears = '<path d="M22 52 C14 46 3 51 4 61 C5 68 13 69 19 63 Z" fill="' + sp.patch + '" stroke="' + O + '" stroke-width="2.4" stroke-linejoin="round"/><path d="M18 54 C13 51 8 54 8.5 59 C9 62 13 63 16 60 Z" fill="' + sp.inner + '"/><path d="M98 52 C106 46 117 51 116 61 C115 68 107 69 101 63 Z" fill="' + sp.patch2 + '" stroke="' + O + '" stroke-width="2.4" stroke-linejoin="round"/><path d="M102 54 C107 51 112 54 111.5 59 C111 62 107 63 104 60 Z" fill="' + sp.inner + '"/>';
    head = (back ? '' : '<g transform="translate(0 6)">' + blush + eyes + mouth + glasses + '</g>') + ears + '<g transform="translate(0 10)">' + hat + '</g>';
  } else {
    const F = B, D = '#9E6F48', S = L, N = '#6E4B38';
    const leg = x => '<rect x="' + x + '" y="98" width="11" height="13" rx="5" fill="' + D + '" stroke="' + O + '" stroke-width="2.2"/>';
    hindL = leg(78); hindR = leg(92); armL = leg(38); armR = leg(56);
    body = '<path d="M40 70 C52 64 92 62 106 72 C118 80 116 104 100 106 C84 108 52 108 40 104 Z" fill="' + F + '" stroke="' + O + '" stroke-width="2.4" stroke-linejoin="round"/>'
      + '<path d="M72 70 Q86 67 98 71 M84 76 Q94 74 104 78" stroke="' + D + '" stroke-width="1.8" fill="none" stroke-linecap="round" opacity=".6"/>'
      + (neck && !back ? '<g transform="translate(-2 12)">' + neck + '</g>' : '');
    const yuzu = mood === 'happy' && !(w.head && w.head !== 'none') ? '<g transform="translate(58 27)"><circle r="7.5" fill="#FFB43C" stroke="' + O + '" stroke-width="2"/><circle cx="-2.4" cy="-2.2" r="1.8" fill="#FFE0A0"/><path d="M1 -7 Q6 -12 10 -8 Q6 -5 1 -7Z" fill="#7BC46A" stroke="' + O + '" stroke-width="1.4" stroke-linejoin="round"/></g>' : '';
    head = '<ellipse cx="23" cy="40" rx="4.4" ry="3.6" fill="' + D + '" stroke="' + O + '" stroke-width="2" transform="rotate(-20 23 40)"/><ellipse cx="93" cy="40" rx="4.4" ry="3.6" fill="' + D + '" stroke="' + O + '" stroke-width="2" transform="rotate(20 93 40)"/>'
      + '<path d="M36 30 H80 Q92 30 92 44 L93 80 Q93 97 76 97 H40 Q23 97 23 80 L24 44 Q24 30 36 30 Z" fill="' + F + '" stroke="' + O + '" stroke-width="2.4" stroke-linejoin="round"/>'
      + '<path d="M50 35 Q58 32 66 35" stroke="' + D + '" stroke-width="1.8" fill="none" stroke-linecap="round" opacity=".55"/>'
      + (back ? '<path d="M40 50 Q58 44 76 50 M44 64 Q58 58 72 64 M46 78 Q58 73 70 78" stroke="' + D + '" stroke-width="1.8" fill="none" stroke-linecap="round" opacity=".5"/>'
        : '<path d="M30 70 Q30 60 44 60 H72 Q86 60 86 70 L86 82 Q86 94 72 94 H44 Q30 94 30 82 Z" fill="' + S + '"/>'
        + '<path d="M47 68 Q58 63 69 68 Q70 75 58 76 Q46 75 47 68 Z" fill="' + N + '"/><ellipse cx="52.5" cy="70" rx="2.2" ry="1.5" fill="' + INK + '"/><ellipse cx="63.5" cy="70" rx="2.2" ry="1.5" fill="' + INK + '"/><ellipse cx="55" cy="66.5" rx="3" ry="1.2" fill="#FFF" opacity=".35"/>'
        + mouth + blush + eyes + (glasses ? '<g transform="translate(-1 -8)">' + glasses + '</g>' : ''))
      + yuzu + hat;
  }
  // 뒤돌아본 모습: 발은 뒤에서 보면 앞발이 안 보인다
  if (back) { armL = ''; armR = ''; }

  const zz = mood === 'sleep' ? '<g class="pet-zz" fill="#8C84C8" font-family="Pretendard, sans-serif" font-weight="700"><text x="88" y="30" font-size="14">z</text><text x="98" y="18" font-size="11">z</text></g>' : '';
  const sh = kind === 'capy' ? [66, 42] : [60, 28];
  const shadow = '<ellipse cx="' + sh[0] + '" cy="112" rx="' + (P.air ? sh[1] * 0.6 : sh[1]) + '" ry="5" fill="#000" opacity="' + (P.air ? '.05' : '.08') + '"/>';
  const allT = P.all ? (P.all.r ? 'translate(' + (P.all.dx || 0) + ' ' + (P.all.dy || 0) + ') rotate(' + P.all.r + ' 60 70)' : tf([60, 112], P.all)) : '';
  const inner = grp(RIG.tail, P.tail, tail) + grp(RIG.hindL, P.hindL, hindL) + grp(RIG.hindR, P.hindR, hindR)
    + (P.body ? '<g transform="' + tf([60, 112], P.body) + '">' + body + '</g>' : body)
    + grp(RIG.head, P.head, head + heart) + grp(RIG.armL, P.armL, armL) + grp(RIG.armR, P.armR, armR);
  return '<svg class="pet-svg' + (opt.cls ? ' ' + opt.cls : '') + '" viewBox="0 0 120 120" aria-hidden="true">'
    + shadow + '<g class="pet-bodyg">' + (allT ? '<g transform="' + allT + '">' + inner + '</g>' : inner) + '</g>' + zz + '</svg>';
}
function eggSvg(cls) {
  return '<svg class="pet-svg ' + (cls || '') + '" viewBox="0 0 120 120" aria-hidden="true"><ellipse cx="60" cy="112" rx="24" ry="5" fill="#000" opacity=".08"/><path d="M60 14 C86 14 96 60 96 78 C96 98 80 110 60 110 C40 110 24 98 24 78 C24 60 34 14 60 14Z" fill="#FFF6E6" stroke="#5B4A48" stroke-width="2.4"/><circle cx="46" cy="52" r="6" fill="#FFD9A8"/><circle cx="72" cy="40" r="4.5" fill="#FFC6D6"/><circle cx="70" cy="80" r="7" fill="#CDEBFF"/></svg>';
}
function heartSvg(on) { return '<svg class="pet-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.5 C5 15.5 2.5 12 2.5 8.3 C2.5 5.6 4.6 3.5 7.2 3.5 C9.2 3.5 10.9 4.7 12 6.4 C13.1 4.7 14.8 3.5 16.8 3.5 C19.4 3.5 21.5 5.6 21.5 8.3 C21.5 12 19 15.5 12 20.5Z" fill="' + (on ? '#FF6B8B' : '#E4DEE8') + '" stroke="' + (on ? '#E0456A' : '#CFC6D6') + '" stroke-width="1.4"/><ellipse cx="8" cy="8" rx="2" ry="1.3" fill="#FFF" opacity="' + (on ? '.7' : '0') + '"/></svg>'; }
function coinSvg() { return '<svg class="pet-ico" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9.5" fill="#FFD34D" stroke="#E3A91E" stroke-width="1.6"/><path d="M9 9.5 Q12 6.5 15 9.5 Q12 13 9 16.5 Q12 19 15 16" stroke="#E3A91E" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg>'; }
function flameSvg() { return '<svg class="pet-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5 C13 7 18.5 9 18.5 14.5 C18.5 18.5 15.5 21.5 12 21.5 C8.5 21.5 5.5 18.5 5.5 14.5 C5.5 11 8 9.5 9 7 C10.5 9 11 10 12 2.5Z" fill="#FF9A3C" stroke="#EE6A2C" stroke-width="1.4"/><path d="M12 12 C13 14 15 15 15 17 C15 19 13.6 20 12 20 C10.4 20 9 19 9 17 C9 15.5 11 14.5 12 12Z" fill="#FFD34D"/></svg>'; }

/* ---------- 상태 ---------- */
function blank() {
  return { v: VER, adopted: false, sp: 'cat', name: '', wear: { head: 'none', neck: 'nothing', face: 'plain' }, owned: { none: 1, nothing: 1, plain: 1 },
    coins: 15, tricks: {}, hearts: RULE.heartsMax, heartTs: now(), food: 80, fun: 80, water: 80, clean: 80, sleepTs: 0, seenTs: now(), dnd: { on: true, from: 23, to: 8 },
    love: 0, careTs: now(), daily: {}, streak: 0, lastGoal: null, combo: 0, trophies: {}, read: {}, boss: null, undo: {}, nick: '', ts: now() };
}
let ST = null;
function load() {
  if (ST) return ST;
  try { ST = JSON.parse(localStorage.getItem(LKEY) || 'null'); } catch (e) { ST = null; }
  try { OLD_KEYS.forEach(k => localStorage.removeItem(k)); } catch (e) { /* 무시 */ }
  if (!ST || ST.v !== VER) ST = blank();
  tick(ST);
  return ST;
}
function tick(s) { careTick(s, now()); }
let pushT = null;
function save() {
  const s = load(); s.ts = now();
  try { localStorage.setItem(LKEY, JSON.stringify(s)); } catch (e) { /* 저장 공간 없음 */ }
  clearTimeout(pushT);
  if (window.SDT && SDT.user && s.adopted) s.owner = SDT.user.uid;
  pushT = setTimeout(() => { if (window.SDT && SDT.user && (!s.owner || s.owner === SDT.user.uid)) SDT.set(REMOTE, s); presenceSoon(); }, 1500);
  render();
}
function pullRemote() {
  if (!(window.SDT && SDT.user)) return;
  const uid = SDT.user.uid;
  SDT.get(REMOTE).then(r => {
    if (!(SDT.user && SDT.user.uid === uid)) return;
    const l = load(), okR = r && r.v === VER && r.adopted;
    // 다른 계정이 이 브라우저에 남긴 펫이거나, 이 브라우저에 아직 펫이 없거나(펫 프로그램에서 데려옴), 서버 것이 더 새것이면 서버 것을 쓴다
    const other = l.owner && l.owner !== uid;
    if (r && r.v === VER && !r.adopted && r.left && (other || (r.ts || 0) > (l.ts || 0))) { ST = blank(); ST.owner = uid; ST.left = r.left; ST.ts = r.ts; try { localStorage.setItem(LKEY, JSON.stringify(ST)); } catch (e) { /* 무시 */ } }
    else if (okR && (other || !l.adopted || (r.ts || 0) > (l.ts || 0))) { ST = r; ST.owner = uid; tick(ST); try { localStorage.setItem(LKEY, JSON.stringify(ST)); } catch (e) { /* 무시 */ } }
    else if (!okR && other) { ST = blank(); try { localStorage.setItem(LKEY, JSON.stringify(ST)); } catch (e) { /* 무시 */ } }
    else if (l.adopted) { l.owner = uid; SDT.set(REMOTE, l); }
    const pg = $('#petPage'); if (pg) bootPage(pg);
    render(); startBeat();
    if ($('#petFriends')) friendsLoad(true); else { nameSync().then(presenceBeat); grantsCheck(true); }
  });
}
const moodOf = s => careMood(s, now());
function streakNow(s) { if (!s.lastGoal) return 0; return dayDiff(s.lastGoal, dayKey()) <= 1 ? s.streak : 0; }

/* ---------- 반응 ---------- */
let floatHost = null, lastReact = { k: null, t: 0 };
function pop(html, kind) {
  if (!floatHost) { floatHost = document.createElement('div'); floatHost.className = 'pet-floats'; document.body.appendChild(floatHost); }
  const d = document.createElement('div'); d.className = 'pet-float ' + (kind || ''); d.innerHTML = html;
  floatHost.appendChild(d); setTimeout(() => d.remove(), 1600);
}
function hearts(el, n) {
  if (!el) return;
  const r = el.getBoundingClientRect();
  for (let i = 0; i < (n || 5); i++) {
    const h = document.createElement('span'); h.className = 'pet-heartfx'; h.innerHTML = heartSvg(true);
    h.style.left = (r.left + r.width / 2 + (Math.random() - 0.5) * r.width * 0.8) + 'px';
    h.style.top = (r.top + r.height * 0.3) + 'px';
    h.style.animationDelay = (i * 0.08) + 's';
    document.body.appendChild(h); setTimeout(() => h.remove(), 1400);
  }
}
function react(kind) {
  lastReact = { k: kind, t: now() };
  $$('.pet-sprite').forEach(el => { el.classList.remove('hop', 'shake', 'eat', 'love'); void el.offsetWidth; el.classList.add(kind); });
}
function replay() { if (lastReact.k && now() - lastReact.t < 900) $$('.pet-sprite').forEach(el => el.classList.add(lastReact.k)); }
function say(msg) { const b = $('#petBubble'); if (!b) return; b.textContent = msg; b.hidden = false; clearTimeout(b._t); b._t = setTimeout(() => { b.hidden = true; }, 2800); }
function news(title, body, art) {
  const d = document.createElement('div'); d.className = 'pet-news'; d.setAttribute('role', 'dialog');
  d.innerHTML = '<div class="pet-news-card"><div class="pet-news-art">' + (art || '') + '</div><b>' + esc(title) + '</b><p>' + esc(body) + '</p><button class="pet-btn main" type="button">좋아요</button></div>';
  document.body.appendChild(d); d.querySelector('button').addEventListener('click', () => d.remove());
}

/* ---------- 문제 연동 (과목 페이지가 부름) ---------- */
function onAnswer(q, ok, info) {
  const s = load(); if (!s.adopted || !q) return;
  info = info || {};
  const today = dayKey(), u = { coins: 0, heart: 0, love: 0, combo: s.combo, daily: 0, paid: false };
  s.paid = s.paid || {}; s.tried = s.tried || {};
  if (s.tried[q.id] !== today) { s.tried[q.id] = today; s.daily[today] = (s.daily[today] || 0) + 1; u.daily = 1; }
  // 코인은 퀴즈에서 처음 맞힌 문제에만. 서술형처럼 스스로 채점하거나 '맞은 걸로' 바꾼 답은 코인이 없다
  const payable = !s.paid[q.id] && !info.self && q.type !== 'essay';
  if (ok) {
    s.combo++;
    const mult = s.combo >= 10 ? 2 : s.combo >= 5 ? 1.5 : 1;
    let gain = payable ? Math.round(RULE.coin * mult) : 0;
    if (payable) { s.paid[q.id] = today; u.paid = true; }
    if (info.review) { if (payable) gain += RULE.reviewBonus; if (s.hearts < RULE.heartsMax) { s.hearts++; u.heart = 1; pop(heartSvg(true) + ' 하트가 돌아왔어요', 'heart'); } }
    s.coins += gain; u.coins = gain;
    s.love += RULE.love; u.love = RULE.love; s.fun = clamp(s.fun + 2, 0, 100);
    if (gain) pop(coinSvg() + ' +' + gain + (mult > 1 ? ' <small>' + s.combo + '연속</small>' : ''), 'coin');
    react('hop');
    if (s.combo === 5) say('다섯 번 연속! 간식 돈이 1.5배예요');
    else if (s.combo === 10) say('열 번 연속! 이제 2배예요');
  } else {
    s.combo = 0;
    if (strict() && !(s.boss && s.boss.active)) {
      if (s.hearts > 0) { s.hearts--; u.heart = -1; if (s.hearts === RULE.heartsMax - 1) s.heartTs = now(); }
      pop(heartSvg(false) + ' 하트 하나', 'lose');
      say(s.hearts === 0 ? '하트가 없어요. 틀린 문제를 다시 맞히면 돌아와요' : '괜찮아요, 해설 보고 다음엔 맞혀요');
    }
    s.fun = clamp(s.fun - 3, 0, 100);
    react('shake');
  }
  if (s.boss && s.boss.active) { if (ok) s.boss.right++; else s.boss.wrong++; }
  goal(s, today);
  s.undo[q.id] = u;
  save();
}
function onUndo(q, wasOk) {
  const s = load(), u = s.undo[q.id]; if (!u) return;
  s.coins = Math.max(0, s.coins - u.coins); s.hearts = clamp(s.hearts - u.heart, 0, RULE.heartsMax); s.love = Math.max(0, s.love - u.love); s.combo = u.combo;
  const d = dayKey(); if (u.daily && s.daily[d]) { s.daily[d]--; if (s.tried) delete s.tried[q.id]; }
  if (u.paid && s.paid) delete s.paid[q.id];
  if (s.boss && s.boss.active) { if (wasOk) s.boss.right = Math.max(0, s.boss.right - 1); else s.boss.wrong = Math.max(0, s.boss.wrong - 1); }
  delete s.undo[q.id]; save();
}
function goal(s, today) {
  if (s.daily[today] !== RULE.goal || s.lastGoal === today) return;
  s.streak = s.lastGoal && dayDiff(s.lastGoal, today) === 1 ? s.streak + 1 : 1;
  s.lastGoal = today; s.love += 10; s.coins += RULE.goalCoins;
  news('오늘 목표 달성!', RULE.goal + '문제를 풀었어요. ' + s.streak + '일째 같이 공부 중이에요. 보너스 간식 돈 ' + RULE.goalCoins + '개.', petSvg(s, { mood: 'happy', cls: 'big' }));
}
function canStart(list) {
  const s = load();
  if (s.boss && s.boss.starting) { s.boss.starting = false; s.boss.active = true; return true; }
  if (s.boss && s.boss.active) s.boss = null;
  if (!strict() || !s.adopted || s.hearts > 0) return true;
  const A = app();
  if (A && list && list.length && list.every(q => A.store.wrong[q.id] && !A.store.wrong[q.id].resolved)) return true;
  const mins = Math.max(1, Math.ceil((RULE.heartRegenMin * 60000 - (now() - s.heartTs)) / 60000));
  const host = $('#qstage');
  const h = '<div class="card pet-lock">' + petSvg(s, { mood: 'sad', cls: 'lockpet' }) + '<div><b>하트가 다 떨어졌어요</b><p>틀렸던 문제를 오답노트에서 다시 맞히면 하나에 하트 하나씩 돌아와요. 기다리면 ' + mins + '분 뒤에 하나가 차요.</p><div class="btnrow"><a class="btn primary" href="#/wrong">오답노트 가기</a></div></div></div>';
  if (host) host.innerHTML = h; else if (A) A.toast('하트가 없어요. 오답노트에서 다시 맞혀 채워요');
  return false;
}
function onSetEnd() {
  const s = load(); if (!s.boss || !s.boss.active) return;
  const b = s.boss; s.boss = null;
  if (b.right >= RULE.bossPass) { s.coins += RULE.bossCoins; s.trophies[b.part] = (s.trophies[b.part] || 0) + 1; s.love += 20; news('보스전 승리!', b.right + ' / ' + RULE.bossN + '. 코인 ' + RULE.bossCoins + '개를 받았어요.', petSvg(s, { mood: 'happy', cls: 'big' })); }
  else news('아깝다!', b.right + ' / ' + RULE.bossN + '. ' + RULE.bossPass + '개 넘게 맞히면 이겨요. 틀린 건 오답노트에 모였어요.', petSvg(s, { mood: 'sad', cls: 'big' }));
  save();
}
function startBoss(part) {
  const A = app(), s = load(); if (!A) return;
  const list = A.BANK.filter(q => q.part === part && q.unit !== '용어');
  if (list.length < RULE.bossN) { A.toast('보스전을 열 문제가 부족해요'); return; }
  closePanel();
  s.boss = { part, starting: true, active: false, right: 0, wrong: 0 }; save();
  location.hash = '#/quiz?week=' + part;
  setTimeout(() => { A.toast('보스전! ' + RULE.bossPass + '개 넘게 맞히면 이겨요'); A.startDeck(list.slice().sort(() => Math.random() - 0.5).slice(0, RULE.bossN), true); }, 120);
}
function onRead(id) { const s = load(); if (!s.adopted || !id || s.read[id]) return; s.read[id] = dayKey(); s.love += 2; pop(heartSvg(true) + ' 다 읽었어요', 'heart'); save(); }

/* ---------- 돌보기, 옷장 ---------- */
function careFx(r, el) {
  if (!r.ok) { if (r.msg) { say(r.msg); react('shake'); } return false; }
  if (r.anim === 'eat' || r.anim === 'drink') react('eat');
  else if (r.anim === 'love') react('love');
  else react('hop');
  if (r.anim === 'drink') pop(needIcon('thirsty') + ' 꿀꺽', 'heart');
  if (r.anim === 'bath') pop(needIcon('dirty') + ' 뽀송', 'heart');
  if (r.msg) say(r.msg);
  hearts(el || $('.pet-room .pet-sprite'), r.anim === 'love' ? 4 : 3);
  const ek = { eat: 'eat', drink: 'drink', bath: 'bath', sleep: 'sleep' }[r.anim];
  if (ek) liveEvent(ek, '');
  return true;
}
function feed(id) { const s = load(); if (careFx(careDo(s, 'feed', id, now()))) save(); }
function care(kind) { const s = load(); if (careFx(careDo(s, kind, '', now()))) { if (kind === 'wake') liveEvent('wake', ''); save(); needHide(); } }
function pet(el) {
  const s = load();
  careDo(s, 'pet', '', now());
  react('love'); hearts(el, 4);
  const lines = ['헤헤, 간지러워요', '좋아요', '또 해 줘요', '오늘 같이 공부해요', s.name + fJosa(s.name, '은', '는') + ' 기분 최고'];
  say(lines[Math.floor(Math.random() * lines.length)]);
  save();
}
function trick(id) {
  const s = load(), k = TRICKS.find(x => x.id === id); if (!k) return;
  const r = careDo(s, 'trick', id, now());
  if (!r.ok) { say(r.msg); react('shake'); return; }
  if (r.learned) news(s.name + fJosa(s.name, '이', '가') + ' "' + k.name + '"' + fJosa(k.name, '을', '를') + ' 배웠어요', '이제 언제든 보여 달라고 할 수 있어요.', petSvg(s, { mood: 'happy', cls: 'big' }));
  if (r.learned) liveEvent('learn', id);
  liveEvent('trick', id);
  save();
  perform(k);
}
// 개인기 보여 주기: TRICK_FRAMES 의 자세를 차례로 그린다 (내 펫 방과 오른쪽 아래 펫 둘 다)
function perform(k) {
  const s = load();
  $$('.pet-room .pet-sprite, .pet-hud .pet-sprite').forEach(el => playTrick(el, s, k.id));
  say(k.say); hearts($('.pet-room .pet-sprite'), 3);
}
function playTrick(el, s, id) {
  const frames = TRICK_FRAMES[id]; if (!el || !frames) return;
  clearTimeout(el._trickT);
  let i = 0;
  el.classList.add('tricking');
  const step = () => {
    if (!el.isConnected) return;
    if (i >= frames.length) { el.classList.remove('tricking'); el.innerHTML = petSvg(s, { mood: moodOf(s) }); return; }
    const f = frames[i++];
    el.innerHTML = petSvg(s, { pose: f[0] });
    el._trickT = setTimeout(step, f[1]);
  };
  step();
}
function wear(id) {
  const s = load(), r = careDo(s, 'wear', id, now());
  if (!r.ok) { if (r.msg) say(r.msg); return; }
  if (r.msg) say(r.msg);
  react('hop'); save();
}

/* ---------- 조르기 (밥, 물, 놀기, 씻기, 잠, 보고 싶음) ---------- */
const ASK_KEY = 'sdt_pet_ask_v1';   // { 원하는 것 id: 마지막으로 보여 준 시각 } (이 브라우저)
function needIcon(id) {
  const I = {
    hungry: '<path d="M4 12h16a8 8 0 0 1-16 0z" fill="#FFB86B" stroke="#C9772E" stroke-width="1.4"/><circle cx="9" cy="10" r="1.6" fill="#8A5A2B"/><circle cx="13" cy="9.4" r="1.6" fill="#8A5A2B"/><circle cx="16" cy="10.4" r="1.4" fill="#8A5A2B"/>',
    thirsty: '<path d="M12 3c3.5 4.6 6 8 6 11a6 6 0 0 1-12 0c0-3 2.5-6.4 6-11z" fill="#8FD0FF" stroke="#3E9BD6" stroke-width="1.4"/><ellipse cx="9.6" cy="14" rx="1.4" ry="2.2" fill="#fff" opacity=".7"/>',
    bored: '<circle cx="12" cy="12" r="8" fill="#FFD34D" stroke="#E3A91E" stroke-width="1.4"/><path d="M4.5 10c5 2 10 2 15 0M4.5 14c5 2 10 2 15 0" stroke="#FF7FA6" stroke-width="1.6" fill="none"/>',
    dirty: '<circle cx="9" cy="13" r="5" fill="#EAF6FF" stroke="#8CC3E8" stroke-width="1.4"/><circle cx="16" cy="9" r="3.4" fill="#EAF6FF" stroke="#8CC3E8" stroke-width="1.4"/><circle cx="16.5" cy="16.5" r="2.4" fill="#EAF6FF" stroke="#8CC3E8" stroke-width="1.4"/>',
    sleepy: '<path d="M15 3.5a8.5 8.5 0 1 0 5.5 13.5A7 7 0 0 1 15 3.5z" fill="#C9C2F0" stroke="#8C84C8" stroke-width="1.4"/>',
    miss: '<path d="M12 20.5C5 15.5 2.5 12 2.5 8.3 2.5 5.6 4.6 3.5 7.2 3.5c2 0 3.7 1.2 4.8 2.9 1.1-1.7 2.8-2.9 4.8-2.9 2.6 0 4.7 2.1 4.7 4.8 0 3.7-2.5 7.2-9.5 12.2z" fill="#FF6B8B" stroke="#E0456A" stroke-width="1.4"/>',
  };
  return '<svg class="pet-ico" viewBox="0 0 24 24" aria-hidden="true">' + (I[id] || I.miss) + '</svg>';
}
function askSeen() { try { return JSON.parse(localStorage.getItem(ASK_KEY) || '{}') || {}; } catch (e) { return {}; } }
function askMark(id) { try { const o = askSeen(); o[id] = now(); localStorage.setItem(ASK_KEY, JSON.stringify(o)); } catch (e) { /* 무시 */ } }
let askT = 0;
function needAsk(force) {
  const s = load(); if (!s.adopted) return;
  const host = PAGE() ? $('#petPage .pet-room') : $('#petHud'); if (!host) return;
  if (host.querySelector('.pet-ask')) return;
  const t = now();
  if (careQuiet(s, t) && !force) return;
  const seen = askSeen();
  const n = careNeeds(s, t).find(x => force || t - (seen[x.id] || 0) > CARE.askGapMs);
  if (!n) return;
  askMark(n.id);
  if (n.id === 'miss') { s.seenTs = t; try { localStorage.setItem(LKEY, JSON.stringify(s)); } catch (e) { /* 무시 */ } }
  const btns = {
    feed: FOODS.filter(f => f.id !== 'play').map(f => '<button type="button" class="pet-btn main" data-ask="feed:' + f.id + '">' + esc(f.name) + ' <small>' + coinSvg() + f.cost + '</small></button>').join(''),
    water: '<button type="button" class="pet-btn main" data-ask="water">물 주기</button>',
    play: '<button type="button" class="pet-btn main" data-ask="pet">쓰다듬기</button><button type="button" class="pet-btn" data-ask="feed:play">장난감 <small>' + coinSvg() + '40</small></button>',
    bath: '<button type="button" class="pet-btn main" data-ask="bath">씻기기</button>',
    sleep: '<button type="button" class="pet-btn main" data-ask="sleep">재우기</button>',
    pet: '<button type="button" class="pet-btn main" data-ask="pet">쓰다듬기</button>',
  }[n.action] || '';
  const d = document.createElement('div');
  d.className = 'pet-ask' + (n.urgent ? ' urgent' : ''); d.setAttribute('role', 'status'); d.dataset.need = n.id;
  d.innerHTML = '<div class="pet-ask-line">' + needIcon(n.id) + '<b>' + esc(n.text) + '</b><button type="button" class="pet-ask-x" data-ask="close" aria-label="닫기">닫기</button></div><div class="pet-ask-btns">' + btns + '</div>';
  host.prepend(d);
  d.addEventListener('click', e => {
    e.stopPropagation();
    const b = e.target.closest('[data-ask]'); if (!b) return;
    const [k, v] = b.dataset.ask.split(':');
    if (k === 'close') { needHide(); return; }
    if (k === 'feed') { const st = load(); if (careFx(careDo(st, 'feed', v, now()))) { save(); needHide(); } return; }
    if (k === 'pet') { pet($('.pet-room .pet-sprite') || $('.pet-hud .pet-sprite')); needHide(); return; }
    care(k);
  });
  clearTimeout(askT); askT = setTimeout(needHide, 45000);
}
function needHide() { $$('.pet-ask').forEach(x => x.remove()); }

/* ---------- 입양, 다른 동물로 바꾸기 ----------
   이름은 모두 달라야 한다. 로그인해 있으면 pet3Names 에 이름 자리를 잡은 뒤에 데려온다(바꾼다).
   바꾸기 규칙: 간식 돈, 옷장, 배운 장기, 하트, 연속 기록은 그대로. 동물이 바뀌면 친해진 정도는 0 (다시 아기부터), 배부름과 기분은 80.
   이름만 바꾸면 아무것도 줄지 않는다. */
function adoptView(mode) {
  const change = mode === 'change' && load().adopted;
  const cur = load();
  let pick = change ? cur.sp : 'cat', typed = change ? cur.name : '', sure = false, busy = false, msg = '';
  const d = document.createElement('div'); d.className = 'pet-news pet-adopt'; d.setAttribute('role', 'dialog');
  const close = () => { d.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = e => { if (e.key === 'Escape' && !busy) close(); };
  document.addEventListener('keydown', onKey);
  const draw = () => {
    const sp = SP[pick];
    const nameVal = change || typed ? typed : sp.name;
    const spChanged = change && pick !== cur.sp;
    let h = '<div class="pet-news-card wide"><button type="button" class="pet-adopt-x" data-x aria-label="닫기" title="닫기 (Esc)"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7l10 10M17 7L7 17"/></svg></button><b>' + (change ? '다른 동물로 바꾸기' : '같이 공부할 친구를 골라요') + '</b>'
      + '<p>' + (change ? '동물과 이름을 바꿀 수 있어요. 이름은 다른 친구와 겹치면 안 돼요.' : '문제를 맞히면 간식을 줄 수 있어요. 이름은 다른 친구와 겹치면 안 되고, 나중에 내 펫 페이지에서 바꿀 수 있어요.') + '</p>'
      + '<div class="pet-adopt-big">' + petSvg({ sp: pick, wear: change ? cur.wear : {} }, { mood: 'happy', cls: 'big' }) + '</div>'
      + '<div class="pet-adopt-grid">' + SPECIES.map(x => '<button type="button" class="pet-adopt-one' + (x.id === pick ? ' on' : '') + '" data-sp="' + x.id + '">' + petSvg({ sp: x.id, wear: {} }) + '<span>' + esc(x.animal) + (change && x.id === cur.sp ? ' (지금)' : '') + '</span></button>').join('') + '</div>'
      + '<label class="pet-name-in">이름<input id="petNameIn" maxlength="12" value="' + esc(nameVal) + '" autocomplete="off" spellcheck="false"></label>'
      + '<small class="pet-name-rule">한글, 영어, 숫자로 8글자까지</small>';
    if (change) h += '<div class="pet-change-rule' + (spChanged ? ' warn' : '') + '">' + (spChanged
      ? '<b>' + esc(SP[cur.sp].animal) + '에서 ' + esc(sp.animal) + ro(sp.animal) + ' 바꾸면</b><span>그대로: 간식 돈 ' + cur.coins + '개, 옷장, 배운 장기, 하트, 연속 기록</span><span>처음부터: 친해진 정도' + (cur.love > 0 ? ' ' + cur.love + ' 에서 0' : '는 0') + ' (다시 아기부터), 배부름과 기분은 80</span>'
      : '<b>이름만 바꾸면</b><span>아무것도 줄지 않아요. 친해진 정도, 간식 돈, 옷장 모두 그대로예요.</span>') + '</div>';
    if (msg) h += '<p class="pet-adopt-msg" role="alert">' + esc(msg) + '</p>';
    const label = busy ? '이름 확인 중' : change ? (spChanged ? (sure ? '정말 바꿀래요' : esc(sp.animal) + ro(sp.animal) + ' 바꾸기') : '이름 바꾸기') : esc(sp.animal) + ' 데려오기';
    h += '<div class="pet-row pet-adopt-btns">' + (change ? '<button class="pet-btn" type="button" data-x>그만두기</button>' : '') + '<button class="pet-btn main' + (sure ? ' warn' : '') + '" type="button" data-go' + (busy ? ' disabled' : '') + '>' + label + '</button></div></div>';
    d.innerHTML = h;
    const inp = $('#petNameIn', d);
    inp.addEventListener('input', () => { typed = inp.value; if (msg) { msg = ''; const m = $('.pet-adopt-msg', d); if (m) m.remove(); } });
    inp.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); go(); } });
    $$('[data-sp]', d).forEach(b => b.addEventListener('click', () => { typed = inp.value; const was = pick; pick = b.dataset.sp; if (!change && (!typed || typed === SP[was].name)) typed = ''; sure = false; msg = ''; draw(); }));
    $$('[data-x]', d).forEach(x => x.addEventListener('click', () => { if (!busy) close(); }));
    $('[data-go]', d).addEventListener('click', go);
  };
  const go = async () => {
    if (busy) return;
    const inp = $('#petNameIn', d);
    typed = inp.value;
    const n = nameCheck(typed || (change ? '' : SP[pick].name));
    if (!n.ok) { msg = n.why; draw(); $('#petNameIn', d).focus(); return; }
    const s = load();
    if (change && pick === s.sp && n.pet === s.name) { close(); return; }
    if (change && pick !== s.sp && !sure) { sure = true; draw(); return; }
    busy = true; msg = ''; draw();
    const r = await nameClaim(n, pick);
    busy = false;
    if (!r.ok) { msg = r.why; sure = false; typed = n.pet; draw(); $('#petNameIn', d).select(); return; }
    close();
    const st = load();
    if (!change) {
      st.adopted = true; st.sp = pick; st.name = n.pet; st.born = dayKey();
      save(); react('hop'); say('안녕! 나는 ' + st.name + '. 잘 부탁해요');
    } else {
      const spChanged = pick !== st.sp;
      if (spChanged) { st.sp = pick; st.love = 0; st.food = 80; st.fun = 80; st.born = dayKey(); st.changedAt = dayKey(); }
      if (st.name !== n.pet) st.nameTs = Date.now();
      st.name = n.pet;
      save(); react('hop');
      if (spChanged) news('새 친구 ' + st.name, SP[pick].animal + ro(SP[pick].animal) + ' 바뀌었어요. 간식 돈과 옷장, 배운 장기는 그대로예요.', petSvg(st, { mood: 'happy', cls: 'big' }));
      else say('이제 내 이름은 ' + st.name + '!');
    }
    const pg = $('#petPage'); if (pg) bootPage(pg);
    const pn = $('#petPanel'); if (pn && !pn.hidden) fillPanel(pn);
    if (window.SDT && SDT.user) { startBeat(); presenceBeat(); }
    if (change) resendRequests();
    friendsRender(); friendsLoad(true);
  };
  d.addEventListener('click', e => { if (e.target === d && !busy) close(); });
  draw(); document.body.appendChild(d);
  setTimeout(() => { const i = $('#petNameIn', d); if (i && change) i.focus(); }, 0);
}

/* 펫 떠나보내기: 두 번 확인한 뒤 펫, 이름, 간식 돈, 개인기, 옷장, 친구 목록을 모두 지운다.
   로그인해 있으면 서버에서도: 이름 자리와 이름표, 접속 표시, 알림 문서, 전체 채팅 글, 내 친구 목록과 요청(상대 쪽의 나를 가리키는 문서까지),
   펫 상태는 adopted:false 와 left(떠나보낸 시각)로 덮어써서 다른 기기에서도 다시 데려오기 화면이 나온다 */
function leaveView() {
  const s = load(); if (!s.adopted) return;
  let step = 1, busy = false, msg = '';
  const d = document.createElement('div'); d.className = 'pet-news pet-adopt pet-leave-dlg'; d.setAttribute('role', 'dialog');
  const close = () => { d.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = e => { if (e.key === 'Escape' && !busy) close(); };
  document.addEventListener('keydown', onKey);
  const nf = FR.friends.length, owned = Object.keys(s.owned || {}).filter(k => !['none', 'nothing', 'plain'].includes(k)).length, tricks = Object.keys(s.tricks || {}).length;
  const draw = () => {
    d.innerHTML = '<div class="pet-news-card wide"><button type="button" class="pet-adopt-x" data-x aria-label="닫기" title="닫기 (Esc)"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7l10 10M17 7L7 17"/></svg></button>'
      + '<div class="pet-news-art">' + petSvg(s, { mood: 'sad', cls: 'big' }) + '</div>'
      + (step === 1
        ? '<b>' + esc(s.name) + fJosa(s.name, '을', '를') + ' 떠나보낼까요?</b><p>떠나보내면 되돌릴 수 없어요. 아래 것이 모두 사라져요.</p>'
          + '<ul class="pet-leave-list"><li>' + esc(SP[s.sp].animal) + ' <b>' + esc(s.name) + '</b>, 친해진 정도 ' + s.love + '</li><li>펫 이름 "' + esc(s.name) + '" (다른 친구가 쓸 수 있게 돼요)</li><li>간식 돈 ' + s.coins + '개</li><li>배운 장기 ' + tricks + '개, 옷장 ' + owned + '벌</li><li>친구 목록' + (FR.loaded ? ' ' + nf + '명' : '') + '과 받은, 보낸 친구 요청</li></ul>'
          + '<div class="pet-row pet-adopt-btns"><button class="pet-btn" type="button" data-x>그만두기</button><button class="pet-btn warn" type="button" data-go>떠나보내기</button></div>'
        : '<b>정말 떠나보낼까요?</b><p>마지막 확인이에요. 누르면 바로 지워지고 새 친구를 데려오는 화면으로 돌아가요.</p>'
          + (msg ? '<p class="pet-adopt-msg" role="alert">' + esc(msg) + '</p>' : '')
          + '<div class="pet-row pet-adopt-btns"><button class="pet-btn" type="button" data-x>아니요, 같이 있을래요</button><button class="pet-btn warn" type="button" data-go' + (busy ? ' disabled' : '') + '>' + (busy ? '지우는 중' : '네, 떠나보낼게요') + '</button></div>')
      + '</div>';
    $$('[data-x]', d).forEach(x => x.addEventListener('click', () => { if (!busy) close(); }));
    $('[data-go]', d).addEventListener('click', go);
  };
  const go = async () => {
    if (busy) return;
    if (step === 1) { step = 2; draw(); return; }
    busy = true; msg = ''; draw();
    const r = await leaveCloud();
    busy = false;
    if (!r.ok) { msg = r.why; draw(); return; }
    close();
    const name = load().name;
    ST = blank(); ST.left = now();
    if (window.SDT && SDT.user) ST.owner = SDT.user.uid;
    try { localStorage.setItem(LKEY, JSON.stringify(ST)); } catch (e) { /* 무시 */ }
    FR.me = null; FR.nameIssue = ''; FR.friends = []; FR.pending = []; FR.requests = []; FR.loaded = false; FR.msg = '';
    const pn = $('#petPanel'); if (pn) closePanel();
    const pg = $('#petPage'); if (pg) bootPage(pg);
    render(); friendsRender();
    note(name + fJosa(name, '과', '와') + ' 인사했어요. 언제든 새 친구를 데려올 수 있어요');
  };
  d.addEventListener('click', e => { if (e.target === d && !busy) close(); });
  draw(); document.body.appendChild(d);
}
async function leaveCloud() {
  const db = fs();
  if (!db || !(window.SDT && SDT.user)) return { ok: true, local: true };
  const me = SDT.user.uid, F = db.collection('pet3Friends');
  try {
    // 2026-09-18: 전체 채팅 글은 지우지 않는다 (대화 기록은 서버에 남긴다. 친구 목록이 없어지니 친구에게는 안 보인다)
    const [own, ls, rs] = await Promise.all([
      db.collection('pet3Owners').doc(me).get(),
      F.doc(me).collection('list').get(), F.doc(me).collection('requests').get(),
    ]);
    const ops = [];
    ls.docs.forEach(x => { if (x.id === me) return; ops.push(['del', F.doc(me).collection('list').doc(x.id)], ['del', F.doc(x.id).collection('list').doc(me)], ['del', F.doc(x.id).collection('requests').doc(me)]); });
    rs.docs.forEach(x => { if (x.id === me) return; ops.push(['del', F.doc(me).collection('requests').doc(x.id)], ['del', F.doc(x.id).collection('list').doc(me)]); });
    ops.push(['del', db.collection('pet3Presence').doc(me)], ['del', db.collection('pet3Inbox').doc(me)]);
    // 이름표와 이름 자리는 같은 묶음에서 지운다 (규칙)
    const first = db.batch();
    if (own.exists) {
      const key = own.data().name;
      const nd = key ? await db.collection('pet3Names').doc(key).get() : null;
      if (nd && nd.exists && nd.data().uid === me) first.delete(db.collection('pet3Names').doc(key));
      first.delete(db.collection('pet3Owners').doc(me));
    }
    const left = blank(); left.left = now(); left.owner = me;
    await first.commit();
    for (let i = 0; i < ops.length; i += 400) {
      const b = db.batch();
      ops.slice(i, i + 400).forEach(o => b.delete(o[1]));
      await b.commit();
    }
    await SDT.set(REMOTE, left);
    return { ok: true };
  } catch (e) {
    return { ok: false, why: e && e.code === 'permission-denied' ? '권한이 없어요. 새로고침한 뒤 다시 해 주세요' : '지우지 못했어요. 인터넷 연결을 보고 다시 해 주세요' };
  }
}

/* 펫 이름: 앞뒤 빈칸을 없애고 빈칸은 한 칸으로. 열쇠는 빈칸을 빼고 영문 소문자 (firestore.rules 의 p3KeyOf 와 같게) */
const ro = w => { const c = String(w || '').slice(-1).charCodeAt(0); if (c < 0xAC00 || c > 0xD7A3) return '로'; const j = (c - 0xAC00) % 28; return j === 0 || j === 8 ? '로' : '으로'; };
const NAME_RE = /^[A-Za-z0-9가-힣]( ?[A-Za-z0-9가-힣])*$/;
function nameCheck(raw) {
  const pet = String(raw || '').normalize('NFC').replace(/\s+/g, ' ').trim();
  if (!pet) return { ok: false, why: '이름을 지어 주세요' };
  if (Array.from(pet).length > 8) return { ok: false, why: '이름은 8글자까지예요' };
  if (!NAME_RE.test(pet)) return { ok: false, why: '이름은 한글, 영어, 숫자로만 지어 주세요 (ㅋ 같은 낱자나 기호는 안 돼요)' };
  return { ok: true, pet, key: pet.toLowerCase().replace(/ /g, '') };
}
const nameTakenMsg = pet => {
  const base = pet.replace(/ /g, ''), tail = String(2 + Math.floor(Math.random() * 97));
  const ex = Array.from(base).length + tail.length <= 8 ? base + tail : '';
  return '"' + pet + '"' + fJosa(pet, '은', '는') + ' 이미 다른 친구가 쓰는 이름이에요. ' + (ex ? '"' + ex + '" 처럼 조금 바꿔 볼까요?' : '다른 이름을 지어 주세요');
};
// 이름 자리 잡기: 내 이름표(pet3Owners/{uid})와 이름 자리(pet3Names/{열쇠})를 한 번에 쓰고, 예전 이름 자리는 비운다.
// 로그인 전이거나 Firebase 가 없으면 이 브라우저에만 저장하고, 로그인하면 nameSync 가 다시 잡는다
// 친구에게 보이는 내 이름(키우는 사람). 기본은 구글 계정 이름, 20글자까지
const whoCut = v => Array.from(String(v || '').replace(/\s+/g, ' ').trim()).slice(0, 20).join('');
async function nameClaim(n, sp, whoWanted) {
  const db = fs();
  if (!db || !(window.SDT && SDT.user)) return { ok: true, local: true };
  const me = SDT.user.uid, O = db.collection('pet3Owners').doc(me), N = db.collection('pet3Names');
  sp = fsp(sp);
  let old = null;
  try {
    const cur = await O.get();
    old = cur.exists ? cur.data() : null;
    const who = whoCut(whoWanted) || whoCut(old && old.who) || whoCut(SDT.user.displayName);
    if (old && old.name === n.key && old.pet === n.pet && old.sp === sp && (old.who || '') === who) { FR.me = { key: n.key, pet: n.pet, sp, who: old.who || '' }; FR.nameIssue = ''; return { ok: true }; }
    if (!old || old.name !== n.key) {
      const t = await N.doc(n.key).get();
      if (t.exists && t.data().uid !== me) return { ok: false, taken: true, why: nameTakenMsg(n.pet) };
    }
    const write = withWho => {
      const b = db.batch();
      b.set(N.doc(n.key), { uid: me, pet: n.pet, sp });
      b.set(O, Object.assign({ name: n.key, pet: n.pet, sp, ts: firebase.firestore.FieldValue.serverTimestamp() }, withWho && who ? { who } : {}));
      if (old && old.name && old.name !== n.key) b.delete(N.doc(old.name));
      return b.commit();
    };
    let saved = who;
    try { await write(true); } catch (e) { if (!(e && e.code === 'permission-denied') || !who) throw e; await write(false); saved = ''; }   // 규칙을 다시 게시하기 전
    FR.me = { key: n.key, pet: n.pet, sp, who: saved }; FR.nameIssue = '';
    return { ok: true };
  } catch (e) {
    if (e && e.code === 'permission-denied') {
      // 이름과 동물은 그대로이고 보이는 이름만 못 바꿨으면(5초 안에 또 바꿈) 예전 이름표를 그대로 쓴다
      if (old && old.name === n.key && old.pet === n.pet && old.sp === sp) { FR.me = { key: n.key, pet: n.pet, sp, who: old.who || '' }; FR.nameIssue = ''; return { ok: true }; }
      // 그 사이 다른 사람이 먼저 잡았거나, 방금 바꿔서 5초가 안 지났다
      try { const t = await N.doc(n.key).get(); if (t.exists && t.data().uid !== me) return { ok: false, taken: true, why: nameTakenMsg(n.pet) }; } catch (err) { /* 아래로 */ }
      return { ok: false, why: '방금 바꿨어요. 5초 뒤에 다시 해 주세요' };
    }
    return { ok: false, why: '이름을 확인하지 못했어요. 인터넷 연결을 보고 다시 해 주세요' };
  }
}
// 로그인할 때: 내 펫 이름이 이름 자리에 잡혀 있는지 보고, 없으면 잡는다. 이미 남이 쓰면 새 이름을 지어 달라고 한다
async function nameSync() {
  const s = load();
  if (!s.adopted || !fs() || !(window.SDT && SDT.user)) return;
  // 이름표가 있고 이 브라우저의 이름과 다르면: 이 브라우저에서 그 뒤에 바꾼 게 아니면(nameTs) 이름표를 따른다.
  // (펫 프로그램에서 바꾼 이름을 예전 이름으로 되돌려 잡지 않게. 친구 관계는 uid 라서 이름과 상관없다)
  try {
    const cur = await fs().collection('pet3Owners').doc(SDT.user.uid).get();
    const o = cur.exists ? cur.data() : null;
    if (o && o.pet && o.name && o.pet !== s.name && nameCheck(o.pet).ok && (s.nameTs || 0) <= tsMs(o.ts)) {
      s.name = o.pet; save();
      FR.me = { key: o.name, pet: o.pet, sp: fsp(o.sp), who: o.who || '' }; FR.nameIssue = '';
      if (fsp(o.sp) === fsp(s.sp)) return;
    }
  } catch (e) { /* 아래에서 다시 */ }
  const n = nameCheck(s.name);
  if (!n.ok) { FR.nameIssue = 'bad'; return; }
  const r = await nameClaim(n, s.sp);
  FR.nameIssue = r.ok ? '' : r.taken ? 'taken' : '';
}

/* ---------- 화면 ---------- */
function spriteHtml(s, cls, mood) {
  if (!s.adopted) return '<span class="pet-sprite egg ' + (cls || '') + '">' + eggSvg() + '</span>';
  const g = growOf(s.love);
  return '<span class="pet-sprite ' + (cls || '') + '" style="--grow:' + g.scale + '">' + petSvg(s, { mood: mood || moodOf(s) }) + '</span>';
}
function hud() {
  let el = $('#petHud');
  if (!el) {
    el = document.createElement('div'); el.id = 'petHud'; el.className = 'pet-hud';
    el.innerHTML = '<div class="pet-bubble" id="petBubble" hidden></div><button type="button" class="pet-hud-btn" aria-label="내 펫 보기"></button>';
    document.body.appendChild(el);
    el.querySelector('button').addEventListener('click', () => { if (!load().adopted) adoptView('adopt'); else openPanel(); });
  }
  return el;
}
function render() {
  const s = load(); const btn = $('#petHud .pet-hud-btn');
  if (!btn) { const pg = $('#petPage'); if (pg && s.adopted) fillPanel(pg); replay(); return; }
  btn.innerHTML = spriteHtml(s, 'mini') + (s.adopted ? '<span class="pet-hud-stats"><span>' + heartSvg(s.hearts > 0) + '<b>' + s.hearts + '</b></span><span>' + coinSvg() + '<b>' + s.coins + '</b></span></span>' : '<span class="pet-hud-stats"><b>알을 눌러요</b></span>');
  const p = $('#petPanel'); if (p && !p.hidden) fillPanel(p);
  const pg = $('#petPage'); if (pg && load().adopted) fillPanel(pg);
  replay();
}
let tab = 'care';
function openPanel(t) {
  if (t) tab = t;
  let p = $('#petPanel');
  if (!p) {
    p = document.createElement('div'); p.id = 'petPanel'; p.className = 'pet-panel'; p.setAttribute('role', 'dialog'); p.setAttribute('aria-label', '내 펫');
    document.body.appendChild(p);
    p.addEventListener('click', e => {
      if (e.target === p) { closePanel(); return; }
      act(e, p);
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !p.hidden) closePanel(); });
  }
  p.hidden = false; document.body.classList.add('pet-open'); fillPanel(p);
}
function act(e, p) {
      const b = e.target.closest('[data-act]'); if (!b) return;
      const [a, v] = b.dataset.act.split(':');
      if (a === 'close') closePanel(); else if (a === 'tab') { tab = v; fillPanel(p); } else if (a === 'feed') feed(v); else if (a === 'wear') wear(v); else if (a === 'boss') startBoss(v); else if (a === 'pet') pet(b);
      else if (a === 'desk') launchDesktop();
      else if (a === 'trick') trick(v);
      else if (a === 'rename') renameOpen(b);
      else if (a === 'change') adoptView('change');
      else if (a === 'leave') leaveView();
      else if (a === 'care') care(v);
      else if (a === 'dnd') { const st = load(); st.dnd = { on: !!b.checked, from: 23, to: 8 }; save(); }
      else if (a === 'chat') { note(WIP.chat); if (DESKTOP_READY) launchDesktop('&open=chat'); }
}
/* 이름 바꾸기: 제목 줄을 입력칸으로 바꾼다. 이름 자리를 먼저 잡고 저장하면 펫 상태, 화면 펫(presence)에 같이 반영 */
function renameOpen(btn) {
  const row = btn.closest('.pet-title'); if (!row || row.parentNode.querySelector('.pet-rename-form')) return;
  const s = load();
  const f = document.createElement('form'); f.className = 'pet-rename-form';
  f.innerHTML = '<input maxlength="12" autocomplete="off" spellcheck="false" aria-label="새 이름" value="' + esc(s.name || '') + '"><button type="submit" class="pet-btn">저장</button><button type="button" class="pet-btn" data-x>취소</button><small>한글, 영어, 숫자로 8글자까지. 다른 친구와 겹치면 안 돼요</small><p class="pet-rename-msg" role="alert" hidden></p>';
  row.hidden = true; row.after(f);
  const inp = f.querySelector('input'), m = f.querySelector('.pet-rename-msg'); inp.focus(); inp.select();
  const close = () => { f.remove(); row.hidden = false; };
  const tell = t => { m.textContent = t; m.hidden = !t; };
  f.querySelector('[data-x]').addEventListener('click', e => { e.stopPropagation(); close(); });
  f.addEventListener('click', e => e.stopPropagation());
  inp.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Escape') close(); });
  inp.addEventListener('input', () => tell(''));
  let busy = false;
  f.addEventListener('submit', async e => {
    e.preventDefault();
    if (busy) return;
    const n = nameCheck(inp.value);
    if (!n.ok) { tell(n.why); inp.focus(); return; }
    const st = load(); if (n.pet === st.name && !FR.nameIssue) { close(); return; }
    busy = true; f.querySelector('[type=submit]').textContent = '확인 중';
    const r = await nameClaim(n, st.sp);
    busy = false; f.querySelector('[type=submit]').textContent = '저장';
    if (!r.ok) { tell(r.why); inp.select(); return; }
    st.name = n.pet; st.nameTs = Date.now(); save();
    close();
    const p = PAGE() ? $('#petPage') : $('#petPanel'); if (p) fillPanel(p);
    react('hop'); say('이제 내 이름은 ' + n.pet + '!');
    presenceBeat(); friendsRender(); resendRequests();
  });
}
function closePanel() { const p = $('#petPanel'); if (p) p.hidden = true; document.body.classList.remove('pet-open'); }
function careNeedsHtml(s) {
  const n = careNeeds(s, now()).filter(x => x.id !== 'miss');
  if (careAsleep(s, now())) return '<div class="pet-wants"><span class="pet-want">' + needIcon('sleepy') + '쿨쿨 자는 중이에요</span></div>';
  if (!n.length) return '<div class="pet-wants"><span class="pet-want ok">' + heartSvg(true) + '지금은 다 괜찮아요</span></div>';
  return '<div class="pet-wants">' + n.map(x => '<span class="pet-want' + (x.urgent ? ' urgent' : '') + '">' + needIcon(x.id) + esc(x.text) + '</span>').join('') + '</div>';
}
function bar(v, cls) { return '<span class="pet-bar ' + cls + '"><i style="width:' + clamp(Math.round(v), 0, 100) + '%"></i></span>'; }
function fillPanel(p) {
  const s = load(), g = growOf(s.love), nextG = GROW.find(x => x.at > s.love);
  const today = s.daily[dayKey()] || 0;
  let h = '<div class="pet-sheet"><div class="pet-head"><div class="pet-tabs">' + [['care', '돌보기'], ['tricks', '장기'], ['closet', '옷장']].map(t => '<button type="button" class="pet-tab' + (tab === t[0] ? ' on' : '') + '" data-act="tab:' + t[0] + '">' + t[1] + '</button>').join('') + '</div>' + (PAGE() ? '' : '<button class="pet-x" type="button" data-act="close" aria-label="닫기">닫기</button>') + '</div>';
  if (tab === 'care') {
    h += '<div class="pet-room"><button type="button" class="pet-touch" data-act="pet" aria-label="쓰다듬기">' + spriteHtml(s, 'big walk') + '</button><div class="pet-room-hint">눌러서 쓰다듬기</div></div>'
      + '<div class="pet-title"><b>' + esc(s.name) + '</b><button type="button" class="pet-rename" data-act="rename" aria-label="이름 바꾸기">이름 바꾸기</button><span>' + esc(SP[s.sp].animal) + ', ' + g.name + '</span><span class="pet-coins">' + coinSvg() + s.coins + '</span></div>'
      + careNeedsHtml(s)
      + '<div class="pet-meters"><div><span>배부름</span>' + bar(s.food, 'food') + '</div><div><span>목마름</span>' + bar(s.water, 'water') + '</div><div><span>기분</span>' + bar(s.fun, 'fun') + '</div><div><span>깨끗함</span>' + bar(s.clean, 'clean') + '</div>'
      + '<div><span>친해진 정도</span>' + bar(nextG ? (s.love - g.at) / (nextG.at - g.at) * 100 : 100, 'love') + '<small>' + s.love + (nextG ? ', ' + nextG.name + '까지 조금 더' : ', 다 자랐어요') + '</small></div></div>'
      + '<div class="pet-chips"><span>' + [0, 1, 2, 3, 4].map(i => heartSvg(i < s.hearts)).join('') + '</span><span>' + flameSvg() + streakNow(s) + '일째</span><span>오늘 ' + Math.min(today, RULE.goal) + ' / ' + RULE.goal + '문제</span></div>'
      + '<div class="pet-foods">' + FOODS.map(f => '<button type="button" class="pet-food" data-act="feed:' + f.id + '"><b>' + f.name + '</b><small>' + coinSvg() + f.cost + '</small></button>').join('') + '</div>'
      + '<div class="pet-foods pet-free">' + '<button type="button" class="pet-food" data-act="care:water">' + needIcon('thirsty') + '<b>물 주기</b><small>공짜</small></button>'
      + '<button type="button" class="pet-food" data-act="care:bath">' + needIcon('dirty') + '<b>씻기기</b><small>공짜</small></button>'
      + (careAsleep(s, now()) ? '<button type="button" class="pet-food" data-act="care:wake">' + needIcon('sleepy') + '<b>깨우기</b><small>자는 중</small></button>'
        : '<button type="button" class="pet-food" data-act="care:sleep">' + needIcon('sleepy') + '<b>재우기</b><small>밤에만</small></button>') + '</div>'
      + '<label class="pet-dnd"><input type="checkbox" data-act="dnd"' + (s.dnd && s.dnd.on ? ' checked' : '') + '> 밤 11시부터 아침 8시까지는 조르지 않기</label>'
      + '<button type="button" class="pet-btn wide pet-change" data-act="change">다른 동물로 바꾸기</button>'
      + '<button type="button" class="pet-leave" data-act="leave">펫 떠나보내기</button>';
    const A = app();
    if (A && strict()) {
      const parts = (A.META.weeks || []).filter(w => A.BANK.filter(q => q.part === w.id && q.unit !== '용어').length >= RULE.bossN);
      if (parts.length) h += '<div class="pet-boss"><b>보스전</b><small>' + RULE.bossN + '문제 중 ' + RULE.bossPass + '개 넘게 맞히면 이겨요. 보스전에서는 하트가 안 줄어요.</small><div class="pet-row">' + parts.map(w => '<button class="pet-btn" type="button" data-act="boss:' + esc(w.id) + '">' + esc(w.short) + (s.trophies[w.id] ? ' 승리' : '') + '</button>').join('') + '</div></div>';
    }
  } else if (tab === 'tricks') {
    h += '<div class="pet-room short">' + spriteHtml(s, 'big') + '</div><div class="pet-title"><b>장기 배우기</b><span class="pet-coins">' + coinSvg() + s.coins + '</span></div>'
      + '<p class="pet-tip">친해진 정도가 쌓이면 새 장기를 배울 수 있어요. 배울 때 연습용 간식 돈이 들고, 배운 장기는 언제든 공짜로 보여 줘요.</p><div class="pet-tricks">'
      + TRICKS.map(k => { const got = (s.tricks || {})[k.id], ready = s.love >= k.need; return '<button type="button" class="pet-trick' + (got ? ' got' : ready ? '' : ' locked') + '" data-act="trick:' + k.id + '"><b>' + esc(k.name) + '</b><small>' + (got ? '보여 줘!' : ready ? coinSvg() + k.cost + ' 로 배우기' : '친해진 정도 ' + k.need + ' 필요') + '</small></button>'; }).join('')
      + '</div>';
  } else if (tab === 'closet') {
    h += '<div class="pet-room short">' + spriteHtml(s, 'big') + '</div><div class="pet-title"><b>옷장</b><span class="pet-coins">' + coinSvg() + s.coins + '</span></div>';
    [['head', '머리'], ['neck', '목'], ['face', '얼굴']].forEach(sl => {
      h += '<div class="pet-slot"><span>' + sl[1] + '</span><div class="pet-row">' + WEAR.filter(x => x.slot === sl[0]).map(x => '<button type="button" class="pet-btn' + (s.wear[x.slot] === x.id ? ' on' : '') + '" data-act="wear:' + x.id + '">' + esc(x.name) + (s.owned[x.id] ? '' : ' <small>' + coinSvg() + x.cost + '</small>') + '</button>').join('') + '</div></div>';
    });
  }
  if (!PAGE()) h += '<div class="pet-row wips"><button type="button" class="pet-btn wide" data-act="desk">노트북 화면에 ' + esc(s.name || '펫') + ' 띄우기' + (DESKTOP_READY ? ' <small class="wip">베타</small>' : ' <small class="wip">작업 중</small>') + '</button><button type="button" class="pet-btn wide" data-act="chat">친구와 채팅 <small class="wip">베타</small></button></div>';
  p.innerHTML = h + '</div>';
}

/* ---------- 접속 표시 (데스크톱 펫 프로그램이 읽음) ----------
   로그인한 사람이 사이트를 열어 두면 1분마다 pet3Presence/{uid}.ts 를 갱신한다. 서로 친구만 읽을 수 있다(firestore.rules).
   이름은 이름표(pet3Owners)에 잡힌 이름 그대로여야 해서, 이름 자리를 잡은 뒤에만 쓴다. */
let beatT = null;
const fs = () => (window.firebase && firebase.firestore) ? firebase.firestore() : null;
//  act, mood, ev(최근 일 10개, 이 기기 시각), ct(쓸 때 이 기기 시각): 친구 프로그램이 ts(서버 시각) 와 ct 의 차이로 시계 차이를 맞춘다
//  쓰기는 1분마다, 일이 생기면 바로(10초에 한 번까지)
const LIVE = { ev: [], recent: null, lastW: 0, t: 0 };
function liveEvent(k, a) {
  LIVE.ev = LIVE.ev.concat([{ k, a: fcut(a, 40), t: Date.now() }]).slice(-10);
  if (['eat', 'drink', 'bath'].includes(k)) LIVE.recent = { k, at: Date.now() };
}
function liveAct(s) {
  const t = now();
  if (careAsleep(s, t)) return 'sleeping';
  if (LIVE.recent && Date.now() - LIVE.recent.at < 20000) return { eat: 'eating', drink: 'drinking', bath: 'bathing' }[LIVE.recent.k];
  if (careMood(s, t) === 'sad') return 'sad';
  return 'walking';
}
// 돌보기로 저장할 때: 10초에 한 번까지 (남은 것은 10초가 차면 한 번에)
function presenceSoon() {
  const since = Date.now() - LIVE.lastW;
  clearTimeout(LIVE.t);
  if (since < 10000) { LIVE.t = setTimeout(presenceBeat, 10000 - since); return; }
  presenceBeat();
}
// 바로 쓰기: 1분 주기, 이름이나 보이는 이름을 바꿨을 때, 친구 목록을 열 때
function presenceBeat() {
  const db = fs(), s = load(); if (!db || !(window.SDT && SDT.user) || !s.adopted) return;
  if (document.hidden || !FR.me || FR.me.pet !== s.name) return;
  clearTimeout(LIVE.t);
  LIVE.lastW = Date.now();
  const wear = {}; ['head', 'neck', 'face'].forEach(k => { if (s.wear && typeof s.wear[k] === 'string') wear[k] = s.wear[k].slice(0, 20); });
  const doc = { name: FR.me.pet, sp: fsp(s.sp), wear, ts: firebase.firestore.FieldValue.serverTimestamp() };
  const tricks = Object.keys(s.tricks || {}).filter(k => TRICK_FRAMES[k]).slice(0, 10);
  const mid = Object.assign({ tricks }, FR.me.who ? { owner: FR.me.who } : {}, doc);
  const live = Object.assign({ act: liveAct(s), mood: String(careMood(s, now())).slice(0, 8), ev: LIVE.ev.slice(-10), ct: Date.now() }, mid);
  const ref = db.collection('pet3Presence').doc(SDT.user.uid);
  ref.set(live).catch(() => ref.set(mid)).catch(() => ref.set(doc)).catch(() => { /* 규칙이 아직 없으면 조용히 */ });
}
function startBeat() {
  if (beatT || !(window.SDT && SDT.user)) return;
  beatT = setInterval(presenceBeat, 60000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) presenceBeat(); });
}

/* ---------- 친구 (pet/ 페이지의 "친구" 칸) ----------
   친구의 펫 이름을 넣어 요청하고, 받은 사람이 수락하면 서로 친구. 서로 친구인 사람끼리만 노트북 화면에 펫이 같이 나오고 채팅한다.
   저장 구조와 권한은 firestore.rules 의 "친구 전용 펫 v3" 블록. 데스크톱 펫 프로그램(src/cloud.js)과 같은 문서를 쓴다. */
const FR = { me: null, nameIssue: '', friends: [], pending: [], requests: [], loaded: false, loading: false, busy: '', msg: '', ok: false, confirm: '', at: 0 };
const fcut = (v, n) => Array.from(String(v || '')).slice(0, n).join('');
const fsp = v => (/^[a-z0-9_-]{1,20}$/.test(String(v || '')) ? String(v) : 'cat');
const fJosa = (w, a, b) => { const c = String(w || '').slice(-1).charCodeAt(0); return (c >= 0xAC00 && c <= 0xD7A3 && (c - 0xAC00) % 28) ? a : b; };
const fFail = e => (e && e.code === 'permission-denied' ? '권한이 없어요. 새로고침한 뒤 다시 해 주세요' : '잠깐 문제가 생겼어요. 조금 뒤에 다시 해 주세요');

async function friendsLoad(force) {
  const db = fs(), s = load();
  if (!db || !(window.SDT && SDT.user) || !s.adopted || FR.loading || !$('#petFriends')) return;
  if (!force && FR.loaded && Date.now() - FR.at < 30000) return;
  const me = SDT.user.uid;
  FR.loading = true;
  try {
    if (!FR.me || FR.me.pet !== s.name || FR.me.sp !== fsp(s.sp)) await nameSync();
    if (SDT.user && SDT.user.uid !== me) return;
    presenceBeat();
    const root = db.collection('pet3Friends').doc(me);
    const [ls, rs] = await Promise.all([root.collection('list').get(), root.collection('requests').get()]);
    const list = ls.docs.filter(d => d.id !== me).map(d => ({ id: d.id, pet: fcut(d.data().pet, 8) || '친구', sp: fsp(d.data().sp), who: fcut(d.data().who, 20) }));
    list.forEach(e => { e.cached = { pet: e.pet, sp: e.sp, who: e.who }; });   // 내 목록에 적어 둔 이름 (친구가 이름을 바꾸면 옛 이름)
    const mutual = await Promise.all(list.map(e => db.collection('pet3Friends').doc(e.id).collection('list').doc(me).get().then(x => x.exists).catch(() => false)));
    FR.friends = list.filter((e, i) => mutual[i]);
    FR.pending = list.filter((e, i) => !mutual[i]);
    // 친구가 이름이나 동물을 바꿨으면 접속 표시에서 새 이름을 가져온다 (서로 친구만 읽힘)
    await Promise.all(FR.friends.map(f => db.collection('pet3Presence').doc(f.id).get().then(x => {
      if (!x.exists) return;
      const v = x.data(); if (v.name) f.pet = fcut(v.name, 8); if (v.sp) f.sp = fsp(v.sp); if (v.owner) f.who = fcut(v.owner, 20);
      f.ts = tsMs(v.ts); f.act = LIVE_ACTS[v.act] ? v.act : '';
      // 최근 2분 안에 한 장기, 배운 장기 (쓴 기기 시계 차이는 ts - ct 로 맞춘다)
      const shift = f.ts && typeof v.ct === 'number' && v.ct > 0 ? f.ts - v.ct : 0;
      const ev = (Array.isArray(v.ev) ? v.ev : []).filter(e => e && (e.k === 'trick' || e.k === 'learn') && TRICKS.some(k => k.id === e.a) && Number(e.t) > 0)
        .map(e => ({ k: e.k, a: e.a, t: Number(e.t) + shift })).sort((a, b) => a.t - b.t);
      const last = ev[ev.length - 1];   // 막 배우고 바로 한 장기면 "배웠어요" 를 보여 준다
      f.trick = last ? (ev.find(e => e.k === 'learn' && e.a === last.a && e.t >= last.t - 1000) || last) : null;
    }).catch(() => {})));
    // 1.4.7 친구가 펫 이름(동물, 키우는 사람 이름)을 바꿨으면 내 목록에 적어 둔 것도 고친다 (바뀐 것만. 접속 표시가 없을 때 이 이름이 보인다)
    FR.cacheJob = Promise.all(FR.friends.map(f => {
      const c = f.cached;
      if (!c || !nameCheck(f.pet).ok || (c.pet === f.pet && c.sp === f.sp && (c.who || '') === (f.who || ''))) return null;
      return root.collection('list').doc(f.id).set(Object.assign({ pet: f.pet, sp: f.sp, ts: firebase.firestore.FieldValue.serverTimestamp() }, f.who ? { who: f.who } : {}))
        .then(() => { f.cached = { pet: f.pet, sp: f.sp, who: f.who }; }).catch(() => {});
    }));
    const inList = new Set(list.map(e => e.id));
    FR.requests = [];
    rs.docs.forEach(d => {
      if (d.id === me) return;
      if (inList.has(d.id)) { d.ref.delete().catch(() => {}); return; }   // 이미 내 목록에 있는 사람의 요청은 치운다
      const v = d.data();
      FR.requests.push({ id: d.id, name: fcut(v.name, 60), pet: fcut(v.pet, 8), sp: fsp(v.sp) });
    });
    FR.loaded = true; FR.at = Date.now();
    await pokeCheck();
  } catch (e) { FR.msg = fFail(e); FR.ok = false; }
  finally { FR.loading = false; }
  friendsRender();
  grantsCheck(false);
}
// 1.4.7 내 펫 이름(동물)을 바꾼 뒤: 아직 수락 안 된 내 친구 요청을 새 이름으로 다시 쓴다 (받는 사람의 "받은 친구 요청"에 새 이름).
// 받는 사람도 그 사이 이름을 바꿨으면 규칙에 막힌다 (via 가 옛 이름). 그러면 그대로 둔다
async function resendRequests() {
  const db = fs(), s = load();
  if (!db || !(window.SDT && SDT.user) || !FR.me || !FR.pending.length) return;
  const me = SDT.user.uid, TS = firebase.firestore.FieldValue.serverTimestamp();
  FR.resendJob = Promise.all(FR.pending.map(p => {
    const k = nameCheck(p.pet); if (!k.ok) return null;
    const ref = db.collection('pet3Friends').doc(p.id).collection('requests').doc(me);
    const doc = name => ({ name, pet: FR.me.pet, sp: fsp(s.sp), via: k.key, ts: TS });
    return ref.set(doc(FR.me.who || '')).catch(() => ref.set(doc(''))).catch(() => null);
  }));
  return FR.resendJob;
}
async function friendsAdd(raw) {
  const db = fs(), s = load();
  if (!db || !(window.SDT && SDT.user) || FR.busy) return;
  const me = SDT.user.uid;
  const say2 = (m, ok) => { FR.busy = ''; FR.msg = m; FR.ok = !!ok; FR.pokeOk = false; friendsRender(); };
  const n = nameCheck(raw);
  if (!n.ok) { say2(String(raw || '').trim() ? '펫 이름은 한글, 영어, 숫자로 8글자까지예요. 다시 확인해 주세요' : '친구 펫 이름을 넣어 주세요'); return; }
  if (!FR.me) { say2(FR.nameIssue === 'taken' ? '내 펫 이름이 다른 친구와 겹쳐요. 먼저 이름을 바꿔 주세요' : '내 펫 이름을 확인하는 중이에요. 조금 뒤에 다시 해 주세요'); return; }
  if (n.key === FR.me.key) { say2('내 펫 이름이에요. 친구 펫 이름을 넣어 주세요'); return; }
  FR.busy = 'add'; FR.msg = ''; friendsRender();
  try {
    const c = await db.collection('pet3Names').doc(n.key).get();
    if (!c.exists || !c.data().uid) { say2('"' + n.pet + '"' + fJosa(n.pet, '이라는', '라는') + ' 펫이 없어요. 띄어쓰기 말고 글자가 맞는지 확인해 주세요'); return; }
    const t = { uid: c.data().uid, pet: fcut(c.data().pet, 8) || n.pet, sp: fsp(c.data().sp) };
    if (t.uid === me) { say2('내 펫 이름이에요. 친구 펫 이름을 넣어 주세요'); return; }
    if (FR.friends.some(f => f.id === t.uid)) { say2('이미 친구예요'); return; }
    const req = FR.requests.find(q => q.id === t.uid);
    if (req) { await friendsAct('accept', t.uid, true); say2(t.pet + fJosa(t.pet, '과', '와') + ' 친구가 됐어요', true); return; }
    if (FR.pending.some(p => p.id === t.uid)) { say2('이미 요청을 보냈어요. 친구가 수락하면 친구 목록에 나와요'); return; }
    const TS = firebase.firestore.FieldValue.serverTimestamp();
    const send = name => {
      const b = db.batch();
      b.set(db.collection('pet3Friends').doc(me).collection('list').doc(t.uid), { pet: t.pet, sp: t.sp, ts: TS });
      b.set(db.collection('pet3Friends').doc(t.uid).collection('requests').doc(me), { name, pet: FR.me.pet, sp: fsp(s.sp), via: n.key, ts: TS });
      return b.commit();
    };
    const dn = (FR.me && FR.me.who) || SDT.user.displayName || '';
    // 규칙이 이름을 로그인 토큰의 이름과 맞춰 본다. 안 맞으면 이름 없이 보낸다
    try { await send(Array.from(dn).length <= 60 ? dn : ''); } catch (e) { if (e.code !== 'permission-denied' || !dn) throw e; await send(''); }
    FR.at = 0;
    await friendsLoad(true);
    say2(t.pet + '에게 요청을 보냈어요. 친구가 수락하면 노트북 화면에 펫이 같이 나와요', true);
  } catch (e) { say2(fFail(e)); }
}
// 친구에게 보이는 내 이름 바꾸기: 이름표의 who 를 바꾸고 접속 표시에도 바로 반영
async function whoSave(raw) {
  const s = load(), who = whoCut(raw);
  if (!who) { FR.msg = '이름을 한 글자 이상 써 주세요'; FR.ok = false; friendsRender(); return; }
  const n = nameCheck((FR.me && FR.me.pet) || s.name); if (!n.ok) return;
  const r = await nameClaim(n, s.sp, who);
  if (r.ok && FR.me && FR.me.who !== who) { FR.msg = '지금은 저장하지 못했어요. 잠시 뒤에 다시 해 주세요'; FR.ok = false; }
  else if (r.ok) { FR.msg = '이제 친구에게 "' + who + '" 으로 보여요'; FR.ok = true; FR.pokeOk = true; const fm = $('#pfWhoForm'); if (fm) fm.hidden = true; presenceBeat(); }
  else { FR.msg = r.why; FR.ok = false; }
  friendsRender();
}
async function friendsAct(kind, id, quiet) {
  const db = fs();
  if (!db || !(window.SDT && SDT.user) || !id) return;
  const me = SDT.user.uid, F = db.collection('pet3Friends');
  if (!quiet) { FR.busy = id; friendsRender(); }
  try {
    const b = db.batch();
    if (kind === 'accept') {
      const q = FR.requests.find(x => x.id === id) || { pet: '친구', sp: 'cat' };
      const entry = { pet: fcut(q.pet, 8) || '친구', sp: fsp(q.sp), ts: firebase.firestore.FieldValue.serverTimestamp() };
      const acc = withWho => { const bb = db.batch(); bb.set(F.doc(me).collection('list').doc(id), Object.assign({}, entry, withWho && q.name ? { who: fcut(q.name, 20) } : {})); bb.delete(F.doc(me).collection('requests').doc(id)); return bb.commit(); };
      try { await acc(true); } catch (e) { if (!(e && e.code === 'permission-denied') || !q.name) throw e; await acc(false); }
    } else if (kind === 'decline') {
      b.delete(F.doc(me).collection('requests').doc(id));
    } else if (kind === 'remove' || kind === 'cancel') {
      b.delete(F.doc(me).collection('list').doc(id));
      b.delete(F.doc(id).collection('list').doc(me));
      b.delete(F.doc(me).collection('requests').doc(id));
      b.delete(F.doc(id).collection('requests').doc(me));
    } else return;
    if (kind !== 'accept') await b.commit();
    if (!quiet) { FR.msg = ''; }
  } catch (e) { FR.msg = fFail(e); FR.ok = false; }
  if (!quiet) FR.busy = '';
  FR.confirm = '';
  await friendsLoad(true);
}
// 콕 찌르기: 친구 알림 문서(pet3Inbox/{친구})의 p_내uid 칸만 지금 시각으로. 규칙이 친구마다 30초에 한 번만 허락한다
const FPOKE = {};   // 친구 uid -> 마지막으로 찌른 시각 (이 브라우저)
async function friendsPoke(id) {
  const db = fs();
  if (!db || !(window.SDT && SDT.user) || !id) return;
  const f = FR.friends.find(x => x.id === id); if (!f) return;
  const left = (FPOKE[id] || 0) + 31000 - Date.now();
  if (left > 0) { FR.msg = Math.ceil(left / 1000) + '초 뒤에 또 찌를 수 있어요'; FR.ok = false; friendsRender(); return; }
  FR.busy = id; friendsRender();
  try {
    await db.collection('pet3Inbox').doc(id).set({ ['p_' + SDT.user.uid]: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
    FPOKE[id] = Date.now();
    FR.msg = f.pet + fJosa(f.pet, '을', '를') + ' 콕 찔렀어요. 펫 프로그램을 켠 친구에게 알림이 가요'; FR.ok = true; FR.pokeOk = true;
  } catch (e) {
    if (e && e.code === 'permission-denied') { FPOKE[id] = Date.now(); FR.msg = '조금 뒤에 또 찌를 수 있어요 (30초에 한 번)'; }
    else FR.msg = fFail(e);
    FR.ok = false;
  }
  FR.busy = '';
  friendsRender();
}

/* ---------- 받은 콕 찌르기 (내 펫 페이지 친구 칸 위 알림) ----------
   pet3Inbox/{나}.p_친구uid 에 친구가 찌른 서버 시각이 있다. 12시간 안의 것 중 닫지 않은 것을 보여 준다.
   이 브라우저에서 닫은(또는 답장한) 시각은 localStorage 에 친구마다 적는다. 시계 차이는 latest.json 응답의 Date 로 맞춘다. */
const tsMs = v => (v && typeof v.toMillis === 'function' ? v.toMillis() : (typeof v === 'number' ? v : 0));
const LIVE_ACTS = { walking: '산책 중', sitting: '앉아 쉬는 중', sleeping: '자는 중', eating: '밥 먹는 중', drinking: '물 마시는 중', bathing: '씻는 중', sad: '배고프고 심심해요', away: '자리 비움' };
const POKE_KEY = 'sdt_petpoke_v1', POKE_KEEP = 12 * 3600000, POKE_FRESH = 2 * 60000;
let skewMs = null;
async function serverSkew() {
  if (skewMs !== null) return skewMs;
  skewMs = 0;
  try {
    const r = await window.fetch(DOWNLOAD.replace(/download\.html$/, 'latest.json') + '?t=' + Date.now(), { method: 'HEAD', cache: 'no-store' });
    const d = Date.parse((r && r.headers && r.headers.get && r.headers.get('date')) || '');
    if (d && Math.abs(d + 500 - Date.now()) > 60000) skewMs = d + 500 - Date.now();
  } catch (e) { /* 시계 그대로 */ }
  return skewMs;
}
const pokeSeenAll = () => { try { return JSON.parse(localStorage.getItem(POKE_KEY) || '{}') || {}; } catch (e) { return {}; } };
function pokeSeen(uid, fid, t) {
  const o = pokeSeenAll(); o[uid] = o[uid] || {}; o[uid][fid] = t;
  try { localStorage.setItem(POKE_KEY, JSON.stringify(o)); } catch (e) { /* 무시 */ }
}
async function pokeCheck() {
  const db = fs(); if (!db || !(window.SDT && SDT.user)) return;
  const me = SDT.user.uid;
  let v = null;
  try { const x = await db.collection('pet3Inbox').doc(me).get(); v = x.exists ? x.data() : {}; } catch (e) { return; }
  if (!(SDT.user && SDT.user.uid === me)) return;
  const nowS = Date.now() + await serverSkew(), seen = pokeSeenAll()[me] || {};
  FR.pokes = FR.friends.map(f => ({ f, t: tsMs(v['p_' + f.id]) }))
    .filter(x => x.t && x.t > (seen[x.f.id] || 0) && nowS - x.t <= POKE_KEEP)
    .sort((a, b) => b.t - a.t)
    .map(x => ({ id: x.f.id, pet: x.f.pet, who: x.f.who, sp: x.f.sp, t: x.t, late: nowS - x.t > POKE_FRESH, ago: Math.max(0, Math.round((nowS - x.t) / 60000)) }));
}
function pokesRender() {
  const host = $('#pfPokes'); if (!host) return;
  const list = FR.pokes || [];
  host.hidden = !list.length;
  host.innerHTML = list.map(x => {
    const who = x.pet + (x.who ? '(' + x.who + ')' : '');
    const last = x.pet;   // 조사는 괄호 밖 펫 이름에 맞춘다
    const when = x.ago < 1 ? '방금' : x.ago < 60 ? x.ago + '분 전' : Math.floor(x.ago / 60) + '시간 전';
    return '<div class="pf-poke" data-id="' + esc(x.id) + '" role="status"><span class="pf-av">' + petSvg({ sp: x.sp, wear: {} }, { mood: 'happy' }) + '</span><span class="pf-col"><b>' + esc((x.late ? '아까 ' : '') + who + fJosa(last, '이', '가') + ' 콕 찔렀어요!') + '</b><small>' + esc(when) + '</small></span>'
      + (FR.busy === x.id ? '<small class="pf-wait">처리 중</small>' : '<button type="button" class="pet-btn main" data-f="pokeBack">답장 콕</button><button type="button" class="pet-btn" data-f="pokeX">닫기</button>') + '</div>';
  }).join('');
}
function pokeDismiss(id) {
  const x = (FR.pokes || []).find(q => q.id === id); if (!x || !(window.SDT && SDT.user)) return;
  pokeSeen(SDT.user.uid, id, x.t);
  FR.pokes = FR.pokes.filter(q => q.id !== id);
  pokesRender();
}

/* ---------- 관리자가 준 코인 (petCoinGrants) ----------
   관리자 화면에서 만든 { uid, amount, note, claimed:false } 를 찾아, 트랜잭션으로 claimed 를 true 로 바꾼 쪽만 코인을 더한다.
   기기 두 대가 같이 받아도 한 번만. 펫이 없으면 받지 않고 남겨 둔다. 데스크톱 펫 프로그램(1.4.2)도 같은 방법으로 받는다. */
const GR = { at: 0, busy: false };
async function grantsCheck(force) {
  const db = fs(), s = load();
  if (!db || !db.runTransaction || !(window.SDT && SDT.user) || !s.adopted || GR.busy) return 0;
  if (!force && Date.now() - GR.at < 60000) return 0;
  GR.busy = true; GR.at = Date.now();
  const me = SDT.user.uid;
  let got = 0;
  try {
    const q = await db.collection('petCoinGrants').where('uid', '==', me).where('claimed', '==', false).limit(20).get();
    for (const g of q.docs) {
      if (!(SDT.user && SDT.user.uid === me) || !load().adopted) break;
      const v = g.data() || {}, amount = Math.floor(Number(v.amount));
      if (!(amount >= 1 && amount <= 5000)) continue;
      let ok = false;
      try {
        ok = await db.runTransaction(async tx => {
          const x = await tx.get(g.ref);
          if (!x.exists || x.data().claimed !== false || x.data().uid !== me) return false;
          tx.update(g.ref, { claimed: true, claimedAt: firebase.firestore.FieldValue.serverTimestamp() });
          return true;
        });
      } catch (e) { ok = false; }
      if (!ok) continue;
      const st = load();
      st.grantsApplied = st.grantsApplied || {};
      if (st.grantsApplied[g.id]) continue;
      st.grantsApplied[g.id] = now(); st.coins += amount; got += amount;
      save();
      news('관리자에게서 코인 ' + amount + '개가 왔어요', (v.note ? '"' + fcut(v.note, 60) + '" ' : '') + '지금 간식 돈은 ' + st.coins + '개예요.', coinSvg() + petSvg(st, { mood: 'happy', cls: 'big' }));
    }
  } catch (e) { /* 규칙이 아직 없거나 오프라인 */ }
  finally { GR.busy = false; }
  return got;
}
function friendsRender() {
  const host = $('#petFriends'); if (!host) return;
  const s = load();
  let state = 'ready';
  if (!(window.SDT && SDT.enabled)) state = 'off';
  else if (!SDT.user) state = 'login';
  else if (!s.adopted) state = 'nopet';
  if (host.dataset.state !== state) {
    host.dataset.state = state;
    let h = '<section class="pet-sheet pf"><div class="pf-head"><b>친구</b><p>친구의 펫 이름으로 친구를 추가해요. 서로 친구가 되면 노트북 화면에 펫이 같이 나오고 채팅해요.</p></div>';
    if (state === 'off') h += '<p class="pf-empty">친구 기능은 사이트 주소(https://geonumul.github.io/Toolbox_Group_Study/)에서 로그인하면 쓸 수 있어요.</p>';
    else if (state === 'login') h += '<div class="pf-empty"><p>로그인하면 친구를 추가할 수 있어요.</p><button type="button" class="pet-btn main" data-f="login">로그인</button></div>';
    else if (state === 'nopet') h += '<p class="pf-empty">펫을 먼저 데려오면 친구를 추가할 수 있어요.</p>';
    else h += '<div class="pf-pokes" id="pfPokes" hidden></div><div class="pf-code"><span>내 펫 이름</span><b id="pfMine"></b><button type="button" class="pet-btn" data-f="copy">복사</button>'
      + '<div class="pf-wholine"><span>친구에게 보이는 내 이름</span><b id="pfWho"></b><button type="button" class="pet-btn" data-f="who">바꾸기</button></div>'
      + '<form class="pf-whoform" id="pfWhoForm" hidden autocomplete="off"><input id="pfWhoIn" maxlength="20" aria-label="친구에게 보이는 내 이름" spellcheck="false"><button type="submit" class="pet-btn main">저장</button><button type="button" class="pet-btn" data-f="whoCancel">취소</button><small>20글자까지. 서로 친구인 사람에게만 보여요</small></form></div>'
      + '<p class="pf-issue" id="pfIssue" hidden></p>'
      + '<form class="pf-add" autocomplete="off"><input id="pfIn" maxlength="12" placeholder="친구 펫 이름" aria-label="친구 펫 이름" spellcheck="false"><button type="submit" class="pet-btn main" id="pfAddBtn">친구 요청</button></form>'
      + '<p class="pf-msg" id="pfMsg" hidden></p><div id="pfLists"></div>';
    host.innerHTML = h + '</section>';
  }
  if (state !== 'ready') return;
  pokesRender();
  $('#pfMine').textContent = FR.me ? FR.me.pet : (FR.nameIssue ? s.name : '확인하는 중');
  $('#pfWho').textContent = FR.me ? (FR.me.who || '(없음)') : '';
  const iss = $('#pfIssue');
  iss.hidden = !FR.nameIssue;
  if (FR.nameIssue) iss.innerHTML = esc('"' + s.name + '"' + fJosa(s.name, '은', '는') + (FR.nameIssue === 'taken' ? ' 이미 다른 친구가 먼저 쓰는 이름이에요.' : ' 쓸 수 없는 이름이에요.') + ' 새 이름을 지어야 친구를 추가할 수 있어요.') + ' <button type="button" class="pet-btn main" data-f="rename">이름 바꾸기</button>';
  $('#pfAddBtn').disabled = FR.busy === 'add';
  $('#pfAddBtn').textContent = FR.busy === 'add' ? '찾는 중' : '친구 요청';
  const m = $('#pfMsg'); m.hidden = !FR.msg; m.textContent = FR.msg; m.classList.toggle('ok', FR.ok);
  if (FR.ok && FR.msg && !FR.pokeOk) $('#pfIn').value = '';   // 콕 찌르기 안내일 때는 쓰던 이름을 지우지 않는다
  const row = (x, sub, btns) => '<div class="pf-row" data-id="' + esc(x.id) + '"><span class="pf-av">' + petSvg({ sp: x.sp, wear: {} }, { mood: 'happy' }) + '</span><span class="pf-col"><b>' + esc(x.title) + (x.who ? ' <span class="pf-owner">' + esc(x.who) + '</span>' : '') + '</b><small>' + esc(sub) + '</small></span>'
    + (FR.busy === x.id ? '<small class="pf-wait">처리 중</small>' : btns) + '</div>';
  let h = '';
  if (!FR.loaded) h = '<p class="pf-empty">친구 목록을 불러오는 중이에요</p>';
  else {
    if (FR.requests.length) h += '<h3>받은 친구 요청</h3>' + FR.requests.map(q => row({ id: q.id, sp: q.sp, title: q.pet || '친구', who: q.name }, q.name ? q.name + ' 님이 키우는 펫이 친구 하자고 해요' : '친구 하자고 해요',
      '<button type="button" class="pet-btn main" data-f="accept">수락</button><button type="button" class="pet-btn" data-f="decline">거절</button>')).join('');
    h += '<h3>친구 ' + FR.friends.length + '명</h3>';
    const trickLine = f => {
      const e = f.trick; if (!e || Date.now() + (skewMs || 0) - e.t > 2 * 60000) return '';
      const n = (TRICKS.find(k => k.id === e.a) || {}).name || '';
      return e.k === 'learn' ? f.pet + fJosa(f.pet, '이', '가') + ' 새 개인기 ' + n + fJosa(n, '을', '를') + ' 배웠어요' : f.pet + fJosa(f.pet, '이', '가') + ' ' + n + fJosa(n, '을', '를') + ' 했어요';
    };
    const actLine = f => trickLine(f) || (f.act && f.ts && Date.now() + (skewMs || 0) - f.ts < 5 * 60000 ? f.pet + fJosa(f.pet, '은', '는') + ' ' + LIVE_ACTS[f.act] : '');
    h += FR.friends.length ? FR.friends.map(f => row({ id: f.id, sp: f.sp, title: f.pet, who: f.who }, actLine(f) ? actLine(f) + (f.who ? ', ' + f.who + ' 님의 펫' : '') : f.who ? f.who + ' 님의 펫, 노트북 화면에 같이 나와요' : '노트북 화면에 같이 나와요',
      FR.confirm === f.id ? '<button type="button" class="pet-btn warn" data-f="remove">정말 끊기</button><button type="button" class="pet-btn" data-f="keep">아니요</button>' : '<button type="button" class="pet-btn main" data-f="poke">콕 찌르기</button><button type="button" class="pet-btn" data-f="ask">끊기</button>')).join('')
      : '<p class="pf-empty">아직 친구가 없어요. 내 펫 이름을 친구에게 알려 주거나 친구 펫 이름을 위에 넣어 보세요.</p>';
    if (FR.pending.length) h += '<h3>수락 기다리는 중</h3>' + FR.pending.map(p => row({ id: p.id, sp: p.sp, title: p.pet }, '친구가 수락하면 친구 목록으로 옮겨져요', '<button type="button" class="pet-btn" data-f="cancel">요청 취소</button>')).join('');
  }
  $('#pfLists').innerHTML = h;
}
function friendsBoot() {
  const host = $('#petFriends'); if (!host) return;
  host.addEventListener('submit', e => {
    if (e.target.closest('.pf-add')) { e.preventDefault(); friendsAdd($('#pfIn').value); }
    if (e.target.closest('.pf-whoform')) { e.preventDefault(); whoSave($('#pfWhoIn').value); }
  });
  host.addEventListener('input', e => { if (e.target.id === 'pfIn' && FR.msg) { FR.msg = ''; $('#pfMsg').hidden = true; } });
  host.addEventListener('click', e => {
    const b = e.target.closest('[data-f]'); if (!b) return;
    const f = b.dataset.f, r = b.closest('.pf-row'), id = r ? r.dataset.id : '';
    if (f === 'login') { if (window.SDT) SDT.login(); return; }
    if (f === 'rename') { const pg = $('#petPage'); tab = 'care'; if (pg) { fillPanel(pg); const rb = $('[data-act="rename"]', pg); if (rb) { rb.scrollIntoView({ block: 'center' }); renameOpen(rb); } } return; }
    if (f === 'who') { const fm = $('#pfWhoForm'); fm.hidden = false; $('#pfWhoIn').value = (FR.me && FR.me.who) || ''; $('#pfWhoIn').focus(); return; }
    if (f === 'whoCancel') { $('#pfWhoForm').hidden = true; return; }
    if (f === 'copy') {
      const t = FR.me ? FR.me.pet : ''; if (!t) return;
      const done = () => { b.textContent = '복사했어요'; setTimeout(() => { b.textContent = '복사'; }, 1600); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(done, () => {}); else done();
      return;
    }
    if (f === 'poke') { friendsPoke(id); return; }
    const pk = b.closest('.pf-poke'), pid = pk ? pk.dataset.id : '';
    if (f === 'pokeBack') { friendsPoke(pid).then(() => { if (FR.ok) pokeDismiss(pid); }); return; }
    if (f === 'pokeX') { pokeDismiss(pid); return; }
    if (f === 'ask') { FR.confirm = id; friendsRender(); return; }
    if (f === 'keep') { FR.confirm = ''; friendsRender(); return; }
    if (['accept', 'decline', 'remove', 'cancel'].includes(f)) friendsAct(f, id);
  });
  friendsRender();
  if (window.SDT) SDT.onAuth(() => { FR.me = null; FR.nameIssue = ''; FR.loaded = false; FR.friends = []; FR.pending = []; FR.requests = []; friendsRender(); });
  window.addEventListener('focus', () => friendsLoad(false));
  // 펫 페이지를 열어 둔 동안 1분마다 받은 콕만 다시 본다 (문서 하나 읽기)
  setInterval(() => { if (!document.hidden && FR.loaded && window.SDT && SDT.user) pokeCheck().then(pokesRender); }, 60000);
  // 1.4.7 친구 목록(친구가 바꾼 펫 이름, 받은 요청)도 90초마다 다시 (창을 보고 있을 때만)
  setInterval(() => { if (!document.hidden && FR.loaded && window.SDT && SDT.user) friendsLoad(true); }, 90000);
}

/* ---------- 노트북 화면에 펫 띄우기 (설치한 펫 프로그램을 tsgpet:// 주소로 켜고 끔) ---------- */
const DESKTOP_READY = true;   // 데스크톱 펫 프로그램을 올리면 true
const WIP = {
  desk: '노트북 화면 전체에 펫을 띄우는 기능은 지금 만들고 있어요. 다 되면 이 버튼 하나로 켜고 끌 수 있어요.',
  chat: '채팅은 노트북 화면에 띄운 펫 프로그램에서 해요. 화면 오른쪽 끝 분홍 채팅 버튼을 누르면 전체 채팅과 1:1 채팅이 나와요. 친구는 펫 이름으로 추가해요.',
};
// 펫 프로그램 켜고 끄기. 설치돼 있으면 브라우저 창이 잠깐 포커스를 잃는다(blur 나 visibilitychange). 2초 안에 없으면 설치 안내
const APP_KEY = 'sdt_petapp_v1';   // { installed: 설치 파일 받기를 누른 시각, launched: 켜기에 성공한 시각 }
const appMark = k => { try { const o = JSON.parse(localStorage.getItem(APP_KEY) || '{}') || {}; o[k] = now(); localStorage.setItem(APP_KEY, JSON.stringify(o)); } catch (e) { /* 무시 */ } };
const appSeen = () => { try { const o = JSON.parse(localStorage.getItem(APP_KEY) || '{}') || {}; return !!(o.installed || o.launched); } catch (e) { return false; } };
function launchDesktop(extra) {
  if (!DESKTOP_READY) { note(WIP.desk); return; }
  // 과목 페이지나 첫 화면에서는 내 펫 페이지로 보낸다 (설치와 띄우기가 한 곳에)
  if (!PAGE()) { location.href = PET_PAGE + '#app'; return; }
  const s = load();
  const who = window.SDT && SDT.user ? '&uid=' + encodeURIComponent(SDT.user.uid) + (SDT.user.refreshToken ? '&rt=' + encodeURIComponent(SDT.user.refreshToken) : '') : '';
  // 펫이 없으면 프로그램의 내 펫 탭을 연다 (프로그램에서 데려올 수도 있음)
  // ping: 1.4.1 이상 프로그램은 받으면 users/{uid}/stores/petapp__info 에 {ver, ping} 을 적는다 (예전 프로그램은 모르는 칸이라 무시)
  const ping = Math.random().toString(36).slice(2, 12) + Date.now().toString(36);
  lastPing = ping;
  const url = (s.adopted
    ? 'tsgpet://toggle?sp=' + encodeURIComponent(s.sp) + '&name=' + encodeURIComponent(s.name || '') + '&wear=' + encodeURIComponent(JSON.stringify(s.wear || {})) + who + (extra || '')
    : 'tsgpet://show?open=pet' + who) + '&ping=' + ping;
  let left = false;
  const onLeave = () => { left = true; };
  const onVis = () => { if (document.hidden) left = true; };
  window.addEventListener('blur', onLeave, { once: true });
  document.addEventListener('visibilitychange', onVis);
  appCardMsg('');
  try { location.href = url; } catch (e) { /* 설치 안 됨 */ }
  setTimeout(() => {
    window.removeEventListener('blur', onLeave);
    document.removeEventListener('visibilitychange', onVis);
    if (left) { appMark('launched'); appCardRender(); appVersionCheck(ping); return; }
    if (!appCardMsg('프로그램이 안 열리면 먼저 설치해 주세요. 설치했는데도 안 열리면 브라우저의 "TSG 펫 열기" 창에서 열기를 눌러 주세요.')) note('펫 프로그램이 아직 없으면 한 번만 설치해 주세요', true);
  }, 2000);
}
// 프로그램이 열린 뒤: 답(ping)이 오면 버전을 보고, 안 오면 예전 버전(1.4.0 이하는 답을 안 적음)일 수 있다고 알려 준다
let lastPing = '';
const APP_POLL_MS = 1000, APP_POLL_N = 8;
const verNum = v => { const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(String(v || '')); return m ? [+m[1], +m[2], +m[3]] : null; };
const verCmp = (a, b) => { const x = verNum(a), y = verNum(b); if (!x || !y) return (x ? 1 : 0) - (y ? 1 : 0); for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] - y[i]; return 0; };
async function latestInfo() {
  try {
    const r = await window.fetch(DOWNLOAD.replace(/download\.html$/, 'latest.json') + '?t=' + now(), { cache: 'no-store' });
    if (!r.ok) return null;
    const j = await r.json();
    return verNum(j.version) ? j : null;
  } catch (e) { return null; }
}
async function appVersionCheck(ping) {
  const OLD = '펫 프로그램이 옛날 버전이에요. 1.3.1 이하는 스스로 업데이트를 못 해요. 한 번만 새로 설치해 주세요. 펫과 설정은 그대로예요.';
  if (!(window.SDT && SDT.user)) {
    appCardMsg('펫 프로그램이 열렸어요. 친구 기능이 안 되면 옛날 버전일 수 있어요. 1.3.1 이하라면 한 번만 새로 설치해 주세요.', true);
    return;
  }
  let info = null;
  for (let i = 0; i < APP_POLL_N && !info; i++) {
    await new Promise(r => setTimeout(r, APP_POLL_MS));
    if (lastPing !== ping) return;   // 그 사이 한 번 더 눌렀다
    try { const v = await SDT.get('petapp__info'); if (v && v.ping === ping && verNum(v.ver)) info = v; } catch (e) { /* 다시 */ }
  }
  if (lastPing !== ping) return;
  if (!info) { appCardMsg(OLD + ' (1.3.2 이상이면 프로그램의 트레이 메뉴에서 "업데이트 확인" 을 눌러도 돼요)', true); return; }
  const latest = await latestInfo();
  if (latest && verCmp(info.ver, latest.minVersion) < 0) { appCardMsg(OLD, true); return; }
  if (latest && verCmp(info.ver, latest.version) < 0) { appCardMsg('새 버전(' + latest.version + ')이 나왔어요. 펫 프로그램의 업데이트 창(또는 트레이 메뉴의 업데이트 확인)에서 설치해 주세요. 지금 버전 ' + info.ver, false); return; }
  appCardMsg('최신 버전(' + info.ver + ')이에요. 잘 켜졌어요!', false, true);
}
// 내 펫 페이지 맨 위: 1. 펫 프로그램 설치, 2. 노트북 화면에 띄우기. 한 번 설치했거나 켜 본 사람은 띄우기가 먼저, 설치는 접힘
function appCardRender() {
  const host = $('#petApp'); if (!host) return;
  const seen = appSeen();
  const exe = DOWNLOAD.replace(/download\.html$/, 'TSG-Pet-Setup.exe');
  const step1 = '<div class="pa-step' + (seen ? ' done' : '') + '"><span class="pa-num">1</span><div class="pa-body"><b>펫 프로그램 설치</b>'
    + (seen ? '<p>설치했어요. <a href="' + exe + '" download data-pa="install">설치 파일 다시 받기</a>, <a href="' + DOWNLOAD + '">쓰는 법</a></p>'
      : '<p>윈도우 10, 11 용이에요 (맥은 준비 중). 받은 파일을 실행하면 설치돼요.</p><div class="pet-row"><a class="pet-btn main" href="' + exe + '" download data-pa="install">설치 파일 받기</a><a class="pet-btn" href="' + DOWNLOAD + '">쓰는 법 보기</a></div>')
    + '</div></div>';
  const step2 = '<div class="pa-step"><span class="pa-num">2</span><div class="pa-body"><b>노트북 화면에 띄우기</b><p>켜져 있으면 한 번 더 누르면 숨어요. 브라우저가 "TSG 펫을 열까요?" 하고 물으면 열기를 눌러요.</p>'
    + '<div class="pet-row"><button type="button" class="pet-btn main" data-pa="launch">노트북 화면에 ' + esc(load().adopted ? load().name : '펫') + ' 띄우기</button></div></div></div>';
  host.innerHTML = '<section class="pet-sheet pa" id="app"><div class="pa-head"><b>노트북 화면에서 같이 지내기</b><p>펫 프로그램을 설치하면 펫이 브라우저 밖 화면 위를 걸어 다니고, 친구와 채팅해요.</p></div>'
    + (seen ? step2 + step1 : step1 + step2) + '<p class="pa-msg" id="paMsg" hidden></p></section>';
}
function appCardMsg(text, withInstall, ok) {
  const m = $('#paMsg'); if (!m) return false;
  if (withInstall === undefined) withInstall = true;
  m.hidden = !text;
  m.classList.toggle('ok', !!ok);
  m.innerHTML = text ? esc(text) + (withInstall ? ' <a class="pet-btn main" href="' + DOWNLOAD.replace(/download\.html$/, 'TSG-Pet-Setup.exe') + '" download data-pa="install">설치 파일 받기</a>' : '') : '';
  return true;
}
function appCardBoot() {
  const host = $('#petApp'); if (!host) return;
  appCardRender();
  host.addEventListener('click', e => {
    const b = e.target.closest('[data-pa]'); if (!b) return;
    if (b.dataset.pa === 'install') { appMark('installed'); setTimeout(appCardRender, 300); }
    if (b.dataset.pa === 'launch') { e.preventDefault(); launchDesktop(); }
  });
}
function note(msg, withDownload) {
  let d = document.getElementById('petNote');
  if (!d) { d = document.createElement('div'); d.id = 'petNote'; d.className = 'pet-note'; document.body.appendChild(d); }
  d.innerHTML = '<span>' + esc(msg) + '</span>' + (withDownload ? '<a class="pet-btn main" href="' + DOWNLOAD + '">펫 프로그램 받기 (윈도우)</a>' : '') + '<button type="button" class="pet-x" aria-label="닫기">닫기</button>';
  d.hidden = false;
  d.querySelector('.pet-x').onclick = () => { d.hidden = true; };
  clearTimeout(d._t); d._t = setTimeout(() => { d.hidden = true; }, withDownload ? 12000 : 4000);
}
// pet.js 는 늘 저장소의 assets/pet/ 에 있으니, 스크립트 주소를 기준으로 받기 페이지를 찾는다 (pet/, subjects/<과목>/ 어디서 열어도 같은 곳)
const DOWNLOAD = (function () {
  try {
    const src = (document.currentScript && document.currentScript.src) || [...document.scripts].map(x => x.src).find(x => /assets\/pet\/pet\.js/.test(x));
    if (src) return new URL('../../desktop-pet/download.html', src).pathname;
  } catch (e) { /* 아래로 */ }
  const m = location.pathname.match(/^(.*?\/)(?:subjects\/[^/]+\/|pet\/|admin\/)?[^/]*$/);
  return (m ? m[1] : '/') + 'desktop-pet/download.html';
})();
const PET_PAGE = DOWNLOAD.replace(/desktop-pet\/download\.html$/, 'pet/index.html');

/* ---------- 시작 ---------- */
window.SDTPet = { onAnswer, onUndo, canStart, onSetEnd, onRead, openPanel, startBoss, petSvg, SPECIES, launchDesktop, care: { lastPing: () => lastPing, state: () => load(), tick: () => tick(load()), save, needAsk, needs: () => careNeeds(load(), now()), grants: () => grantsCheck(true), pokes: () => pokeCheck().then(pokesRender), live: () => ({ ev: LIVE.ev.slice(), act: liveAct(load()) }), beat: () => presenceBeat() },
  friends: { reload: () => friendsLoad(true), jobs: () => Promise.all([FR.cacheJob, FR.resendJob]), view: () => ({ loaded: FR.loaded, me: FR.me, friends: FR.friends.map(f => ({ id: f.id, pet: f.pet, who: f.who })), pending: FR.pending.map(f => ({ id: f.id, pet: f.pet })), requests: FR.requests.map(q => ({ id: q.id, pet: q.pet, name: q.name })) }) } };
window.addEventListener('sdt:read', e => onRead(e.detail && e.detail.id));
function bootPage(pg) {
  if (load().adopted) { fillPanel(pg); return; }
  pg.innerHTML = '<div class="pet-sheet page"><div class="pet-room">' + spriteHtml(load(), 'big') + '</div><p class="pet-tip" style="text-align:center">알을 눌러 같이 지낼 친구를 데려와요</p><button class="pet-btn main wide" type="button" data-adopt>친구 데려오기</button></div>';
  $('[data-adopt]', pg).addEventListener('click', () => adoptView('adopt'));
}
function boot() {
  const pg = $('#petPage');
  if (pg) { pg.addEventListener('click', e => act(e, pg)); bootPage(pg); }
  const withPet = !!(window.SDT_META || window.GNN_META) && !pg;   // 과목 페이지면 펫이 같이 다녀요 (허브는 버튼만)
  if (withPet) { document.body.classList.add('pet-on'); hud(); render(); }
  friendsBoot();
  appCardBoot();
  $$('[data-petlaunch]').forEach(b => b.addEventListener('click', e => { e.preventDefault(); launchDesktop(); }));
  if (window.SDT) SDT.onAuth(u => { if (u) pullRemote(); });
  setInterval(() => { tick(load()); if (withPet) render(); needAsk(); }, 60000);
  setInterval(() => { if (!document.hidden) grantsCheck(false); }, 5 * 60000);
  window.addEventListener('focus', () => grantsCheck(false));
  // 보고 싶었어요: 하루 넘게 안 왔으면 먼저 말하고, 아니면 이번 방문 시각만 적는다 (서버로 보내지 않음, 다음 저장 때 같이 감)
  setTimeout(() => {
    const st = load();
    if (st.adopted && !(st.seenTs && now() - st.seenTs > CARE.missMs)) { st.seenTs = now(); try { localStorage.setItem(LKEY, JSON.stringify(st)); } catch (e) { /* 무시 */ } }
    needAsk();
  }, 2500);
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
