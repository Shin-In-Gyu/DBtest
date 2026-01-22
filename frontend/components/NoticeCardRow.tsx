import NoticeCard from "@/components/NoticeCard";
import type { NoticeListItem } from "@/types";
import { router } from "expo-router";
import React, { useCallback } from "react";

/** renderItem 인라인 콜백 제거·메모 — VirtualizedList 경고 완화 */
export const NoticeCardRow = React.memo(function NoticeCardRow({
  item,
  bookmarked,
  isRead,
  tabKey,
  deptKey,
  toggleBookmark,
}: {
  item: NoticeListItem;
  bookmarked: boolean;
  isRead: boolean;
  tabKey: string;
  deptKey: string | null;
  toggleBookmark: (item: any, source: string) => void;
}) {
  const handlePress = useCallback(() => {
    router.push({
      pathname: "/notice-detail",
      params: {
        url: item.detailUrl,
        noticeId: item.id?.toString() || "",
        title: item.title || "",
      },
    });
  }, [item.detailUrl, item.id, item.title]);

  const handleToggle = useCallback(() => {
    toggleBookmark(
      { ...item, detailUrl: item.detailUrl },
      tabKey === "dept" ? (deptKey ?? "dept") : tabKey
    );
  }, [item, tabKey, deptKey, toggleBookmark]);

  return (
    <NoticeCard
      item={item}
      bookmarked={bookmarked}
      isRead={isRead}
      onPress={handlePress}
      onToggleBookmark={handleToggle}
    />
  );
});
