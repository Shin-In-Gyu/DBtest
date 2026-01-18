import { useBookmarks } from "@/app/providers/BookmarksProvider";
import { useReadStatus } from "@/app/providers/ReadStatusProvider";
import ErrorBanner from "@/components/ErrorBanner";
import NoticeCard from "@/components/NoticeCard";
import OtherHeader from "@/components/OtherHeader";
import { colors } from "@/constants";
import { useKnuNotices } from "@/hooks/useKNUNoitces";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const RECENT_SEARCHES_KEY = "@knu_recent_searches_v1";

export default function SearchScreen() {
  const [query, setQuery] = useState("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [recent, setRecent] = useState<string[]>([]);

  const { isBookmarked, toggleBookmark } = useBookmarks();
  const { isRead } = useReadStatus();

  // 최근 검색어 로드
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
        const parsed: string[] = raw ? JSON.parse(raw) : [];
        setRecent(Array.isArray(parsed) ? parsed : []);
      } catch {
        setRecent([]);
      }
    })();
  }, []);

  // 검색어 debounce 처리 (실시간 검색)
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setSearchQuery("");
      return;
    }

    const timer = setTimeout(() => {
      setSearchQuery(trimmed);
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [query]);

  // 최근 검색어 저장 (검색 실행 시에만)
  useEffect(() => {
    if (searchQuery) {
      const trimmed = searchQuery.trim();
      if (!trimmed) return;
      setRecent((prev) => {
        const newRecent = [trimmed, ...prev.filter((x) => x !== trimmed)].slice(
          0,
          10,
        );
        AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(newRecent)).catch(
          () => {},
        );
        return newRecent;
      });
    }
  }, [searchQuery]);

  const {
    flatItems: rawFlatItems,
    isFetching,
    isRefetching,
    isFetchingNextPage,
    error,
    fetchNextPage,
    hasNextPage,
    refetch,
  } = useKnuNotices({
    pageSize: 20,
    sourceKey: "all", // 전체 검색
    q: searchQuery || undefined,
    enabled: !!searchQuery, // 검색어가 있을 때만 실행
  });

  // [수정] 서버에서 이미 필터링된 결과를 사용하므로 클라이언트 측 중복 필터링 제거
  const flatItems = rawFlatItems;


  const onSubmit = () => {
    const trimmed = query.trim();
    if (!trimmed) return;
    setSearchQuery(trimmed);
  };

  const onRecentPress = (word: string) => {
    setQuery(word);
    setSearchQuery(word);
  };

  const clearRecent = () => {
    setRecent([]);
    AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify([])).catch(() => {});
  };

  const footer = useMemo(() => {
    if (!searchQuery) return null;
    if (isFetchingNextPage) {
      return (
        <View style={s.footer}>
          <ActivityIndicator color={colors.KNU} />
          <Text style={s.footerText}>불러오는 중...</Text>
        </View>
      );
    }
    if (!hasNextPage && flatItems.length > 0) {
      return (
        <View style={s.footer}>
          <Text style={s.footerText}>마지막입니다</Text>
        </View>
      );
    }
    if (hasNextPage) {
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
    }
    return null;
  }, [searchQuery, isFetchingNextPage, hasNextPage, fetchNextPage, flatItems.length]);

  const showResults = !!searchQuery;
  const showRecent = !showResults;

  return (
    <>
      <OtherHeader title="검색" back={true} />
      <SafeAreaView style={s.safe} edges={["left", "right", "bottom"]}>
        <View style={s.container}>
          <View style={s.searchBox}>
            <Ionicons name="search" size={20} color="#9CA3AF" />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="검색어를 입력하세요"
              placeholderTextColor="#9CA3AF"
              style={s.input}
              returnKeyType="search"
              onSubmitEditing={onSubmit}
            />
          </View>

          {showRecent && (
            <>
              <View style={s.sectionRow}>
                <Text style={s.sectionTitle}>최근 검색어</Text>
                {recent.length > 0 && (
                  <Pressable onPress={clearRecent} hitSlop={8}>
                    <Text style={s.link}>전체삭제</Text>
                  </Pressable>
                )}
              </View>

              {recent.length === 0 ? (
                <Text style={s.empty}>최근 검색어가 없습니다.</Text>
              ) : (
                <View style={s.chips}>
                  {recent.map((w) => (
                    <Pressable
                      key={w}
                      onPress={() => onRecentPress(w)}
                      style={s.chip}
                      hitSlop={6}
                    >
                      <Text style={s.chipText}>{w}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </>
          )}

          {showResults && (
            <>
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
                keyExtractor={(item, index) =>
                  `search::${item.detailUrl ?? item.title ?? "no"}::${index}`
                }
                renderItem={({ item }) => (
                  <NoticeCard
                    item={item}
                    bookmarked={isBookmarked(item.detailUrl)}
                    isRead={isRead(item.detailUrl)}
                    highlightQuery={searchQuery}
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
                        item.category ?? "all",
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
                    {isFetching
                      ? "검색 중..."
                      : `"${searchQuery}"에 대한 검색 결과가 없습니다.`}
                  </Text>
                }
                ListFooterComponent={footer}
              />
            </>
          )}
        </View>
      </SafeAreaView>
    </>
  );
}

const s = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.WHITE,
  },
  container: {
    flex: 1,
  },
  searchBox: {
    marginTop: 14,
    marginHorizontal: 12,
    height: 52,
    borderRadius: 14,
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.BLACK,
  },
  sectionRow: {
    marginTop: 20,
    marginHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.BLACK,
  },
  link: {
    fontSize: 14,
    fontWeight: "700",
    color: "#6B7280",
  },
  empty: {
    marginTop: 10,
    marginHorizontal: 12,
    color: "#9CA3AF",
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 10,
    marginHorizontal: 12,
  },
  chip: {
    backgroundColor: colors.WHITE,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  chipText: {
    color: colors.BLACK,
    fontWeight: "600",
  },
  listContent: { padding: 12, gap: 10 },
  emptyContainer: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  helperText: {
    color: "#6b7280",
    fontSize: 14,
    marginTop: 4,
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
