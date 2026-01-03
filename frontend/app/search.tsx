import OtherHeader from "@/components/OtherHeader";
import { colors } from "@/constants";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SearchScreen() {
  const [query, setQuery] = useState("");
  const [recent, setRecent] = useState<string[]>([]);

  const onSubmit = () => {
    const trimmed = query.trim();
    if (!trimmed) return;
    setRecent((prev) =>
      [trimmed, ...prev.filter((x) => x !== trimmed)].slice(0, 10),
    );
    setQuery("");
  };

  return (
    <>
      <OtherHeader title="검색" back={true} />
      <SafeAreaView style={styles.safe} edges={["left", "right", "bottom"]}>
        <View style={styles.container}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={20} color="#9CA3AF" />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="검색어를 입력하세요"
              placeholderTextColor="#9CA3AF"
              style={styles.input}
              returnKeyType="search"
              onSubmitEditing={onSubmit}
            />
          </View>

          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>최근 검색어</Text>
            <Pressable onPress={() => setRecent([])} hitSlop={8}>
              <Text style={styles.link}>전체삭제</Text>
            </Pressable>
          </View>

          {recent.length === 0 ? (
            <Text style={styles.empty}>최근 검색어가 없습니다.</Text>
          ) : (
            <View style={styles.chips}>
              {recent.map((w) => (
                <Pressable
                  key={w}
                  onPress={() => setQuery(w)}
                  style={styles.chip}
                  hitSlop={6}
                >
                  <Text style={styles.chipText}>{w}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.WHITE,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.BLACK,
  },
  searchBox: {
    marginTop: 14,
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
    color: "#9CA3AF",
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 10,
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
});
