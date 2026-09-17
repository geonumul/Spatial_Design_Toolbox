/* 몽글 펫: 사이트 어디서나 같이 다니는 내 펫
   - 처음에 동물을 고르고 이름을 지어 줘요. 퀴즈를 맞히면 간식 돈이 조금씩 모여요(모으기 어렵게).
   - 사료, 간식, 장난감, 옷, 장기(앉아, 손, 빙글빙글, 윙크 애교 ...). 레벨 대신 "친해진 정도"로 자라요.
   - 하트 벌칙(틀리면 하트가 줄고 0이면 새 문제 잠김)은 meta.pet 을 켠 과목(근현대)만.
   - 로그인하면 presence 를 1분마다 갱신. 데스크톱 펫 프로그램이 이걸 읽어 깨어 있는 펫은 걷고, 아니면 자게 그린다.
   저장: localStorage "sdt_pet_v2", 로그인하면 Firebase users/{uid}/stores/pet__state 에도 저장 */
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
const LKEY = 'sdt_pet_v2';
const PAGE = () => !!document.getElementById('petPage');

const RULE = { heartsMax: 5, heartRegenMin: 30, goal: 10, coin: 3, reviewBonus: 2, love: 2, goalCoins: 10, bossN: 15, bossPass: 12, bossCoins: 60 };

/* ---------- 동물 ---------- */
const SPECIES = [
  { id: 'puppy', animal: '강아지', name: '콩이', body: '#FFF3DE', belly: '#FFFFFF', ear: 'puppy', inner: '#C9956B', mouth: 'bear', patch: '#E3B58B' },
  { id: 'cat', animal: '고양이', name: '나비', body: '#FFE1BD', belly: '#FFF6EA', ear: 'cat', inner: '#FFB8B8', mouth: 'cat', mark: '#F5B97F' },
  { id: 'capybara', animal: '카피바라', name: '카피', body: '#C8966A', belly: '#DDB48D', ear: 'small', inner: '#A87A52', mouth: 'capy', headRx: 38, headRy: 28, sleepy: true },
  { id: 'guinea', animal: '기니피그', name: '뭉치', body: '#FFFFFF', belly: '#FFF7EE', ear: 'small', inner: '#E8A06A', mouth: 'bunny', patch: '#F0A860', patch2: '#6B4A3A' },
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
  { id: 'sit', name: '앉아', need: 20, cost: 40, anim: 'sit', say: '앉았어요, 칭찬해 줘요' },
  { id: 'paw', name: '손', need: 50, cost: 60, anim: 'paw', say: '손! 여기요' },
  { id: 'spin', name: '빙글빙글', need: 90, cost: 90, anim: 'spin', say: '빙글빙글, 어지러워' },
  { id: 'wink', name: '윙크 애교', need: 140, cost: 120, anim: 'wink', say: '뿅, 반했죠?' },
  { id: 'jump', name: '점프', need: 200, cost: 150, anim: 'jump', say: '높이 뛰었어요' },
  { id: 'roll', name: '데굴데굴', need: 280, cost: 200, anim: 'roll', say: '데굴데굴 굴렀어요' },
  { id: 'dance', name: '엉덩이 춤', need: 380, cost: 260, anim: 'dance', say: '신난다 신난다' },
];
const FOODS = [
  { id: 'meal', name: '사료', cost: 12, food: 30, fun: 4, love: 1, say: '냠냠, 배불러요' },
  { id: 'snack', name: '간식', cost: 25, food: 12, fun: 18, love: 4, say: '간식이다! 고마워요' },
  { id: 'play', name: '장난감', cost: 40, food: -6, fun: 35, love: 6, say: '한 번 더 던져 줘요' },
];
const GROW = [{ at: 0, name: '아기', scale: 0.82 }, { at: 60, name: '꼬마', scale: 0.92 }, { at: 200, name: '어린이', scale: 1 }];
const growOf = love => { let g = GROW[0]; GROW.forEach(x => { if (love >= x.at) g = x; }); return g; };

