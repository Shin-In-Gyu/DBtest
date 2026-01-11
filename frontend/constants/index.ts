// frontend/constants/index.ts
import { Category } from "@/types";

const colors = {
  KNU: "#006DB8",
  WHITE: "#fff",
  BLACK: "#000",
  GRAY: "#F2F2F2",
  TEXT_GRAY: "#888",
};

// [수정] 요청하신 탭 메뉴 구성
// id 값은 백엔드의 notices.json 키값과 일치해야 데이터가 나옵니다.
const categories = [
  { id: "all", label: "전체" },
  { id: "academic", label: "학사" },
  { id: "scholar", label: "장학" },
  { id: "learning", label: "학습/상담" }, // 백엔드 설정 확인 필요 (learning or counsel)
  { id: "job", label: "취창업" },
  { id: "library", label: "도서관" },
  { id: "daeple", label: "대플" },      // 백엔드 설정 확인 필요
  { id: "charm", label: "참인재" },     // 백엔드 설정 확인 필요
];

export { categories, colors };