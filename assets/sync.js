/* =====================================================================
   계정 로그인과 기록 동기화 (홈, 모든 과목 페이지 공통)
   - Firebase Google 로그인 + Firestore. 설정은 assets/firebase-config.js
   - 설정이 없거나 파일(file://)로 열면 아무것도 하지 않는다. 기록은 그 브라우저에만 저장.
   - 저장 위치: users/{uid}/stores/{과목키} = {data: 기록 JSON 문자열, updatedAt}
   - 이 기기 캐시: localStorage["과목키@uid"]. 아직 못 올린 변경이 있으면 "과목키@uid#p" = "1"
   - 과목 페이지는 SDT.attach({key, get, set}), 홈은 SDT.attachHome(fn) 으로 붙는다.
   ===================================================================== */
(function(){
  var SDT = { user:null, page:null, home:null, dirty:function(){}, attach:function(p){ SDT.page=p; }, attachHome:function(fn){ SDT.home=fn; } };
  window.SDT = SDT;
  var CFG = window.SDT_FIREBASE;
  if(!CFG || !CFG.apiKey || location.protocol.indexOf("http")!==0) return;

  var VER = "10.12.2", auth = null, db = null, box = null, timer = null, gen = 0, loadedGen = -1, dirtyN = 0;

  /* ---------- 유틸 ---------- */
  function readLocal(k){ try{ return JSON.parse(localStorage.getItem(k)||"null"); }catch(e){ return null; } }
  function writeLocal(k, d){ try{ localStorage.setItem(k, JSON.stringify(d)); }catch(e){} }
  function flag(k, on){ try{ if(on) localStorage.setItem(k+"#p","1"); else localStorage.removeItem(k+"#p"); }catch(e){} }
  function flagged(k){ try{ return localStorage.getItem(k+"#p")==="1"; }catch(e){ return false; } }
  function hasData(d){ return !!(d && ((d.wrong && Object.keys(d.wrong).length) || (d.seen && Object.keys(d.seen).length) || (d.extra && d.extra.length))); }
  function say(m){
    if(typeof window.toast==="function"){ window.toast(m); return; }
    var t=document.getElementById("sdtToast");
    if(!t){ t=document.createElement("div"); t.id="sdtToast"; document.body.appendChild(t); }
    t.textContent=m; t.className="on"; clearTimeout(t._t); t._t=setTimeout(function(){ t.className=""; }, 2600);
  }
  /* 두 기록 합치기: 오답은 더 최근(ts) 것, 푼 기록은 더 많이 푼(n) 것, 추가 문제는 합집합 */
  function merge(a, b){
    var o={wrong:{}, seen:{}, extra:[]}, ids={};
    [a||{}, b||{}].forEach(function(d){
      var w=d.wrong||{}, s=d.seen||{}, k;
      for(k in w){ if(w.hasOwnProperty(k) && (!o.wrong[k] || (w[k].ts||0)>(o.wrong[k].ts||0))) o.wrong[k]=w[k]; }
      for(k in s){ if(s.hasOwnProperty(k) && (!o.seen[k] || (s[k].n||0)>(o.seen[k].n||0))) o.seen[k]=s[k]; }
      (d.extra||[]).forEach(function(q){ var id=q.id||(q.type+"|"+q.q); if(!ids[id]){ ids[id]=1; o.extra.push(q); } });
    });
    return o;
  }
  function stores(uid){ return db.collection("users").doc(uid).collection("stores"); }

  /* ---------- 화면 ---------- */
  function buildUI(){
    var css=document.createElement("style");
    css.textContent=".acct{display:flex;align-items:center;gap:8px;margin-left:14px;flex:none}"
      +".acctname{font-size:13px;color:var(--sub);max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}"
      +".acctbtn{padding:7px 15px;border-radius:999px;border:1.5px solid var(--line);background:#fff;font-weight:600;font-size:13.5px;color:#2E2E48;cursor:pointer;font-family:inherit}"
      +".acctbtn:hover{border-color:var(--primary-mid);background:var(--soft)}"
      +".acctbtn.on{background:var(--primary);border-color:var(--primary);color:#fff}"
      +".acctbtn.on:hover{background:var(--primary-dark)}"
      +"#sdtToast{position:fixed;left:50%;bottom:28px;transform:translateX(-50%) translateY(20px);background:var(--ink);color:#fff;padding:11px 18px;border-radius:999px;font-size:14px;opacity:0;pointer-events:none;transition:.2s;z-index:40;max-width:90vw;text-align:center}"
      +"#sdtToast.on{opacity:1;transform:translateX(-50%)}"
      +"@media (max-width:720px){.hwrap nav{order:1}.acct{margin-left:auto}.acctname{max-width:90px}}";
    document.head.appendChild(css);
    var wrap=document.querySelector(".hwrap"); if(!wrap) return;
    box=document.createElement("div"); box.className="acct"; wrap.appendChild(box);
    renderUI();
  }
  function renderUI(){
    if(!box) return;
    var u=SDT.user;
    box.innerHTML = u ? '<span class="acctname"></span><button class="acctbtn" type="button">로그아웃</button>'
                      : '<button class="acctbtn on" type="button">로그인</button>';
    if(u) box.querySelector(".acctname").textContent=(u.displayName||u.email||"내 계정")+" 님";
    box.querySelector(".acctbtn").addEventListener("click", function(){
      if(!SDT.user){ login(); return; }
      (timer ? push() : Promise.resolve()).then(function(){ return auth.signOut(); }).then(function(){ say("로그아웃했습니다"); });
    });
  }
  function setStatus(m){ var n=box && box.querySelector(".acctname"); if(n) n.title="기록 "+m; }

  /* ---------- 로그인 ---------- */
  function login(){
    var ua=navigator.userAgent||"";
    if(/KAKAOTALK/i.test(ua)){ location.href="kakaotalk://web/openExternal?url="+encodeURIComponent(location.href); return; }
    if(/NAVER\(|Instagram|FBAN|FBAV|Line\/|everytime/i.test(ua)){ say("앱 안의 브라우저에서는 구글 로그인이 막혀 있습니다. 크롬이나 사파리로 열어 주세요."); return; }
    var prov=new firebase.auth.GoogleAuthProvider(); prov.setCustomParameters({prompt:"select_account"});
    auth.signInWithPopup(prov).catch(function(e){
      var c=e&&e.code;
      if(c==="auth/popup-blocked" || c==="auth/operation-not-supported-in-this-environment") auth.signInWithRedirect(prov);
      else if(c!=="auth/popup-closed-by-user" && c!=="auth/cancelled-popup-request") say("로그인하지 못했습니다 ("+c+")");
    });
  }

  /* ---------- 과목 페이지 ---------- */
  function localKey(){ return SDT.page.key+"@"+SDT.user.uid; }
  function syncPage(){
    var p=SDT.page, u=SDT.user, my=++gen;
    clearTimeout(timer); timer=null;
    if(!u){ p.set(readLocal(p.key)||{}, p.key); return; }
    var lk=localKey(), cache=readLocal(lk), pending=flagged(lk);
    if(cache) p.set(cache, lk);   // 이 기기 캐시로 먼저 보여 준다
    setStatus("불러오는 중");
    stores(u.uid).doc(p.key).get().then(function(snap){
      if(my!==gen) return;
      var remote=null;
      if(snap.exists){ try{ remote=JSON.parse(snap.data().data); }catch(e){ remote=null; } }
      // 못 올린 변경이 있으면 합치고, 없으면 서버 기록이 기준(다른 기기에서 지운 것도 반영)
      var data = remote ? (pending && cache ? merge(remote, p.get()) : remote) : (cache ? p.get() : {});
      var guest=readLocal(p.key);
      if(!remote && !cache && hasData(guest) && confirm("로그인 없이 이 브라우저에서 푼 기록이 있습니다. 내 계정으로 옮길까요?")){
        data=merge(data, guest); try{ localStorage.removeItem(p.key); }catch(e){}
      }
      data=merge(data, null);
      writeLocal(lk, data); p.set(data, lk); loadedGen=my;
      if(!remote || pending || JSON.stringify(data)!==JSON.stringify(merge(remote,null))) push(); else setStatus("저장됨");
    }).catch(function(){
      if(my!==gen) return;
      loadedGen=my; setStatus("오프라인");
      say("기록을 불러오지 못했습니다. 이 기기에 저장해 두고 다음에 올립니다.");
    });
  }
  SDT.dirty=function(){
    if(!SDT.user || !SDT.page) return;
    flag(localKey(), true); dirtyN++;
    if(loadedGen!==gen) return;
    clearTimeout(timer); setStatus("저장 대기"); timer=setTimeout(push, 1500);
  };
  function push(){
    clearTimeout(timer); timer=null;
    var p=SDT.page, u=SDT.user; if(!p || !u) return Promise.resolve();
    var lk=localKey(), n=dirtyN; setStatus("저장 중");
    return stores(u.uid).doc(p.key).set({ data:JSON.stringify(p.get()), updatedAt:firebase.firestore.FieldValue.serverTimestamp() })
      .then(function(){ if(n===dirtyN) flag(lk, false); setStatus("저장됨"); })
      .catch(function(){ setStatus("저장 실패"); });
  }
  window.addEventListener("pagehide", function(){ if(timer) push(); });
  document.addEventListener("visibilitychange", function(){ if(document.visibilityState==="hidden" && timer) push(); });

  /* ---------- 홈 ---------- */
  function syncHome(){
    var fn=SDT.home, u=SDT.user;
    if(!u){ fn(null, null); return; }
    stores(u.uid).get().then(function(qs){
      var map={}; qs.forEach(function(d){ try{ map[d.id]=JSON.parse(d.data().data); }catch(e){} });
      fn(map, u);
    }).catch(function(){ fn(null, u); });
  }

  /* ---------- 시작 ---------- */
  function load(src, cb){ var el=document.createElement("script"); el.src=src; el.onload=function(){ cb(true); }; el.onerror=function(){ cb(false); }; document.head.appendChild(el); }
  var base="https://www.gstatic.com/firebasejs/"+VER+"/";
  load(base+"firebase-app-compat.js", function(ok){ if(!ok) return;
    load(base+"firebase-auth-compat.js", function(ok){ if(!ok) return;
      load(base+"firebase-firestore-compat.js", function(ok){ if(!ok) return;
        firebase.initializeApp(CFG);
        auth=firebase.auth(); db=firebase.firestore();
        auth.getRedirectResult().catch(function(){});
        buildUI();
        auth.onAuthStateChanged(function(u){
          SDT.user=u; renderUI();
          if(SDT.page) syncPage();
          if(SDT.home) syncHome();
        });
      });
    });
  });
})();
