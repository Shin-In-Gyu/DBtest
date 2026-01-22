import { Building } from "@/types";

// constants/noticeCategories.ts
export const categories = [
  { id: "all", label: "전체" },
  { id: "academic", label: "학사" },
  { id: "scholar", label: "장학" },
  { id: "learning", label: "학습/상담" },
  { id: "job", label: "취창업" },
  { id: "event_internal", label: "행사(교내)" },
  { id: "event_external", label: "행사(교외)" },
  // { id: "library", label: "도서관" },
  // { id: "daeple", label: "대플" },
] as const;

// 백엔드에서 받은 학과 데이터 타입
export type DeptData = {
  name: string;
  domain: string;
  menu_id: string;
  seq: number;
};

// 백엔드 학과 데이터 (API에서 받아올 수 있도록 export)
export const deptData: Record<string, DeptData> = {
  dls: {
    name: "자유전공학부",
    domain: "https://dls.kangnam.ac.kr",
    menu_id: "e789c348fbc8bb492728f600b8f41a44",
    seq: 0,
  },
  social_work: {
    name: "사회복지학부",
    domain: "https://knusw.kangnam.ac.kr",
    menu_id: "22dd7f703ec676ffdecdd6b4e4fe1b1b",
    seq: 0,
  },
  senior_biz: {
    name: "시니어비즈니스학과",
    domain: "https://senior-industry.kangnam.ac.kr",
    menu_id: "f61730fb09006de23bee07331bfda13e",
    seq: 0,
  },
  global_biz: {
    name: "상경학부",
    domain: "https://globalbiz.kangnam.ac.kr",
    menu_id: "6b108ed6447a9b934100e9a1ddc0c070",
    seq: 0,
  },
  law_tax: {
    name: "법행정세무학부",
    domain: "https://pet.kangnam.ac.kr",
    menu_id: "04cb25b9b9430a879fd82a9ef90206aa",
    seq: 0,
  },
  culture_content: {
    name: "문화콘텐츠학과",
    domain: "https://kcc.kangnam.ac.kr",
    menu_id: "29b8da331f6b973f09bfef239630d1b7",
    seq: 5261,
  },
  intl_area: {
    name: "국제지역학과",
    domain: "https://kcc.kangnam.ac.kr",
    menu_id: "29b8da331f6b973f09bfef239630d1b7",
    seq: 12875,
  },
  china_biz: {
    name: "중국콘텐츠비즈니스학과",
    domain: "https://kcc.kangnam.ac.kr",
    menu_id: "29b8da331f6b973f09bfef239630d1b7",
    seq: 12882,
  },
  christian_comm: {
    name: "기독교커뮤니케이션학과",
    domain: "https://dcs.kangnam.ac.kr",
    menu_id: "942f430954b529e6d910d5ba8c61a29f",
    seq: 0,
  },
  computer: {
    name: "컴퓨터공학부",
    domain: "https://sae.kangnam.ac.kr",
    menu_id: "e408e5e7c9f27b8c0d5eeb9e68528b48",
    seq: 0,
  },
  ai: {
    name: "인공지능융합공학부",
    domain: "https://ace.kangnam.ac.kr",
    menu_id: "f3a3bfbbc5715e4180657f71177d8bcf",
    seq: 0,
  },
  esc: {
    name: "전자반도체공학부",
    domain: "https://esc.kangnam.ac.kr",
    menu_id: "f25ac6a8a2a27a5a10fee744b5084a6e",
    seq: 0,
  },
  real_estate: {
    name: "부동산건설학부",
    domain: "https://knureal.kangnam.ac.kr",
    menu_id: "26c80ce9728657a14fe638d4c566ead8",
    seq: 0,
  },
  edu: {
    name: "교육학과",
    domain: "https://educ.kangnam.ac.kr",
    menu_id: "8e4d118b43e9fb0f1d3d8ff4a35911c4",
    seq: 0,
  },
  ece: {
    name: "유아교육과",
    domain: "https://knece.kangnam.ac.kr",
    menu_id: "1e179ef9d06b26f3ae133a18a5ee1ba7",
    seq: 0,
  },
  sped_elem: {
    name: "초등중등특수교육과",
    domain: "https://sped.kangnam.ac.kr",
    menu_id: "f1b0fb76ba66f0a7319fc278bed29175",
    seq: 0,
  },
  clas: {
    name: "KNU참인재대학",
    domain: "https://clas.kangnam.ac.kr",
    menu_id: "0a9724422ac736bd5d7eb039deab70db",
    seq: 0,
  },
  wel_tech: {
    name: "융복합전공",
    domain: "https://wel-tech.kangnam.ac.kr",
    menu_id: "7bf0844d28678ab4ffa96ceae9e0da25",
    seq: 0,
  },
  pe: {
    name: "체육학과",
    domain: "https://ksps.kangnam.ac.kr",
    menu_id: "3c5c4cf0bebe416ae09666bee7b38984",
    seq: 0,
  },
  music: {
    name: "음악학과",
    domain: "https://musicdpt.kangnam.ac.kr",
    menu_id: "ac37fa802cc891d4909f48061ae97ecc",
    seq: 0,
  },
};

