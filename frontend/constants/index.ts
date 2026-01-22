// frontend/constants/index.ts
import { Category } from "@/types";

const colors = {
  KNU: "#006DB8",
  WHITE: "#fff",
  BLACK: "#000",
};

/**
 * [수정] 카테고리 구성 변경
 * 1. general에서 univ, daeple, library 제거
 * 2. event_internal, event_external 추가
 */
const category: { general: Category[]; dept: Category[] } = {
  general: [
    { id: "academic", label: "학사", icon: "school-outline" },
    { id: "scholar", label: "장학", icon: "ribbon-outline" },
    { id: "job", label: "취창업", icon: "briefcase-outline" },
    // [추가] 교내/교외 행사 카테고리
    { id: "event_internal", label: "행사(교내)", icon: "calendar-outline" },
    { id: "event_external", label: "행사(교외)", icon: "globe-outline" },
    { id: "learning", label: "학습/상담", icon: "chatbubbles-outline" },
    // { id: "daeple", label: "대플", icon: "rocket-outline" },
    // { id: "library", label: "도서관", icon: "book-outline" },
  ],
  dept: [
    { id: "computer", label: "컴퓨터공학", icon: "laptop-outline" },
    { id: "ai", label: "인공지능융합", icon: "hardware-chip-outline" },
    { id: "esc", label: "전자반도체", icon: "flash-outline" },
    { id: "social_work", label: "사회복지", icon: "heart-outline" },
    { id: "global_biz", label: "상경학부", icon: "business-outline" },
    { id: "law_tax", label: "법행정세무", icon: "scale-outline" }, 
    { id: "real_estate", label: "부동산건설", icon: "home-outline" },
    { id: "culture_content", label: "문화콘텐츠", icon: "color-palette-outline" },
    { id: "intl_area", label: "국제지역", icon: "earth-outline" },
    { id: "china_biz", label: "중국콘텐츠", icon: "cash-outline" },
    { id: "christian_comm", label: "기독교커뮤", icon: "chatbox-ellipses-outline" },
    { id: "edu", label: "교육학", icon: "pencil-outline" },
    { id: "ece", label: "유아교육", icon: "grid-outline" },
    { id: "sped_elem", label: "특수교육", icon: "accessibility-outline" },
    { id: "pe", label: "체육학", icon: "fitness-outline" },
    { id: "music", label: "음악학", icon: "musical-notes-outline" },
    { id: "dls", label: "자유전공", icon: "help-buoy-outline" },
    { id: "wel_tech", label: "융복합전공", icon: "construct-outline" },
    { id: "clas", label: "참인재대학", icon: "ribbon-outline" },
  ],
};

export { category, colors };