/* ---------- 회독 공부, 용어 도감 (tools/study/study.js, build_study.py 가 넣음) ----------
   데이터: STUDY(단원, 레슨, 회독별 블록), TERMS(용어 사전). 형식은 docs/STUDY_FORMAT.md
   기록: store.study = {xp, best, read, done:{"레슨id:회독":ts}, terms:{용어키:[본 횟수, 누른 횟수]}}
   전역: pl(재생 중인 레슨), dexF(도감 필터), gm(스피드 게임). 나머지는 함수. */
var READ_NAME={1:"큰그림",2:"조금 자세히",3:"자세히 + 시험"};
var LEVELS=[0,50,150,300,500,800,1200,1700,2300,3000,4000];
var LEVEL_NAME=["새싹","떡잎","줄기","가지","꽃봉오리","꽃","열매","나무","숲","지능형홈 박사","지능형홈 마스터"];
var TERM_BY={}; TERMS.forEach(function(t){ TERM_BY[t.key]=t; });
var pl=null, dexF={u:"all", exam:false, q:""}, gm=null;

function sd(){
  if(!store.study) store.study={};
  var s=store.study; s.xp=s.xp||0; s.best=s.best||0; s.read=s.read||1; s.done=s.done||{}; s.terms=s.terms||{};
  return s;
}
function attr(s){ return esc(s).replace(/"/g,"&quot;"); }
function unitName(p){ return p==="0" ? "시험 대비" : p+"단원"; }
function fmtTerm(k){ var t=TERM_BY[k]; return t ? '<button class="term'+(t.exam?' ex':'')+'" data-term="'+attr(k)+'">'+esc(k)+'</button>' : esc(k); }
/* 본문 표시: **굵게**, [[용어]] 칩 */
function fmt(s){
  return String(s||"").split(/(\[\[.+?\]\])/).map(function(part){
    var m=part.match(/^\[\[(.+?)\]\]$/); if(m) return fmtTerm(m[1]);
    return esc(part).replace(/\*\*(.+?)\*\*/g,"<b>$1</b>");
  }).join("");
}
/* 버튼 안처럼 칩을 못 넣는 곳: 용어는 굵은 글씨로 */
function fmtPlain(s){
  return esc(String(s||"")).replace(/\[\[(.+?)\]\]/g,'<b class="tword">$1</b>').replace(/\*\*(.+?)\*\*/g,"<b>$1</b>");
}
function lessonList(){
  var out=[];
  STUDY.slice().sort(function(a,b){ return (a.part==="0"?999:+a.part)-(b.part==="0"?999:+b.part); })
    .forEach(function(u){ u.lessons.forEach(function(l){ out.push({u:u, l:l}); }); });
  return out;
}

/* ---------- XP, 레벨 ---------- */
function levelOf(x){ var i=0; while(i<LEVELS.length-1 && x>=LEVELS[i+1]) i++; return i; }
function addXp(n){
  var s=sd(), before=levelOf(s.xp); s.xp+=n; save(); updateLevel();
  var after=levelOf(s.xp);
  if(after>before) toast("레벨 업! Lv."+(after+1)+" "+LEVEL_NAME[after]);
  var p=$("#xpPop"); p.textContent="+"+n+" XP"; p.classList.add("on"); clearTimeout(p._t); p._t=setTimeout(function(){ p.classList.remove("on"); },900);
}
function updateLevel(){
  var s=sd(), i=levelOf(s.xp), lo=LEVELS[i], hi=LEVELS[i+1];
  $("#lvName").textContent="Lv."+(i+1)+" "+LEVEL_NAME[i];
  $("#lvXp").textContent=s.xp+" XP";
  $("#lvFill").style.width=(hi ? Math.round((s.xp-lo)/(hi-lo)*100) : 100)+"%";
  $("#lvSub").textContent=hi ? "다음 레벨까지 "+(hi-s.xp)+" XP. 블록을 누르고, 퀴즈를 맞히고, 회독을 끝내면 올라가요." : "최고 레벨!";
}

/* ---------- 레슨 목록 ---------- */
function setRead(r){
  sd().read=r; save();
  $$(".rchip[data-read]").forEach(function(b){ b.classList.toggle("on", +b.dataset.read===r); });
  closeLesson();
}
function renderLessonList(){
  var s=sd(), r=s.read, h="", next=null, total=0, done=0, cur=null, grp="";
  lessonList().forEach(function(x){
    var l=x.l, key=l.id+":"+r;
    total+=3; [1,2,3].forEach(function(k){ if(s.done[l.id+":"+k]) done++; });
    if(!next && !s.done[key]) next=x;
    if(x.u!==cur){
      if(cur) h+='</div></div>';
      cur=x.u;
      var dn=cur.lessons.filter(function(y){ return s.done[y.id+":"+r]; }).length;
      h+='<div class="ugrp"><div class="uhead"><b>'+esc(unitName(cur.part))+'</b><span>'+esc(cur.title)+'</span><span class="pn">'+r+'회독 '+dn+' / '+cur.lessons.length+'</span></div><div class="lgrid">';
    }
    var dots=[1,2,3].map(function(k){ return '<i class="'+(s.done[l.id+":"+k]?'on':'')+(k===r?' cur':'')+'">'+k+'</i>'; }).join("");
    h+='<button class="lcard'+(s.done[key]?' done':'')+'" data-lesson="'+attr(l.id)+'"><span class="le">'+esc(l.emoji||"📘")+'</span><span class="lt">'+esc(l.title)+'</span><span class="ld">'+dots+'</span></button>';
  });
  if(cur) h+='</div></div>';
  var top;
  if(!total) top='<div class="card empty"><b>아직 회독 자료가 없습니다</b>강의자료가 들어오면 이 자리에 레슨이 생깁니다.</div>';
  else if(next) top='<div class="card cont"><div><div class="muted" style="font-size:13px">이어서 하기</div><b>'+esc(next.l.emoji||"")+' '+esc(next.l.title)+'</b> <span class="rb r'+r+'">'+r+'회독 '+READ_NAME[r]+'</span></div><button class="btn primary" data-lesson="'+attr(next.l.id)+'">시작 ▶</button></div>';
  else top='<div class="card cont"><div><b>'+r+'회독을 모두 끝냈어요!</b><div class="muted">'+(r<3?(r+1)+'회독으로 한 번 더 읽으면 훨씬 오래 기억돼요.':'대단해요. 문제풀기로 실력을 확인해 보세요.')+'</div></div>'
    +(r<3?'<button class="btn primary" data-setread="'+(r+1)+'">'+(r+1)+'회독 시작</button>':'<button class="btn primary" data-gotab="quiz">문제풀기</button>')+'</div>';
  $("#lessonList").innerHTML=top+(total?'<div class="prog3">전체 회독 진도 '+done+' / '+total+' (레슨 수 x 3회독)</div>':'')+h;
  $$("#lessonList [data-lesson]").forEach(function(b){ b.addEventListener("click", function(){ openLesson(b.dataset.lesson, sd().read); }); });
  $$("#lessonList [data-setread]").forEach(function(b){ b.addEventListener("click", function(){ setRead(+b.dataset.setread); }); });
  $$("#lessonList [data-gotab]").forEach(function(b){ b.addEventListener("click", function(){ showTab(b.dataset.gotab); }); });
}

/* ---------- 레슨 재생 ---------- */
function openLesson(id, read){
  var list=lessonList(), idx=-1;
  for(var i=0;i<list.length;i++) if(list[i].l.id===id) idx=i;
  if(idx<0) return;
  var x=list[idx];
  pl={u:x.u, l:x.l, idx:idx, read:read, pos:-1, blocks:x.l["r"+read]||[], terms:{}};
  $("#lessonList").hidden=true;
  var v=$("#lessonView"); v.hidden=false;
  v.innerHTML='<div class="pbar"><button class="btn sm" id="plBack">← 목록</button><div class="ptitle"><span class="rb r'+read+'">'+esc(unitName(x.u.part))+', '+read+'회독 '+READ_NAME[read]+'</span><b>'+esc(x.l.emoji||"")+' '+esc(x.l.title)+'</b></div><button class="btn sm" id="plAll">한 번에 보기</button></div>'
    +'<div class="pprog"><i id="plFill"></i></div><div id="plBlocks"></div><div class="pnext" id="plNextBox"><button class="pill solid" id="plNext">시작하기 ▶</button><div class="muted" style="font-size:12.5px;margin-top:8px">Enter 또는 스페이스로도 넘길 수 있어요</div></div>';
  $("#plBack").addEventListener("click", closeLesson);
  $("#plAll").addEventListener("click", function(){ while(pl && pl.pos<pl.blocks.length-1) step(true); updatePlayer(); });
  $("#plNext").addEventListener("click", function(){ step(); });
  window.scrollTo(0, 0);
  step();
}
function closeLesson(){
  if(pl) save();
  pl=null; $("#lessonView").hidden=true; $("#lessonView").innerHTML=""; $("#lessonList").hidden=false;
  renderLessonList(); window.scrollTo(0, 0);
}
function updatePlayer(){
  if(!pl) return;
  var n=pl.blocks.length;
  $("#plFill").style.width=(n?Math.round((pl.pos+1)/n*100):100)+"%";
  var b=$("#plNext"); if(b) b.textContent = pl.pos>=n-1 ? "완료하기 ✓" : "계속 ▶";
}
function step(quiet){
  if(!pl) return;
  if(pl.pos>=pl.blocks.length-1){ finishLesson(); return; }
  pl.pos++;
  var el=appendBlock(pl.blocks[pl.pos], pl.pos);
  if(!quiet){ updatePlayer(); if(el && pl.pos>0) el.scrollIntoView({behavior:"smooth", block:"center"}); }
}
function finishLesson(){
  var s=sd(), key=pl.l.id+":"+pl.read, first=!s.done[key], gain=first?20:5;
  s.done[key]=Date.now(); addXp(gain);
  var list=lessonList(), nx=list[pl.idx+1], met=Object.keys(pl.terms);
  var h='<div class="card fin"><div class="emo">'+(pl.read===3?'🏆':'🎉')+'</div><b>'+pl.read+'회독 완료!</b>'
    +'<div class="muted">+'+gain+' XP'+(first?'':', 다시 읽기 보너스')+'</div>'
    +(met.length?'<div style="margin-top:14px;font-weight:700;font-size:14px">이번에 만난 용어 '+met.length+'개. 기억 안 나는 걸 눌러 보세요</div><div class="tchips">'+met.map(fmtTerm).join("")+'</div>':'')
    +'<div class="btnrow center">'
    +(pl.read<3?'<button class="btn primary" id="finUp">바로 '+(pl.read+1)+'회독</button>':'')
    +(nx?'<button class="btn'+(pl.read<3?'':' primary')+'" id="finNext">다음 레슨 ▶</button>':'')
    +'<button class="btn" id="finList">목록으로</button></div></div>';
  $("#plNextBox").innerHTML=h;
  $("#plFill").style.width="100%";
  var cur=pl;
  if($("#finUp")) $("#finUp").addEventListener("click", function(){ openLesson(cur.l.id, cur.read+1); });
  if($("#finNext")) $("#finNext").addEventListener("click", function(){ openLesson(nx.l.id, cur.read); });
  $("#finList").addEventListener("click", closeLesson);
  $("#plNextBox").scrollIntoView({behavior:"smooth", block:"center"});
}
function appendBlock(b, i){
  var box=$("#plBlocks"); if(!box) return null;
  box.insertAdjacentHTML("beforeend", '<div id="blk'+i+'">'+renderBlock(b)+'</div>');
  var el=document.getElementById("blk"+i);
  bindBlock(b, el);
  // 이 레슨에서 처음 본 용어는 본 횟수 +1
  var s=sd();
  JSON.stringify(b).replace(/\[\[(.+?)\]\]/g, function(m, k){
    if(TERM_BY[k] && !pl.terms[k]){ pl.terms[k]=1; var r=s.terms[k]||[0,0]; r[0]++; s.terms[k]=r; }
    return m;
  });
  save();
  return el;
}

/* ---------- 블록 그리기 ---------- */
function renderBlock(b){
  var t=b.t, h="";
  if(t==="say") return '<div class="b say"><span class="bot">🤖</span><div class="bub">'+fmt(b.h)+'</div></div>';
  if(t==="big") return '<div class="b big">'+fmt(b.h)+'</div>';
  if(t==="story") return '<div class="b story">'+(b.items||[]).map(function(x){ return '<div><b>'+fmtPlain(x.k)+'</b><span>'+fmt(x.v)+'</span></div>'; }).join("")+'</div>';
  if(t==="reveal") return '<div class="b quizb"><div class="qlbl">🤔 생각해 보기</div><div class="qq">'+fmt(b.q)+'</div><button class="btn sm primary rv">눌러서 답 보기</button><div class="ans" hidden>'+fmt(b.a)+'</div></div>';
  if(t==="blank"){
    h=String(b.h||"").split(/\{\{(.+?)\}\}/).map(function(p, k){
      return k%2 ? '<button class="blk"><span class="bq">?</span><span class="ba">'+fmtPlain(p)+'</span></button>' : fmt(p);
    }).join("");
    return '<div class="b quizb"><div class="qlbl">✏️ 빈칸 누르기</div><div class="blktext">'+h+'</div><div class="ofb muted">머릿속으로 먼저 답해 보고 빈칸을 누르세요</div></div>';
  }
  if(t==="cards") return '<div class="b cards"><div class="qlbl">🃏 카드 뒤집기</div><div class="cgrid">'+(b.items||[]).map(function(x){
      return '<button class="fcard"><span class="fi"><span class="ff">'+fmtPlain(x.f)+'</span><span class="fb">'+fmtPlain(x.b)+'</span></span></button>'; }).join("")+'</div><div class="fhint">앞면을 보고 뒷면을 떠올린 다음 뒤집어 보세요</div></div>';
  if(t==="table"){
    h='<div class="b tblw">'+(b.title?'<div class="qlbl">'+esc(b.title)+'</div>':'')+'<table class="stbl"><tr>'+(b.cols||[]).map(function(c){ return '<th>'+fmtPlain(c)+'</th>'; }).join("")+'</tr>';
    (b.rows||[]).forEach(function(row){ h+='<tr>'+row.map(function(c, k){ return k===0 ? '<th>'+fmt(c)+'</th>' : '<td'+(b.hide?' class="hid"':'')+'><span>'+fmt(c)+'</span></td>'; }).join("")+'</tr>'; });
    h+='</table>'+(b.hide?'<div class="btnrow"><span class="muted" style="font-size:13.5px">? 칸을 눌러 맞혀 보세요</span><button class="btn sm tall">모두 보기</button></div>':'')+'</div>';
    return h;
  }
  if(t==="steps") return '<div class="b steps2"><div class="qlbl">👣 '+esc(b.title||"순서대로 알아보기")+'</div><ol class="stp">'+(b.items||[]).map(function(x, k){
      return '<li'+(k?' class="hide"':'')+'><b>'+fmtPlain(x.k)+'</b>'+fmt(x.v)+'</li>'; }).join("")+'</ol>'+((b.items||[]).length>1?'<button class="btn sm primary snext">다음 단계 ▶</button>':'')+'</div>';
  if(t==="order"){
    var idx=(b.items||[]).map(function(_, k){ return k; }), tries=0;
    do { shuffle(idx); tries++; } while(tries<6 && idx.length>1 && idx.every(function(v, k){ return v===k; }));
    return '<div class="b quizb"><div class="qlbl">🔢 순서 맞히기</div><div class="qq">'+fmt(b.q)+'</div><div class="oans"></div><div class="opool">'
      +idx.map(function(k){ return '<button class="ochip" data-i="'+k+'">'+fmtPlain(b.items[k])+'</button>'; }).join("")+'</div><div class="ofb muted">첫 번째부터 차례로 누르세요</div></div>';
  }
  if(t==="match"){
    var pairs=b.pairs||[], L=shuffle(pairs.map(function(_, k){ return k; })), R=shuffle(pairs.map(function(_, k){ return k; }));
    return '<div class="b quizb"><div class="qlbl">🧩 짝 맞추기</div><div class="qq">'+fmt(b.q||"짝이 되는 것끼리 이어 보세요")+'</div><div class="mgrid"><div class="mcol">'
      +L.map(function(k){ return '<button class="mitem ml" data-p="'+k+'">'+fmtPlain(pairs[k][0])+'</button>'; }).join("")+'</div><div class="mcol">'
      +R.map(function(k){ return '<button class="mitem mr" data-p="'+k+'">'+fmtPlain(pairs[k][1])+'</button>'; }).join("")+'</div></div><div class="ofb muted">왼쪽을 먼저 누르고, 짝이 되는 오른쪽을 누르세요</div></div>';
  }
  if(t==="pick"){
    var o=shuffle((b.c||[]).map(function(_, k){ return k; }));
    return '<div class="b quizb"><div class="qlbl">🎮 퀴즈</div><div class="qq">'+fmt(b.q)+'</div><div class="schoices">'
      +o.map(function(k, n){ return '<button class="sch" data-oi="'+k+'"><i>'+(n+1)+'</i><span>'+fmtPlain(b.c[k])+'</span></button>'; }).join("")+'</div><div class="sexpl"></div></div>';
  }
  if(t==="ox") return '<div class="b quizb"><div class="qlbl">⭕ O/X</div><div class="qq">'+fmt(b.q)+'</div><div class="soxrow"><button class="sox" data-v="1">O</button><button class="sox" data-v="0">X</button></div><div class="sexpl"></div></div>';
  if(t==="chart"){
    var mx=0; (b.bars||[]).forEach(function(x){ mx=Math.max(mx, +x.v||0); });
    return '<div class="b chart"><div class="qlbl">📊 '+esc(b.title||"비교")+'</div>'+(b.bars||[]).map(function(x){
      return '<div class="cbar"><span>'+fmtPlain(x.k)+'</span><span class="ct"><i data-w="'+(mx?Math.max(2, Math.round((+x.v||0)/mx*100)):0)+'"></i></span><span class="cv">'+esc(x.v)+esc(b.unit||"")+'</span></div>'; }).join("")+'</div>';
  }
  if(t==="svg") return '<div class="b svgb"><div class="sv">'+String(b.svg||"")+'</div>'+(b.cap?'<div class="cap">'+fmt(b.cap)+'</div>':'')
      +(b.spots?'<div class="spotinfo">👆 그림에서 칸을 눌러 보세요</div>':'')+'</div>';
  if(t==="exam") return '<div class="b exam"><div class="qlbl">🎯 기출 포인트'+(b.ref?'<span class="ref">'+esc(b.ref)+'</span>':'')+'</div><div>'+fmt(b.h)+'</div></div>';
  if(t==="tip") return '<div class="b tipb"><div class="qlbl">💡 외우는 꿀팁</div><div>'+fmt(b.h)+'</div></div>';
  if(t==="img") return '<figure class="b" style="margin:0"><img src="'+attr(b.src||"")+'" alt="">'+(b.cap?'<figcaption>'+fmt(b.cap)+'</figcaption>':'')+'</figure>';
  return '';
}

/* ---------- 블록 동작 ---------- */
function bindBlock(b, el){
  var t=b.t;
  function all(sel){ return Array.prototype.slice.call(el.querySelectorAll(sel)); }
  if(t==="reveal"){
    var rv=el.querySelector(".rv");
    rv.addEventListener("click", function(){ el.querySelector(".ans").hidden=false; rv.remove(); addXp(1); });
  }
  if(t==="blank"){
    var blks=all(".blk"), paid=false;
    blks.forEach(function(x){ x.addEventListener("click", function(){
      x.classList.add("open");
      if(!paid && blks.every(function(y){ return y.classList.contains("open"); })){ paid=true; addXp(2); el.querySelector(".ofb").textContent="다 채웠어요! 소리 내어 한 번 읽어 보세요"; }
    }); });
  }
  if(t==="cards"){
    var cs=all(".fcard"), seen=[], paidC=false;
    cs.forEach(function(c, k){ c.addEventListener("click", function(){
      c.classList.toggle("flip"); seen[k]=true;
      if(!paidC && cs.every(function(_, n){ return seen[n]; })){ paidC=true; addXp(2); }
    }); });
  }
  if(t==="table" && b.hide){
    var cells=all("td.hid"), paidT=false;
    function checkT(){ if(!paidT && !el.querySelector("td.hid")){ paidT=true; addXp(2); } }
    cells.forEach(function(c){ c.addEventListener("click", function(){ c.classList.remove("hid"); checkT(); }); });
    el.querySelector(".tall").addEventListener("click", function(){ cells.forEach(function(c){ c.classList.remove("hid"); }); paidT=true; });
  }
  if(t==="steps"){
    var sn=el.querySelector(".snext");
    if(sn) sn.addEventListener("click", function(){
      var h=el.querySelector(".stp li.hide"); if(h) h.classList.remove("hide");
      if(!el.querySelector(".stp li.hide")){ sn.remove(); addXp(2); }
    });
  }
  if(t==="order"){
    var need=0, miss=0, ans=el.querySelector(".oans"), fb=el.querySelector(".ofb");
    all(".opool .ochip").forEach(function(c){ c.addEventListener("click", function(){
      if(+c.dataset.i===need){
        c.disabled=true; ans.insertAdjacentHTML("beforeend", '<span class="ochip in">'+c.innerHTML+'</span>'); need++;
        if(need===b.items.length){ fb.className="ofb good"; fb.textContent=miss?"완성! 틀린 "+miss+"번은 다시 떠올려 봐요":"완벽해요!"; addXp(miss?1:3); }
      } else { miss++; c.classList.add("bad"); setTimeout(function(){ c.classList.remove("bad"); }, 450); }
    }); });
  }
  if(t==="match"){
    var sel=null, got=0, missM=0, fbm=el.querySelector(".ofb");
    all(".ml").forEach(function(x){ x.addEventListener("click", function(){ all(".ml").forEach(function(y){ y.classList.remove("sel"); }); x.classList.add("sel"); sel=x; }); });
    all(".mr").forEach(function(x){ x.addEventListener("click", function(){
      if(!sel){ fbm.textContent="왼쪽부터 골라 주세요"; return; }
      if(sel.dataset.p===x.dataset.p){
        sel.classList.remove("sel"); sel.classList.add("ok"); x.classList.add("ok"); sel.disabled=true; x.disabled=true; sel=null; got++;
        if(got===b.pairs.length){ fbm.className="ofb good"; fbm.textContent=missM?"다 맞췄어요!":"한 번에 다 맞췄어요!"; addXp(missM?1:3); }
      } else { missM++; var a=sel; a.classList.add("bad"); x.classList.add("bad"); setTimeout(function(){ a.classList.remove("bad"); x.classList.remove("bad"); }, 450); }
    }); });
  }
  if(t==="pick" || t==="ox"){
    var done=false, ex=el.querySelector(".sexpl"), btns=all(t==="pick"?".sch":".sox");
    btns.forEach(function(x){ x.addEventListener("click", function(){
      if(done) return; done=true;
      var ok = t==="pick" ? +x.dataset.oi===b.a : (x.dataset.v==="1")===b.a;
      btns.forEach(function(y){
        y.disabled=true;
        var right = t==="pick" ? +y.dataset.oi===b.a : (y.dataset.v==="1")===b.a;
        if(right) y.classList.add("correct"); else if(y===x) y.classList.add("wrong");
      });
      var answer = t==="pick" ? fmtPlain(b.c[b.a]) : (b.a?"O":"X");
      ex.className="sexpl on "+(ok?"good":"bad");
      ex.innerHTML='<b>'+(ok?"정답! ":"아쉬워요. 정답은 "+answer+". ")+'</b>'+fmt(b.e||"");
      if(ok) addXp(3);
    }); });
  }
  if(t==="chart"){
    setTimeout(function(){ all(".ct i").forEach(function(i){ i.style.width=i.dataset.w+"%"; }); }, 60);
  }
  if(t==="svg" && b.spots){
    var info=el.querySelector(".spotinfo"), visited={}, paidS=false, ids=Object.keys(b.spots);
    all("[data-spot]").forEach(function(sp){
      sp.classList.add("spot");
      sp.addEventListener("click", function(){
        var d=b.spots[sp.getAttribute("data-spot")]; if(!d) return;
        all("[data-spot]").forEach(function(o){ o.classList.remove("seen"); }); sp.classList.add("seen");
        info.className="spotinfo on"; info.innerHTML='<b>'+fmt(d.k)+'</b><br>'+fmt(d.v);
        visited[sp.getAttribute("data-spot")]=1;
        if(!paidS && ids.every(function(k){ return visited[k]; })){ paidS=true; addXp(2); }
      });
    });
  }
}

/* ---------- 용어 카드 ---------- */
function openTerm(key){
  var t=TERM_BY[key]; if(!t) return;
  var s=sd(), rec=s.terms[key]||[0,0], first=!rec[1];
  rec[1]++; s.terms[key]=rec;
  if(first) addXp(1); else save();
  var r=pl?pl.read:s.read, sh=$("#tsheet");
  sh.innerHTML='<div class="tsbg" data-close="1"></div><div class="tsbox" role="dialog" aria-modal="true"><div class="tstop"><div><div class="tsname">'+esc(t.term||t.key)+'</div>'+(t.en?'<div class="muted">'+esc(t.en)+'</div>':'')+'</div><button class="btn sm" data-close="1">닫기</button></div>'
    +'<span class="tag">'+esc(unitName(t.unit))+'</span>'+(t.exam?'<span class="tag src">기출 용어</span>':'')
    +[1,2,3].map(function(k){ return t["r"+k] ? '<div class="tsr'+(k===r?' cur':'')+'"><b>'+k+'회독</b><span>'+fmtPlain(t["r"+k])+'</span></div>' : ''; }).join("")
    +'<div class="muted tsc">본 횟수 '+rec[0]+'번, 눌러 본 횟수 '+rec[1]+'번'+(first?'. 도감에 새로 등록했어요!':'')+'</div></div>';
  sh.hidden=false;
  $$("#tsheet [data-close]").forEach(function(x){ x.addEventListener("click", closeTerm); });
  if($("#dex").classList.contains("on") && !gm) renderDex();
}
function closeTerm(){ var sh=$("#tsheet"); sh.hidden=true; sh.innerHTML=""; }

/* ---------- 도감 ---------- */
function dexList(){
  var q=dexF.q.trim().toLowerCase();
  return TERMS.filter(function(t){
    if(dexF.u!=="all" && t.unit!==dexF.u) return false;
    if(dexF.exam && !t.exam) return false;
    if(q && (t.key+" "+(t.term||"")+" "+(t.en||"")).toLowerCase().indexOf(q)<0) return false;
    return true;
  });
}
function renderDex(){
  var s=sd(), got=0, star=0, ex=0;
  TERMS.forEach(function(t){ var r=s.terms[t.key]; if(r && r[1]) got++; if(r && r[0]>=3) star++; if(t.exam) ex++; });
  $("#dexStat").innerHTML='<div><b>'+got+' / '+TERMS.length+'</b><span>도감 등록</span></div><div><b>'+star+'</b><span>★ 세 번 이상 봄</span></div><div><b>'+ex+'</b><span>기출 용어</span></div><div><b>'+s.best+'</b><span>게임 최고 점수</span></div>';
  var units={}; TERMS.forEach(function(t){ units[t.unit]=1; });
  var uk=Object.keys(units).sort(function(a,b){ return (a==="0"?999:+a)-(b==="0"?999:+b); });
  $("#dexUnits").innerHTML='<button class="chip'+(dexF.u==="all"?' on soft':'')+'" data-dexu="all">전체</button>'+uk.map(function(u){ return '<button class="chip'+(dexF.u===u?' on soft':'')+'" data-dexu="'+attr(u)+'">'+esc(unitName(u))+'</button>'; }).join("");
  $$("[data-dexu]").forEach(function(b){ b.addEventListener("click", function(){ dexF.u=b.dataset.dexu; renderDex(); }); });
  var list=dexList();
  $("#dexGrid").innerHTML=list.length ? list.map(function(t){
    var r=s.terms[t.key]||[0,0];
    return '<button class="dcard'+(r[1]?' got':'')+(r[0]>=3?' star':'')+'" data-term="'+attr(t.key)+'"><span class="dn">'+esc(t.key)+'</span>'+(t.en&&t.en!==t.key?'<span class="de">'+esc(t.en)+'</span>':'')+'<span class="dr">'+fmtPlain(t.r1||"")+'</span>'+(t.exam?'<i class="dx">기출</i>':'')+'</button>';
  }).join("") : '<div class="empty" style="grid-column:1/-1"><b>조건에 맞는 용어가 없습니다</b></div>';
}

/* ---------- 용어 스피드 게임 ---------- */
function startGame(){
  var pool=dexList(); if(pool.length<4) pool=TERMS.slice();
  if(pool.length<4){ toast("용어가 4개 이상 있어야 게임을 할 수 있어요"); return; }
  gm={qs:shuffle(pool.slice()).slice(0,10), pool:pool, i:-1, score:0, combo:0, miss:[], t:null};
  nextGame();
}
function nextGame(){
  clearTimeout(gm.t); gm.i++;
  if(gm.i>=gm.qs.length){ endGame(); return; }
  var t=gm.qs[gm.i], hint=[t.r1, t.r2].filter(Boolean), others=shuffle(gm.pool.filter(function(x){ return x.key!==t.key; })).slice(0,3);
  var ch=shuffle([t].concat(others));
  $("#dexGameBox").innerHTML='<div class="card game"><div class="gtop"><span>'+(gm.i+1)+' / '+gm.qs.length+'</span><span>'+(gm.combo>1?'🔥 '+gm.combo+' 콤보':'')+'</span><span>점수 '+gm.score+'</span></div><div class="gtime"><i id="gTime"></i></div>'
    +'<div class="ghint">'+fmtPlain(hint[Math.floor(Math.random()*hint.length)]||t.r3||"").replace(new RegExp(t.key.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),"g"),"○○")+'</div>'
    +'<div class="gch">'+ch.map(function(x){ return '<button data-k="'+attr(x.key)+'">'+esc(x.key)+'</button>'; }).join("")+'</div><button class="btn sm" id="gQuit">그만하기</button></div>';
  var bar=$("#gTime"); bar.style.transition="none"; bar.style.width="100%"; void bar.offsetWidth; bar.style.transition="width 10s linear"; bar.style.width="0%";
  gm.t=setTimeout(function(){ answerGame(null); }, 10000);
  $$("#dexGameBox .gch button").forEach(function(b){ b.addEventListener("click", function(){ answerGame(b.dataset.k); }); });
  $("#gQuit").addEventListener("click", function(){ clearTimeout(gm.t); gm=null; $("#dexGameBox").innerHTML=""; renderDex(); });
}
function answerGame(k){
  if(!gm) return; clearTimeout(gm.t);
  var t=gm.qs[gm.i], ok=k===t.key, s=sd();
  $$("#dexGameBox .gch button").forEach(function(b){ b.disabled=true; if(b.dataset.k===t.key) b.classList.add("ok"); else if(b.dataset.k===k) b.classList.add("bad"); });
  var r=s.terms[t.key]||[0,0]; r[0]++; s.terms[t.key]=r;
  if(ok){ gm.combo++; gm.score+=10+Math.min(gm.combo-1,5)*2; addXp(2); }
  else { gm.combo=0; gm.miss.push(t); save(); }
  var g=gm; setTimeout(function(){ if(gm===g) nextGame(); }, ok?650:1500);
}
function endGame(){
  var s=sd(), best=gm.score>s.best; if(best){ s.best=gm.score; save(); }
  var miss=gm.miss;
  $("#dexGameBox").innerHTML='<div class="card game"><div class="gbig">'+gm.score+'점</div><div class="muted">'+(gm.qs.length-miss.length)+' / '+gm.qs.length+' 정답'+(best?', 최고 기록!':'')+'</div>'
    +(miss.length?'<div style="margin-top:12px;font-weight:700;font-size:14px">틀린 용어는 눌러서 다시 보기</div><div class="fin"><div class="tchips">'+miss.map(function(x){ return fmtTerm(x.key); }).join("")+'</div></div>':'<p>전부 맞혔어요! 🎉</p>')
    +'<div class="btnrow center"><button class="btn primary" id="gAgain">한 판 더</button><button class="btn" id="gClose">닫기</button></div></div>';
  gm=null;
  $("#gAgain").addEventListener("click", startGame);
  $("#gClose").addEventListener("click", function(){ $("#dexGameBox").innerHTML=""; renderDex(); });
  renderDex();
}

/* ---------- 탭, 동기화 연결, 시작 ---------- */
function studyTab(id){
  if(id==="study"){ updateLevel(); if(!pl) renderLessonList(); }
  if(id==="dex") renderDex();
}
function studyRefresh(){
  updateLevel();
  $$(".rchip[data-read]").forEach(function(b){ b.classList.toggle("on", +b.dataset.read===sd().read); });
  if(!pl) renderLessonList();
  if($("#dex").classList.contains("on") && !gm) renderDex();
}
(function(){
  document.body.insertAdjacentHTML("beforeend", '<div id="tsheet" hidden></div><div id="xpPop"></div>');
  $$(".rchip[data-read]").forEach(function(b){ b.addEventListener("click", function(){ setRead(+b.dataset.read); }); });
  $("#dexExam").addEventListener("click", function(){ dexF.exam=!dexF.exam; $("#dexExam").classList.toggle("on", dexF.exam); $("#dexExam").classList.toggle("soft", dexF.exam); renderDex(); });
  $("#dexQ").addEventListener("input", function(){ dexF.q=this.value; renderDex(); });
  $("#dexGame").addEventListener("click", startGame);
  // 용어 칩은 어디서 누르든 용어 카드
  document.addEventListener("click", function(ev){
    var el=ev.target && ev.target.closest ? ev.target.closest("[data-term]") : null;
    if(el){ ev.preventDefault(); openTerm(el.getAttribute("data-term")); }
  });
  document.addEventListener("keydown", function(ev){
    if(ev.key==="Escape" && !$("#tsheet").hidden){ closeTerm(); return; }
    if(!pl || !$("#study").classList.contains("on") || !$("#tsheet").hidden) return;
    var a=document.activeElement;
    if(a && a!==document.body && a.tagName!=="HTML") return;
    if(ev.key==="Enter" || ev.key===" "){ ev.preventDefault(); step(); }
  });
  $$(".rchip[data-read]").forEach(function(b){ b.classList.toggle("on", +b.dataset.read===sd().read); });
  updateLevel(); renderLessonList();
})();
