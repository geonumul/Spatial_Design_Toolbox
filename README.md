# Toolbox Study Group

공간디자인 수업 과목별 정리노트, 암기 팁, 문제은행.

사이트: https://geonumul.github.io/Spatial_Design_Toolbox/

## 과목

| 번호 | 과목 | 페이지 | 저장 키 | 로컬 자료 폴더 |
|---|---|---|---|---|
| 01 | 근현대 공간디자인 (근대건축 디자인사) | `subjects/modern-space-design/` | `archhist_v2` | `0. 근현대공간디자인` |
| 02 | 실내디자인시공과실무 | `subjects/interior-construction/` | `sdt_interior_v1` | `1. 실내디자인시공과실무` |
| 03 | 식품영양의 이론과실제 | `subjects/food-nutrition/` | `sdt_food_v1` | `2. 식품영양의 이론과실제` |
| 04 | IoT 스마트홈 | `subjects/iot-smart-home/` | `sdt_iot_v1` | `3. IoT 스마트홈` |
| 05 | 친환경건축 | `subjects/eco-architecture/` | `sdt_eco_v1` | `4. 친환경건축` |

## 구조

```
index.html                      홈. 과목 카드(문항 수, 내 진행 기록)
subjects/<slug>/index.html      과목 페이지. 문제풀기, 오답노트, 정리노트(단원별 접기), 암기 팁, 연표
assets/sync.js                  로그인과 기록 동기화(Firebase). 없어도 페이지는 동작
assets/firebase-config.js       Firebase 설정. null 이면 로그인 꺼짐
firestore.rules                 DB 규칙(각자 자기 기록만)
tools/new_subject.py            빈 과목 페이지 만들기 (근현대 페이지의 엔진을 복사하고 내용만 비움)
tools/sync_home.py              과목 파일에서 문항 수, 단원 수를 읽어 홈 카드 숫자 갱신
tools/build_study.py            회독 공부 과목 빌드: content/<slug>/ JSON → 과목 페이지 (docs/STUDY_FORMAT.md)
tools/study/                    회독 공부, 용어 도감 화면 코드(css, html, js)
content/<slug>/                 회독 공부 과목의 원본 데이터(단원, 용어, 문항, 그림)
docs/WORKFLOW.md                강의자료, 기출문제, 녹음 반영 절차
docs/LOGIN_SETUP.md             로그인(Firebase) 켜는 법
docs/modern-space-design/       작업가이드, 코딩 가이드라인, 검증 보고서 (모든 과목 공통 규칙)
```

## 자료 반영

`docs/WORKFLOW.md` 참고. 요약:

- 강의자료 1개 = 1단원. 정리노트 목차와 본문은 단원별로 접히고, 새 단원은 `h1.part`, `section`, 목차 버튼만 추가하면 자동으로 묶인다.
- 기출문제는 `"src":"기출"`, 녹음에서 교수가 강조한 내용은 `"src":"강조"` 문항으로 넣는다. 문제풀기의 "기출, 강조 문제" 모드로 모아 풀 수 있다.
- 채운 뒤 `python tools/sync_home.py`.

빈 과목에서 달라지는 점:

- `PARTS`, `BANK`가 비어 있다. 첫 단원은 `{"id":"1", ...}`, 정리노트 섹션 id는 `s1`부터.
- `s0`은 "과목 안내" 자리. 내용이 들어오면 전체 흐름으로 바꾸고 목차 버튼 글자도 같이 바꾼다.
- 히어로 문구 "강의자료가 들어오는 대로 문제가 채워집니다"는 문항을 넣으면 "틀린 문제는 오답노트에 자동으로 쌓입니다"로 바꾼다.
- 연표 탭은 nav 버튼만 빠져 있다(패널과 스크립트는 있음). 필요하면 `<button class="tab" data-tab="time">연표</button>`를 nav 끝에 넣고 `TIMELINE`, `FLOW`, `KEYYEARS`, `CATS`를 채운다.

## 새 과목 추가

```
python tools/new_subject.py <slug> "<과목명>" <저장키>
```

그다음 `index.html`의 `SUBJECTS` 배열에 항목을 하나 추가하고(`href`, `key`는 위에서 쓴 값) `python tools/sync_home.py`.

## 기록 저장

- 로그인하지 않으면 브라우저 localStorage에 과목별 키로 저장된다. 로그인하면 Firebase에 계정별로 저장되고 기기 사이에 이어진다(`docs/LOGIN_SETUP.md`).
- 저장 키와 기존 문항의 `id`는 바꾸지 않는다. 바꾸면 오답노트가 사라진다.
- 로컬 파일(`file://`)로 열던 기록은 사이트로 넘어오지 않는다. 로컬 파일의 오답노트 탭에서 내보내기 → 사이트의 같은 과목 오답노트 탭에서 가져오기.

## 배포

`main` 브랜치 루트를 GitHub Pages로 서비스한다(Settings → Pages → Deploy from a branch → main, / (root)). 푸시하면 1~2분 뒤 반영된다.
