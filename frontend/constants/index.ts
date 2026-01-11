// frontend/constants/index.ts

// 색상 상수
const colors = {
  KNU: "#006DB8",
  WHITE: "#fff",
  BLACK: "#000",
  GRAY: "#F2F2F2",
  TEXT_GRAY: "#888",
  BACKGROUND: "#F9F9F9",
};

// 1. 홈 화면 상단 탭용 데이터 (단순 라벨)
const categories = [
  { id: "all", label: "전체" },
  { id: "academic", label: "학사" },
  { id: "scholar", label: "장학" },
  { id: "learning", label: "학습/상담" },
  { id: "job", label: "취창업" },
  { id: "library", label: "도서관" },
  { id: "daeple", label: "대플" },
  { id: "charm", label: "참인재" },
];

// 2. 알림 설정 화면용 데이터 (아이콘 포함, 구조 분리)
// notifications.tsx에서 import { category } ... 로 사용 중인 부분 대응
const category = {
  general: [
    { id: "academic", label: "학사", icon: "school-outline" },
    { id: "scholar", label: "장학", icon: "gift-outline" },
    { id: "learning", label: "학습/상담", icon: "book-outline" },
    { id: "job", label: "취창업", icon: "briefcase-outline" },
    { id: "library", label: "도서관", icon: "library-outline" },
    { id: "daeple", label: "대플", icon: "rocket-outline" },
    { id: "charm", label: "참인재", icon: "ribbon-outline" },
  ],
  dept: [
    // 학과 알림은 추후 확장 가능하도록 예시 데이터 넣어둠
    { id: "cse", label: "컴퓨터학부", icon: "desktop-outline" },
    { id: "simcom", label: "심컴", icon: "hardware-chip-outline" },
  ],
};

export { categories, category, colors };