import {
  getKnuNotices,
  type NoticeListItem,
  type NoticeListResponse,
} from "@/api/knuNotice";
import { useInfiniteQuery, type InfiniteData } from "@tanstack/react-query";
import { useMemo } from "react";

function dedupe(items: NoticeListItem[]) {
  const seen = new Set<string>();
  return items.filter((it) => {
    const key = it.detailUrl || it.title;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function useKnuNotices(options?: {
  pageSize?: number;
  searchMenuSeq?: number;
}) {
  const pageSize = options?.pageSize ?? 20;
  const searchMenuSeq = options?.searchMenuSeq ?? 0;

  const queryKey = ["knuNotices", { searchMenuSeq, pageSize }] as const;

  const query = useInfiniteQuery<
    NoticeListResponse,
    Error,
    InfiniteData<NoticeListResponse, number>,
    typeof queryKey,
    number
  >({
    queryKey,
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      getKnuNotices({
        page: pageParam,
        limit: pageSize,
        searchMenuSeq,
      }),

    // ✅ 1 -> 2 -> 3 ... 로 확실히 넘어가게
    // ✅ 단, 새 글이 하나도 없으면 종료(무한루프 방지)
    getNextPageParam: (lastPage, allPages, lastPageParam) => {
      const prevSet = new Set(
        allPages
          .slice(0, -1)
          .flatMap((p) => p.items ?? [])
          .map((it) => it.detailUrl),
      );

      const newCount = (lastPage.items ?? []).filter(
        (it) => !prevSet.has(it.detailUrl),
      ).length;

      // 마지막 페이지거나(0개) / 다음 페이지가 사실상 같은 페이지면 종료
      if (newCount === 0) return undefined;

      return lastPageParam + 1;
    },
  });

  const flatItems = useMemo(() => {
    const items = query.data?.pages.flatMap((p) => p.items ?? []) ?? [];
    return dedupe(items);
  }, [query.data]);

  const totalCount = flatItems.length; // ✅ count 신뢰 못 하니까 그냥 현재 누적 개수로

  return { ...query, flatItems, totalCount };
}