/* ---------- 그림 (동글동글 벡터) ---------- */
function petSvg(pet, opt) {
  opt = opt || {};
  const sp = SP[pet.sp] || SPECIES[0];
  const trick = opt.trick || '';
  const mood = opt.mood || 'normal';   // normal, happy, sad, sleep
  const w = pet.wear || {};
  const B = sp.body, L = sp.belly;
  let ears = '';
  if (sp.ear === 'cat') ears = '<path d="M30 38 L34 12 L52 28 Z" fill="' + B + '" stroke="#5B4A48" stroke-width="2.4" stroke-linejoin="round"/><path d="M36 30 L37 19 L46 27 Z" fill="' + sp.inner + '"/><path d="M90 38 L86 12 L68 28 Z" fill="' + B + '" stroke="#5B4A48" stroke-width="2.4" stroke-linejoin="round"/><path d="M84 30 L83 19 L74 27 Z" fill="' + sp.inner + '"/>';
  else if (sp.ear === 'fox') ears = '<path d="M28 42 L30 8 L54 28 Z" fill="' + B + '" stroke="#5B4A48" stroke-width="2.4" stroke-linejoin="round"/><path d="M33 30 L32 16 L44 26 Z" fill="#FFFFFF"/><path d="M92 42 L90 8 L66 28 Z" fill="' + B + '" stroke="#5B4A48" stroke-width="2.4" stroke-linejoin="round"/><path d="M87 30 L88 16 L76 26 Z" fill="#FFFFFF"/>';
  else if (sp.ear === 'bunny') ears = '<ellipse cx="46" cy="16" rx="8" ry="20" fill="' + B + '" stroke="#5B4A48" stroke-width="2.4" transform="rotate(-10 46 16)"/><ellipse cx="46" cy="18" rx="3.6" ry="13" fill="' + sp.inner + '" transform="rotate(-10 46 18)"/><ellipse cx="74" cy="16" rx="8" ry="20" fill="' + B + '" stroke="#5B4A48" stroke-width="2.4" transform="rotate(10 74 16)"/><ellipse cx="74" cy="18" rx="3.6" ry="13" fill="' + sp.inner + '" transform="rotate(10 74 18)"/>';
  else if (sp.ear === 'bear') ears = '<circle cx="34" cy="28" r="11" fill="' + B + '" stroke="#5B4A48" stroke-width="2.4"/><circle cx="34" cy="28" r="5.5" fill="' + sp.inner + '"/><circle cx="86" cy="28" r="11" fill="' + B + '" stroke="#5B4A48" stroke-width="2.4"/><circle cx="86" cy="28" r="5.5" fill="' + sp.inner + '"/>';
  else if (sp.ear === 'puppy') ears = '<ellipse cx="28" cy="50" rx="9" ry="18" fill="' + sp.inner + '" stroke="#5B4A48" stroke-width="2.4" transform="rotate(18 28 50)"/><ellipse cx="92" cy="50" rx="9" ry="18" fill="' + sp.inner + '" stroke="#5B4A48" stroke-width="2.4" transform="rotate(-18 92 50)"/>';
  else if (sp.ear === 'hamster') ears = '<circle cx="36" cy="30" r="8" fill="' + B + '" stroke="#5B4A48" stroke-width="2.4"/><circle cx="36" cy="30" r="4" fill="' + sp.inner + '"/><circle cx="84" cy="30" r="8" fill="' + B + '" stroke="#5B4A48" stroke-width="2.4"/><circle cx="84" cy="30" r="4" fill="' + sp.inner + '"/>';
  else if (sp.ear === 'small') ears = '<ellipse cx="34" cy="34" rx="7" ry="6" fill="' + sp.inner + '" stroke="#5B4A48" stroke-width="2.4"/><ellipse cx="86" cy="34" rx="7" ry="6" fill="' + sp.inner + '" stroke="#5B4A48" stroke-width="2.4"/>';
  else if (sp.ear === 'tuft') ears = '<path d="M58 20 C54 10 60 8 60 16 C62 6 68 10 62 20" fill="' + B + '" stroke="#5B4A48" stroke-width="2.2" stroke-linejoin="round"/>';
  let tail = '';
  if (sp.tail === 'lizard') tail = '<path d="M80 102 Q104 108 110 92 Q114 82 106 80" fill="none" stroke="#5B4A48" stroke-width="9" stroke-linecap="round"/><path d="M80 102 Q104 108 110 92 Q114 82 106 80" fill="none" stroke="' + B + '" stroke-width="5.5" stroke-linecap="round"/>';
  let eyes;
  if (mood === 'sleep') eyes = '<path d="M40 58 Q46 63 52 58" stroke="#3A2E2C" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M68 58 Q74 63 80 58" stroke="#3A2E2C" stroke-width="3" fill="none" stroke-linecap="round"/>';
  else if (mood === 'happy') eyes = '<path d="M40 60 Q46 51 52 60" stroke="#3A2E2C" stroke-width="3.2" fill="none" stroke-linecap="round"/><path d="M68 60 Q74 51 80 60" stroke="#3A2E2C" stroke-width="3.2" fill="none" stroke-linecap="round"/>';
  else if (sp.eyesUp && mood !== 'sad') eyes = '<g class="pet-eyes"><circle cx="44" cy="40" r="11" fill="#FFFFFF" stroke="#5B4A48" stroke-width="2.4"/><circle cx="76" cy="40" r="11" fill="#FFFFFF" stroke="#5B4A48" stroke-width="2.4"/><circle cx="45" cy="41" r="4.6" fill="#3A2E2C"/><circle cx="75" cy="41" r="4.6" fill="#3A2E2C"/><circle cx="46.4" cy="39" r="1.6" fill="#FFF"/><circle cx="76.4" cy="39" r="1.6" fill="#FFF"/></g>';
  else if (sp.sleepy && mood !== 'sad') eyes = '<g class="pet-eyes"><path d="M40 56 Q46 52 52 56 L52 58 Q46 61 40 58Z" fill="#3A2E2C"/><path d="M68 56 Q74 52 80 56 L80 58 Q74 61 68 58Z" fill="#3A2E2C"/></g>';
  else eyes = '<g class="pet-eyes"><ellipse cx="46" cy="57" rx="5.2" ry="6.4" fill="#3A2E2C"/><ellipse cx="74" cy="57" rx="5.2" ry="6.4" fill="#3A2E2C"/><circle cx="47.8" cy="54.4" r="2" fill="#FFF"/><circle cx="75.8" cy="54.4" r="2" fill="#FFF"/><circle cx="44.6" cy="59.6" r="1" fill="#FFF"/><circle cx="72.6" cy="59.6" r="1" fill="#FFF"/></g>'
    + (mood === 'sad' ? '<path d="M38 47 L50 50" stroke="#3A2E2C" stroke-width="2.2" stroke-linecap="round"/><path d="M82 47 L70 50" stroke="#3A2E2C" stroke-width="2.2" stroke-linecap="round"/><path d="M78 64 Q80 70 77 72 Q74 70 78 64Z" fill="#8FD0FF"/>' : '');
  let mouth;
  if (sp.mouth === 'smile') mouth = '<path d="M38 66 Q60 84 82 66" stroke="#5B4A48" stroke-width="2.6" fill="#E86A7A" stroke-linecap="round" stroke-linejoin="round"/><path d="M40 66 Q60 72 80 66" fill="' + B + '"/>';
  else if (sp.mouth === 'capy') mouth = '<ellipse cx="60" cy="68" rx="16" ry="11" fill="' + L + '" stroke="#5B4A48" stroke-width="2"/><ellipse cx="54" cy="65" rx="2.2" ry="1.6" fill="#5B4A48"/><ellipse cx="66" cy="65" rx="2.2" ry="1.6" fill="#5B4A48"/><path d="M56 72 Q60 75 64 72" stroke="#5B4A48" stroke-width="2" fill="none" stroke-linecap="round"/>';
  else if (sp.mouth === 'beak') mouth = '<path d="M54 64 Q60 60 66 64 Q60 71 54 64Z" fill="#FFA24A" stroke="#5B4A48" stroke-width="1.8" stroke-linejoin="round"/>';
  else if (sp.mouth === 'cat') mouth = '<path d="M60 64 l-2.4 2" stroke="#5B4A48" stroke-width="2"/><path d="M54 66 Q57 70 60 66 Q63 70 66 66" stroke="#5B4A48" stroke-width="2.2" fill="none" stroke-linecap="round"/><ellipse cx="60" cy="63" rx="2.6" ry="1.8" fill="#FF8FA3"/>';
  else if (sp.mouth === 'bear') mouth = '<ellipse cx="60" cy="67" rx="10" ry="7.5" fill="' + L + '"/><ellipse cx="60" cy="64" rx="3.4" ry="2.4" fill="#3A2E2C"/><path d="M56 69 Q60 73 64 69" stroke="#3A2E2C" stroke-width="2" fill="none" stroke-linecap="round"/>';
  else mouth = '<ellipse cx="60" cy="64" rx="2.4" ry="1.8" fill="#FF8FA3"/><path d="M56 67 Q58 70 60 67 Q62 70 64 67" stroke="#5B4A48" stroke-width="2" fill="none" stroke-linecap="round"/>';
  if (mood === 'sad' && sp.mouth !== 'beak') mouth = '<path d="M55 71 Q60 66 65 71" stroke="#5B4A48" stroke-width="2.2" fill="none" stroke-linecap="round"/>';
  let head = '';
  if (w.head === 'ribbon') head = '<g transform="translate(78 26) rotate(18)"><path d="M0 0 L-13 -8 L-13 8 Z" fill="#FF7FA6" stroke="#5B4A48" stroke-width="2"/><path d="M0 0 L13 -8 L13 8 Z" fill="#FF7FA6" stroke="#5B4A48" stroke-width="2"/><circle r="4.2" fill="#FF5C8D" stroke="#5B4A48" stroke-width="2"/></g>';
  else if (w.head === 'flower') head = '<g transform="translate(80 30)">' + [0, 72, 144, 216, 288].map(a => '<circle cx="' + (6 * Math.cos(a * Math.PI / 180)).toFixed(1) + '" cy="' + (6 * Math.sin(a * Math.PI / 180)).toFixed(1) + '" r="5" fill="#FFFFFF" stroke="#5B4A48" stroke-width="1.6"/>').join('') + '<circle r="3.8" fill="#FFD34D"/></g>';
  else if (w.head === 'beret') head = '<path d="M34 34 Q44 14 76 18 Q92 22 86 32 Q60 40 34 34Z" fill="#E5566D" stroke="#5B4A48" stroke-width="2.2"/><circle cx="60" cy="17" r="3" fill="#5B4A48"/>';
  else if (w.head === 'crown') head = '<path d="M44 26 L48 12 L56 22 L60 8 L64 22 L72 12 L76 26 Z" fill="#FFD34D" stroke="#5B4A48" stroke-width="2.2" stroke-linejoin="round"/><circle cx="60" cy="20" r="2.6" fill="#FF7FA6"/>';
  let neck = '';
  if (w.neck === 'scarf') neck = '<path d="M36 84 Q60 94 84 84 L84 92 Q60 102 36 92 Z" fill="#6EC6FF" stroke="#5B4A48" stroke-width="2"/><path d="M72 92 L78 108 L68 106 Z" fill="#6EC6FF" stroke="#5B4A48" stroke-width="2"/>';
  else if (w.neck === 'bow') neck = '<g transform="translate(60 88)"><path d="M0 0 L-12 -7 L-12 7 Z" fill="#7C6BFF" stroke="#5B4A48" stroke-width="2"/><path d="M0 0 L12 -7 L12 7 Z" fill="#7C6BFF" stroke="#5B4A48" stroke-width="2"/><circle r="3.6" fill="#5B4AE8"/></g>';
  const face = w.face === 'glasses' ? '<circle cx="46" cy="57" r="10" fill="none" stroke="#5B4A48" stroke-width="2.4"/><circle cx="74" cy="57" r="10" fill="none" stroke="#5B4A48" stroke-width="2.4"/><path d="M56 57 L64 57" stroke="#5B4A48" stroke-width="2.4"/>' : '';
  const faceMask = sp.face ? '<ellipse cx="60" cy="' + (sp.faceRy ? 64 : 60) + '" rx="28" ry="' + (sp.faceRy || 24) + '" fill="' + sp.face + '"/>' : '';
  const spots = sp.spots ? '<circle cx="38" cy="52" r="3" fill="' + sp.spots + '"/><circle cx="84" cy="54" r="2.6" fill="' + sp.spots + '"/><circle cx="50" cy="96" r="3" fill="' + sp.spots + '"/><circle cx="70" cy="90" r="2.4" fill="' + sp.spots + '"/>' : '';
  const shell = sp.shell ? '<g transform="translate(60 96)"><path d="M-10 4 Q0 -12 10 4 Z" fill="#FFC8B0" stroke="#5B4A48" stroke-width="1.8" stroke-linejoin="round"/><path d="M-4 3 L-2 -5 M2 3 L2 -6 M6 3 L5 -4" stroke="#E09A80" stroke-width="1.2"/></g>' : '';
  const patch = (sp.patch ? '<ellipse cx="74" cy="54" rx="11" ry="10" fill="' + sp.patch + '" opacity=".75"/>' : '') + (sp.patch2 ? '<path d="M28 50 Q34 34 50 36 Q46 50 30 60 Z" fill="' + sp.patch2 + '" opacity=".85"/>' : '');
  const mark = sp.mark ? '<path d="M52 30 Q54 36 56 30 M58 29 Q60 35 62 29 M64 30 Q66 36 68 30" stroke="' + sp.mark + '" stroke-width="2.6" fill="none" stroke-linecap="round"/>' : '';
  const zz = mood === 'sleep' ? '<g class="pet-zz" fill="#8C84C8" font-family="Pretendard, sans-serif" font-weight="700"><text x="88" y="30" font-size="14">z</text><text x="98" y="18" font-size="11">z</text></g>' : '';
  const wink = trick === 'wink' ? '<path d="M68 57 Q74 52 80 57" stroke="#3A2E2C" stroke-width="3" fill="none" stroke-linecap="round"/>' : '';
  return '<svg class="pet-svg' + (opt.cls ? ' ' + opt.cls : '') + '" viewBox="0 0 120 120" aria-hidden="true">'
    + '<ellipse cx="60" cy="112" rx="28" ry="5" fill="#000" opacity=".08"/>'
    + '<g class="pet-bodyg">'
    + tail + ears
    + '<ellipse cx="60" cy="92" rx="26" ry="20" fill="' + B + '" stroke="#5B4A48" stroke-width="2.4"/>'
    + '<ellipse cx="60" cy="96" rx="15" ry="12" fill="' + L + '"/>'
    + '<ellipse cx="44" cy="108" rx="8" ry="5" fill="' + B + '" stroke="#5B4A48" stroke-width="2.2"/><ellipse cx="76" cy="108" rx="8" ry="5" fill="' + B + '" stroke="#5B4A48" stroke-width="2.2"/>'
    + neck
    + '<ellipse cx="60" cy="58" rx="' + (sp.headRx || 34) + '" ry="' + (sp.headRy || 30) + '" fill="' + B + '" stroke="#5B4A48" stroke-width="2.4"/>'
    + faceMask + patch + mark + spots
    + '<ellipse cx="38" cy="68" rx="6.5" ry="4" fill="#FF9EB5" opacity=".55"/><ellipse cx="82" cy="68" rx="6.5" ry="4" fill="#FF9EB5" opacity=".55"/>'
    + shell + (wink ? eyes.replace(/<ellipse cx="74"[^>]*>/, '').replace(/<circle cx="75.8"[^>]*>/, '').replace(/<circle cx="72.6"[^>]*>/, '') + wink : eyes) + mouth + face + head
    + '</g>' + zz + '</svg>';
}
function eggSvg(cls) {
  return '<svg class="pet-svg ' + (cls || '') + '" viewBox="0 0 120 120" aria-hidden="true"><ellipse cx="60" cy="112" rx="24" ry="5" fill="#000" opacity=".08"/><path d="M60 14 C86 14 96 60 96 78 C96 98 80 110 60 110 C40 110 24 98 24 78 C24 60 34 14 60 14Z" fill="#FFF6E6" stroke="#5B4A48" stroke-width="2.4"/><circle cx="46" cy="52" r="6" fill="#FFD9A8"/><circle cx="72" cy="40" r="4.5" fill="#FFC6D6"/><circle cx="70" cy="80" r="7" fill="#CDEBFF"/></svg>';
}
function heartSvg(on) { return '<svg class="pet-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.5 C5 15.5 2.5 12 2.5 8.3 C2.5 5.6 4.6 3.5 7.2 3.5 C9.2 3.5 10.9 4.7 12 6.4 C13.1 4.7 14.8 3.5 16.8 3.5 C19.4 3.5 21.5 5.6 21.5 8.3 C21.5 12 19 15.5 12 20.5Z" fill="' + (on ? '#FF6B8B' : '#E4DEE8') + '" stroke="' + (on ? '#E0456A' : '#CFC6D6') + '" stroke-width="1.4"/><ellipse cx="8" cy="8" rx="2" ry="1.3" fill="#FFF" opacity="' + (on ? '.7' : '0') + '"/></svg>'; }
function coinSvg() { return '<svg class="pet-ico" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9.5" fill="#FFD34D" stroke="#E3A91E" stroke-width="1.6"/><path d="M9 9.5 Q12 6.5 15 9.5 Q12 13 9 16.5 Q12 19 15 16" stroke="#E3A91E" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg>'; }
function flameSvg() { return '<svg class="pet-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5 C13 7 18.5 9 18.5 14.5 C18.5 18.5 15.5 21.5 12 21.5 C8.5 21.5 5.5 18.5 5.5 14.5 C5.5 11 8 9.5 9 7 C10.5 9 11 10 12 2.5Z" fill="#FF9A3C" stroke="#EE6A2C" stroke-width="1.4"/><path d="M12 12 C13 14 15 15 15 17 C15 19 13.6 20 12 20 C10.4 20 9 19 9 17 C9 15.5 11 14.5 12 12Z" fill="#FFD34D"/></svg>'; }

