# 움직이는 개념 그림 (viz)

정리 슬라이드와 회독 레슨에 "움직이는 그림" 프레임을 넣는 공통 틀이에요.
설명 글만 읽어서는 잘 안 그려지는 개념을 한 단계씩 움직여 보여 줘요.
화면을 누를 때마다 그림이 다음 상태로 움직이고, 이전으로 가면 바로 앞 상태로 정확히 돌아가요.

- 외부 라이브러리 없음. SVG 와 `requestAnimationFrame` 만 써요.
- 과목 공통 틀은 `viz.js` 하나, 그림은 과목 묶음 파일(`gnn.js`, `iot.js` ...)에 들어 있어요.
- GNN 사이트(`D:/GRAPH_LECTURE_OJLEE/02_작업/그래프신경망/최종정리/_작업/html/viz/`)에도 `viz.js`, `gnn.js`, 이 문서가 똑같이 들어 있어요. 원본은 이 폴더예요.

## 파일

| 파일 | 하는 일 |
|---|---|
| `engine/viz/viz.js` | 틀. `window.SDTViz` 등록부, 프레임 HTML, 단계 넘기기, 재생 단추, 조절 막대, 스타일(한 번만 넣음) |
| `engine/viz/gnn.js` | 그래프 신경망 그림 10개 |
| `engine/viz/iot.js` | IoT 스마트홈 그림 8개 |
| `engine/viz/eco.js` | 친환경건축(건축환경) 그림 8개 |
| `engine/viz/modern.js` | 근현대 공간디자인 그림 7개 |
| `engine/viz/interior.js` | 실내디자인시공과실무 그림 6개 |
| `engine/app.js` (`renderFrame` 의 `case 'viz'`) | 플레이어와 잇는 곳. GNN 은 `_작업/html/app.js` 에 같은 코드 |
| `tools/build_site.py` (`viz_tags`) | 과목 JSON 에 `"kind": "viz"` 가 있으면 `viz.js` 와 쓰는 묶음만 `index.html` 에 넣어요 |
| `tools/viz_tool.py` | `list` 등록 이름, `place` 자리표대로 슬라이드에 끼우기, `check-page` 페이지 자리표 확인, `sync-gnn` GNN 으로 복사 |
| `tools/build_site.py` (`viz_page`) | `work/<과목>/pages/viz_<페이지>.json` 이 있으면 빌드할 때 그 페이지(정리노트, 답안 팁) 항목 안에 그림을 넣어요 |
| `tools/checkers/slide_check.py`, `lesson_check.py` | `viz` kind 를 알아보고, 슬라이드의 그림 이름이 등록돼 있는지 봐요 |

## JSON 모양 (프레임 하나)

```json
{"kind": "viz", "viz": "iot.packet", "head": "움직여 보기: 집 안 25ms, 클라우드 140ms",
 "caption": "숫자는 손계산 1, 2 의 가정 숫자예요.",
 "params": {"walls": 1},
 "caps": [null, "이 단계 캡션만 바꾸고 싶을 때"],
 "alt": "화면 읽기 프로그램용 한 줄 설명"}
```

| 칸 | 꼭? | 뜻 |
|---|---|---|
| `kind` | 꼭 | `"viz"` |
| `viz` | 꼭 | 등록 이름 `<묶음>.<이름>`. 묶음 이름이 곧 파일 이름이에요 (`iot.packet` 이면 `engine/viz/iot.js`) |
| `head` | 꼭 | 슬라이드 제목 |
| `caption` | 선택 | 조절 단추 아래 작은 글. 가정 숫자라면 여기 적어요 |
| `params` | 선택 | 그림의 처음 조절값 덮어쓰기 (예: `gnn.wl` 의 `{"pair": "c6"}`) |
| `caps` | 선택 | 단계 캡션을 이 슬라이드에서만 바꿀 때. 배열 칸이 `null` 이면 그림 기본 캡션 |
| `alt` | 선택 | SVG 의 `aria-label`. 없으면 `head` |

정리 슬라이드 단원 안이든, 레슨의 `pass1`~`pass4` 목록 안이든 같은 모양으로 넣으면 돼요.
(레슨의 `pass1` 과 `pass4` 는 lesson_check 가 kind 종류를 제한하니, 넣으려면 그 목록에 `viz` 를 더해요.)

