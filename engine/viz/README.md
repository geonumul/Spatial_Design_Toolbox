# 움직이는 개념 그림 (viz)

정리 슬라이드와 회독 레슨에 "움직이는 그림" 프레임을 넣는 공통 틀이에요.
설명 글만 읽어서는 잘 안 그려지는 개념을 한 단계씩 움직여 보여 줘요.
화면을 누를 때마다 그림이 다음 상태로 움직이고, 이전으로 가면 바로 앞 상태로 정확히 돌아가요.

- 외부 라이브러리 없음. SVG 와 `requestAnimationFrame` 만 써요.
- 과목 공통 틀은 `viz.js` 하나, 그림은 과목 묶음 파일(`gnn.js`, `iot.js` ...)에 들어 있어요.
- GNN 사이트(`D:/GRAPH_LECTURE_OJLEE/2026/최종정리/_작업/html/viz/`)에도 `viz.js`, `gnn.js`, 이 문서가 똑같이 들어 있어요. 원본은 이 폴더예요.

## 파일

| 파일 | 하는 일 |
|---|---|
| `engine/viz/viz.js` | 틀. `window.SDTViz` 등록부, 프레임 HTML, 단계 넘기기, 재생 단추, 조절 막대, 스타일(한 번만 넣음) |
| `engine/viz/gnn.js` | 그래프 신경망 그림 10개 |
| `engine/viz/iot.js` | IoT 스마트홈 그림 8개 |
| `engine/app.js` (`renderFrame` 의 `case 'viz'`) | 플레이어와 잇는 곳. GNN 은 `_작업/html/app.js` 에 같은 코드 |
| `tools/build_site.py` (`viz_tags`) | 과목 JSON 에 `"kind": "viz"` 가 있으면 `viz.js` 와 쓰는 묶음만 `index.html` 에 넣어요 |
| `tools/viz_tool.py` | `list` 등록 이름, `place` 자리표대로 슬라이드에 끼우기, `sync-gnn` GNN 으로 복사 |
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

  V.add('eco.heat', {
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
   - `build_slides_*.py` 로 슬라이드 JSON 을 새로 만들었으면 이 명령을 다시 돌려요.
4. `python tools/checkers/slide_check.py work/<과목>/notes/slides_w*.json`
5. `python tools/build_site.py <과목> --no-home`. `index.html` 에 `engine/viz/viz.js` 와 묶음 파일이 자동으로 들어가요.

GNN 은 `python tools/viz_tool.py place "D:/GRAPH_LECTURE_OJLEE/2026/최종정리/_작업/html/viz_place.json"`, 체커는 `2026/번역/_tools/slide_check.py`,
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

## 다음 과목 아이디어 (아직 안 만듦)

같은 틀로 이렇게 만들면 돼요. 숫자는 그 과목 정리 슬라이드 손계산에서 가져와요.

- 친환경건축 `eco.js`
  - `eco.heat` 벽 단면 속 열 흐름: 실내외 온도 두 칸, 층마다 온도 떨어지는 계단 선, 단열재 두께 막대로 U값과 열손실(W) 숫자가 바뀜.
  - `eco.insulation` 외단열과 내단열 비교: 열교(기둥, 슬래브 끝)에서 새는 화살표 굵기. `choice` 단추로 두 방식.
  - `eco.condense` 결로: 벽 안 온도 선과 이슬점 선이 만나는 곳에 물방울. 실내 습도 막대로 이슬점이 오르내림.
  - 도우미: 온도 선은 `path` 를 `draw` 에서 매번 새로 그리고, 물방울은 `u.op`.
- 근현대 공간디자인 `modern.js`
  - `modern.timeline` 가로 연표: 상태마다 한 시기를 확대, 인물과 작품 점이 나타남. 너무 길면 두 그림으로 나눠요.
  - `modern.influence` 영향 관계도: 사람과 운동 노드, 상태마다 영향 화살표가 하나씩 켜짐 (`u.arrow`, `u.setArrow`).
- 실내건축 시공실무 `interior.js`
  - `interior.sequence` 시공 순서: 벽 단면이나 평면 위에 공정이 차례로 쌓임 (먹매김, 경량 철골, 석고보드, 퍼티, 도장). 상태마다 한 공정, 캡션에 "왜 이 순서인지".
  - `interior.gantt` 공정표 막대가 하루씩 채워지고, 선행 공정이 늦으면 뒤 막대가 밀림. 지연 일수 막대.
