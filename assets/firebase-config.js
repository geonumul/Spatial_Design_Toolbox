/* Firebase 웹 앱 설정.
   Firebase 콘솔 > 프로젝트 설정 > 내 앱(웹) 의 firebaseConfig 값을 아래 null 자리에 붙여넣는다(docs/LOGIN_SETUP.md).
   null 이면 로그인 버튼이 나오지 않고, 기록은 각자 브라우저에만 저장된다.
   이 값은 공개되어도 되는 값이다. 접근 제어는 firestore.rules 가 한다. */
window.SDT_FIREBASE = {
  apiKey: "AIzaSyDdD74H4l9Ao34tsPGvJtcfFbRTo0KxFvw",
  authDomain: "spatialstudy-fdaa2.firebaseapp.com",
  projectId: "spatialstudy-fdaa2",
  storageBucket: "spatialstudy-fdaa2.firebasestorage.app",
  messagingSenderId: "328320680745",
  appId: "1:328320680745:web:fe599f162837708b3f6d38",
  measurementId: "G-BXZLWT6TRC"
};
