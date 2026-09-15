/* =====================================================================
   로그인과 기록 저장 (홈, 모든 과목 페이지 공통)
   - Firebase Google 로그인 + Firestore. 설정은 assets/firebase-config.js
   - 설정이 없거나 파일(file://)로 열면 enabled=false. 모든 호출은 조용히 null/false 를 돌려준다.
   - 저장 위치: users/{uid}/stores/{문서id} = {data: JSON 문자열, updatedAt}
       과목 진행 기록  <과목키>__progress
       필기 한 쪽      <과목키>__ink:<쪽 키>   ("/" 는 "|" 로 바꿔 저장)
   - API: window.SDT = { enabled, user, onAuth(fn), login(), logout(), get(id), set(id, value) }
     onAuth(fn) 은 로그인 상태가 정해지면(로그인/로그아웃/처음 확인) 매번 fn(user 또는 null) 을 부른다.
   - 마지막 로그인 uid 를 localStorage "sdt_uid" 에 적어 두어, 과목 페이지가 첫 화면부터 그 사람 기록을 연다.
   ===================================================================== */
(function(){
  var CFG = window.SDT_FIREBASE, listeners = [], resolved = false;
  var SDT = {
    enabled: !!(CFG && CFG.apiKey && location.protocol.indexOf("http") === 0),
    user: null,
    onAuth: function(fn){ listeners.push(fn); if(resolved){ try{ fn(SDT.user); }catch(e){} } },
    login: function(){ say("로그인 준비 중이에요. 잠시 후 다시 눌러 주세요."); },
    logout: function(){ return Promise.resolve(); },
    get: function(){ return Promise.resolve(null); },
    set: function(){ return Promise.resolve(false); },
    /* 예전 형식 과목 페이지가 부르는 이름. 새 엔진으로 다시 빌드되면 필요 없다 */
    attach: function(){}, attachHome: function(){}, dirty: function(){}
  };
  window.SDT = SDT;

  function say(m){
    var t = document.getElementById("toast");
    if(!t){ t = document.getElementById("sdtToast"); }
    if(!t){ t = document.createElement("div"); t.id = "sdtToast"; document.body.appendChild(t); }
    t.textContent = m; t.classList.add("on"); clearTimeout(t._sdt); t._sdt = setTimeout(function(){ t.classList.remove("on"); }, 2600);
  }

  if(!SDT.enabled){ resolved = true; return; }

  var VER = "10.12.2", auth = null, db = null, box = null;

  function sid(id){ return String(id).replace(/\//g, "|"); }
  function col(){ return db.collection("users").doc(SDT.user.uid).collection("stores"); }

  /* ---------- 머리글 로그인 칸 ---------- */
  function buildUI(){
    var css = document.createElement("style");
    css.textContent = ".acct{display:flex;align-items:center;gap:8px;margin-left:12px;flex:none}"
      + ".acctname{font-size:13px;color:var(--sub);max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}"
      + ".acctbtn{min-height:36px;padding:6px 14px;border-radius:4px;border:1.5px solid var(--line-2,var(--line));background:var(--surface,#fff);font-weight:650;font-size:13.5px;color:var(--ink);cursor:pointer;font-family:inherit}"
      + ".acctbtn.on{background:var(--accent,var(--primary));border-color:var(--accent,var(--primary));color:#fff}"
      + "#sdtToast{position:fixed;left:50%;bottom:28px;transform:translateX(-50%) translateY(20px);background:var(--ink);color:#fff;padding:11px 18px;border-radius:999px;font-size:14px;opacity:0;pointer-events:none;transition:.2s;z-index:40;max-width:90vw;text-align:center}"
      + "#sdtToast.on{opacity:1;transform:translateX(-50%)}"
      + "@media (max-width:720px){.hwrap nav{order:1}.acct{margin-left:auto}.acctname{max-width:90px}}";
    document.head.appendChild(css);
    var wrap = document.querySelector(".hwrap"); if(!wrap) return;
    box = document.createElement("div"); box.className = "acct"; wrap.appendChild(box);
    renderUI();
  }
  function renderUI(){
    if(!box) return;
    var u = SDT.user;
    box.innerHTML = u ? '<span class="acctname"></span><button class="acctbtn" type="button">로그아웃</button>'
                      : '<button class="acctbtn on" type="button">로그인</button>';
    if(u) box.querySelector(".acctname").textContent = (u.displayName || u.email || "내 계정") + " 님";
    box.querySelector(".acctbtn").addEventListener("click", function(){
      if(SDT.user) SDT.logout().then(function(){ say("로그아웃했어요"); }); else SDT.login();
    });
  }

  /* ---------- 로그인 ---------- */
  function login(){
    var ua = navigator.userAgent || "";
    if(/KAKAOTALK/i.test(ua)){ location.href = "kakaotalk://web/openExternal?url=" + encodeURIComponent(location.href); return; }
    if(/NAVER\(|Instagram|FBAN|FBAV|Line\/|everytime/i.test(ua)){ say("앱 안의 브라우저에서는 구글 로그인이 막혀 있어요. 크롬이나 사파리로 열어 주세요."); return; }
    var prov = new firebase.auth.GoogleAuthProvider(); prov.setCustomParameters({prompt: "select_account"});
    auth.signInWithPopup(prov).catch(function(e){
      var c = e && e.code;
      if(c === "auth/popup-blocked" || c === "auth/operation-not-supported-in-this-environment") auth.signInWithRedirect(prov);
      else if(c === "auth/unauthorized-domain") say("이 주소(" + location.host + ")에서는 로그인이 안 돼요. https://geonumul.github.io/Spatial_Design_Toolbox/ 로 열어 주세요.");
      else if(c !== "auth/popup-closed-by-user" && c !== "auth/cancelled-popup-request") say("로그인하지 못했어요 (" + c + ")");
    });
  }

  /* ---------- 시작 ---------- */
  function load(src, cb){ var el = document.createElement("script"); el.src = src; el.onload = function(){ cb(true); }; el.onerror = function(){ cb(false); }; document.head.appendChild(el); }
  var base = "https://www.gstatic.com/firebasejs/" + VER + "/";
  function fail(){ resolved = true; SDT.enabled = false; listeners.forEach(function(fn){ try{ fn(null); }catch(e){} }); }
  load(base + "firebase-app-compat.js", function(ok){ if(!ok) return fail();
    load(base + "firebase-auth-compat.js", function(ok){ if(!ok) return fail();
      load(base + "firebase-firestore-compat.js", function(ok){ if(!ok) return fail();
        firebase.initializeApp(CFG);
        auth = firebase.auth(); db = firebase.firestore();
        auth.getRedirectResult().catch(function(){});
        SDT.login = login;
        SDT.logout = function(){ return auth.signOut(); };
        SDT.get = function(id){
          if(!SDT.user) return Promise.resolve(null);
          return col().doc(sid(id)).get().then(function(s){
            if(!s.exists) return null;
            try{ return JSON.parse(s.data().data); }catch(e){ return null; }
          }).catch(function(){ return null; });
        };
        SDT.set = function(id, value){
          if(!SDT.user) return Promise.resolve(false);
          var str = JSON.stringify(value == null ? null : value);
          if(str.length > 890000){ say("기록이 너무 커서 올리지 못했어요"); return Promise.resolve(false); }
          return col().doc(sid(id)).set({data: str, updatedAt: firebase.firestore.FieldValue.serverTimestamp()})
            .then(function(){ return true; }).catch(function(){ return false; });
        };
        buildUI();
        auth.onAuthStateChanged(function(u){
          SDT.user = u;
          try{ if(u) localStorage.setItem("sdt_uid", u.uid); else localStorage.removeItem("sdt_uid"); }catch(e){}
          resolved = true;
          renderUI();
          listeners.forEach(function(fn){ try{ fn(u); }catch(e){} });
        });
      });
    });
  });
})();