## 정리노트 같은 긴 페이지에 넣기 (정리 슬라이드가 없는 과목)

근현대, 시공실무처럼 정리 슬라이드 단원이 없고 `pages/note.html` 이 중심인 과목은 페이지 안에 그림을 끼워요.
`note.html` 원본은 건드리지 않아요(시공실무는 `_src/build_note.py` 가 새로 만들기 때문). 대신 자리표를 둬요.

`work/<과목>/pages/viz_note.json` (답안 팁이면 `viz_tips.json`)

```json
{"places": [
  {"id": "ic-stud-s12", "section": "s12", "where": "afterEasy",
   "frame": {"kind": "viz", "viz": "interior.stud", "head": "움직여 보기: 스터드 벽체 시공 순서",
             "caption": "숫자는 노트 그대로예요.",
             "check": {"q": "벽 두께는?", "choices": ["103mm", "84mm"], "a": 0, "why": "9.5 × 4 + 65 = 103"}}}
]}
```

- `section`: 노트의 `<section id="s12">`. `where`: `start`(h2 제목 바로 뒤), `afterEasy`(쉬운 설명 상자 뒤, 기본), `end`(항목 끝).
- `frame`: 슬라이드 프레임과 같은 모양. `check` 를 주면 그림 아래에 확인 퀴즈가 붙어요.
- 확인: `python tools/viz_tool.py check-page <과목> note` (넣을 자리와 그림 이름, 금지 문자를 봐요).
- 빌드: `python tools/build_site.py <과목> --no-home`. `data/page_note.js` 안에 `<div class="vz-embed" data-frame="...">` 로 들어가요.
- 화면: 엔진이 정리노트(`buildNote`)와 답안 팁 같은 정적 페이지(`pageStatic`)를 그린 뒤 `SDTViz.embedAll(root, {fmt, renderMath})` 를 불러요. 끼운 그림은 자기 `이전`, `다음` 단추로 단계를 넘기고, 재생, 처음부터, 조절 막대는 슬라이드와 같아요.

## 플레이어에서 어떻게 움직이나

- 그림은 상태 0, 1, 2, ... 를 가져요. 상태 수가 곧 플레이어의 단계 수예요 (`steps = 상태 수 - 1`).
- 다음(화면 누르기, 오른쪽 화살표, 스페이스, 밀기): 다음 상태로 부드럽게 움직여요.
- 이전: 바로 앞 상태의 끝 모습을 곧장 그려요. 그래서 앞뒤로 오가도 모습이 똑같아요.
- 캡션은 상태마다 하나씩 `data-s` 요소로 들어가요. 지금 상태 캡션만 보여요. 자동 재생 타이머가 이 글 길이로 기다리는 시간을 정하고, 움직임 시간 1.8초를 더 기다려요.
- 그림 아래 단추: `▶ 재생` (지금 상태부터 끝까지 차례로, 끝이면 처음부터), `멈춤`, `처음부터`. 재생도 플레이어 단계를 함께 넘겨서 캡션과 진행 막대가 맞아요.
- 조절 막대(`range`)나 고르기 단추(`choice`)가 있는 그림은 바꾸는 즉시 다시 그려요. 단추와 막대 위의 누르기, 밀기는 슬라이드를 넘기지 않아요.
- `prefers-reduced-motion: reduce` 이면 움직임 없이 끝 모습으로 바로 가요. 계속 도는 장식 움직임(파도)도 멈춰요.
- 폰(640px 이하)에서는 SVG 가 화면 폭에 맞게 줄고, 글씨를 조금 키워요. 단추는 44px 높이예요.

## 새 그림 만들기

묶음 파일에 이렇게 등록해요. 새 과목이면 `engine/viz/<묶음>.js` 파일을 새로 만들고 `iot.js` 머리 부분을 본떠요.

