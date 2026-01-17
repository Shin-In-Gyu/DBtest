import { Ionicons } from "@expo/vector-icons";

export type Category = {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
};

export type RankItem = {
  id: string;
  keyword: string;
};

export type NoticeListItem = {
  id: number;
  title: string;
  detailUrl: string;
  date?: string;
  category?: string;
  author?: string | null;
  univ_views?: number;
  app_views?: number;
  views?: number;
  is_scraped?: boolean;
};

// ✅ 페이지네이션 정보 추가
export type PaginationInfo = {
  page: number;
  size: number;
  total_pages: number;
};

// ✅ 백엔드 응답 구조에 맞게 수정
export type NoticeListResponse = {
  count: number; // total 개수
  items: NoticeListItem[];
  pagination?: PaginationInfo; // 페이지네이션 정보 (선택적)
};

export type NoticeDetail = {
  id?: number;
  title: string;
  link?: string;
  date?: string;
  category?: string;
  author?: string | null;
  content: string;
  images?: string[];
  files: { name: string; url: string }[];
  univ_views?: number;
  app_views?: number;
  views?: number;
  is_scraped?: boolean;
  summary?: string | null;
  is_image_only?: boolean;
  is_image_heavy?: boolean;
};

export type BookmarkItem = NoticeListItem & {
  savedAt: number;
  sourceKey: string;
};

export type Building = {
  name: string;
  code?: number;
  lat?: number;
  lng?: number;
};

// ✅ API 관련 추가 타입들
export type CategoryInfo = {
  key: string;
  name: string;
};

export type Statistics = {
  total_notices: number;
  by_category: Record<string, number>;
  today_crawled: number;
  total_devices: number;
};

export type SubscriptionRequest = {
  token: string;
  categories: string[];
};

export type SubscriptionResponse = {
  message: string;
  count: number;
};

export type ScrapToggleResponse = {
  status: "added" | "removed";
  message: string;
};

export type SummaryResponse = {
  summary: string;
};

// ✅ 검색 관련
export type SearchParams = {
  q?: string;
  category?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  size?: number;
};

export type AdvancedSearchResponse = {
  items: NoticeListItem[];
  page: number;
  size: number;
};