/* ---------- 상태 ---------- */
function blank() {
  return { v: 2, adopted: false, sp: 'cat', name: '', wear: { head: 'none', neck: 'nothing', face: 'plain' }, owned: { none: 1, nothing: 1, plain: 1 },
    coins: 15, tricks: {}, hearts: RULE.heartsMax, heartTs: now(), food: 80, fun: 80, love: 0, careTs: now(), daily: {}, streak: 0, lastGoal: null,
    combo: 0, trophies: {}, read: {}, boss: null, undo: {}, nick: '', ts: now() };
}
let ST = null;
function load() {
  if (ST) return ST;
  try { ST = JSON.parse(localStorage.getItem(LKEY) || 'null'); } catch (e) { ST = null; }
  if (!ST || ST.v !== 2) ST = blank();
  tick(ST);
  return ST;
}
function tick(s) {
  const t = now();
  if (s.hearts < RULE.heartsMax) {
    const step = RULE.heartRegenMin * 60000, n = Math.floor((t - (s.heartTs || t)) / step);
    if (n > 0) { s.hearts = Math.min(RULE.heartsMax, s.hearts + n); s.heartTs = s.hearts >= RULE.heartsMax ? t : s.heartTs + n * step; }
  } else s.heartTs = t;
  const h = (t - (s.careTs || t)) / 3600000;
  if (h > 0.05) { s.food = clamp(s.food - h * 4, 0, 100); s.fun = clamp(s.fun - h * 3, 0, 100); s.careTs = t; }
}
let pushT = null;
function save() {
  const s = load(); s.ts = now();
  try { localStorage.setItem(LKEY, JSON.stringify(s)); } catch (e) { /* 저장 공간 없음 */ }
  clearTimeout(pushT);
  pushT = setTimeout(() => { if (window.SDT && SDT.user) SDT.set('pet__state', s); presenceBeat(); }, 1500);
  render();
}
function pullRemote() {
  if (!(window.SDT && SDT.user)) return;
  SDT.get('pet__state').then(r => {
    if (r && r.v === 2 && (r.ts || 0) > (load().ts || 0)) { ST = r; tick(ST); try { localStorage.setItem(LKEY, JSON.stringify(ST)); } catch (e) { /* 무시 */ } render(); }
    else if (load().adopted) SDT.set('pet__state', load());
  });
}
const moodOf = s => (s.food <= 10 || s.fun <= 15) ? 'sad' : 'normal';
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
  const today = dayKey(), u = { coins: 0, heart: 0, love: 0, combo: s.combo };
  s.daily[today] = (s.daily[today] || 0) + 1;
  if (ok) {
    s.combo++;
    const mult = s.combo >= 10 ? 2 : s.combo >= 5 ? 1.5 : 1;
    let gain = Math.round(RULE.coin * mult);
    if (info.review) { gain += RULE.reviewBonus; if (s.hearts < RULE.heartsMax) { s.hearts++; u.heart = 1; pop(heartSvg(true) + ' 하트가 돌아왔어요', 'heart'); } }
    s.coins += gain; u.coins = gain;
    s.love += RULE.love; u.love = RULE.love; s.fun = clamp(s.fun + 2, 0, 100);
    pop(coinSvg() + ' +' + gain + (mult > 1 ? ' <small>' + s.combo + '연속</small>' : ''), 'coin');
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
  const d = dayKey(); if (s.daily[d]) s.daily[d]--;
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
function onRead(id) { const s = load(); if (!s.adopted || !id || s.read[id]) return; s.read[id] = dayKey(); s.coins += 5; s.love += 2; pop(coinSvg() + ' +5 다 읽었어요', 'coin'); save(); }

/* ---------- 돌보기, 옷장 ---------- */
function feed(id) {
  const s = load(), f = FOODS.find(x => x.id === id); if (!f) return;
  if (s.coins < f.cost) { say('코인이 모자라요. 문제를 맞히면 모여요'); react('shake'); return; }
  s.coins -= f.cost; s.food = clamp(s.food + f.food, 0, 100); s.fun = clamp(s.fun + f.fun, 0, 100); s.love += f.love;
  react('eat'); say(f.say); hearts($('.pet-room .pet-sprite'), 3); save();
}
function pet(el) {
  const s = load(); const d = dayKey();
  s.petDay = s.petDay || {};
  if ((s.petDay[d] || 0) < 10) { s.petDay[d] = (s.petDay[d] || 0) + 1; s.love += 1; s.fun = clamp(s.fun + 2, 0, 100); }
  react('love'); hearts(el, 4);
  const lines = ['헤헤, 간지러워요', '좋아요', '또 해 줘요', '오늘 같이 공부해요', s.name + '는 기분 최고'];
  say(lines[Math.floor(Math.random() * lines.length)]);
  save();
}
function trick(id) {
  const s = load(), k = TRICKS.find(x => x.id === id); if (!k) return;
  s.tricks = s.tricks || {};
  if (!s.tricks[id]) {
    if (s.love < k.need) { say('더 친해지면 배울 수 있어요'); react('shake'); return; }
    if (s.coins < k.cost) { say('연습용 간식 돈 ' + k.cost + '개가 필요해요'); react('shake'); return; }
    s.coins -= k.cost; s.tricks[id] = dayKey(); s.love += 5;
    news(s.name + '가 "' + k.name + '"를 배웠어요', '이제 언제든 보여 달라고 할 수 있어요.', petSvg(s, { mood: 'happy', cls: 'big' }));
  }
  perform(k);
  save();
}
function perform(k) {
  const room = $('.pet-room .pet-sprite');
  $$('.pet-room .pet-sprite, .pet-hud .pet-sprite').forEach(el => {
    el.classList.remove('t-sit', 't-paw', 't-spin', 't-wink', 't-jump', 't-roll', 't-dance'); void el.offsetWidth;
    el.classList.add('t-' + k.anim);
    if (k.anim === 'wink') { const s = load(); el.innerHTML = petSvg(s, { trick: 'wink' }); setTimeout(() => { el.innerHTML = petSvg(s, { mood: moodOf(s) }); }, 1400); }
    setTimeout(() => el.classList.remove('t-' + k.anim), 1600);
  });
  say(k.say); hearts(room, 3);
}
function wear(id) {
  const s = load(), it = WEAR.find(x => x.id === id); if (!it) return;
  if (!s.owned[id]) {
    if (s.coins < it.cost) { say('코인 ' + it.cost + '개가 필요해요'); return; }
    s.coins -= it.cost; s.owned[id] = 1; say(it.name + ' 샀어요!');
  }
  s.wear[it.slot] = id; react('hop'); save();
}

/* ---------- 입양 ---------- */
function adoptView() {
  let pick = 'cat';
  const d = document.createElement('div'); d.className = 'pet-news pet-adopt'; d.setAttribute('role', 'dialog');
  const draw = () => {
    const sp = SP[pick];
    d.innerHTML = '<div class="pet-news-card wide"><b>같이 공부할 친구를 골라요</b><p>문제를 맞히면 간식을 줄 수 있어요. 나중에 바꿀 수 없으니 마음에 드는 친구로!</p>'
      + '<div class="pet-adopt-big">' + petSvg({ sp: pick, wear: {} }, { mood: 'happy', cls: 'big' }) + '</div>'
      + '<div class="pet-adopt-grid">' + SPECIES.map(x => '<button type="button" class="pet-adopt-one' + (x.id === pick ? ' on' : '') + '" data-sp="' + x.id + '">' + petSvg({ sp: x.id, wear: {} }) + '<span>' + esc(x.animal) + '</span></button>').join('') + '</div>'
      + '<label class="pet-name-in">이름<input id="petNameIn" maxlength="8" value="' + esc(sp.name) + '" autocomplete="off"></label>'
      + '<button class="pet-btn main" type="button" data-go>' + esc(sp.animal) + ' 데려오기</button></div>';
    $$('[data-sp]', d).forEach(b => b.addEventListener('click', () => { pick = b.dataset.sp; draw(); }));
    $('[data-go]', d).addEventListener('click', () => {
      const s = load(); s.adopted = true; s.sp = pick; s.name = ($('#petNameIn', d).value || SP[pick].name).trim().slice(0, 8); s.born = dayKey();
      d.remove(); save(); react('hop'); say('안녕! 나는 ' + s.name + '. 잘 부탁해요');
      const pg = $('#petPage'); if (pg) fillPanel(pg);
      if (window.SDT && SDT.user) startBeat();
    });
  };
  draw(); document.body.appendChild(d);
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
    el.querySelector('button').addEventListener('click', () => { if (!load().adopted) adoptView(); else openPanel(); });
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
      else if (a === 'chat') note(WIP.chat);
}
function closePanel() { const p = $('#petPanel'); if (p) p.hidden = true; document.body.classList.remove('pet-open'); }
function bar(v, cls) { return '<span class="pet-bar ' + cls + '"><i style="width:' + clamp(Math.round(v), 0, 100) + '%"></i></span>'; }
function fillPanel(p) {
  const s = load(), g = growOf(s.love), nextG = GROW.find(x => x.at > s.love);
  const today = s.daily[dayKey()] || 0;
  let h = '<div class="pet-sheet"><div class="pet-head"><div class="pet-tabs">' + [['care', '돌보기'], ['tricks', '장기'], ['closet', '옷장']].map(t => '<button type="button" class="pet-tab' + (tab === t[0] ? ' on' : '') + '" data-act="tab:' + t[0] + '">' + t[1] + '</button>').join('') + '</div>' + (PAGE() ? '' : '<button class="pet-x" type="button" data-act="close" aria-label="닫기">닫기</button>') + '</div>';
  if (tab === 'care') {
    h += '<div class="pet-room"><button type="button" class="pet-touch" data-act="pet" aria-label="쓰다듬기">' + spriteHtml(s, 'big walk') + '</button><div class="pet-room-hint">눌러서 쓰다듬기</div></div>'
      + '<div class="pet-title"><b>' + esc(s.name) + '</b><span>' + esc(SP[s.sp].animal) + ', ' + g.name + '</span><span class="pet-coins">' + coinSvg() + s.coins + '</span></div>'
      + '<div class="pet-meters"><div><span>배부름</span>' + bar(s.food, 'food') + '</div><div><span>기분</span>' + bar(s.fun, 'fun') + '</div>'
      + '<div><span>친해진 정도</span>' + bar(nextG ? (s.love - g.at) / (nextG.at - g.at) * 100 : 100, 'love') + '<small>' + s.love + (nextG ? ', ' + nextG.name + '까지 조금 더' : ', 다 자랐어요') + '</small></div></div>'
      + '<div class="pet-chips"><span>' + [0, 1, 2, 3, 4].map(i => heartSvg(i < s.hearts)).join('') + '</span><span>' + flameSvg() + streakNow(s) + '일째</span><span>오늘 ' + Math.min(today, RULE.goal) + ' / ' + RULE.goal + '문제</span></div>'
      + '<div class="pet-foods">' + FOODS.map(f => '<button type="button" class="pet-food" data-act="feed:' + f.id + '"><b>' + f.name + '</b><small>' + coinSvg() + f.cost + '</small></button>').join('') + '</div>';
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
  h += '<div class="pet-row wips"><button type="button" class="pet-btn wide" data-act="desk">노트북 화면에 ' + esc(s.name || '펫') + ' 띄우기' + (DESKTOP_READY ? '' : ' <small class="wip">작업 중</small>') + '</button><button type="button" class="pet-btn wide" data-act="chat">친구들과 말풍선 채팅 <small class="wip">작업 중</small></button></div>';
  p.innerHTML = h + '</div>';
}

/* ---------- 접속 표시 (데스크톱 펫 프로그램이 읽음) ----------
   로그인한 사람이 사이트를 열어 두면 1분마다 presence/{uid}.ts 를 갱신한다. 프로그램은 5분 안에 갱신된 펫은 걷게, 아니면 자게 그린다. */
let beatT = null;
const fs = () => (window.firebase && firebase.firestore) ? firebase.firestore() : null;
function presenceBeat() {
  const db = fs(), s = load(); if (!db || !(window.SDT && SDT.user) || !s.adopted) return;
  if (document.hidden) return;
  db.collection('plaza').doc('lobby').collection('presence').doc(SDT.user.uid).set({
    name: (s.name || '').slice(0, 8), sp: s.sp, wear: s.wear, ts: firebase.firestore.FieldValue.serverTimestamp(),
  }).catch(() => { /* 규칙이 아직 없으면 조용히 */ });
}
function startBeat() { if (beatT) return; presenceBeat(); beatT = setInterval(presenceBeat, 60000); document.addEventListener('visibilitychange', () => { if (!document.hidden) presenceBeat(); }); }

/* ---------- 노트북 화면에 펫 띄우기 (설치한 펫 프로그램을 tsgpet:// 주소로 켜고 끔) ---------- */
const DESKTOP_READY = false;   // 데스크톱 펫 프로그램을 올리면 true
const WIP = {
  desk: '노트북 화면 전체에 펫을 띄우는 기능은 지금 만들고 있어요. 다 되면 이 버튼 하나로 켜고 끌 수 있어요.',
  chat: '로그인한 친구들과 펫 말풍선으로 채팅하는 기능은 지금 만들고 있어요.',
};
function launchDesktop() {
  if (!DESKTOP_READY) { note(WIP.desk); return; }
  const s = load();
  if (!s.adopted) {
    if (window.SDT_META || window.GNN_META) { adoptView(); return; }
    note('과목에 들어가서 오른쪽 아래 알을 누르면 펫을 데려올 수 있어요');
    return;
  }
  const q = 'sp=' + encodeURIComponent(s.sp) + '&name=' + encodeURIComponent(s.name || '') + '&wear=' + encodeURIComponent(JSON.stringify(s.wear || {})) + (window.SDT && SDT.user ? '&uid=' + encodeURIComponent(SDT.user.uid) + (SDT.user.refreshToken ? '&rt=' + encodeURIComponent(SDT.user.refreshToken) : '') : '');
  let left = false;
  const onBlur = () => { left = true; };
  window.addEventListener('blur', onBlur, { once: true });
  location.href = 'tsgpet://toggle?' + q;
  setTimeout(() => {
    window.removeEventListener('blur', onBlur);
    if (!left) note('펫 프로그램이 아직 없으면 한 번만 설치해 주세요', true);
  }, 1500);
}
function note(msg, withDownload) {
  let d = document.getElementById('petNote');
  if (!d) { d = document.createElement('div'); d.id = 'petNote'; d.className = 'pet-note'; document.body.appendChild(d); }
  d.innerHTML = '<span>' + esc(msg) + '</span>' + (withDownload ? '<a class="pet-btn main" href="' + DOWNLOAD + '">펫 프로그램 받기 (윈도우)</a>' : '') + '<button type="button" class="pet-x" aria-label="닫기">닫기</button>';
  d.hidden = false;
  d.querySelector('.pet-x').onclick = () => { d.hidden = true; };
  clearTimeout(d._t); d._t = setTimeout(() => { d.hidden = true; }, withDownload ? 12000 : 4000);
}
const DOWNLOAD = (function () {
  const m = location.pathname.match(/^(.*?\/)(subjects\/[^/]+\/)?[^/]*$/);
  return (m ? m[1] : '/') + 'desktop-pet/download.html';
})();

/* ---------- 시작 ---------- */
window.SDTPet = { onAnswer, onUndo, canStart, onSetEnd, onRead, openPanel, startBoss, petSvg, SPECIES, launchDesktop };
window.addEventListener('sdt:read', e => onRead(e.detail && e.detail.id));
function boot() {
  const pg = $('#petPage');
  if (pg) {
    pg.addEventListener('click', e => act(e, pg));
    if (load().adopted) fillPanel(pg); else { pg.innerHTML = '<div class="pet-sheet page"><div class="pet-room">' + spriteHtml(load(), 'big') + '</div><p class="pet-tip" style="text-align:center">알을 눌러 같이 지낼 친구를 데려와요</p><button class="pet-btn main wide" type="button" data-adopt>친구 데려오기</button></div>'; $('[data-adopt]', pg).addEventListener('click', adoptView); }
  }
  const withPet = !!(window.SDT_META || window.GNN_META) && !pg;   // 과목 페이지면 펫이 같이 다녀요 (허브는 버튼만)
  if (withPet) { document.body.classList.add('pet-on'); hud(); render(); }
  $$('[data-petlaunch]').forEach(b => b.addEventListener('click', e => { e.preventDefault(); launchDesktop(); }));
  if (window.SDT) SDT.onAuth(u => { if (u) { pullRemote(); startBeat(); } });
  setInterval(() => { tick(load()); if (withPet) render(); }, 60000);
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
