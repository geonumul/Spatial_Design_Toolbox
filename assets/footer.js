/* 과목 페이지, 펫 페이지 공통 하단 (첫 화면 index.html 은 큰 푸터를 따로 둔다)
   스크립트 주소로 저장소 뿌리를 찾아 링크를 만든다. 슬라이드 넘기는 중(body.playing)에는 숨긴다. */
(function () {
  var me = document.currentScript;
  var root = me && me.src ? new URL('../', me.src).href : '../../';
  function build() {
    if (document.getElementById('sdtFoot')) return;
    var css = document.createElement('style');
    css.textContent = '#sdtFoot{border-top:1px solid var(--line,#E7E6F3);color:#9A9AB0;font-size:13px;margin-top:40px}'
      + '#sdtFoot .fw{max-width:1120px;margin:0 auto;padding:20px 24px 28px;display:flex;justify-content:space-between;align-items:center;gap:10px 18px;flex-wrap:wrap}'
      + '#sdtFoot .fl{display:flex;gap:16px;flex-wrap:wrap}'
      + '#sdtFoot a{color:#6B6B84;text-decoration:none}#sdtFoot a:hover{color:var(--primary,#4E3FE5)}'
      + 'body.playing #sdtFoot{display:none}'
      + '@media (max-width:720px){#sdtFoot .fw{padding:18px 16px 24px}}';
    document.head.appendChild(css);
    var f = document.createElement('footer');
    f.id = 'sdtFoot';
    f.innerHTML = '<div class="fw"><span>&copy; 2026 TSG. All rights reserved.</span><span class="fl">'
      + '<a href="' + root + 'index.html#subjects">전체 과목</a>'
      + '<a href="mailto:8268go@naver.com">문의하기</a>'
      + '<a href="' + root + 'legal/faq.html">자주 묻는 질문</a>'
      + '<a href="' + root + 'legal/privacy.html">개인정보처리방침</a>'
      + '<a href="' + root + 'legal/terms.html">이용약관</a></span></div>';
    var app = document.getElementById('app') || document.querySelector('main');
    if (app && app.parentNode === document.body) app.after(f); else document.body.appendChild(f);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build); else build();
})();