```js
(function () {
  'use strict';
  const V = window.SDTViz;
  if (!V) return;
  const u = V.u;
  const at = u.at, seg = u.seg, num = u.num;

  V.add('mypack.example', {   // 이름은 '<묶음 파일 이름>.<그림 이름>'
    title: '벽을 지나는 열',          // 개발용 이름
    w: 480, h: 300,                    // viewBox. 폰에서 줄어드니 글씨는 viewBox 기준 15 이상
    dur: 1100,                         // 한 단계 움직임 시간(ms). 함수 (s, p) => ms 도 돼요
    live: false,                       // true 면 ctx.t(초)가 계속 흘러요. 장식에만 쓰고 상태에 쓰지 않아요
    params: { u: 0.3 },                // 조절값 기본
    controls: [                        // 선택
      { key: 'u', type: 'range', label: 'U값', min: 0.1, max: 2, step: 0.1, fmt: v => v + ' W/m²K' },
      // { key: 'mode', type: 'choice', label: '벽', options: [['a', '외단열'], ['b', '내단열']] },
    ],
    capsDependOn: true,                // 캡션 글이 조절값에 따라 바뀌면 true
    states: p => [                     // 배열 또는 (조절값) => 배열. 개수는 조절값과 상관없이 같아야 해요
      { cap: '실내 20°C, 실외 -5°C 예요.' },
      { tag: '전도', cap: '열이 벽 안쪽에서 바깥쪽으로 흘러요. U값 ' + p.u + ' 이에요.' },
      { set: { u: 0.2 }, cap: '단열재를 더하면 U값이 0.2 로 내려가요.' },   // set: 이 상태에서 조절값을 이 값으로
    ],
    build(ctx) {                       // 한 번: 요소를 만들어 ctx.g 에 둬요
      const g = ctx.g = {};
      g.wall = u.el(ctx.svg, 'rect', { x: 200, y: 40, width: 60, height: 200, class: 'vz-box' });
      g.dot = u.el(ctx.svg, 'circle', { r: 8, class: 'vz-dot cr' });
    },
    draw(ctx, s, k) {                  // 상태 s 로 가는 중, 진행 k (0~1). k = 1 이 그 상태의 끝 모습
      const g = ctx.g, p = ctx.p;
      const x = u.lerp(120, 360, at(s, k, 1));      // 상태 1 에서 움직이고, 지나면 끝 위치
      u.set(g.dot, { cx: x, cy: 140 });
      u.op(g.dot, s >= 1 ? 1 : 0);
      g.wall.setAttribute('class', 'vz-box' + (s === 2 ? ' tl' : ''));
    },
  });
})();
```

### 꼭 지킬 규칙

1. `draw(ctx, s, k)` 는 `s`, `k`, `ctx.p` 만 보고 모든 속성을 새로 정해요. 앞에서 바꾼 값에 기대지 않아요. 그래야 이전으로 갔을 때 똑같아요. 한 상태에서만 켜지는 요소도 다른 상태에서 꺼 주는 코드가 있어야 해요.
2. 상태 수는 조절값에 따라 달라지면 안 돼요 (플레이어 단계 수가 먼저 정해져요). 두 가지 흐름을 보여 주려면 상태를 이어 붙여요 (예: `iot.packet` 은 집 안 길 3단계 다음에 클라우드 길 5단계).
3. 색은 직접 쓰지 않고 클래스로 줘요. 다크 모드에서도 맞게 나와요. 꼭 섞은 색이 필요하면 `node.style.fill` 에 넣고 글자색도 같이 정해요 (`gnn.oversmooth` 참고).
4. 캡션은 한국어로 짧게, 숫자를 넣어서. 한 문장 35자 안쪽이 좋아요. em dash, en dash, 가운뎃점은 쓰지 않아요.
5. 강의 자료에 없는 숫자는 `caption` 에 "가정 숫자", "예시" 라고 적어요.
6. 요소를 숨길 때는 `u.op(el, 0)` 을 써요 (투명도와 `visibility` 를 같이 정리해요).

### 도우미 `u` (= `SDTViz.u`)

