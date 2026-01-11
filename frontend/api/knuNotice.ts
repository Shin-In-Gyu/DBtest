// src/api/knuNotice.ts
import { NoticeDetail, NoticeListItem, NoticeListResponse } from "@/types";
import KNU_API_BASE from "./base-uri";

type QueryValue = string | number | boolean | undefined | null;

function buildUrl(path: string, params?: Record<string, QueryValue>) {
  const url = new URL(`${KNU_API_BASE}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v === undefined || v === null) return;
      url.searchParams.set(k, String(v));
    });
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

// ✅ 백엔드 raw 타입 (네가 올린 JSON 그대로)
type RawNotice = {
  id: number;
  title: string;
  link: string;
  date?: string;
  category?: string;
  author?: string | null;
  univ_views?: number;
  app_views?: number;
  views?: number; // 총 조회수 (univ_views + app_views)
  is_scraped?: boolean;
};

export async function getKnuNotices(params: {
  page: number;
  category: string;
  q?: string;
  sort_by?: "date" | "views";
  token?: string;
}): Promise<NoticeListResponse> {
  const url = buildUrl("/notices", {
    category: params.category,
    page: params.page,
    sort_by: params.sort_by,
    q: params.q,
    token: params.token,
  });

  // ✅ 백엔드는 배열을 준다
  const raw = await safeFetch<RawNotice[]>(url);

  // ✅ 프론트에서 쓰는 형태로 변환
  const items: NoticeListItem[] = raw.map((r) => ({
    id: r.id,
    title: r.title,
    detailUrl: r.link, // ✅ 핵심: link -> detailUrl
    date: r.date,
    category: r.category,
    author: r.author,
    univ_views: r.univ_views, // 참고용
    app_views: r.app_views, // 참고용
    views: r.views, // 총 조회수 사용
    is_scraped: r.is_scraped,
  }));

  return {
    count: items.length,
    items,
  };
}

export async function getKnuNoticeDetail(params: {
  detailUrl: string;
  noticeId?: number;
  token?: string;
}) {
  const url = buildUrl("/notice/detail", {
    url: params.detailUrl,
    notice_id: params.noticeId,
    token: params.token,
  });
  return safeFetch<NoticeDetail>(url);
}

// 조회수 증가 API (새로 추가)
// 백엔드에서 /api/knu/notice/{notice_id}/view 엔드포인트가 필요합니다
export async function incrementNoticeView(noticeId: number): Promise<void> {
  if (!noticeId) {
    console.warn("조회수 증가: noticeId가 없습니다");
    return;
  }

  try {
    // buildUrl은 query params를 사용하므로 직접 URL 생성
    const url = `${KNU_API_BASE}/notice/${noticeId}/view`.replace(/([^:]\/)\/+/g, "$1");
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });
    if (!res.ok) {
      console.warn(`조회수 증가 실패: ${res.status}`);
    }
  } catch (error) {
    // 조회수 증가 실패는 무시 (사용자 경험에 영향 없음)
    console.error("조회수 증가 실패:", error);
  }
}
