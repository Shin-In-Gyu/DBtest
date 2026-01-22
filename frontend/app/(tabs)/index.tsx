import ErrorBanner from "@/components/ErrorBanner";
import NoticeCard from "@/components/NoticeCard";
import { colors } from "@/constants";
import { categories } from "@/constants/knuSources";
import { useKnuNotices } from "@/hooks/useKNUNoitces";
import type { NoticeListItem } from "@/types";
import { toUserFriendlyMessage } from "@/utils/errorMessage";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useBookmarks } from "../providers/BookmarksProvider";
import { useReadStatus } from "../providers/ReadStatusProvider";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type TabItem = { id: string; label: string };

/** renderItem 인라인 콜백 제거·메모 — VirtualizedList 경고 완화 */
const NoticeCardRow = React.memo(function NoticeCardRow({
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

/**
 * [컴포넌트] 개별 공지사항 리스트 페이지
 */
function NoticeListPage({
  tabKey,
  deptKey,
  isBookmarked,
  isRead,
  toggleBookmark,
}: {
  tabKey: string;
  deptKey: string | null;
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

        {/* [수정] router.push 인자를 객체 형태로 변경하여 TypeScript 에러(TS2345) 해결 */}
        <Pressable
          onPress={() => 
            router.push({
              pathname: "/dept-select",
              params: { selectedId: deptKey || "" }
            })
          }
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
        data={flatItems}
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
        contentContainerStyle={flatItems.length === 0 ? s.emptyContainer : s.listContent}
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

export default function HomeScreen() {
  const tabs: TabItem[] = useMemo(() => {
    const deptTab = { id: "dept", label: "학과" };
    const idx = categories.findIndex((t) => t.id === "all");
    if (idx === -1) return [deptTab, ...categories];
    return [...categories.slice(0, idx + 1), deptTab, ...categories.slice(idx + 1)];
  }, []);

  const [tabKey, setTabKey] = useState<TabItem["id"]>(tabs[0]?.id ?? "all");
  const [deptKey, setDeptKey] = useState<string | null>(null);

  const pagerRef = useRef<FlatList>(null);
  const tabListRef = useRef<FlatList>(null);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        try {
          const stored = await AsyncStorage.getItem("@knu_selected_dept_v1");
          if (stored) setDeptKey(stored);
        } catch {}
      })();
    }, [])
  );

  const { isBookmarked, toggleBookmark } = useBookmarks();
  const { isRead } = useReadStatus();

  const onTabPress = (id: string, index: number) => {
    setTabKey(id);
    pagerRef.current?.scrollToIndex({ index, animated: true });
  };

  const onMomentumScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextIndex = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    const nextTab = tabs[nextIndex];
    if (nextTab && nextTab.id !== tabKey) {
      setTabKey(nextTab.id);
      tabListRef.current?.scrollToIndex({
        index: nextIndex,
        animated: true,
        viewPosition: 0.5,
      });
    }
  };

  return (
    <View style={s.container}>
      <View style={s.tabWrap}>
        <FlatList
          ref={tabListRef}
          horizontal
          data={tabs}
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.tabList}
          renderItem={({ item, index }) => {
            const active = item.id === tabKey;
            return (
              <Pressable
                onPress={() => onTabPress(item.id, index)}
                style={({ pressed }) => [
                  s.tabBtn,
                  active && s.tabBtnActive,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text style={[s.tabText, active && s.tabTextActive]}>{item.label}</Text>
              </Pressable>
            );
          }}
        />
      </View>

      <FlatList
        ref={pagerRef}
        data={tabs}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => `page-${item.id}`}
        onMomentumScrollEnd={onMomentumScrollEnd}
        renderItem={({ item }) => (
          <NoticeListPage
            tabKey={item.id}
            deptKey={deptKey}
            isBookmarked={isBookmarked}
            isRead={isRead}
            toggleBookmark={toggleBookmark}
          />
        )}
        windowSize={3}
        initialNumToRender={1}
        getItemLayout={(_, index) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * index,
          index,
        })}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f7f8fa" },
  tabWrap: {
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eef0f3",
  },
  tabList: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  tabBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#f1f5f9",
  },
  tabBtnActive: { backgroundColor: colors.KNU },
  tabText: { fontSize: 13, fontWeight: "700", color: "#334155" },
  tabTextActive: { color: "#fff" },

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