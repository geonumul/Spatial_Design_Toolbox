/* =====================================================================
   이용권 검사 (홈, 과목 페이지, 펫 페이지, 관리자 페이지 공통)
   - 먼저 assets/firebase-config.js, assets/sync.js, assets/access-config.js 를 읽은 뒤에 넣는다.
   - 로그인 상태는 window.SDT(sync.js), 이용권은 Firestore users/{uid}/passes (firestore.rules 참고)
   - 스크립트 태그에 data-gate 를 붙이면 화면을 막는다
       data-gate="subject"  로그인 + 이 과목 이용권이 있어야 열린다 (과목은 주소 subjects/<slug>/ 로 찾는다)
       data-gate="login"    로그인만 하면 열린다 (펫 페이지)
   - API: window.SDTAccess = { state, onChange(fn), can(key), until(key), redeem(code), db(), refresh(),
            subjectName(key), passName(p), fmtDate(ms), codeForm(el, done), passListHTML(), root }
   - 테스트용: 실제 사이트 주소가 아닐 때 window.SDT_ACCESS_TEST = {user, passes, admin} 를 먼저 넣으면
     Firebase 없이 그 상태로 동작한다.
   - 이 검사는 화면만 막는다. 저장소가 공개라 data/*.js 파일은 주소로 직접 받을 수 있다.
   ===================================================================== */
