import OtherHeader from "@/components/OtherHeader";
import { colors } from "@/constants";
import { categoryOptions } from "@/constants/knuSources";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
    FlatList,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const DEPT_STORAGE_KEY = "@knu_selected_dept_v1";

export default function DeptSelectScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ selectedId?: string }>();
  const selectedId = params.selectedId || null;

  const [searchQuery, setSearchQuery] = useState("");

  const allDepts = useMemo(
    () =>
      (categoryOptions?.dept ?? []).map((d) => ({
        id: d.id,
        label: d.label,
      })),
    [],
  );

  // 검색 필터링
  const filteredDepts = useMemo(() => {
    if (!searchQuery.trim()) return allDepts;

    const queryLower = searchQuery.toLowerCase().trim();
    return allDepts.filter((dept) =>
      dept.label.toLowerCase().includes(queryLower),
    );
  }, [allDepts, searchQuery]);

  const handleSelect = async (id: string) => {
    // 선택된 학과 ID를 AsyncStorage에 저장
    await AsyncStorage.setItem(DEPT_STORAGE_KEY, id);
    router.back();
  };

  return (
    <>
      <OtherHeader title="학과 선택" back={true} />
      <SafeAreaView style={s.safe} edges={["left", "right", "bottom"]}>
        <View style={s.container}>
          {/* 검색 박스 */}
          <View style={s.searchBox}>
            <Ionicons name="search" size={20} color="#9CA3AF" />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="학과명으로 검색"
              placeholderTextColor="#9CA3AF"
              style={s.input}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery("")} hitSlop={8}>
                <Ionicons name="close-circle" size={20} color="#9CA3AF" />
              </Pressable>
            )}
          </View>

          {/* 검색 결과 개수 */}
          {searchQuery.trim() && (
            <Text style={s.resultCount}>
              {filteredDepts.length}개 학과 찾음
            </Text>
          )}

          {/* 학과 리스트 */}
          <FlatList
            data={filteredDepts}
            keyExtractor={(item) => item.id}
            contentContainerStyle={s.list}
            renderItem={({ item }) => {
              const active = item.id === selectedId;
              return (
                <Pressable
                  onPress={() => handleSelect(item.id)}
                  style={({ pressed }) => [
                    s.item,
                    active && s.itemActive,
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <Text style={[s.itemText, active && s.itemTextActive]}>
                    {item.label}
                  </Text>
                  {active && (
                    <Ionicons name="checkmark-circle" size={20} color={colors.KNU} />
                  )}
                </Pressable>
              );
            }}
            ListEmptyComponent={
              <View style={s.empty}>
                <Text style={s.emptyText}>
                  {searchQuery.trim()
                    ? `"${searchQuery}"에 해당하는 학과를 찾을 수 없습니다.`
                    : "학과가 없습니다."}
                </Text>
              </View>
            }
          />
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
    paddingHorizontal: 20,
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
  resultCount: {
    marginTop: 12,
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "600",
  },
  list: {
    paddingTop: 12,
    paddingBottom: 20,
    gap: 8,
  },
  item: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  itemActive: {
    backgroundColor: "rgba(0, 109, 184, 0.08)",
    borderColor: colors.KNU,
  },
  itemText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#334155",
  },
  itemTextActive: {
    color: colors.KNU,
    fontWeight: "700",
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center",
  },
});
