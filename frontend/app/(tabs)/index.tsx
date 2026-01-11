import ErrorBanner from "@/components/ErrorBanner";
import NoticeCard from "@/components/NoticeCard";
import { colors } from "@/constants";
import { useKnuNotices } from "@/hooks/useKNUNoitces";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useBookmarks } from "../providers/BookmarksProvider";
import { useReadStatus } from "../providers/ReadStatusProvider";

import { categories } from "@/constants/knuSources";

type TabItem = { id: string; label: string };

export default function HomeScreen() {

  const tabs: TabItem[] = useMemo(() => {
    const deptTab = { id: "dept", label: "학과" };

    const idx = categories.findIndex((t) => t.id === "all");
    if (idx === -1) return [deptTab, ...categories]; // all 없으면 그냥 맨 앞

    return [
      ...categories.slice(0, idx + 1), // all 포함
      deptTab,
      ...categories.slice(idx + 1),
    ];
  }, []);

  const [tabKey, setTabKey] = useState<TabItem["id"]>(tabs[0]?.id ?? "all");

  const [deptKey, setDeptKey] = useState<string | null>(null);

  // 학과 선택 페이지에서 돌아왔을 때 업데이트
  useFocusEffect(
    useCallback(() => {
      (async () => {
        try {
          const stored = await AsyncStorage.getItem("@knu_selected_dept_v1");
          if (stored) {
            setDeptKey(stored);
          }
        } catch {
          // 무시
        }
      })();
    }, []),
  );

  const { isBookmarked, toggleBookmark } = useBookmarks();
  const { isRead } = useReadStatus();

  const noticesEnabled = tabKey !== "dept" || !!deptKey;
  const effectiveSourceKey =
    tabKey === "dept" ? (deptKey ?? "__unset__") : tabKey;
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
    enabled: noticesEnabled, // ✅ 핵심
  });

  const footer = useMemo(() => {
    if (!noticesEnabled) return null; // ✅ 선택 전엔 footer 자체 없음
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

  return (
    <View style={s.container}>
      {/* ✅ 상단 가로 탭바 */}
      <View style={s.tabWrap}>
        <FlatList
          horizontal
          data={tabs}
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.tabList}
          renderItem={({ item }) => {
            const active = item.id === tabKey;
            return (
              <Pressable
                onPress={() => {
                  setTabKey(item.id);
                }}
                style={({ pressed }) => [
                  s.tabBtn,
                  active && s.tabBtnActive,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text style={[s.tabText, active && s.tabTextActive]}>
                  {item.label}
                </Text>
              </Pressable>
            );
          }}
        />
      </View>

      {/* ✅ 학과 탭 & 선택 전 화면: fetch 안함/리스트 안뜸 */}
      {tabKey === "dept" && !deptKey ? (
        <View style={s.deptEmptyWrap}>
          <Text style={s.deptEmptyTitle}>학과를 설정하세요.</Text>
          <Text style={s.deptEmptyDesc}>
            학과를 선택하면 해당 학과 공지사항을 보여드릴게요.
          </Text>

          <Pressable
            onPress={() => router.push(`/dept-select?selectedId=${deptKey || ""}`)}
            style={({ pressed }) => [s.deptBtn, pressed && { opacity: 0.8 }]}
          >
            <Text style={s.deptBtnText}>학과설정하기</Text>
          </Pressable>
        </View>
      ) : (
        <>
          {/* ✅ 에러도 선택 후에만 보여주기 */}
          {!!error && noticesEnabled && (
            <ErrorBanner
              message={
                error instanceof Error ? error.message : "오류가 발생했습니다."
              }
              onRetry={() => refetch()}
            />
          )}

          <FlatList
            key={listKey}
            data={flatItems}
            keyExtractor={(item, index) =>
              `${listKey}::${item.detailUrl ?? item.title ?? "no"}::${index}`
            }
            renderItem={({ item }) => (
              <NoticeCard
                item={item}
                bookmarked={isBookmarked(item.detailUrl)}
                isRead={isRead(item.detailUrl)}
                onPress={() => {
                  router.push({
                    pathname: "/notice-detail",
                    params: {
                      url: item.detailUrl,
                      noticeId: item.id?.toString() || "",
                      title: item.title || "",
                    },
                  });
                }}
                onToggleBookmark={() =>
                  toggleBookmark(
                    {
                      ...item,
                      detailUrl: item.detailUrl,
                    },
                    tabKey === "dept" ? (deptKey ?? "dept") : tabKey,
                  )
                }
              />
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
            onEndReachedThreshold={0.8}
            onEndReached={() => {
              if (!hasNextPage) return;
              if (isFetchingNextPage) return;
              fetchNextPage();
            }}
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
        </>
      )}
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

  // ✅ 학과 선택 전 화면
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

  helperText: { color: "#6b7280", fontSize: 14, marginTop: 4 },
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