(function(){
  var CFG = window.SDT_ACCESS || {enforce: false, subjects: [], plans: []};
  var me = document.currentScript;
  var GATE = me && me.getAttribute("data-gate");
  var ROOT = me && me.src ? me.src.replace(/assets\/access\.js.*$/, "") : "";
  var PROD = "geonumul.github.io";
  var DAY = 86400000;
  var listeners = [];

  var st = {ready: false, off: false, error: null, user: null, admin: false, passes: [], all: 0, subjects: {}};
  var A = {
    state: st, root: ROOT,
    onChange: function(fn){ listeners.push(fn); if(st.ready){ try{ fn(st); }catch(e){} } },
    can: function(key){ if(st.off) return true; return A.until(key) > Date.now(); },
    until: function(key){ return Math.max(st.all || 0, (key && st.subjects[key]) || 0); },
    db: function(){ return (window.firebase && firebase.firestore) ? firebase.firestore() : null; },
    refresh: function(){ return st.user ? loadUser(st.user) : Promise.resolve(); },
    redeem: redeem, subjectName: subjectName, passName: passName, fmtDate: fmtDate,
    codeForm: codeForm, passListHTML: passListHTML, normCode: normCode, josa: josa
  };
  window.SDTAccess = A;

  function emit(){ st.ready = true; listeners.slice().forEach(function(fn){ try{ fn(st); }catch(e){} }); }

  /* ---------- 글자 ---------- */
  function esc(s){ return String(s == null ? "" : s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
  function fmtDate(ms){ var d = new Date(ms); return d.getFullYear() + "년 " + (d.getMonth() + 1) + "월 " + d.getDate() + "일"; }
  function subjectName(key){
    var s = (CFG.subjects || []).filter(function(x){ return x.key === key; })[0];
    return s ? s.name : key;
  }
  function passName(p){
    if(p.kind === "subject") return "과목 이용권 (" + subjectName(p.scope) + ")";
    if(p.kind === "month") return "월간 프리패스";
    if(p.kind === "year") return "연간 프리패스";
    return "전체 과목 이용권";
  }
  /* 받침에 맞춰 은/는, 이/가 고르기 */
  function josa(word, a, b){
    var w = String(word).replace(/[\s)\]]+$/, ""), ch = w.charAt(w.length - 1), code = ch.charCodeAt(0);
    var has = code >= 0xAC00 && code <= 0xD7A3 ? (code - 0xAC00) % 28 > 0 : /[LMNlmn0136789]/.test(ch);
    return word + (has ? a : b);
  }
  function normCode(s){ return String(s || "").toUpperCase().replace(/[\s-]/g, ""); }
  function ms(t){ return !t ? 0 : typeof t === "number" ? t : t.toMillis ? t.toMillis() : +new Date(t); }

  /* ---------- 상태 계산 ---------- */
  function setPasses(list){
    var now = Date.now();
    st.passes = list.map(function(p){ return {id: p.id, kind: p.kind, scope: p.scope, expiresAt: ms(p.expiresAt), source: p.source || ""}; })
      .sort(function(a, b){ return b.expiresAt - a.expiresAt; });
    st.all = 0; st.subjects = {};
    st.passes.forEach(function(p){
      if(p.expiresAt <= now) return;
      if(p.scope === "*") st.all = Math.max(st.all, p.expiresAt);
      else st.subjects[p.scope] = Math.max(st.subjects[p.scope] || 0, p.expiresAt);
    });
    try{
      if(st.user) localStorage.setItem("sdt_access", JSON.stringify({uid: st.user.uid, all: st.all, subjects: st.subjects, t: now}));
    }catch(e){}
  }

  function loadUser(u){
    var db = A.db();
    if(!db){ st.error = "load"; emit(); return Promise.resolve(); }
    db.collection("users").doc(u.uid).set({email: u.email || "", name: (u.displayName || "").slice(0, 100),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()}, {merge: true}).catch(function(){});
    var adm = db.collection("admins").doc(u.uid).get().then(function(s){ return s.exists; }).catch(function(){ return false; });
    var ps = db.collection("users").doc(u.uid).collection("passes").get()
      .then(function(q){ return q.docs.map(function(d){ var x = d.data(); x.id = d.id; return x; }); });
    return Promise.all([adm, ps]).then(function(r){
      if(st.user !== u) return;
      st.admin = r[0]; st.error = null; setPasses(r[1]); emit();
    }).catch(function(){
      if(st.user !== u) return;
      st.error = "load"; emit();
    });
  }

  function start(){
    var T = window.SDT_ACCESS_TEST;
    if(T && location.hostname !== PROD){
      st.user = T.user || null; st.admin = !!T.admin; setPasses(T.passes || []);
      if(T.off) st.off = true;
      A.redeem = T.redeem || function(){ return Promise.resolve({ok: false, msg: "테스트에서는 코드를 쓸 수 없어요."}); };
      A.testSet = function(list){ setPasses(list); emit(); };
      emit(); return;
    }
    if(!CFG.enforce || !window.SDT_FIREBASE || !window.SDT || (!window.SDT.enabled && location.protocol.indexOf("http") !== 0)){
      /* 검사를 껐거나, 로그인을 쓸 수 없는 곳(파일로 연 경우). 막지 않는다 */
      st.off = true;
      if(window.SDT && SDT.enabled) SDT.onAuth(function(u){ st.user = u || null; if(u) loadUser(u); else emit(); });
      else emit();
      return;
    }
    SDT.onAuth(function(u){
      st.user = u || null; st.admin = false;
      if(!SDT.enabled){ st.error = "sdk"; emit(); return; }
      if(!u){ setPasses([]); st.error = null; emit(); return; }
      loadUser(u);
    });
  }

  /* ---------- 이벤트 코드 ---------- */
  function redeem(raw){
    var id = normCode(raw), u = st.user, db = A.db();
    if(!u) return Promise.resolve({ok: false, msg: "로그인한 뒤에 코드를 넣어 주세요."});
    if(!/^[A-Z0-9]{6,32}$/.test(id)) return Promise.resolve({ok: false, msg: "코드는 영문과 숫자 6~32자예요. 다시 확인해 주세요."});
    if(!db) return Promise.resolve({ok: false, msg: "지금은 코드를 확인할 수 없어요. 새로고침한 뒤 다시 해 주세요."});
    var FV = firebase.firestore.FieldValue, TS = firebase.firestore.Timestamp;
    var codeRef = db.collection("codes").doc(id);
    var passRef = db.collection("users").doc(u.uid).collection("passes").doc("c_" + id);
    var redRef = codeRef.collection("redemptions").doc(u.uid);
    var got = null;
    return db.runTransaction(function(tx){
      return tx.get(codeRef).then(function(s){
        if(!s.exists) throw {why: "없는 코드예요. 글자를 다시 확인해 주세요."};
        var c = s.data(), now = Date.now();
        if(!c.active) throw {why: "지금은 쓸 수 없는 코드예요."};
        if(ms(c.expiresAt) <= now) throw {why: "기간이 끝난 코드예요."};
        if((c.used || 0) >= c.maxUses) throw {why: "사용할 수 있는 인원이 다 찬 코드예요."};
        return tx.get(passRef).then(function(p){
          if(p.exists) throw {why: "이미 등록한 코드예요."};
          got = {kind: c.kind, scope: c.scope, expiresAt: now + c.days * DAY};
          tx.set(passRef, {kind: c.kind, scope: c.scope, expiresAt: TS.fromMillis(got.expiresAt), source: "code", code: id, createdAt: FV.serverTimestamp()});
          tx.update(codeRef, {used: (c.used || 0) + 1});
          tx.set(redRef, {uid: u.uid, email: u.email || "", at: FV.serverTimestamp()});
        });
      });
    }).then(function(){
      return loadUser(u).then(function(){
        return {ok: true, msg: josa(passName(got), "이", "가") + " 생겼어요. " + fmtDate(got.expiresAt) + "까지 쓸 수 있어요."};
      });
    }).catch(function(e){
      if(e && e.why) return {ok: false, msg: e.why};
      if(e && e.code === "permission-denied") return {ok: false, msg: "코드를 등록하지 못했어요. 이미 쓴 코드거나 인원이 다 찼을 수 있어요."};
      return {ok: false, msg: "코드를 등록하지 못했어요. 인터넷 연결을 확인하고 다시 해 주세요."};
    });
  }

  /* ---------- 공통 조각 ---------- */
  function codeForm(el, done){
    el.innerHTML = '<form class="acc-code"><input type="text" name="code" maxlength="40" autocomplete="off" spellcheck="false" placeholder="이벤트 코드" aria-label="이벤트 코드">'
      + '<button type="submit" class="acc-btn">등록</button></form><p class="acc-msg" role="status" aria-live="polite"></p>';
    var f = el.querySelector("form"), inp = f.querySelector("input"), msg = el.querySelector(".acc-msg"), btn = f.querySelector("button");
    f.addEventListener("submit", function(ev){
      ev.preventDefault();
      var v = inp.value;
      if(!normCode(v)){ msg.textContent = "코드를 넣어 주세요."; return; }
      btn.disabled = true; msg.className = "acc-msg"; msg.textContent = "확인하고 있어요.";
      A.redeem(v).then(function(r){
        btn.disabled = false; msg.textContent = r.msg; msg.className = "acc-msg " + (r.ok ? "ok" : "no");
        if(r.ok){ inp.value = ""; if(done) done(r); }
      });
    });
  }

  function passListHTML(){
    if(!st.user) return '<p class="acc-empty">로그인하면 내 이용권이 보여요.</p>';
    if(st.error) return '<p class="acc-empty">이용권 정보를 읽지 못했어요. 새로고침해 주세요.</p>';
    if(!st.passes.length) return '<p class="acc-empty">아직 이용권이 없어요.</p>';
    var now = Date.now();
    return '<ul class="acc-list">' + st.passes.map(function(p){
      var live = p.expiresAt > now;
      return '<li class="' + (live ? "" : "end") + '"><b>' + esc(passName(p)) + '</b><span>'
        + (live ? fmtDate(p.expiresAt) + "까지" : fmtDate(p.expiresAt) + "에 끝남") + '</span></li>';
    }).join("") + '</ul>';
  }

  var BASE_CSS = ".acc-code{display:flex;gap:8px;flex-wrap:wrap}"
    + ".acc-code input{flex:1;min-width:0;min-height:44px;padding:8px 12px;border:1.5px solid var(--line-2,#D3D3E3);border-radius:4px;font:inherit;font-size:16px;letter-spacing:.5px;text-transform:uppercase;background:var(--surface,#fff);color:var(--ink,#1B1B2F)}"
    + ".acc-btn{min-height:44px;padding:8px 18px;border-radius:4px;border:1.5px solid var(--accent,#4E3FE5);background:var(--accent,#4E3FE5);color:var(--accent-ink,#fff);font:inherit;font-weight:600;cursor:pointer}"
    + ".acc-btn.line{background:transparent;color:var(--accent,#4E3FE5)}"
    + ".acc-btn:disabled{opacity:.6;cursor:default}"
    + ".acc-msg{margin:8px 0 0;font-size:14px;min-height:1.5em;color:var(--sub,#6B6B84)}.acc-msg.ok{color:var(--ok,#1F9D67)}.acc-msg.no{color:var(--no,#E14B4B)}"
    + ".acc-list{list-style:none;margin:0;padding:0}.acc-list li{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:10px 0;border-bottom:1px solid var(--line,#E7E6F3)}"
    + ".acc-list li span{color:var(--sub,#6B6B84);font-size:14px}.acc-list li.end{opacity:.55}"
    + ".acc-empty{margin:0;color:var(--sub,#6B6B84);font-size:14.5px}";
  var cssDone = false;
  function addCSS(extra){
    if(!cssDone){ var s = document.createElement("style"); s.textContent = BASE_CSS; document.head.appendChild(s); cssDone = true; }
    if(extra){ var t = document.createElement("style"); t.textContent = extra; document.head.appendChild(t); }
  }
  A.addCSS = function(){ addCSS(); };

  /* ---------- 화면 막기 ---------- */
  function slugKey(){
    var m = location.pathname.match(/\/subjects\/([^\/]+)\//);
    var slug = m ? decodeURIComponent(m[1]) : "";
    var s = (CFG.subjects || []).filter(function(x){ return x.slug === slug; })[0];
    return s ? {key: s.key, name: s.name} : {key: "slug:" + slug, name: "이 과목"};
  }

  function gate(){
    var root = document.documentElement, sub = GATE === "subject" ? slugKey() : null;
    addCSS("html.sdt-locked body>*:not(header):not(#sdtGate):not(#toast):not(#sdtToast):not(script):not(style){display:none!important}"
      + "html.sdt-locked #nav,html.sdt-locked header nav{visibility:hidden}"
      + "#sdtGate{display:none;max-width:560px;margin:0 auto;padding:56px 20px 80px;color:var(--ink,#1B1B2F)}"
      + "html.sdt-locked #sdtGate{display:block}"
      + "#sdtGate .g-card{background:var(--surface,#fff);border:1px solid var(--line,#E7E6F3);border-radius:8px;padding:28px 24px}"
      + "#sdtGate h1{font-size:23px;line-height:1.4;margin:0 0 8px;font-weight:650;letter-spacing:-.4px;word-break:keep-all}"
      + "#sdtGate p{margin:0 0 18px;color:var(--ink-2,#44445C);line-height:1.7;word-break:keep-all}"
      + "#sdtGate .g-row{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:18px}"
      + "#sdtGate a.acc-btn{display:inline-flex;align-items:center;text-decoration:none}"
      + "#sdtGate h2{font-size:15px;margin:22px 0 8px;font-weight:600}"
      + "#sdtGate .g-small{font-size:13.5px;color:var(--sub,#6B6B84);margin:14px 0 0}");
    var box = document.createElement("section");
    box.id = "sdtGate"; box.setAttribute("aria-live", "polite");
    var app = document.getElementById("app") || document.querySelector("main");
    if(app && app.parentNode === document.body) document.body.insertBefore(box, app);
    else document.body.appendChild(box);

    /* 막혀 있는 동안 뒤에 있는 화면이 키보드를 받지 않게 */
    window.addEventListener("keydown", function(e){
      if(root.classList.contains("sdt-locked") && !box.contains(e.target)) e.stopImmediatePropagation();
    }, true);

    /* 이 기기에서 확인한 적이 있으면 확인이 끝나기 전에도 먼저 연다 */
    var cached = false;
    try{
      var c = JSON.parse(localStorage.getItem("sdt_access") || "null"), uid = localStorage.getItem("sdt_uid");
      if(c && uid && c.uid === uid && Date.now() - c.t < 7 * DAY){
        var until = GATE === "login" ? Infinity : Math.max(c.all || 0, (c.subjects || {})[sub.key] || 0);
        cached = until > Date.now();
      }
    }catch(e){}
    if(!cached){ root.classList.add("sdt-locked"); show("wait"); }

    A.onChange(function(){
      var mode;
      if(st.off) mode = "open";
      else if(st.error === "sdk") mode = "sdk";
      else if(!st.user) mode = "login";
      else if(GATE === "login") mode = "open";
      else if(st.error) mode = "load";
      else mode = A.can(sub.key) ? "open" : "nopass";
      root.classList.toggle("sdt-locked", mode !== "open");
      if(mode !== "open") show(mode);
    });

    function show(mode){
      if(box.getAttribute("data-mode") === mode && mode !== "nopass") return;
      box.setAttribute("data-mode", mode);
      var home = ROOT + "index.html";
      var h = "";
      if(mode === "wait"){
        h = '<h1>로그인 정보를 확인하고 있어요</h1><p>잠시만 기다려 주세요.</p>';
      } else if(mode === "sdk"){
        h = '<h1>로그인 기능을 불러오지 못했어요</h1><p>인터넷 연결을 확인하고 새로고침해 주세요. 광고 차단 확장 프로그램이 막고 있을 수도 있어요.</p>'
          + '<div class="g-row"><button type="button" class="acc-btn" data-act="reload">새로고침</button><a class="acc-btn line" href="' + esc(home) + '">홈으로</a></div>';
      } else if(mode === "login"){
        h = (GATE === "login"
            ? '<h1>로그인하면 볼 수 있어요</h1><p>구글 계정으로 로그인해 주세요. 펫과 기록이 계정에 저장돼요.</p>'
            : '<h1>' + esc(josa(sub.name, "은", "는")) + ' 로그인한 뒤에 열려요</h1><p>구글 계정으로 로그인해 주세요. 이용권이 있으면 바로 공부를 시작할 수 있어요.</p>')
          + '<div class="g-row"><button type="button" class="acc-btn" data-act="login">구글 계정으로 로그인</button><a class="acc-btn line" href="' + esc(home) + '#subjects">전체 과목</a></div>';
      } else if(mode === "load"){
        h = '<h1>이용권 정보를 읽지 못했어요</h1><p>잠시 뒤에 새로고침해 주세요. 계속 안 되면 관리자에게 알려 주세요.</p>'
          + '<div class="g-row"><button type="button" class="acc-btn" data-act="reload">새로고침</button><a class="acc-btn line" href="' + esc(home) + '">홈으로</a></div>';
      } else if(mode === "nopass"){
        var old = st.passes.filter(function(p){ return p.scope === "*" || p.scope === sub.key; })[0];
        h = '<h1>' + esc(sub.name) + ' 이용권이 없어요</h1>'
          + '<p>' + (old ? esc(josa(passName(old), "은", "는")) + ' ' + fmtDate(old.expiresAt) + '에 끝났어요. ' : '')
          + '과목 이용권이나 프리패스가 있으면 이 과목이 열려요. 이벤트 코드를 받았다면 아래에 넣어 주세요.</p>'
          + '<div class="g-row"><a class="acc-btn" href="' + esc(home) + '#pass">이용권 보기</a><a class="acc-btn line" href="' + esc(home) + '#subjects">전체 과목</a></div>'
          + '<h2>이벤트 코드</h2><div data-code></div>'
          + '<p class="g-small">' + esc((st.user.email || "") + " 계정으로 로그인했어요.") + '</p>';
      }
      box.innerHTML = '<div class="g-card">' + h + '</div>';
      var cf = box.querySelector("[data-code]"); if(cf) codeForm(cf);
      var b = box.querySelector("[data-act]");
      if(b) b.addEventListener("click", function(){
        if(b.getAttribute("data-act") === "reload") location.reload();
        else if(window.SDT) SDT.login();
      });
    }
  }

  if(GATE) gate();
  start();
})();
