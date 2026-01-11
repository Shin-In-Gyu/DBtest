import { colors } from "@/constants";
import { CATEGORY_LABEL } from "@/constants/knuSources";
import type { NoticeListItem } from "@/types";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

export default function NoticeCard({
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
  const categoryText = item.category
    ? (CATEGORY_LABEL[item.category] ?? item.category)
    : null;

  const hasMeta =
    !!categoryText || !!item.date || typeof item.views === "number";

  // 검색어 하이라이트 처리
  const renderHighlightedTitle = () => {
    const title = item.title || "";
    if (!highlightQuery || !highlightQuery.trim()) {
      return (
        <Text style={[s.title, isRead && s.titleRead]} numberOfLines={2}>
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
      <Text style={[s.title, isRead && s.titleRead]} numberOfLines={2}>
        {parts.map((part, idx) => (
          <Text
            key={idx}
            style={part.highlight ? [s.titleHighlight, isRead && s.titleHighlightRead] : undefined}
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
        s.card,
        isRead && s.cardRead,
        pressed && s.pressed,
      ]}
    >
      {renderHighlightedTitle()}

      {hasMeta && (
        <View style={s.metaRow}>
          {/* ✅ 왼쪽 메타 */}
          <View style={s.metaLeft}>
            {!!categoryText && (
              <View style={s.badgeContainer}>
                <Text style={s.categoryBadge} numberOfLines={1}>
                  {categoryText}
                </Text>
              </View>
            )}

            {!!categoryText &&
              (item.date || typeof item.views === "number") && (
                <Text style={s.divider}>|</Text>
              )}

            {!!item.date && <Text style={s.date}>{item.date}</Text>}

            {!!item.date && typeof item.views === "number" && (
              <Text style={s.divider}>|</Text>
            )}

            {typeof item.views === "number" && (
              <Text style={s.views}>
                조회 {item.views.toLocaleString("ko-KR")}
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
              color={bookmarked ? colors.KNU : "#64748b"}
            />
          </Pressable>
        </View>
      )}
    </Pressable>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: colors.WHITE,
    borderRadius: 14,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  cardRead: {
    backgroundColor: "#f9fafb",
    opacity: 0.8,
  },
  pressed: { opacity: 0.85 },
  title: { fontSize: 16, fontWeight: "700", color: "#111827" },
  titleRead: { color: "#6b7280", fontWeight: "600" },
  titleHighlight: {
    backgroundColor: "#FEF3C7",
    color: "#92400E",
    fontWeight: "800",
  },
  titleHighlightRead: {
    backgroundColor: "#FEF3C7",
    color: "#92400E",
  },

  metaRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between", // ✅ 좌/우 분리
    gap: 10,
  },
  metaLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    minWidth: 0, // ✅ 텍스트 줄어들 수 있게
  },

  badgeContainer: {
    backgroundColor: "#F5F7FA",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    maxWidth: 140,
  },
  categoryBadge: { fontSize: 11, color: "#555", fontWeight: "700" },
  divider: { marginHorizontal: 6, color: "#E0E0E0", fontSize: 10 },
  date: { fontSize: 12, color: "#888" },
  views: { fontSize: 12, color: "#888" },

  bookmarkBtn: {
    paddingLeft: 6,
    paddingVertical: 2,
  },
});