| 이름 | 하는 일 |
|---|---|
| `u.el(parent, tag, attrs, text)` | SVG 요소 만들기 |
| `u.set(node, attrs)` | 속성 한꺼번에. 숫자는 소수 둘째 자리까지 |
| `u.txt(node, s)`, `u.op(node, v)` | 글자, 투명도(0 이면 숨김) |
| `u.at(s, k, n)` | 상태 n 의 진행도: s < n 이면 0, s > n 이면 1, s = n 이면 k |
| `u.seg(k, a, b)` | k 의 a~b 구간을 0~1 로 늘린 부드러운 진행도 |
| `u.lerp(a, b, t)`, `u.pt(p, q, t)`, `u.along(점들, t)` | 숫자, 점, 꺾인 길 위 위치 |
| `u.shrink(a, b, ra, rb)` | 원 둘레에서 멈추도록 선 끝 줄이기 |
| `u.node(parent, x, y, r, label)` | 노드 원 + 글자 `{g, c, t}`. `g` 에 `on`, `tl`, `cr`, `am`, `off`, `dim`, `vz-k0`~`vz-k9` 클래스 |
| `u.draw(line, a, b, k)` | 선이 k 만큼 그려지게 |
| `u.arrow(parent, cls)`, `u.setArrow(a, p, q, k)` | 화살표 |
| `u.num(x, d)` | 숫자를 소수 d 자리까지, 끝의 0 빼고 |
| `u.ease(t)`, `u.clamp(x, a, b)` | 부드럽게, 범위 자르기 |

### 클래스

- 글자: `vz-tb`(굵게), `vz-tm`(흐리게), `vz-ts`(작게), `vz-ta`(보라), `vz-tt`(청록), `vz-tc`(빨강), `vz-tok`(초록)
- 노드: 그룹에 `on`(보라), `tl`(청록), `cr`(빨강), `am`(주황), `off`(점선 꺼짐), `dim`(흐리게), `vz-k0`~`vz-k9`(색 번호 10가지, WL 색칠용)
- 선: `vz-e` + `on`/`tl`/`cr`/`off`
- 상자: `vz-box` + `on`/`tl`/`cr`/`am`/`ok`/`off`, 배경 칸 `vz-area`, 벽 `vz-wall`
- 점과 막대: `vz-dot` + `tl`/`cr`/`am`, `vz-bar` + `tl`/`cr`/`am`/`ok`/`mu`
- 축, 곡선: `vz-axis`, `vz-grid`, `vz-curve` + `tl`/`cr`/`mu`, 강조 테두리 `vz-hl`

## 과목에 넣기

1. 그림을 `engine/viz/<묶음>.js` 에 등록해요. `python tools/viz_tool.py list` 로 이름을 확인해요.
2. 자리표 `work/<과목>/notes/viz_place.json` 을 만들어요. 모양은 `tools/viz_tool.py` 머리 설명과 `work/iot-smart-home/notes/viz_place.json` 을 봐요. 그림 바로 뒤에 확인 퀴즈(`check`)를 하나 두면 좋아요.
3. `python tools/viz_tool.py place work/<과목>/notes/viz_place.json`
   - 자리표에 나온 슬라이드 파일에서 `"vp"` 표시가 있는 프레임을 지우고 다시 넣어요. 몇 번 돌려도 결과가 같아요.
   - `build_slides_*.py` 로 슬라이드 JSON 을 새로 만들었으면 이 명령을 다시 돌려요. 예를 들어 친환경건축은
     `python work/eco-architecture/notes/build_slides_wb.py` 다음에 꼭 `python tools/viz_tool.py place work/eco-architecture/notes/viz_place.json` 을 돌려요.
     (IoT: `work/iot-smart-home/notes/viz_place.json`, GNN: `02_작업/그래프신경망/최종정리/_작업/html/viz_place.json`)
4. `python tools/checkers/slide_check.py work/<과목>/notes/slides_w*.json`
5. `python tools/build_site.py <과목> --no-home`. `index.html` 에 `engine/viz/viz.js` 와 묶음 파일이 자동으로 들어가요.

GNN 은 `python tools/viz_tool.py place "D:/GRAPH_LECTURE_OJLEE/02_작업/그래프신경망/최종정리/_작업/html/viz_place.json"`, 체커는 `02_작업/그래프신경망/번역/_tools/slide_check.py`,
빌드는 `_작업/html/build_site.py` (`html/viz/*.js` 를 `홈페이지/assets/viz/` 로 복사) 다음 `python tools/import_gnn.py` 예요.

## GNN 과 맞추기

`viz.js` 나 `gnn.js` 를 고쳤으면:

```
python tools/viz_tool.py sync-gnn      # engine/viz 의 viz.js, gnn.js, README.md 를 GNN _작업/html/viz/ 로 복사
python tools/viz_tool.py check-gnn     # 같은지만 확인
```

`app.js` 의 `case 'viz'` 와 `schedule()` 의 `f.kind === 'viz'` 줄은 두 엔진에 손으로 똑같이 둬요.

