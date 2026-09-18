/* 관리자 페이지 "대화 기록" (2026-09-18, 펫 프로그램 1.4.7)
   펫 친구끼리 나눈 1:1 대화(pet3Chats/{a_b}/messages)와 한 사람의 전체 채팅(pet3Board/{uid}/messages)을 관리자만 본다.
   보낸 사람이 지운 메시지도 "삭제됨" 표시와 함께 보인다 (서버에는 그대로 남는다. firestore.rules 의 p3Admin).
   읽기를 줄이려고: 사람 목록(pet3Owners)은 누를 때 한 번, 사람을 고르면 그 사람의 친구 목록으로 방을 찾고, 방을 열면 50개씩.
   색인이 따로 필요 없게 한 방 안에서 ts 하나로만 정렬하고 거른다 (날짜 범위). 글자 찾기는 불러온 것 안에서. */
(function () {
  'use strict';
  var PAGE = 50, MAX_ALL = 40;   // "모두 불러오기"는 50개씩 40번(2000개)까지
  var A = window.SDTAccess;
  var host = document.getElementById('chatLog');
  if (!host || !A) return;
  var S = { admin: false, owners: {}, ownerList: [], user: '', rooms: [], room: null, docs: [], last: null, done: false, busy: false };
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function ms(t) { return !t ? 0 : t.toMillis ? t.toMillis() : +t; }
  function two(n) { return ('0' + n).slice(-2); }
  function when(t) { var v = ms(t); if (!v) return '-'; var d = new Date(v); return d.getFullYear() + '-' + two(d.getMonth() + 1) + '-' + two(d.getDate()) + ' ' + two(d.getHours()) + ':' + two(d.getMinutes()) + ':' + two(d.getSeconds()); }
  function db() { return A.db ? A.db() : null; }
  function q(sel) { return host.querySelector(sel); }
  function say(t, ok) { var m = q('#clMsg'); m.textContent = t || ''; m.className = 'msg' + (ok === true ? ' ok' : ok === false ? ' no' : ''); }
  function fail(e) { say('안 됐어요. ' + (e && e.code === 'permission-denied' ? '권한이 없어요 (관리자 계정인지, firestore.rules 를 게시했는지 확인해 주세요).' : (e && e.message) || ''), false); }
  function who(uid) { var o = S.owners[uid]; return o ? o.pet + (o.who ? ' (' + o.who + ')' : '') : uid.slice(0, 8) + '...'; }
  function stampOf(d) { return window.firebase && firebase.firestore && firebase.firestore.Timestamp ? firebase.firestore.Timestamp.fromDate(d) : d; }

  host.innerHTML = '<h2>대화 기록</h2>'
    + '<p>펫 친구끼리 나눈 1:1 대화와 전체 채팅이에요. 보낸 사람이 지운 메시지도 "삭제됨"으로 보여요. 안전과 운영(괴롭힘, 신고 확인)에만 써 주세요.</p>'
    + '<div class="row"><button type="button" id="clLoad">사람 목록 불러오기</button>'
    + '<label>사람<select id="clUser"><option value="">먼저 불러오세요</option></select></label>'
    + '<label>시작일<input type="date" id="clFrom"></label><label>끝일<input type="date" id="clTo"></label>'
    + '<label>글자로 찾기 (불러온 것 안에서)<input id="clQ" autocomplete="off"></label></div>'
    + '<p class="msg" id="clMsg"></p><div class="tbl" id="clRooms"></div>'
    + '<div id="clView" hidden><h2 id="clTitle" style="font-size:16px;margin-top:14px"></h2>'
    + '<div class="row"><button type="button" class="line" id="clMore">50개 더</button><button type="button" class="line" id="clAll">이 방 모두 불러오기</button>'
    + '<button type="button" class="line" id="clCsv">CSV 받기</button><button type="button" class="line" id="clJson">JSON 받기</button></div>'
    + '<div class="tbl" id="clMsgs"></div></div>';

  function loadOwners() {
    if (!S.admin || !db()) return Promise.resolve(0);
    say('읽고 있어요.');
    return db().collection('pet3Owners').get().then(function (r) {
      S.owners = {}; S.ownerList = [];
      r.docs.forEach(function (d) { var v = d.data() || {}; S.owners[d.id] = { pet: String(v.pet || ''), who: String(v.who || ''), key: String(v.name || '') }; S.ownerList.push(d.id); });
      S.ownerList.sort(function (a, b) { return S.owners[a].pet.localeCompare(S.owners[b].pet, 'ko'); });
      q('#clUser').innerHTML = '<option value="">사람을 고르세요 (' + S.ownerList.length + '명)</option>' + S.ownerList.map(function (u) { return '<option value="' + esc(u) + '">' + esc(who(u)) + '</option>'; }).join('');
      say('펫 이름이 있는 사람 ' + S.ownerList.length + '명을 불러왔어요.', true);
      return S.ownerList.length;
    }).catch(function (e) { fail(e); return 0; });
  }
  // 고른 사람의 방: 친구 목록에 있는 사람과의 1:1 방, 그 사람의 전체 채팅
  function pickUser(uid) {
    S.user = uid; S.rooms = []; closeRoom();
    if (!uid) { q('#clRooms').innerHTML = ''; return Promise.resolve([]); }
    say('방을 찾고 있어요.');
    return db().collection('pet3Friends').doc(uid).collection('list').get().then(function (r) {
      var rooms = [{ kind: 'board', id: 'board:' + uid, owner: uid, title: who(uid) + ' 의 전체 채팅' }];
      r.docs.forEach(function (d) {
        if (d.id === uid) return;
        var pair = uid < d.id ? uid + '_' + d.id : d.id + '_' + uid;
        rooms.push({ kind: 'dm', id: pair, pair: pair, a: uid, b: d.id, title: who(uid) + ' 과(와) ' + (S.owners[d.id] ? who(d.id) : (String((d.data() || {}).pet || '') || d.id.slice(0, 8) + '...')) });
      });
      S.rooms = rooms;
      q('#clRooms').innerHTML = '<table><tr><th>방</th><th></th></tr>' + rooms.map(function (x) { return '<tr class="pick" data-room="' + esc(x.id) + '"><td>' + esc(x.title) + '</td><td>' + (x.kind === 'board' ? '<span class="tag">전체 채팅</span>' : '<span class="tag">1:1</span>') + '</td></tr>'; }).join('') + '</table>';
      say('방 ' + rooms.length + '개. 누르면 최근 대화부터 50개씩 보여요.', true);
      return rooms;
    }).catch(function (e) { fail(e); return []; });
  }
  function coll(room) { return room.kind === 'board' ? db().collection('pet3Board').doc(room.owner).collection('messages') : db().collection('pet3Chats').doc(room.pair).collection('messages'); }
  function query(room) {
    var qq = coll(room), f = q('#clFrom').value, t = q('#clTo').value;
    if (f) qq = qq.where('ts', '>=', stampOf(new Date(f + 'T00:00:00')));
    if (t) qq = qq.where('ts', '<', stampOf(new Date(new Date(t + 'T00:00:00').getTime() + 86400000)));
    qq = qq.orderBy('ts', 'desc');
    if (S.last) qq = qq.startAfter(S.last);
    return qq.limit(PAGE);
  }
  function openRoom(id) {
    var room = S.rooms.filter(function (x) { return x.id === id; })[0]; if (!room) return Promise.resolve(0);
    S.room = room; S.docs = []; S.last = null; S.done = false;
    q('#clView').hidden = false; q('#clTitle').textContent = room.title;
    return more();
  }
  function more() {
    if (!S.room || S.done || S.busy) return Promise.resolve(0);
    S.busy = true; say('읽고 있어요.');
    return query(S.room).get().then(function (r) {
      r.docs.forEach(function (d) { var v = d.data() || {}; S.docs.push({ id: d.id, ref: d.ref, from: String(v.from || ''), text: String(v.text || ''), ts: ms(v.ts), deleted: v.deleted === true, deletedAt: ms(v.deletedAt), restoredAt: ms(v.restoredAt) }); });
      if (r.docs.length) S.last = r.docs[r.docs.length - 1];
      if (r.docs.length < PAGE) S.done = true;
      S.busy = false; render();
      say(S.docs.length + '개 불러왔어요' + (S.done ? ' (끝)' : '') + '.', true);
      return r.docs.length;
    }).catch(function (e) { S.busy = false; fail(e); return 0; });
  }
  // 삭제 취소: deleted, deletedAt 을 없애고 누가 언제 되살렸는지 적는다 (규칙 p3AdminMark). 친구 앱은 지운 메시지가 있는 방을 다시 확인할 때(5분 안) 원래대로 보인다
  function restore(id) {
    var m = S.docs.filter(function (x) { return x.id === id; })[0]; if (!m || !m.deleted || !S.admin) return Promise.resolve(false);
    var FV = firebase.firestore.FieldValue, uid = (window.SDT && SDT.user && SDT.user.uid) || '';
    return m.ref.update({ deleted: FV.delete(), deletedAt: FV.delete(), restoredBy: uid, restoredAt: FV.serverTimestamp() }).then(function () {
      m.deleted = false; m.restoredAt = Date.now(); render(); say('삭제를 취소했어요. 친구 화면에도 다시 보여요.', true); return true;
    }).catch(function (e) { fail(e); return false; });
  }
  function loadAll() {
    var n = 0;
    function step() { if (S.done || n++ >= MAX_ALL) return Promise.resolve(S.docs.length); return more().then(step); }
    return step();
  }
  function closeRoom() { S.room = null; S.docs = []; S.last = null; S.done = false; var v = q('#clView'); if (v) v.hidden = true; }
  function shown() {
    var w = q('#clQ').value.trim().toLowerCase();
    return S.docs.filter(function (m) { return !w || m.text.toLowerCase().indexOf(w) >= 0 || who(m.from).toLowerCase().indexOf(w) >= 0; });
  }
  function render() {
    var list = shown();
    q('#clMore').disabled = S.done; q('#clAll').disabled = S.done;
    q('#clMsgs').innerHTML = list.length ? '<table><tr><th>시간</th><th>보낸 사람</th><th>글</th><th>상태</th></tr>' + list.map(function (m) {
      return '<tr' + (m.deleted ? ' class="cl-del"' : '') + '><td style="white-space:nowrap">' + esc(when(m.ts)) + '</td><td>' + esc(who(m.from)) + '</td><td>' + esc(m.text) + '</td><td>'
        + (m.deleted ? '<span class="tag off">삭제됨</span> <small>' + esc(when(m.deletedAt)) + '</small> <button type="button" class="line" data-restore="' + esc(m.id) + '">삭제 취소</button>' : m.restoredAt ? '<span class="tag on">삭제 취소함</span> <small>' + esc(when(m.restoredAt)) + '</small>' : '') + '</td></tr>';
    }).join('') + '</table>' : '<p class="msg">메시지가 없어요.</p>';
  }
  function rowsOut() { return shown().map(function (m) { return { time: new Date(m.ts).toISOString(), from: m.from, sender: who(m.from), text: m.text, deleted: m.deleted, deletedAt: m.deletedAt ? new Date(m.deletedAt).toISOString() : '', restoredAt: m.restoredAt ? new Date(m.restoredAt).toISOString() : '', id: m.id, room: S.room ? S.room.id : '' }; }); }
  function csv() {
    var head = ['time', 'room', 'from', 'sender', 'text', 'deleted', 'deletedAt', 'restoredAt', 'id'];
    var cell = function (v) { v = String(v == null ? '' : v); return /[",\r\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
    return '﻿' + [head.join(',')].concat(rowsOut().map(function (r) { return head.map(function (k) { return cell(r[k]); }).join(','); })).join('\r\n');
  }
  function download(name, text, type) {
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: type })); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  function fileName(ext) { return 'tsg-chat-' + (S.room ? S.room.id.replace(/[^A-Za-z0-9_-]/g, '_') : 'room') + '-' + new Date().toISOString().slice(0, 10) + '.' + ext; }

  q('#clLoad').addEventListener('click', loadOwners);
  q('#clUser').addEventListener('change', function (e) { pickUser(e.target.value); });
  q('#clRooms').addEventListener('click', function (e) { var r = e.target.closest('[data-room]'); if (r) openRoom(r.getAttribute('data-room')); });
  q('#clMore').addEventListener('click', more);
  q('#clMsgs').addEventListener('click', function (e) { var b = e.target.closest('[data-restore]'); if (b) { b.disabled = true; restore(b.getAttribute('data-restore')); } });
  q('#clAll').addEventListener('click', loadAll);
  q('#clQ').addEventListener('input', render);
  ['#clFrom', '#clTo'].forEach(function (s) { q(s).addEventListener('change', function () { if (S.room) openRoom(S.room.id); }); });
  q('#clCsv').addEventListener('click', function () { download(fileName('csv'), csv(), 'text/csv;charset=utf-8'); });
  q('#clJson').addEventListener('click', function () { download(fileName('json'), JSON.stringify(rowsOut(), null, 2), 'application/json'); });
  A.onChange(function (st) {
    S.admin = !!(st && st.user && st.admin);
    host.hidden = !S.admin;
    if (!S.admin) { S.owners = {}; S.ownerList = []; S.rooms = []; closeRoom(); q('#clRooms').innerHTML = ''; }
  });
  // 시험용 (펫 프로그램 smoke 가 가짜 Firestore 로 부른다)
  window.SDTChatLog = { restore: restore, loadOwners: loadOwners, pickUser: pickUser, openRoom: openRoom, more: more, loadAll: loadAll, csv: csv, rows: rowsOut, state: function () { return { admin: S.admin, owners: S.ownerList.length, rooms: S.rooms.map(function (x) { return x.id; }), docs: S.docs.length, done: S.done }; } };
})();
