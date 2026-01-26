import { useBookmarks } from "@/app/providers/BookmarksProvider";
import { useReadStatus } from "@/app/providers/ReadStatusProvider";
import NoticeCard from "@/components/NoticeCard";
import { useColors } from "@/constants";
import { router } from "expo-router";
import React, { useMemo } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";

function bookmarkKey(item: any, index: number) {
  // detailUrl이 제일 안전한 키지만, 혹시 없으면 id/title로 fallback
  return (
    item?.detailUrl ??
    (typeof item?.id === "number" ? `id::${item.id}` : null) ??
    `title::${item?.title ?? "no"}::${index}`
  );
}

export default function BookmarksScreen() {
  const colors = useColors();
  const { ready, bookmarks, isBookmarked, toggleBookmark } = useBookmarks();
  const { isRead } = useReadStatus();

  const data = useMemo(() => {
    // savedAt 최신순 유지 (Provider에서 이미 최신이 위로 들어감)
    return bookmarks ?? [];
  }, [bookmarks]);

  return (
    <View style={[s.container, { backgroundColor: colors.BACKGROUND }]}>
      {!ready ? (
        <Text style={[s.helper, { color: colors.TEXT_SECONDARY }]}>불러오는 중...</Text>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item, index) => bookmarkKey(item, index)}
          contentContainerStyle={data.length === 0 ? s.empty : s.list}
          ListEmptyComponent={<Text style={[s.helper, { color: colors.TEXT_SECONDARY }]}>북마크가 없습니다.</Text>}
          renderItem={({ item }) => (
            <NoticeCard
              item={item}
              // ✅ detailUrl이 없을 수도 있으니 안전하게
              bookmarked={
                item?.detailUrl ? isBookmarked(item.detailUrl) : false
              }
              isRead={item?.detailUrl ? isRead(item.detailUrl) : false}
              onPress={() => {
                if (!item?.detailUrl) return; // 상세는 url 없으면 못 열어
                router.push({
                  pathname: "/notice-detail",
                  params: {
                    url: item.detailUrl,
                    noticeId: item.id?.toString() || "",
                    title: item.title || "",
                  },
                });
              }}
              onToggleBookmark={() => {
                // ✅ 홈 화면과 동일하게 전체 item 전달
                toggleBookmark(
                  item,
                  // ✅ sourceKey가 없을 수도 있으니 fallback
                  item.sourceKey ?? item.category ?? "all",
                );
              }}
            />
          )}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: 12, gap: 10 },
  empty: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  helper: { fontSize: 14 },
});
