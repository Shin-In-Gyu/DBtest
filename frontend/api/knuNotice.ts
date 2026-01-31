// src/api/knuNotice.ts
import {
  AdvancedSearchResponse,
  CategoryInfo,
  NoticeDetail,
  NoticeListItem,
  NoticeListResponse,
  ScrapToggleResponse,
  SearchParams,
  Statistics,
  SubscriptionRequest,
  SubscriptionResponse,
  SummaryResponse,
} from "@/types";
import KNU_API_BASE from "./base-uri";

type QueryValue = string | number | boolean | undefined | null;

/**
 * URL 조합 함수 - 쿼리 파라미터 추가
 */
function buildUrl(path: string, params?: Record<string, QueryValue>): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const baseUrl = KNU_API_BASE.endsWith("/") 
    ? KNU_API_BASE.slice(0, -1) 
    : KNU_API_BASE;
  const fullPath = `${baseUrl}${normalizedPath}`;
  
  const url = new URL(fullPath);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v === undefined || v === null) return;
      url.searchParams.set(k, String(v));
    });
  }
  
  return url.toString();
}

/**
 * fetch 래퍼
 */
async function safeFetch<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`요청 실패 (${res.status})\n${text.slice(0, 300)}`);
  }
  return (await res.json()) as T;
}

// ============================================================
// 백엔드 응답 타입 (내부용)
// ============================================================
type RawNotice = {
  id: number;
  title: string;
  link: string;
  date?: string;
  category?: string;
  author?: string | null;
  univ_views?: number;
  app_views?: number;
  views?: number;
  is_scraped?: boolean;
  is_pinned?: boolean; // [추가] 필독 공지 여부
};

type BackendNoticeListResponse = {
  items: RawNotice[];
  total: number;
  page: number;
  size: number;
  total_pages: number;
};

// ============================================================
// 공지사항 목록 조회
// ============================================================
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

  // 백엔드(K-Now)는 배열을 그대로 반환: List[NoticeListResponse].
  // { items: [] } 형태가 아님.
  const raw = await safeFetch<BackendNoticeListResponse | RawNotice[]>(url);
  const list = Array.isArray(raw) ? raw : (raw?.items ?? []);

  const items: NoticeListItem[] = list.map((r) => ({
    id: r.id,
    title: r.title,
    detailUrl: r.link,
    date: r.date,
    category: r.category,
    author: r.author,
    univ_views: r.univ_views,
    app_views: r.app_views,
    views: r.views ?? r.univ_views ?? r.app_views,
    is_scraped: r.is_scraped,
    is_pinned: r.is_pinned, // [추가] 필독 공지 여부
  }));

  const obj = Array.isArray(raw) ? null : raw;
  return {
    count: obj?.total ?? items.length,
    items,
    pagination: {
      page: obj?.page ?? 1,
      size: obj?.size ?? 20,
      total_pages: obj?.total_pages ?? 1,
    },
  };
}

// ============================================================
// 공지사항 상세 조회
// ============================================================
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

// ============================================================
// 조회수 증가
// ============================================================
export async function incrementNoticeView(noticeId: number): Promise<void> {
  if (!noticeId) {
    console.warn("조회수 증가: noticeId가 없습니다");
    return;
  }

  try {
    const baseUrl = KNU_API_BASE.endsWith("/") ? KNU_API_BASE.slice(0, -1) : KNU_API_BASE;
    const url = `${baseUrl}/notice/${noticeId}/view`;
    
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
    console.error("조회수 증가 실패:", error);
  }
}

// ============================================================
// AI 요약 생성
// ============================================================
export async function generateNoticeSummary(
  noticeId: number
): Promise<SummaryResponse> {
  const baseUrl = KNU_API_BASE.endsWith("/") ? KNU_API_BASE.slice(0, -1) : KNU_API_BASE;
  const url = `${baseUrl}/notice/${noticeId}/summary`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`요약 생성 실패: ${res.status}\n${text}`);
  }

  return res.json();
}

// ============================================================
// 구독 목록 조회 (서버에 저장된 카테고리)
// ============================================================
export async function getSubscriptions(
  token: string
): Promise<{ categories: string[] }> {
  const url = buildUrl("/device/subscriptions", { token });
  return safeFetch(url);
}

