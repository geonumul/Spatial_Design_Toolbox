# 로그인 켜기 (Firebase, 무료)

사람마다 오답노트와 진행 기록을 따로 저장하려고 Firebase의 Google 로그인과 Firestore DB를 쓴다. 무료 요금제(Spark)로 충분하고 결제 정보도 필요 없다. 50명이 매일 써도 무료 한도(읽기 하루 5만, 쓰기 하루 2만) 안이다. 저장은 문제를 푼 뒤 1.5초 모아서 한 번에 올리므로 쓰기 횟수가 적다.

## 1. 프로젝트 만들기 (한 번만, 10분)

1. https://console.firebase.google.com 접속, Google 계정으로 로그인.
2. **프로젝트 추가** → 이름 `spatial-design-toolbox` → Google 애널리틱스는 꺼도 됨 → 만들기.
3. 왼쪽 **빌드 → Authentication → 시작하기** → 로그인 방법 탭 → **Google** → 사용 설정 켜기 → 프로젝트 지원 이메일 선택 → 저장.
4. 같은 Authentication 화면 **설정 탭 → 승인된 도메인 → 도메인 추가** → `geonumul.github.io` 입력 → 추가.
5. 왼쪽 **빌드 → Firestore Database → 데이터베이스 만들기** → 위치 `asia-northeast3 (Seoul)` → **프로덕션 모드** → 만들기.
6. Firestore 화면 **규칙 탭** → 내용을 전부 지우고 저장소의 `firestore.rules` 파일 내용을 붙여넣기 → **게시**.
7. 왼쪽 위 톱니바퀴 **프로젝트 설정 → 일반 → 내 앱 → 웹(`</>`) 아이콘** → 앱 닉네임 아무거나 → Firebase 호스팅은 체크하지 않음 → 앱 등록.
8. 화면에 나오는 `const firebaseConfig = { apiKey: "...", authDomain: "...", ... };` 의 중괄호 부분을 복사.

## 2. 사이트에 넣기

`assets/firebase-config.js` 의 `window.SDT_FIREBASE = null;` 을 아래처럼 바꾸고 커밋, 푸시한다. (복사한 값을 Claude에게 주면 대신 넣어 준다.)

```js
window.SDT_FIREBASE = {
  apiKey: "...",
  authDomain: "spatial-design-toolbox.firebaseapp.com",
  projectId: "spatial-design-toolbox",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};
```

이 값은 공개되어도 되는 값이다. 남의 기록을 못 보게 막는 건 6번의 규칙이다.

## 동작 방식

- 헤더 오른쪽에 **로그인** 버튼이 생긴다. 로그인하면 과목마다 기록이 계정에 저장되고, 다른 기기에서 로그인해도 같은 오답노트가 보인다.
- 로그인하지 않으면 지금처럼 그 브라우저에만 저장된다.
- 로그인 없이 풀던 기록이 있는 브라우저에서 처음 로그인하면 "내 계정으로 옮길까요?"를 묻는다.
- 인터넷이 끊겨도 이 기기에 먼저 저장되고, 다음에 접속할 때 올라간다.
- 카카오톡 링크로 열면 구글이 로그인을 막기 때문에, 로그인 버튼을 누르면 외부 브라우저로 다시 연다. 인스타그램, 네이버 앱 등은 크롬이나 사파리로 열라는 안내가 뜬다.
- 파일을 내려받아 더블클릭으로 열면(file://) 로그인 기능은 꺼지고 로컬 저장만 된다.

## 저장 구조 (참고)

- Firestore: `users/{uid}/stores/{과목 저장 키}` 문서 하나에 `{data: 기록 JSON 문자열, updatedAt}`.
- 기기 캐시: localStorage `과목키@uid`. 로그인 전 기록은 `과목키` 그대로.
- 과목 저장 키는 README 표 참고. 키를 바꾸면 기존 기록과 연결이 끊긴다.
