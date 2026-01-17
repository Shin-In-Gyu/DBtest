// frontend/constants/index.ts
import { Category } from "@/types";

const colors = {
  KNU: "#006DB8",
  WHITE: "#fff",
  BLACK: "#000",
};

/**
 * [수정] TS2322 에러 해결: balance-scale-outline을 scale-outline으로 변경
 * Ionicons 라이브러리의 정확한 glyphMap 키값을 사용해야 합니다.
 */
const category: { general: Category[]; dept: Category[] } = {
  general: [
    { id: "univ", label: "전체 공지", icon: "megaphone-outline" },
    { id: "academic", label: "학사", icon: "school-outline" },
    { id: "scholar", label: "장학", icon: "ribbon-outline" },
    { id: "job", label: "취창업", icon: "briefcase-outline" },
    { id: "daeple", label: "취창업(대플)", icon: "rocket-outline" },
    { id: "library", label: "도서관", icon: "library-outline" },
    { id: "learning", label: "학습/상담", icon: "chatbubbles-outline" },
  ],
  dept: [
    { id: "computer", label: "컴퓨터공학", icon: "laptop-outline" },
    { id: "ai", label: "인공지능융합", icon: "hardware-chip-outline" },
    { id: "esc", label: "전자반도체", icon: "flash-outline" },
    { id: "social_work", label: "사회복지", icon: "heart-outline" },
    { id: "global_biz", label: "상경학부", icon: "business-outline" },
    // [수정 위치] balance-scale-outline -> scale-outline
    { id: "law_tax", label: "법행정세무", icon: "scale-outline" }, 
    { id: "real_estate", label: "부동산건설", icon: "home-outline" },
    { id: "culture_content", label: "문화콘텐츠", icon: "color-palette-outline" },
    { id: "intl_area", label: "국제지역", icon: "earth-outline" },
    { id: "china_biz", label: "중국콘텐츠", icon: "cash-outline" },
    { id: "christian_comm", label: "기독교커뮤", icon: "chatbox-ellipses-outline" },
    { id: "edu", label: "교육학", icon: "pencil-outline" },
    { id: "ece", label: "유아교육", icon: "grid-outline" }, // [수정] 호환성을 위해 grid-outline으로 변경
    { id: "sped_elem", label: "특수교육", icon: "accessibility-outline" },
    { id: "pe", label: "체육학", icon: "fitness-outline" },
    { id: "music", label: "음악학", icon: "musical-notes-outline" },
    { id: "dls", label: "자유전공", icon: "help-buoy-outline" },
    { id: "wel_tech", label: "융복합전공", icon: "construct-outline" },
    { id: "clas", label: "참인재대학", icon: "ribbon-outline" },
  ],
};

export { category, colors };