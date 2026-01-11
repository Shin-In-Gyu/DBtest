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
  detailUrl: string; // ✅ 백엔드 link를 여기로 매핑
  date?: string;
  category?: string;
  author?: string | null;
  univ_views?: number; // 참고용
  app_views?: number; // 참고용
  views?: number; // 총 조회수 (univ_views + app_views)
  is_scraped?: boolean;
};

export type NoticeListResponse = {
  count: number;
  items: NoticeListItem[];
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
  univ_views?: number; // 참고용
  app_views?: number; // 참고용
  views?: number; // 총 조회수 (univ_views + app_views)
  is_scraped?: boolean;
  summary?: string | null;
  is_image_only?: boolean; // 이미지만 있고 텍스트가 전혀 없는 경우
  is_image_heavy?: boolean; // 이미지가 주로 이루고 있는 공지사항인 경우
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