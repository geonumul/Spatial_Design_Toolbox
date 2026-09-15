# 코드 작성 가이드라인 (근대건축 문제은행 HTML)

이 파일의 코드를 고치거나 기능을 붙일 때 지키는 규칙. 작업가이드 md가 "무엇을" 넣을지라면, 이 문서는 "어떻게 짤지"다.

## 1. 큰 원칙

1. 파일 하나, 의존성 없음. 외부 JS 라이브러리, 빌드 도구, 모듈 시스템(import/export) 금지. 폰트 CDN 하나만 예외. `file://`로 열어도 돌아가야 한다.
2. 오래된 브라우저까지 신경 쓰지 않아도 되지만 문법은 ES5로 맞춘다(`var`, `function`, `for` 루프). 이유: 기존 코드가 전부 ES5라 스타일이 섞이면 읽기 힘들고, 사용자 폰 브라우저가 뭔지 모른다. 화살표 함수, `const`, 템플릿 리터럴, 옵셔널 체이닝은 쓰지 않는다.
3. 데이터와 코드를 분리한다. 문항, 연표, 범위는 배열/객체 상수(`BANK`, `TIMELINE`, `PARTS` 등)에만 두고, 렌더 함수는 그 데이터를 읽기만 한다. 렌더 함수 안에 사실(연도, 이름)을 하드코딩하지 않는다.
4. 사용자 기록(localStorage)을 깨뜨리는 변경은 금지. 저장 키 `archhist_v2`, 문항 `id` 규칙(`ensureIds`), `store` 구조(`wrong`, `seen`, `extra`)는 유지한다. 구조를 바꿔야 하면 로드 시 마이그레이션 코드를 넣고 옛 키를 읽어 변환한다. 삭제는 없다.
5. 화면 문구에 가운뎃점(·)과 dash(—, –)를 쓰지 않는다. 코드 주석에도 쓰지 않는다(검증 스크립트가 잡는다). 예외는 `norm()` 정규식 한 줄.

## 2. 파일 안 배치 순서

`<style>` → 마크업(탭 순서: quiz, wrong, tips, note, time) → `<script>` 하나. 스크립트 안 순서:

```
1  주석: 데이터 추가 가이드
2  var PARTS, var BANK
3  [문제 추가 지점] 마커 + concat 블록들
4  유틸 ($, $$, esc, shuffle, hash, norm, TYPE_NAME, ESSAY_PASS, partName, toast)
5  저장소 (KEY, store, save)
6  문제 풀 준비 (allBank, ensureIds, byId, registerParts)
7  상태 st
8  탭, 목차 스크롤, 헤더 스크롤
9  설정 UI (buildScopeChips, 칩 이벤트, inScope, pool, updateSetupStat)
10 덱 (startDeck, record, next, head, nextBtn)
11 렌더 4종 (renderMcq, renderOx, renderShort, renderEssay)
12 키보드 (keyHandler)
13 결과 (renderResult)
14 오답노트 (wf, wrongItems, renderWrong, 버튼들)
15 추가 문제 JSON
16 연표 (TIMELINE, FLOW, KEYYEARS, CATS, ccls, 흐름도 IIFE, renderTimeline, 칩 IIFE)
17 정리노트 보기 모드, 목차 모드
```
새 기능은 해당 번호 자리에 넣는다. 맨 끝에 아무거나 붙이지 않는다.

## 3. 이름 규칙

- 함수: 동사+명사 camelCase. `renderX`(화면 그리기), `buildX`(DOM 생성), `updateX`(기존 DOM 갱신), `showX`(표시 전환), `startX`.
- 상태 객체: 문제풀기 `st`, 오답노트 필터 `wf`, 연표 필터 `tf`, 목차 모드 `tocMode`. 전역 상태는 이 넷과 `store`뿐. 새 전역을 만들면 이 목록에 추가하고 주석을 단다.
- DOM id: camelCase(`setupStat`, `heroCount`). data 속성: `data-type`, `data-scope`, `data-n`, `data-mode`, `data-wtype`, `data-tcat`, `data-nmode`, `data-tocmode`, `data-go`, `data-act`, `data-oi`, `data-v`. 새 칩 그룹은 `data-xxx` 하나로 묶고 `$$("[data-xxx]")`로 다룬다.
- CSS 클래스: 소문자, 짧게(`.card`, `.chip`, `.tev`). 상태는 `.on`, `.show`, `.hide`, `.checked`, `.correct`, `.wrong`, `.resolved`. 유형은 `.mcq .short .ox .essay`. 연표 분류는 `.c-분류명`(공백 제거).

## 4. DOM과 렌더

- 렌더는 문자열 조립 후 `innerHTML` 한 번. 조각마다 `appendChild` 하지 않는다(기존 방식과 통일, 속도).
- 사용자 데이터(문항 텍스트, 답안, 해설)는 반드시 `esc()`로 감싼다. 내가 쓴 고정 마크업만 raw로 넣는다. 예외: `.easy`, 팁 카드, 노트 본문은 작성자가 쓴 HTML이라 raw.
- 이벤트는 `innerHTML` 직후에 `$$(...).forEach(addEventListener)`로 붙인다. 인라인 `onclick` 금지.
- 렌더 함수는 `#stage`(문제), `#wlist`(오답), `#tl`(연표) 같은 자기 영역만 건드린다. 다른 영역을 바꾸려면 그 영역의 `updateX`를 호출한다.
- 한 문항 안의 지역 상태(`done`, `verdict`, `mine`)는 렌더 함수의 클로저 변수로 둔다. 전역에 올리지 않는다.
- `keyHandler(fn)`로 키보드 핸들러를 교체한다. 렌더 함수 끝에서 반드시 호출(없으면 `keyHandler(null)`), 아니면 이전 문항의 핸들러가 남는다.

