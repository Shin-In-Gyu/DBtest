import { getKnuNotices } from "@/api/knuNotice";
import { NoticeListItem, NoticeListResponse } from "@/types";
import { useInfiniteQuery, type InfiniteData } from "@tanstack/react-query";
import { useMemo } from "react";

function dedupe(items: NoticeListItem[], sourceKey: string) {
  const seen = new Set<string>();
  return items.filter((it) => {
    const key =
      (it.detailUrl && `${sourceKey}::${it.detailUrl}`) ||
      `${sourceKey}::title::${it.title}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ✅ detailUrl 없을 때도 중복비교가 되게 키 생성 함수
function itemKey(it: NoticeListItem) {
  return it.detailUrl ?? `title::${it.title ?? ""}`;
}

export function useKnuNotices(options?: {
  pageSize?: number; // ✅ 프론트에서 "마지막 페이지 판정"에만 사용
  sourceKey?: string;
  q?: string;
  sortBy?: "date" | "views";
  token?: string;

  enabled?: boolean; // ✅ 추가
}) {
  const pageSize = options?.pageSize ?? 20;
  const sourceKey = options?.sourceKey ?? "univ";
  const q = options?.q ?? undefined;
  const sortBy = options?.sortBy ?? "date";
  const token = options?.token ?? undefined;

  const enabled = options?.enabled ?? true; // ✅ 기본 true

  const queryKey = [
    "knuNotices",
    { sourceKey, q, sortBy, token, pageSize },
  ] as const;

  const query = useInfiniteQuery<
    NoticeListResponse,
    Error,
    InfiniteData<NoticeListResponse, number>,
    typeof queryKey,
    number
  >({
    queryKey,
    initialPageParam: 1,

    enabled, // ✅ 핵심: false면 queryFn 자체 실행 안 됨

    queryFn: ({ pageParam }) =>
      getKnuNotices({
        page: pageParam,
        category: sourceKey,
        q,
        sort_by: sortBy,
        token,
      }),

    getNextPageParam: (lastPage, allPages, lastPageParam) => {
      const lastItems = lastPage.items ?? [];

      // ✅ "마지막 페이지"는 보통 20개보다 적게 옴
      if (lastItems.length < pageSize) return undefined;

      // ✅ 중복 페이지 방지 (detailUrl 없는 경우도 안전)
      const prevSet = new Set(
        allPages
          .slice(0, -1)
          .flatMap((p) => p.items ?? [])
          .map(itemKey),
      );

      const newCount = lastItems.filter(
        (it) => !prevSet.has(itemKey(it)),
      ).length;
      if (newCount === 0) return undefined;

      return lastPageParam + 1;
    },
  });

  const flatItems = useMemo(() => {
    // ✅ enabled=false면 화면에 아무것도 안 뜨게
    if (!enabled) return [];

    const items = query.data?.pages.flatMap((p) => p.items ?? []) ?? [];
    return dedupe(items, sourceKey);
  }, [enabled, query.data, sourceKey]);

  const totalCount = flatItems.length;

  return { ...query, flatItems, totalCount };
}
