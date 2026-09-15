# Spatial Design Toolbox

공간디자인 수업 과목별 정리노트, 암기 팁, 문제은행.

사이트: https://geonumul.github.io/Spatial_Design_Toolbox/

## 과목

| 번호 | 과목 | 페이지 | 저장 키 | 상태 |
|---|---|---|---|---|
| 01 | 근현대 공간디자인 (근대건축 디자인사) | `subjects/modern-space-design/` | `archhist_v2` | 중간고사 범위 457문항 |
| 02 | 실내디자인시공실무 | `subjects/interior-construction/` | `sdt_interior_v1` | 자료 대기 |
| 03 | 식영이실 | `subjects/sikyeong-isil/` | `sdt_sikyeong_v1` | 자료 대기 |
| 04 | IoT 스마트홈 | `subjects/iot-smart-home/` | `sdt_iot_v1` | 자료 대기 |
| 05 | 친환경건축 | `subjects/eco-architecture/` | `sdt_eco_v1` | 자료 대기 |

## 구조

```
index.html                      홈. 과목 카드(문항 수, 내 진행 기록)
subjects/<slug>/index.html      과목 페이지. 파일 하나에 문제풀기, 오답노트, 정리노트, 암기 팁, 연표
tools/new_subject.py            빈 과목 페이지 만들기 (근현대 페이지의 엔진을 복사하고 내용만 비움)
tools/sync_home.py              과목 파일에서 문항 수, 단원 수를 읽어 홈 카드 숫자 갱신
docs/modern-space-design/       작업가이드, 코딩 가이드라인, 검증 보고서
```

과목 페이지는 외부 라이브러리 없이 파일 하나로 동작한다. 사이트에서도, 파일을 내려받아 더블클릭해도 열린다.

## 과목 내용 채우기

모든 과목이 같은 엔진이라 `docs/modern-space-design/작업가이드.md` 10절 절차와 `CODING_GUIDELINES.md` 규칙을 그대로 따른다. 새 과목에서 달라지는 점만 적는다.

- 파일 경로는 `subjects/<slug>/index.html`.
- 빈 과목은 `PARTS`, `BANK`가 비어 있다. 첫 범위는 `{"id":"1", ...}`, 정리노트 섹션 id는 `s1`부터.
- `s0`은 "과목 안내" 자리. 내용이 들어오면 전체 흐름으로 바꾸고 목차 버튼 글자도 같이 바꾼다.
- 히어로 문구 "강의자료가 들어오는 대로 문제가 채워집니다"는 문항을 넣으면 "틀린 문제는 오답노트에 자동으로 쌓입니다"로 바꾼다.
- 연표 탭은 nav 버튼만 빠져 있다(패널과 스크립트는 있음). 연표가 필요한 과목이면 `<button class="tab" data-tab="time">연표</button>`을 nav 끝에 다시 넣고 `TIMELINE`, `FLOW`, `KEYYEARS`, `CATS`를 채운다.
- 채운 뒤 `python tools/sync_home.py` 실행 → 홈 카드의 문항 수와 "공부 가능" 표시가 갱신된다.

## 새 과목 추가

```
python tools/new_subject.py <slug> "<과목명>" <저장키>
```

그다음 `index.html`의 `SUBJECTS` 배열에 항목을 하나 추가하고(`href`, `key`는 위에서 쓴 값) `python tools/sync_home.py`.

## 기록 저장에 대해

- 진행 기록과 오답노트는 브라우저 localStorage에 과목별 키로 저장된다. 같은 사이트 안이라 키가 다르지 않으면 과목끼리 섞이므로, 저장 키는 과목마다 달라야 한다.
- 저장 키와 기존 문항의 `id`는 바꾸지 않는다. 바꾸면 오답노트가 사라진다.
- 로컬 파일(`file://`)로 열던 기록은 사이트로 넘어오지 않는다. 로컬 파일의 오답노트 탭에서 내보내기 → 사이트의 같은 과목 오답노트 탭에서 가져오기.

## 배포

`main` 브랜치 루트를 GitHub Pages로 서비스한다(Settings → Pages → Deploy from a branch → main, / (root)). 푸시하면 1~2분 뒤 반영된다.