// id(영문) → 한글 라벨. 공통 카테고리 + 학과( deptData.name ) → 공지 카드 등에서 한글 표시
export const CATEGORY_LABEL: Record<string, string> = {
  ...Object.fromEntries(categories.map((c) => [c.id, c.label])),
  ...Object.fromEntries(
    Object.entries(deptData).map(([id, d]) => [id, d.name])
  ),
};

// 학과별 아이콘 매핑 (필요시 수정 가능)
const deptIconMap: Record<string, string> = {
  dls: "star-outline",
  social_work: "people-outline",
  senior_biz: "business-outline",
  global_biz: "globe-outline",
  law_tax: "document-text-outline",
  culture_content: "film-outline",
  intl_area: "earth-outline",
  china_biz: "flag-outline",
  christian_comm: "book-outline",
  computer: "desktop-outline",
  ai: "hardware-chip-outline",
  esc: "flash-outline",
  real_estate: "home-outline",
  edu: "school-outline",
  ece: "happy-outline",
  sped_elem: "accessibility-outline",
  clas: "trophy-outline",
  wel_tech: "apps-outline",
  pe: "fitness-outline",
  music: "musical-notes-outline",
};

// [알림 화면] 설정용 데이터 (아이콘 포함)
export const category = {
  general: [
    { id: "academic", label: "학사", icon: "school-outline" },
    { id: "scholar", label: "장학", icon: "gift-outline" },
    { id: "learning", label: "학습/상담", icon: "book-outline" },
    { id: "job", label: "취창업", icon: "briefcase-outline" },
    //{ id: "library", label: "도서관", icon: "library-outline" },
    //{ id: "daeple", label: "대플", icon: "rocket-outline" },
    { id: "event_internal", label: "행사(교내)", icon: "calendar-outline" },
    { id: "event_external", label: "행사(교외)", icon: "globe-outline" },
    
  ],
  dept: Object.entries(deptData)
    .sort(([, a], [, b]) => a.seq - b.seq || a.name.localeCompare(b.name))
    .map(([id, data]) => ({
      id,
      label: data.name,
      icon: deptIconMap[id] || "school-outline", // 기본 아이콘
    })),
};
// ✅ 캠퍼스 중심(임시: 캠퍼스 평균값) — 본관/경천관 lat/lng 확보되면 여기로 교체 추천
export const CAMPUS_CENTER = { lat: 37.2762898, lng: 127.1328313 };

// ✅ 건물 좌표 (공식 캠퍼스맵 URL의 lat/lng 기반 + 일부(본관/경천관)는 임시)
export const BUILDINGS: Building[] = [
  { name: "전체", code: undefined, lat: CAMPUS_CENTER.lat, lng: CAMPUS_CENTER.lng },

   { name: "본관", code: 109, lat: 37.276080, lng: 127.13325 },
   { name: "경천관", code: 101, lat: 37.27655, lng: 127.13400 },
  { name: "후생관", code: 102, lat: 37.2769444, lng: 127.133579 },      // 
  { name: "목양관", code: 103, lat: 37.2741664, lng: 127.13204 },        // :contentReference[oaicite:1]{index=1}
  { name: "인문사회관", code: 105, lat: 37.2754045, lng: 127.13078 },    // :contentReference[oaicite:2]{index=2}
  { name: "교육관", code: 106, lat: 37.2754196, lng: 127.133328 },       // 
  { name: "이공관", code: 107, lat: 37.2770644, lng: 127.134133 },       // 
  { name: "도서관", code: 108, lat: 37.2765470, lng: 127.132428 },       // :contentReference[oaicite:5]{index=5}
  { name: "예술관", code: 110, lat: 37.2761521, lng: 127.130995 },       // :contentReference[oaicite:6]{index=6}
  { name: "심전1관[A동]", code: 111, lat: 37.2781302, lng: 127.134753 }, // :contentReference[oaicite:7]{index=7}
  { name: "심전1관[B동]", code: 112, lat: 37.2778954, lng: 127.135193 }, // :contentReference[oaicite:8]{index=8}
  { name: "심전2관", code: 143, lat: 37.2784646, lng: 127.133818 },      // :contentReference[oaicite:9]{index=9}
  { name: "천은관", code: 113, lat: 37.2757700, lng: 127.134242 },       // :contentReference[oaicite:10]{index=10}
  { name: "우원관", code: 114, lat: 37.2758360, lng: 127.131648 },       // :contentReference[oaicite:11]{index=11}
  { name: "샬롬관", code: 127, lat: 37.2750178, lng: 127.130102 },       // :contentReference[oaicite:12]{index=12}
  { name: "승리관", code: 141, lat: 37.2745286, lng: 127.132469 },       // :contentReference[oaicite:13]{index=13}
  { name: "심전산학관", code: 143, lat: 37.2777646, lng: 127.133818 },
];

// categoryOptions는 category의 별칭 (기존 코드 호환성)
export const categoryOptions = category;