## 확인하는 법

- 단위 시험 (jsdom): 모든 그림을 붙이고 상태를 끝까지 넘긴 뒤 거꾸로 돌아오며 SVG 가 같은지, 조절값을 바꿔도 오류가 없는지 봐요. 확인용 훅: 프레임 요소 `.vz` 의 `_viz` 에 `finish()`, `snapshot()`, `pose(s, k)`, `set(key, value)`, `state()` 가 있어요. 시험할 때는 `SDTViz.freeze = true` 로 장식 움직임을 멈춰요.
- 사이트 시험: 과목 정리 슬라이드를 열어 `.vz` 가 붙는지, 다음/이전으로 같은 모습인지, 오류가 없는지.
- 스크린샷: 헤드리스 Chrome 으로 1280, 390 폭. `pose(s, 0.6)` 으로 움직이는 중간 모습을 찍어 봐요.

## 등록된 그림

| 이름 | 무엇을 움직이나 | 넣은 곳 |
|---|---|---|
| `gnn.adj` | 엣지를 그을 때마다 인접행렬 두 칸이 켜지고, 가로줄 합이 차수 | wb-1, w1-1, wc-8 |
| `gnn.walk` | 랜덤워크 한 걸음씩, 이웃 확률, 워크가 문장이 되고 윈도 주변 | w1-7 |
| `gnn.node2vec` | t 에서 v 로 온 뒤 거리, 점수 1/p, 1, 1/q, 확률 막대. p, q 막대 | w1-8 |
| `gnn.mp` | 메시지가 날아가고, 합/평균/최대로 모으고, 갱신, 이웃도 동시에 | w2-4 |
| `gnn.receptive` | 층마다 1홉씩 넓어지는 범위와 계산 나무, 가라테 클럽 17, 26, 34명 | w2-5 |
| `gnn.oversmooth` | 층을 쌓을수록 두 무리 값이 같아지고 차이 곡선이 바닥으로. 층 수 막대 | w2-5 |
| `gnn.gcnnorm` | A, A + I, 차수, 선 칸 0.41, 대각 0.5 / 0.33, 한 층 전파 | w2-8, wc-12 |
| `gnn.wl` | WL 색 정제 라운드와 색별 개수 막대. p.48 예제, 삼각형 둘 대 육각형 | w3-7, w3-10 |
| `gnn.gin` | 봉투 세 개를 합, 평균, 최대로 요약할 때 겹치는 것 | w3-5, wb-10 |
| `gnn.train` | 예측, 손실, 기울기, 고치기 고리와 손실 곡선 위 공. 학습률 0.01 / 0.1 / 0.5 | wb-8, wc-11 |
| `iot.packet` | 집 안 25ms 길과 클라우드 140ms 길, 인터넷 끊김 | wb-8, w2-4 |
| `iot.topology` | 스타, 메시, 트리에서 노드 하나 고장 | wb-6 |
| `iot.zigbee` | 안방 센서, 스위치, 플러그, 허브 3홉과 플러그 꺼짐 뒤 자가 치유 | w3-6, wb-6 |
| `iot.wave` | 50cm 안의 2.4GHz 와 900MHz 파도, 벽 개수에 따른 dBm 눈금. 벽 개수 막대 | wb-4, w3-5 |
| `iot.loop` | 감지, 전달, 판단, 실행과 다시 감지 (에어컨 예시) | w2-3 |
| `iot.datatypes` | 상태, 이벤트, 시계열 세 줄과 평균 07:12. 보고 주기 단추 | w2-5, wb-9 |
| `iot.nat` | 사설 주소, MAC, 공유기의 주소 바꾸기 표와 답장 | wb-7 |
| `iot.secure` | 문제 번호와 도장으로 인증, 1234 를 4567 로 암호화, 가짜 앱 차단 | wb-10 |

