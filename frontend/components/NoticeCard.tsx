import { useColors } from "@/constants";
import { CATEGORY_LABEL } from "@/constants/knuSources";
import type { NoticeListItem } from "@/types";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

function NoticeCard({
  item,
  bookmarked,
  isRead,
  onPress,
  onToggleBookmark,
  highlightQuery,
}: {
  item: NoticeListItem;
  bookmarked: boolean;
  isRead?: boolean;
  onPress: () => void;
  onToggleBookmark: () => void;
  highlightQuery?: string;
}) {
  const colors = useColors();
  const categoryText = item.category
    ? (CATEGORY_LABEL[item.category] ?? item.category)
    : null;

  const displayViews = item.views ?? item.univ_views ?? item.app_views;
  const hasMeta =
    !!categoryText || !!item.date || typeof displayViews === "number";

  // 검색어 하이라이트 처리
  const renderHighlightedTitle = () => {
    const title = item.title || "";
    if (!highlightQuery || !highlightQuery.trim()) {
      return (
        <Text style={[s.title(colors), isRead && s.titleRead(colors)]} numberOfLines={2}>
          {title}
        </Text>
      );
    }

    const query = highlightQuery.trim();
    const titleLower = title.toLowerCase();
    const queryLower = query.toLowerCase();
    const parts: { text: string; highlight: boolean }[] = [];
    let lastIndex = 0;
    let index = titleLower.indexOf(queryLower, lastIndex);

    while (index !== -1) {
      // 매칭 전 텍스트
      if (index > lastIndex) {
        parts.push({
          text: title.substring(lastIndex, index),
          highlight: false,
        });
      }
      // 매칭된 텍스트
      parts.push({
        text: title.substring(index, index + query.length),
        highlight: true,
      });
      lastIndex = index + query.length;
      index = titleLower.indexOf(queryLower, lastIndex);
    }

    // 남은 텍스트
    if (lastIndex < title.length) {
      parts.push({
        text: title.substring(lastIndex),
        highlight: false,
      });
    }

    return (
      <Text style={[s.title(colors), isRead && s.titleRead(colors)]} numberOfLines={2}>
        {parts.map((part, idx) => (
          <Text
            key={idx}
            style={part.highlight ? [s.titleHighlight(colors), isRead && s.titleHighlightRead(colors)] : undefined}
          >
            {part.text}
          </Text>
        ))}
      </Text>
    );
  };

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        s.card(colors),
        isRead && s.cardRead(colors),
        item.is_pinned && s.cardPinned(colors), // [추가] 필독 공지 강조
        pressed && s.pressed,
      ]}
    >
      {/* [수정] 제목과 필독 배지를 한 줄에 배치 */}
      <View style={s.titleRow}>
        {item.is_pinned && (
          <View style={s.pinnedBadge(colors)}>
            <Text style={s.pinnedText(colors)}>필독</Text>
          </View>
        )}
        <View style={s.titleContainer}>
          {renderHighlightedTitle()}
        </View>
      </View>

      {hasMeta && (
        <View style={s.metaRow}>
          {/* ✅ 왼쪽 메타 */}
          <View style={s.metaLeft}>
            {!!categoryText && (
              <View style={s.badgeContainer(colors)}>
                <Text style={s.categoryBadge(colors)} numberOfLines={1}>
                  {categoryText}
                </Text>
              </View>
            )}

            {!!categoryText &&
              (item.date || typeof displayViews === "number") && (
                <Text style={s.divider(colors)}>|</Text>
              )}

            {!!item.date && <Text style={s.date(colors)}>{item.date}</Text>}

            {!!item.date && typeof displayViews === "number" && (
              <Text style={s.divider(colors)}>|</Text>
            )}

            {typeof displayViews === "number" && (
              <Text style={s.views(colors)}>
                조회 {displayViews.toLocaleString("ko-KR")}
              </Text>
            )}
          </View>

          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              onToggleBookmark();
            }}
            hitSlop={10}
            style={({ pressed }) => [
              s.bookmarkBtn,
              pressed && { opacity: 0.6 },
            ]}
          >
            <Ionicons
              name={bookmarked ? "bookmark" : "bookmark-outline"}
              size={20}
              color={bookmarked ? colors.KNU : colors.TEXT_TERTIARY}
            />
          </Pressable>
        </View>
      )}
    </Pressable>
  );
}

const s = {
  card: (colors: ReturnType<typeof useColors>) => ({
    backgroundColor: colors.CARD_BACKGROUND,
    borderRadius: 14,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.BORDER_COLOR,
    shadowColor: colors.SHADOW_COLOR,
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  }),
  cardRead: (colors: ReturnType<typeof useColors>) => ({
    backgroundColor: colors.CARD_READ_BACKGROUND,
    opacity: 0.8,
  }),
  cardPinned: (colors: ReturnType<typeof useColors>) => ({
    backgroundColor: colors.CARD_BACKGROUND,
    borderColor: colors.KNU,
    borderWidth: 1,
  }),
  pressed: { opacity: 0.85 },
  
  // [추가] 제목 행 (필독 배지 + 제목)
  titleRow: {
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
    gap: 8,
  },
  
  // [수정] 필독 배지 스타일 - 제목과 같은 줄
  pinnedBadge: (colors: ReturnType<typeof useColors>) => ({
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: colors.RED_LIGHT,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    gap: 3,
    borderWidth: 1,
    borderColor: colors.RED,
    marginTop: 2,
  }),
  pinnedText: (colors: ReturnType<typeof useColors>) => ({
    fontSize: 10,
    fontWeight: "800" as const,
    color: colors.RED,
  }),
  
  // [추가] 제목 컨테이너
  titleContainer: {
    flex: 1,
  },
  
  title: (colors: ReturnType<typeof useColors>) => ({ 
    fontSize: 16, 
    fontWeight: "700" as const, 
    color: colors.TEXT_PRIMARY 
  }),
  titleRead: (colors: ReturnType<typeof useColors>) => ({ 
    color: colors.TEXT_SECONDARY, 
    fontWeight: "600" as const 
  }),
  titleHighlight: (colors: ReturnType<typeof useColors>) => ({
    backgroundColor: colors.YELLOW,
    color: colors.YELLOW_TEXT,
    fontWeight: "800" as const,
  }),
  titleHighlightRead: (colors: ReturnType<typeof useColors>) => ({
    backgroundColor: colors.YELLOW,
    color: colors.YELLOW_TEXT,
  }),

  metaRow: {
    marginTop: 8,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    gap: 10,
  },
  metaLeft: {
    flex: 1,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    minWidth: 0,
  },

  badgeContainer: (colors: ReturnType<typeof useColors>) => ({
    backgroundColor: colors.BACKGROUND_LIGHT,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    maxWidth: 140,
  }),
  categoryBadge: (colors: ReturnType<typeof useColors>) => ({ 
    fontSize: 11, 
    color: colors.TEXT_TERTIARY, 
    fontWeight: "700" as const 
  }),
  divider: (colors: ReturnType<typeof useColors>) => ({ 
    marginHorizontal: 6, 
    color: colors.DIVIDER_COLOR, 
    fontSize: 10 
  }),
  date: (colors: ReturnType<typeof useColors>) => ({ 
    fontSize: 12, 
    color: colors.TEXT_TERTIARY 
  }),
  views: (colors: ReturnType<typeof useColors>) => ({ 
    fontSize: 12, 
    color: colors.TEXT_TERTIARY 
  }),

  bookmarkBtn: {
    paddingLeft: 6,
    paddingVertical: 2,
  },
};

export default React.memo(NoticeCard);