// ============================================================
// 구독 설정 업데이트
// ============================================================
export async function updateSubscriptions(
  params: SubscriptionRequest
): Promise<SubscriptionResponse> {
  const baseUrl = KNU_API_BASE.endsWith("/") ? KNU_API_BASE.slice(0, -1) : KNU_API_BASE;
  const url = `${baseUrl}/device/subscriptions`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`구독 업데이트 실패: ${res.status}\n${text}`);
  }

  return res.json();
}

// ============================================================
// 스크랩 토글
// ============================================================
export async function toggleScrap(params: {
  noticeId: number;
  token: string;
}): Promise<ScrapToggleResponse> {
  const baseUrl = KNU_API_BASE.endsWith("/") ? KNU_API_BASE.slice(0, -1) : KNU_API_BASE;
  const url = `${baseUrl}/scrap/${params.noticeId}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ token: params.token }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`스크랩 실패: ${res.status}\n${text}`);
  }

  return res.json();
}

// ============================================================
// 내 스크랩 목록 조회
// ============================================================
export async function getMyScraps(
  token: string
): Promise<NoticeListResponse> {
  const url = buildUrl("/scraps", { token });
  
  // 스크랩: 배열 또는 { items: [] } 형태 모두 처리
  const raw = await safeFetch<RawNotice[] | { items?: RawNotice[] }>(url);
  const list = Array.isArray(raw) ? raw : (raw?.items ?? []);

  const items: NoticeListItem[] = list.map((r) => ({
    id: r.id,
    title: r.title,
    detailUrl: r.link,
    date: r.date,
    category: r.category,
    author: r.author,
    univ_views: r.univ_views,
    app_views: r.app_views,
    views: r.views ?? r.univ_views ?? r.app_views,
    is_scraped: true,
    is_pinned: r.is_pinned, // [추가] 필독 공지 여부
  }));

  return {
    count: items.length,
    items,
  };
}

// ============================================================
// 카테고리 목록 조회
// ============================================================
export async function getCategories(): Promise<CategoryInfo[]> {
  const baseUrl = KNU_API_BASE.endsWith("/") ? KNU_API_BASE.slice(0, -1) : KNU_API_BASE;
  const url = `${baseUrl}/categories`;
  return safeFetch(url);
}

// ============================================================
// 통계 조회
// ============================================================
export async function getStatistics(): Promise<Statistics> {
  const baseUrl = KNU_API_BASE.endsWith("/") ? KNU_API_BASE.slice(0, -1) : KNU_API_BASE;
  const url = `${baseUrl}/stats`;
  return safeFetch(url);
}

// ============================================================
// 고급 검색
// ============================================================
export async function advancedSearch(
  params: SearchParams
): Promise<AdvancedSearchResponse> {
  const url = buildUrl("/search/advanced", params);
  const raw = await safeFetch<{
    items?: RawNotice[];
    page: number;
    size: number;
  }>(url);
  const list = raw?.items ?? [];

  const items: NoticeListItem[] = list.map((r) => ({
    id: r.id,
    title: r.title,
    detailUrl: r.link,
    date: r.date,
    category: r.category,
    author: r.author,
    univ_views: r.univ_views,
    app_views: r.app_views,
    views: r.views ?? r.univ_views ?? r.app_views,
    is_scraped: r.is_scraped,
    is_pinned: r.is_pinned, // [추가] 필독 공지 여부
  }));

  return {
    items,
    page: raw.page,
    size: raw.size,
  };
}

// ============================================================
// 기기 등록
// ============================================================
export async function registerDevice(token: string): Promise<void> {
  const baseUrl = KNU_API_BASE.endsWith("/") ? KNU_API_BASE.slice(0, -1) : KNU_API_BASE;
  const url = `${baseUrl}/device/register`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ token }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`기기 등록 실패: ${res.status}\n${text}`);
  }
}

// ============================================================
// 피드백 전송
// ============================================================
export async function submitFeedback(params: {
  title: string;
  content: string;
}): Promise<{ success: boolean; message?: string }> {
  const baseUrl = KNU_API_BASE.endsWith("/") ? KNU_API_BASE.slice(0, -1) : KNU_API_BASE;
  const url = `${baseUrl}/feedback`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`피드백 전송 실패: ${res.status}\n${text}`);
  }

  return res.json();
}