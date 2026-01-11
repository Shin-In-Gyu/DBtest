import ErrorBanner from "@/components/ErrorBanner";
import NoticeCard from "@/components/NoticeCard";
import NoticeDetailModal from "@/components/NoticeDetailModal";
import { colors } from "@/constants";
import { useKnuNotices } from "@/hooks/useKNUNoitces";
import { useKnuNoticeDetail } from "@/hooks/useKNUNoticeDetail";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";

export default function HomeScreen() {
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);

  const {
    flatItems,
    isFetching,
    isRefetching,
    isFetchingNextPage,
    error,
    fetchNextPage,
    hasNextPage,
    refetch,
  } = useKnuNotices({ pageSize: 20, searchMenuSeq: 0 });

  const detailQuery = useKnuNoticeDetail(selectedUrl);

  const footer = useMemo(() => {
    if (isFetchingNextPage) {
      return (
        <View style={s.footer}>
          <ActivityIndicator color={colors.KNU} />
          <Text style={s.footerText}>불러오는 중...</Text>
        </View>
      );
    }

    // 더 가져올 게 없으면(끝) 표시(원하면 null로 해도 됨)
    if (!hasNextPage) {
      return (
        <View style={s.footer}>
          <Text style={s.footerText}>마지막입니다</Text>
        </View>
      );
    }

    // ✅ 스크롤 안 생겨도 누를 수 있는 버튼
    return (
      <View style={s.footer}>
        <Pressable
          onPress={() => fetchNextPage()}
          style={({ pressed }) => [s.loadMoreBtn, pressed && { opacity: 0.7 }]}
        >
          <Text style={s.loadMoreText}>더 불러오기</Text>
        </Pressable>
      </View>
    );
  }, [isFetchingNextPage, hasNextPage, fetchNextPage]);

  return (
    <View style={s.container}>
      {!!error && (
        <ErrorBanner
          message={
            error instanceof Error ? error.message : "오류가 발생했습니다."
          }
          onRetry={() => refetch()}
        />
      )}

      <FlatList
        data={flatItems}
        // ✅ index 쓰지 말기 (중요)
        keyExtractor={(item) => item.detailUrl}
        renderItem={({ item }) => (
          <NoticeCard item={item} onPress={(url) => setSelectedUrl(url)} />
        )}
        contentContainerStyle={
          flatItems.length === 0 ? s.emptyContainer : s.listContent
        }
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => refetch()}
            tintColor={colors.KNU}
          />
        }
        // ✅ 무한 스크롤 안정화
        onEndReachedThreshold={0.8}
        onEndReached={() => {
          // 연속 호출 방지(특히 iOS/짧은 리스트에서 자주 발생)
          if (!hasNextPage) return;
          if (isFetchingNextPage) return;
          fetchNextPage();
        }}
        // ✅ 성능 옵션(쌓일수록 중요)
        initialNumToRender={12}
        maxToRenderPerBatch={12}
        windowSize={7}
        removeClippedSubviews
        ListEmptyComponent={
          <Text style={s.helperText}>
            {isFetching ? "불러오는 중..." : "표시할 공지사항이 없습니다."}
          </Text>
        }
        ListFooterComponent={footer}
      />

      <NoticeDetailModal
        visible={!!selectedUrl}
        loading={detailQuery.isLoading}
        detail={detailQuery.data}
        onClose={() => setSelectedUrl(null)}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f7f8fa" },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#f7f8fa",
  },
  helperText: { color: "#6b7280", fontSize: 14, marginTop: 4 },
  listContent: { padding: 12, gap: 10 },
  emptyContainer: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  footer: {
    paddingVertical: 16,
    alignItems: "center",
    gap: 10,
  },
  footerText: {
    color: "#6b7280",
    fontSize: 13,
  },
  loadMoreBtn: {
    backgroundColor: colors.KNU,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  loadMoreText: {
    color: colors.WHITE,
    fontWeight: "800",
  },
});
