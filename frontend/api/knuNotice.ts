// src/api/knuNotice.ts
import Constants from "expo-constants";
import { Platform } from "react-native";

export type NoticeListItem = {
  title: string;
  detailUrl: string;
};

export type NoticeListResponse = {
  count: number;
  items: NoticeListItem[];
};

export type NoticeDetail = {
  title: string;
  content: string;
  files: { name: string; url: string }[];
};

const API_HOST =
  (Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined)
    ?.apiBaseUrl ??
  (Platform.OS === "android"
    ? "http://10.0.2.2:8000"
    : "http://localhost:8000");

// ✅ KNU 라우터 prefix
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
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`요청 실패 (${res.status})\n${text.slice(0, 300)}`);
  }
  return (await res.json()) as T;
}

export async function getKnuNotices(params: {
  page: number;
  limit: number;
  searchMenuSeq: number;
}): Promise<NoticeListResponse> {
  const url = buildUrl("/notices", {
    page: params.page,
    limit: params.limit,
    searchMenuSeq: params.searchMenuSeq,
  });
  return safeFetch<NoticeListResponse>(url);
}

export async function getKnuNoticeDetail(
  detailUrl: string,
): Promise<NoticeDetail> {
  const url = buildUrl("/notice", { url: detailUrl });
  return safeFetch<NoticeDetail>(url);
}
