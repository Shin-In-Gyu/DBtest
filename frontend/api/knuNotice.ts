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
  try {
    const res = await fetch(url);
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`요청 실패 (${res.status})\n${text.slice(0, 300)}`);
    }
    return (await res.json()) as T;
  } catch (error) {
    // 네트워크 에러나 연결 실패 시 더 자세한 정보 제공
    if (error instanceof TypeError && error.message.includes("fetch")) {
      console.error(`[API] 네트워크 에러 - URL: ${url}`, error);
      throw new Error(`네트워크 연결 실패: ${url}`);
    }
    throw error;
  }
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
    const url = `${KNU_API_BASE}/notice/${noticeId}/view`.replace(
      /([^:]\/)\/+/g,
      "$1"
    );
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
  const url = `${KNU_API_BASE}/notice/${noticeId}/summary`.replace(
    /([^:]\/)\/+/g,
    "$1"
  );

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
// 구독 설정 업데이트
// ============================================================
export async function updateSubscriptions(
  params: SubscriptionRequest
): Promise<SubscriptionResponse> {
  const url = `${KNU_API_BASE}/device/subscriptions`;

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
  const url = `${KNU_API_BASE}/scrap/${params.noticeId}`.replace(
    /([^:]\/)\/+/g,
    "$1"
  );

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
  const url = `${KNU_API_BASE}/categories`;
  return safeFetch(url);
}

// ============================================================
// 통계 조회
// ============================================================
export async function getStatistics(): Promise<Statistics> {
  const url = `${KNU_API_BASE}/stats`;
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
  const url = `${KNU_API_BASE}/device/register`;

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
  const url = `${KNU_API_BASE}/feedback`;

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