## 5. 새 문제 유형을 추가할 때

1. `TYPE_NAME`에 이름 추가.
2. `.tag.새유형` CSS 색 추가(파스텔).
3. `renderNewType(q)` 작성. 뼈대:
   ```js
   function renderX(q){
     var h='<div class="card">'+head(q)+'<div class="qtext">'+esc(q.q)+'</div>';
     h+= /* 입력 UI */;
     h+='<div class="expl" id="expl"></div><div class="btnrow" id="after" style="display:none">'+nextBtn("nx")+'</div></div>';
     $("#stage").innerHTML=h;
     var done=false;
     function pick(...){ if(done) return; done=true; /* 채점 */ record(q, ok, mine); $("#after").style.display="flex"; $("#nx").focus(); }
     /* 이벤트 */ $("#nx").addEventListener("click", next);
     keyHandler(function(k){ if(done && k==="Enter") next(); });
   }
   ```
4. `next()`의 분기에 추가.
5. `renderWrong()`의 정답 표시 분기(`ans` 계산)와 `renderResult()`는 유형 무관이지만 확인.
6. 설정 카드 유형 칩 `data-type` 추가, `updateSetupStat`의 카운트 객체 `c`에 키 추가.
7. `#extraAdd`의 형식 검사에 조건 추가.
8. 작업가이드 md 5-2, 8-3에 형식과 작성 요령 추가.

## 6. 새 탭을 추가할 때

1. `<nav>`에 `<button class="tab" data-tab="아이디">이름</button>`.
2. `<main>` 안에 `<section id="아이디" class="panel">`. 본문은 `<div class="wrap">`로 감싼다.
3. 탭 전환 시 초기화가 필요하면 `showTab()`의 `if(id==="wrong") renderWrong();` 옆에 분기 추가.
4. 탭 순서는 사용 빈도순(문제풀기, 오답노트, 정리노트, 암기 팁, 연표). 새 탭은 맨 뒤.

## 7. CSS

- 색은 `:root` 변수만. 새 hex를 직접 쓰는 곳은 `.tag` 유형색, `.c-분류` 연표색, 채점색뿐이다.
- 반응형은 `@media (max-width:720px)` 한 블록에 몰아 넣는다. 새 컴포넌트의 모바일 규칙도 그 블록에 추가.
- 선택자 특이도 주의: `#tl .era`처럼 id로 시작하는 세로 연표 규칙과 `table.tl`은 이름이 비슷하니 헷갈리지 말 것. 새 컴포넌트 클래스가 기존 것과 겹치지 않는지 `grep`으로 확인(`.era`, `.tl`, `.flow`, `.story`는 이미 쓰임).
- `prefers-reduced-motion` 블록이 있으니 전환 효과는 `transition` 속성만 쓰고 애니메이션 키프레임은 넣지 않는다.
- 포커스 링(`:focus-visible`)을 없애지 않는다.

## 8. 채점과 기록

- 기록은 오직 `record(q, ok, mine, missing)` 한 곳에서. 렌더 함수에서 `store`를 직접 만지지 않는다. 예외는 주관식 "맞은 걸로/틀린 걸로" 되돌리기(`override`)인데, 되돌린 뒤 반드시 `record`를 다시 호출한다.
- `save()`는 `record` 안과 오답노트 조작 버튼에서만 호출.
- 세션 통계는 `st.session`에만. 세트가 끝나면 `renderResult()`가 읽는다.
- 논술 통과 기준 `ESSAY_PASS`는 상수로만 바꾼다. 화면 문구("70% 이상이면 통과")도 같이 바꾼다.

## 9. 성능

- 파일이 4MB 이상이고 이미지가 92장이라 `#note`는 첫 로드에 한 번만 파싱된다. 노트 DOM을 JS로 재생성하지 않는다(`innerHTML` 교체 금지).
- 렌더 함수에서 `allBank()`를 루프 안에서 반복 호출하지 않는다. 한 번 받아 변수에 둔다.
- `renderTimeline`, `renderWrong`처럼 목록 전체를 다시 그리는 함수는 필터 변경 때만 호출한다.

## 10. 테스트

- 브라우저가 없는 환경이므로 jsdom으로 검증한다(작업가이드 11-4 스크립트). 새 기능을 넣으면 그 스크립트에 해당 버튼 클릭을 한 줄 추가한다.
- `node --check`는 문법만 본다. 런타임 에러는 jsdom의 `errors` 배열로 잡는다.
- 이미지가 4MB라 jsdom 로드 전에 `src="data:image…"`를 빈 문자열로 치환한다.
- `verify.py`로 문항 무결성과 강의노트 대조를 돌린다.

## 11. 하지 말 것 목록

- `alert()` 대신 `toast()`. `confirm()`은 삭제성 동작에만.
- `document.write`, `eval`, `new Function` 금지.
- `localStorage`에 문항 본문을 저장하지 않는다(`extra`는 사용자가 넣은 것만).
- 문항 배열을 정렬하거나 순서에 의존하지 않는다. 항상 `id`로 찾는다.
- 노트 원문 `.orig` 안의 텍스트를 JS로 가공하지 않는다.
- 새 파일로 쪼개지 않는다(css, js 분리 금지). 사용자는 파일 하나를 받아서 연다.
