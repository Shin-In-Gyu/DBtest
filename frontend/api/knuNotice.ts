// frontend/api/knuNotice.ts
import Constants from "expo-constants";
import { Platform } from "react-native";

// [수정] 내 컴퓨터 IP 주소 (반드시 확인!)
const LOCAL_IP = "192.168.45.218"; // 방금 성공한 IP 유지

export type NoticeListItem = {
  id: number;
  title: string;
  link: string;
  date: string;
  author: string;
  category: string;
  is_scraped?: boolean; // 백엔드에서 주는 필드 추가
  univ_views: number;
};

// [수정] 백엔드는 배열을 바로 반환하므로 타입을 배열로 변경
export type NoticeListResponse = NoticeListItem[];

const API_HOST =
  (Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined)
    ?.apiBaseUrl ??
  (Platform.OS === "android"
    ? "http://10.0.2.2:8000"
    : `http://${LOCAL_IP}:8000`);

const KNU_API_BASE = `${API_HOST}/api/knu`.replace(/([^:]\/)\/+/g, "$1");

function buildUrl(path: string, params?: Record<string, string | number>) {
  const url = new URL(`${KNU_API_BASE}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) =>
      url.searchParams.set(k, String(v)),
    );
  }
  return url.toString();
}

async function safeFetch<T>(url: string): Promise<T> {
  console.log(`[API Request] ${url}`);
  try {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`요청 실패 (${res.status})`);
    }
    return (await res.json()) as T;
  } catch (error) {
    console.error(`[API Error] ${error}`);
    throw error;
  }
}

// [수정] 파라미터를 category로 변경
export async function getKnuNotices(params: {
  page: number;
  limit: number;
  category: string; // searchMenuSeq 삭제 -> category 추가
}): Promise<NoticeListResponse> {
  const url = buildUrl("/notices", {
    page: params.page,
    category: params.category, // 백엔드 쿼리 파라미터 매핑
  });
  return safeFetch<NoticeListResponse>(url);
}

export async function getKnuNoticeDetail(
  detailUrl: string,
): Promise<NoticeDetail> {
  // 백엔드: /api/knu/notice/detail
  const url = buildUrl("/notice/detail", { url: detailUrl });
  return safeFetch<NoticeDetail>(url);
}

// NoticeDetail 타입 정의 (프론트엔드에서 사용하는 형태)
export type NoticeDetail = {
  title: string;
  content?: string; // 단일 content 필드가 있는 경우
  texts?: string[]; // 분리된 텍스트 배열
  images?: string[]; // 본문 이미지 URL 배열
  files?: { name: string; url: string }[]; // 첨부파일
};