| `eco.heat3` | 벽을 지나 새는 열, 전도, 대류, 복사 칸이 차례로, 단열재 기포 | wb-1 |
| `eco.uvalue` | 단열재 두께로 R, U, 열손실(0.1 m: 2.5, 0.4, 200 W). 두께 막대 | wb-2 |
| `eco.lag` | 하루 기온과 가벼운 건물, 뚝배기 건물의 실내 곡선(시간 지연), 42 와 21 kJ/K 그릇. 열용량 막대 | wb-3 |
| `eco.dew` | 실내 공기의 이슬점 선과 창 유리 8℃, 벽 16℃ 표면 결로 판정. 온도, 습도 막대 | wb-4, wb-5 |
| `eco.bridge` | 내단열 벽의 열교, 표면 온도 18.9℃ 대 11.8℃ 와 결로, 외단열로 해결. 단열 위치 단추 | wb-4 |
| `eco.vent` | 60 m³ 방, 5명 × 24 m³/h = 120, 한 시간에 공기 2번 바뀜. 재실자 막대 | wb-7, w1-10 |
| `eco.sun` | 계절별 태양 고도와 바깥 차양 그늘, 안쪽 블라인드. 계절 단추, 차양 길이 막대 | wb-9, w1-7 |
| `eco.sound` | 음압 10배에 20 dB, 60 dB 두 개는 63 dB, 확산, 흡음, 차음, 벽 무게와 차음. 벽 무게 막대 | wb-10 |
| `modern.timeline` | 1850~1940 연표가 1강부터 6강까지 채워지고 세 덩어리로 묶임 | 정리노트 s0 |
| `modern.influence` | 퓨진, 러스킨에서 미술공예운동, 아르누보, 빈, 독일공작연맹, 바우하우스, 바이센호프, 국제주의 양식 | 정리노트 s22 |
| `modern.bauhaus` | 바이마르, 데사우, 베를린과 세 학장, 선언문, 입문과정에서 건축부서까지 | 정리노트 s23 |
| `modern.destijl` | 직선, 3원색, 면이 떨어져 뜨기, 슈뢰더 하우스 미닫이, 카페 로베뜨 대각선 | 정리노트 s26 |
| `modern.gardencity` | 58,000명 중심도시와 32,000명 전원도시 6개, 철도, 중앙공원, 가로수길, 농지, 레치워스 | 정리노트 s4 |
| `modern.weissenhof` | 33개 번호와 건축가(미스, 오우트, 르 코르뷔지에, 그로피우스 ...) 개념도 | 정리노트 s28 |
| `modern.chicago` | 조적조 두꺼운 벽(모나드녹 1.8m)과 철골조, 시카고 창, base, shaft, attic | 정리노트 s14 |
| `interior.stud` | 먹매김부터 조인트 처리까지 스터드 벽체 10단계와 벽 두께 103mm 단면 | 정리노트 s12 |
| `interior.ceiling` | 앵커, 몰딩, 행거, 캐링, 마이너, M-Bar, 수평, 1ply, 2ply(타카 금지), C-형강 보강 | 정리노트 s15 |
| `interior.scaffold` | 강관비계 기둥 1.85m, 띠장 2m, 가새 40~60도, 난간, 400kg, 보양재. 기둥 간격 막대 | 정리노트 s8 |
| `interior.contract` | 직영, 일식, 분할, 공동도급, 턴키 흐름과 정액, 단가(6,000,000원), 실비정산(1억 1,000만) | 정리노트 s2 |
| `interior.gantt` | 네트워크와 바차트가 쌓이고 주공정선 10일, 여유시간, 지연. 지연 작업 단추와 날수 막대 | 정리노트 s5 |
| `interior.demolish` | 배관 막기, 분진 대비, 마감재 철거, 구조체 해체(압쇄기, 브레이커), 폐기물 분리, 3년 보관 | 정리노트 s9 |

강의 자료에 없는 숫자는 각 자리표의 `caption` 에 가정이라고 적었어요. 예: 이슬점 공식, 열교 부위 U 3.0, 서울 태양 고도, 질량 법칙, 바깥 기온 10~30℃, 바이센호프 칸 자리.

## 새 과목에 붙일 때 순서 요약

1. 과목 자료(정리 슬라이드, 정리노트, 손계산)에서 움직여 보여 줄 개념과 숫자를 고른다.
2. `engine/viz/<묶음>.js` 에 그림을 등록하고 `README.md` 표에 한 줄 더한다.
3. 정리 슬라이드가 있으면 `notes/viz_place.json` + `viz_tool.py place`, 정리노트만 있으면 `pages/viz_note.json` + `viz_tool.py check-page`.
4. `slide_check.py` 와 빌드, jsdom 시험(viz_checks), 1280 과 390 스크린샷.
