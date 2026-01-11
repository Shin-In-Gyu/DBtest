// src/components/NoticeCard.tsx
import type { NoticeListItem } from "@/api/knuNotice";
import { colors } from "@/constants";
import React from "react";
import { Pressable, StyleSheet, Text } from "react-native";

export default function NoticeCard({
  item,
  onPress,
}: {
  item: NoticeListItem;
  onPress: (detailUrl: string) => void;
}) {
  return (
    <Pressable
      onPress={() => onPress(item.detailUrl)}
      style={({ pressed }) => [s.card, pressed && s.pressed]}
    >
      <Text style={s.title} numberOfLines={2}>
        {item.title}
      </Text>
      <Text style={s.meta}>자세히 보기</Text>
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
  pressed: { opacity: 0.8 },
  title: { fontSize: 16, fontWeight: "700", color: "#111827" },
  meta: { marginTop: 6, color: colors.KNU, fontWeight: "600" },
});
