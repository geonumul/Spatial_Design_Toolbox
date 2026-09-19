// 홈페이지 jsdom 스모크 테스트: 라우트 전부 열고, 문제 풀이, 오답노트, 용어 카드, (있으면) 회독과 정리 슬라이드 넘기기
const { JSDOM } = require('jsdom'); const fs = require('fs'); const path = require('path');
const ROOT = process.argv[2] || path.resolve(__dirname, '..', '..', '..', 'Graph-Neural-Networks-Fall-2026');   // 03_사이트 안의 GNN 홈페이지 저장소
let html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8')
  .replace(/<script src="https?:[^"]+"[^>]*><\/script>/g, '')
  .replace(/<link [^>]*>/g, '')
  .replace(/<script src="([^"?]+)(\?[^"]*)?" defer><\/script>/g, (m, src) => '<script>' + fs.readFileSync(path.join(ROOT, src), 'utf8').replace(/<\/script>/g, '<\\/script>') + '</script>');
const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://example.test/' });
const w = dom.window, d = w.document; w.scrollTo = () => {}; w.HTMLElement.prototype.scrollIntoView = () => {}; w.confirm = () => true;
const errs = []; w.addEventListener('error', e => errs.push(e.message));
// 동적 스크립트(lesson, notes)를 파일에서 읽어 실행
const origAppend = d.head.appendChild.bind(d.head);
d.head.appendChild = el => {
  if (el.tagName === 'SCRIPT' && el.src) {
    const rel = el.src.replace('https://example.test/', '').split('?')[0];
    const p = path.join(ROOT, rel);
    setTimeout(() => { if (fs.existsSync(p)) { try { w.eval(fs.readFileSync(p, 'utf8')); el.onload && el.onload(); } catch (e) { errs.push('eval ' + rel + ': ' + e.message); el.onerror && el.onerror(); } } else { el.onerror && el.onerror(); } }, 0);
    return el;
  }
  return origAppend(el);
};
const $ = s => d.querySelector(s), $$ = s => [...d.querySelectorAll(s)];
const wait = ms => new Promise(r => setTimeout(r, ms));
const go = async h => { w.location.hash = h; await wait(60); };
(async () => {
  await wait(50);
  console.log('home cards:', $$('.wcard').length, 'plan cells:', $$('.pcell').length, 'tools:', $$('.tool').length);
  for (const wk of ['0', '1', '2', '3']) { await go('#/week/' + wk); console.log('week', wk, 'ptiles', $$('.ptile').length, 'units', $$('.ucard').length, 'qbtns', $$('.qbtn').length); }
  await go('#/quiz?week=2&level=basic&mode=all&start=1&n=0');
  let types = {}, guard = 0;
  while (guard++ < 400) {
    const card = $('#qstage .card'); if (!card) { console.log('no card'); break; }
    if (card.classList.contains('result')) { console.log('RESULT', card.querySelector('.big').textContent, card.querySelector('p').textContent); break; }
    const tag = card.querySelector('.tag').textContent; types[tag] = (types[tag] || 0) + 1;
    if ($('#qstage .ch')) { $$('#qstage .ch')[guard % 2].click(); $('#nx').click(); }
    else if ($('#qstage .oxbtn')) { $$('#qstage .oxbtn')[guard % 2].click(); $('#nx').click(); }
    else if ($('#qstage .blank')) { $$('#qstage .blank input').forEach(i => i.value = '1'); $('#hint').click(); $('#chk').click(); $('#markOk').click(); $('#nx').click(); }
    else if ($('#qstage #ans') && $('#qstage #ans').tagName === 'INPUT') { $('#ans').value = 'x'; $('#chk').click(); $('#nx').click(); }
    else { $('#showKey').click(); $$('#qstage .kitem input').slice(0, 1).forEach(c => { c.checked = true; c.dispatchEvent(new w.Event('change', { bubbles: true })); }); $('#grade').click(); }
  }
  console.log('types', types, 'badge', $('#wrongBadge').textContent);
  await go('#/quiz?week=2&unit=%EC%9A%A9%EC%96%B4&start=1');
  console.log('term quiz first:', ($('#qstage .qtext') || {}).textContent);
  await go('#/mock?week=2'); $('#mockGo').click(); await wait(20); console.log('mock label:', ($('#qstage .mocklbl') || {}).textContent);
  await go('#/wrong'); console.log('wrong items:', $$('.witem').length); $('#retryWrong').click(); await wait(20); console.log('retry card:', !!$('#qstage .card'));
  await go('#/terms/2'); console.log('term card:', !!$('#fcard'), ($('.whead p') || {}).textContent); if ($('#fcard')) { $('#fcard').click(); $('#fKnow').click(); console.log('after know:', ($('.whead p') || {}).textContent); }
  await go('#/terms/all'); console.log('all terms card:', !!$('#fcard'));
  await go('#/exams'); console.log('exams cards:', $$('#exams .card').length);
  await go('#/tips'); console.log('tips cards:', $$('#tips .card').length);
  const meta = w.GNN_META;
  for (const deck of Object.keys(meta.decks)) {
    if (!meta.decks[deck].have) continue;
    for (const pass of [1, 2, 3, 4]) {
      if (!meta.decks[deck].frames[pass - 1]) continue;
      await go('#/lesson/' + deck + '/' + pass); await wait(80);
      let n = 0; const kinds = {};
      while (n++ < 5000) {
        const f = w.eval('null'); // placeholder
        const slide = $('#pslide'); if (!slide) break;
        const ch = slide.querySelector('.schoices button'); if (ch && !ch.disabled) ch.click();
        const cnt = $('#pcount').textContent; const [a, b] = cnt.split(' / ').map(Number);
        if (a === b && !slide.querySelector('[data-s].hide')) break;
        $('#pNext').click();
      }
      console.log('lesson', deck, 'pass', pass, 'frames', $('#pcount') && $('#pcount').textContent);
    }
  }
  for (const wk of Object.keys(meta.units)) {
    for (const u of meta.units[wk]) {
      await go('#/unit/' + u.id); await wait(80);
      let n = 0;
      while (n++ < 2000) { const slide = $('#pslide'); if (!slide) break; const ch = slide.querySelector('.schoices button'); if (ch && !ch.disabled) ch.click(); const [a, b] = $('#pcount').textContent.split(' / ').map(Number); if (a === b && !slide.querySelector('[data-s].hide')) break; $('#pNext').click(); }
      console.log('unit', u.id, $('#pcount') && $('#pcount').textContent);
    }
  }
  await go('#/'); console.log('home again cards:', $$('.wcard').length, 'last:', ($('.intro .btn.primary') || {}).textContent);
  console.log('errors:', errs.length ? errs.slice(0, 10) : '없음');
  process.exit(0);
})();
