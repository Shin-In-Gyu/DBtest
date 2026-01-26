import { useColors } from "@/constants";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function HomeHeader() {
  const insets = useSafeAreaInsets();
  const colors = useColors();

  return (
    <View style={[styles.wrap, { paddingTop: insets.top, backgroundColor: colors.CARD_BACKGROUND }]}>
      <View style={styles.inner}>
        {/* 왼쪽: 앱 이름 */}
        <Text style={[styles.title, { color: colors.TEXT_PRIMARY }]} numberOfLines={1}>
          강남대 알림이
        </Text>

        {/* 오른쪽: 검색 + 알림 */}
        <View style={styles.right}>
          <Pressable
            onPress={() => router.push("/search")}
            style={({ pressed }) => [
              styles.iconBtn,
              pressed && { opacity: 0.6 },
            ]}
          >
            <Ionicons name="search-outline" size={24} color={colors.TEXT_PRIMARY} />
          </Pressable>

          <Pressable
            onPress={() => router.push("/notifications")}
            style={({ pressed }) => [
              styles.iconBtn,
              pressed && { opacity: 0.6 },
            ]}
          >
            <Ionicons name="notifications-outline" size={24} color={colors.TEXT_PRIMARY} />
            {/* <View style={styles.badge} /> */}
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {},
  inner: {
    height: 56,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    maxWidth: 160,
  },
  right: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#ff3b30",
  },
});
