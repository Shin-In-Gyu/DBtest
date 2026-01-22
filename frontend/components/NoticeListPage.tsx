import ErrorBanner from "@/components/ErrorBanner";
import { NoticeCardRow } from "@/components/NoticeCardRow";
import { colors } from "@/constants";
import { categories } from "@/constants/knuSources";
import { useKnuNotices } from "@/hooks/useKNUNoitces";
import { toUserFriendlyMessage } from "@/utils/errorMessage";
import { Dimensions } from "react-native";
import React, { useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

/**
 * [컴포넌트] 개별 공지사항 리스트 페이지
 */
export function NoticeListPage({
  tabKey,
  deptKey,
  selectedDepts,
  onAddDept,
  isBookmarked,
  isRead,
  toggleBookmark,
}: {
  tabKey: string;
  deptKey: string | null;
  selectedDepts: string[];
  onAddDept: () => void;
  isBookmarked: (url: string) => boolean;
  isRead: (url: string) => boolean;
  toggleBookmark: (item: any, source: string) => void;
}) {
  const noticesEnabled = tabKey !== "dept" || !!deptKey;
  const effectiveSourceKey = tabKey === "dept" ? (deptKey ?? "__unset__") : tabKey;
  const listKey = tabKey === "dept" ? `dept:${deptKey ?? "unset"}` : tabKey;

  const {
    flatItems,
    isFetching,
    isRefetching,
    isFetchingNextPage,
    error,
    fetchNextPage,
    hasNextPage,
    refetch,
  } = useKnuNotices({
    pageSize: 20,
    sourceKey: effectiveSourceKey,
    enabled: noticesEnabled,
  });

  // 전체 탭에서 선택한 학과 + 일반 카테고리(학사, 장학 등) 모두 표시
  const filteredItems = useMemo(() => {
    if (tabKey === "all" && selectedDepts.length > 0) {
      // 일반 카테고리 ID 목록 (학사, 장학, 학습/상담, 취창업, 행사(교내), 행사(교외))
      const generalCategoryIds = categories
        .filter(cat => cat.id !== "all")
        .map(cat => cat.id);
      
      return flatItems.filter(item => {
        if (!item.category) return false;
        // 일반 카테고리이거나 선택한 학과이면 표시
        return generalCategoryIds.includes(item.category as any) || 
               selectedDepts.includes(item.category);
      });
    }
    return flatItems;
  }, [flatItems, tabKey, selectedDepts]);

  const footer = useMemo(() => {
    if (!noticesEnabled) return null;
    if (isFetchingNextPage) {
      return (
        <View style={s.footer}>
          <ActivityIndicator color={colors.KNU} />
          <Text style={s.footerText}>불러오는 중...</Text>
        </View>
      );
    }
    if (!hasNextPage) {
      return (
        <View style={s.footer}>
          <Text style={s.footerText}>마지막입니다</Text>
        </View>
      );
    }
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
  }, [noticesEnabled, isFetchingNextPage, hasNextPage, fetchNextPage]);

  if (tabKey === "dept" && !deptKey) {
    return (
      <View style={[s.deptEmptyWrap, { width: SCREEN_WIDTH }]}>
        <Text style={s.deptEmptyTitle}>학과를 설정하세요.</Text>
        <Text style={s.deptEmptyDesc}>
          학과를 선택하면 해당 학과 공지사항을 보여드릴게요.
        </Text>

        <Pressable
          onPress={onAddDept}
          style={({ pressed }) => [s.deptBtn, pressed && { opacity: 0.8 }]}
        >
          <Text style={s.deptBtnText}>학과설정하기</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ width: SCREEN_WIDTH, flex: 1 }}>
      {!!error && noticesEnabled && (
        <ErrorBanner
          message={toUserFriendlyMessage(error)}
          onRetry={() => refetch()}
        />
      )}

      <FlatList
        data={filteredItems}
        keyExtractor={(item, index) => `${listKey}::${item.detailUrl}::${index}`}
        renderItem={({ item }) => (
          <NoticeCardRow
            item={item}
            bookmarked={isBookmarked(item.detailUrl)}
            isRead={isRead(item.detailUrl)}
            tabKey={tabKey}
            deptKey={deptKey}
            toggleBookmark={toggleBookmark}
          />
        )}
        contentContainerStyle={filteredItems.length === 0 ? s.emptyContainer : s.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => refetch()}
            tintColor={colors.KNU}
          />
        }
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) fetchNextPage();
        }}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          <Text style={s.helperText}>
            {isFetching ? "불러오는 중..." : "표시할 공지사항이 없습니다."}
          </Text>
        }
        ListFooterComponent={footer}
        removeClippedSubviews={true}
        windowSize={11}
        maxToRenderPerBatch={10}
      />
    </View>
  );
}

const s = StyleSheet.create({
  deptEmptyWrap: {
    flex: 1,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  deptEmptyTitle: { fontSize: 18, fontWeight: "900", color: "#111827" },
  deptEmptyDesc: { color: "#6b7280", fontSize: 13, textAlign: "center" },
  deptBtn: {
    marginTop: 6,
    backgroundColor: colors.KNU,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  deptBtnText: { color: "#fff", fontWeight: "900" },
  helperText: { color: "#6b7280", fontSize: 14, marginTop: 4, textAlign: 'center' },
  listContent: { padding: 12, gap: 10 },
  emptyContainer: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  footer: { paddingVertical: 16, alignItems: "center", gap: 10 },
  footerText: { color: "#6b7280", fontSize: 13 },
  loadMoreBtn: {
    backgroundColor: colors.KNU,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  loadMoreText: { color: colors.WHITE, fontWeight: "800" },
});
