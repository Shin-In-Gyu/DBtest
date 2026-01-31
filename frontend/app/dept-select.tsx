import OtherHeader from "@/components/OtherHeader";
import { useColors } from "@/constants";
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

const DEPT_STORAGE_KEY_V2 = "@knu_selected_depts_v2";

export default function DeptSelectScreen() {
  const colors = useColors();
  const router = useRouter();
  const params = useLocalSearchParams<{ selectedIds?: string }>();
  
  // 기존 선택된 학과 목록 파싱
  const selectedIds = useMemo(() => {
    try {
      if (params.selectedIds) {
        const parsed = JSON.parse(params.selectedIds);
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch {}
    return [];
  }, [params.selectedIds]);

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
    try {
      // 이미 선택된 학과인지 확인
      if (selectedIds.includes(id)) {
        // 이미 선택된 학과면 그대로 돌아가기
        router.back();
        return;
      }

      // 새로운 학과를 배열에 추가
      const updatedIds = [...selectedIds, id];
      
      // AsyncStorage에 저장
      await AsyncStorage.setItem(DEPT_STORAGE_KEY_V2, JSON.stringify(updatedIds));
      router.back();
    } catch (error) {
      console.error("학과 선택 저장 실패:", error);
    }
  };

  return (
    <>
      <OtherHeader title="학과 선택" back={true} />
      <SafeAreaView style={[s.safe, { backgroundColor: colors.BACKGROUND }]} edges={["left", "right", "bottom"]}>
        <View style={s.container}>
          {/* 검색 박스 */}
          <View style={[s.searchBox, { backgroundColor: colors.CARD_BACKGROUND }]}>
            <Ionicons name="search" size={20} color={colors.TEXT_TERTIARY} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="학과명으로 검색"
              placeholderTextColor={colors.PLACEHOLDER_COLOR}
              style={[s.input, { color: colors.TEXT_PRIMARY }]}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery("")} hitSlop={8}>
                <Ionicons name="close-circle" size={20} color={colors.TEXT_TERTIARY} />
              </Pressable>
            )}
          </View>

          {/* 검색 결과 개수 */}
          {searchQuery.trim() && (
            <Text style={[s.resultCount, { color: colors.TEXT_SECONDARY }]}>
              {filteredDepts.length}개 학과 찾음
            </Text>
          )}

          {/* 학과 리스트 */}
          <FlatList
            data={filteredDepts}
            keyExtractor={(item) => item.id}
            contentContainerStyle={s.list}
            renderItem={({ item }) => {
              const isSelected = selectedIds.includes(item.id);
              return (
                <Pressable
                  onPress={() => handleSelect(item.id)}
                  style={({ pressed }) => [
                    s.item,
                    {
                      backgroundColor: isSelected 
                        ? colors.KNU_LIGHT 
                        : colors.CARD_BACKGROUND,
                      borderColor: isSelected ? colors.KNU : colors.BORDER_COLOR,
                    },
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <Text style={[
                    s.itemText,
                    { color: isSelected ? colors.KNU : colors.TEXT_PRIMARY },
                    isSelected && s.itemTextActive
                  ]}>
                    {item.label}
                  </Text>
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={20} color={colors.KNU} />
                  )}
                </Pressable>
              );
            }}
            ListEmptyComponent={
              <View style={s.empty}>
                <Text style={[s.emptyText, { color: colors.TEXT_TERTIARY }]}>
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
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  searchBox: {
    marginTop: 14,
    height: 52,
    borderRadius: 14,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
  },
  resultCount: {
    marginTop: 12,
    fontSize: 14,
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
    borderWidth: 1,
  },
  itemText: {
    fontSize: 15,
    fontWeight: "600",
  },
  itemTextActive: {
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
    textAlign: "center",
  },
});
