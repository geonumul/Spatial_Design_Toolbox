/* 이용권 설정 (assets/access.js 가 읽는다)
   enforce: true 면 과목 페이지에 로그인과 이용권 검사를 건다. "login" 이면 로그인만 확인한다. 급하게 끄려면 false 로 바꿔 커밋, 푸시.
   subjects: 과목 페이지 주소(subjects/<slug>/)와 이용권에 적는 과목 키(홈 index.html 의 key)를 잇는다.
             새 과목을 만들면 여기에도 한 줄 넣는다. 여기 없는 과목은 프리패스로만 열린다.
   plans: 홈 "이용권" 칸에 보이는 세 가지. price 가 null 이면 "가격 준비 중" 으로 보인다.
   payReady: 카드 결제를 붙이기 전까지 false. false 면 결제 버튼에 "작업 중" 이 붙는다. */
window.SDT_ACCESS = {
  enforce: "login",   // "login": 로그인만 확인. true: 이용권까지 확인 (Firebase 콘솔에서 규칙 게시와 관리자 등록을 끝낸 뒤). false: 끔
  subjects: [
    {slug: "gnn", key: "gnn2026_site_v1", name: "그래프 신경망 (GNN)"},
    {slug: "modern-space-design", key: "archhist_v2", name: "근현대 공간디자인"},
    {slug: "interior-construction", key: "sdt_interior_v1", name: "실내디자인시공과실무"},
    {slug: "iot-smart-home", key: "sdt_iot_v1", name: "IoT 스마트홈"},
    {slug: "eco-architecture", key: "sdt_eco_v1", name: "친환경건축"}
  ],
  plans: [
    {kind: "subject", name: "과목별 이용권", desc: "과목 하나를 한 학기 동안 열어요.", days: 120, price: null},
    {kind: "month", name: "월간 프리패스", desc: "모든 과목을 30일 동안 열어요.", days: 30, price: null},
    {kind: "year", name: "연간 프리패스", desc: "모든 과목을 365일 동안 열어요.", days: 365, price: null}
  ],
  payReady: false
};
