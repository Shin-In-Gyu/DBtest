import { colors } from "@/constants";
import { CATEGORY_LABEL } from "@/constants/knuSources";
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useRef } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

/**
 * [컴포넌트] 학과 하위 탭 바
 */
export function DeptSubTabs({
  selectedDepts,
  selectedIndex,
  onSelect,
  onAdd,
  onRemove,
}: {
  selectedDepts: string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
}) {
  const subTabListRef = useRef<FlatList>(null);

  const handleRemove = useCallback(
    (index: number, e: any) => {
      e.stopPropagation();
      onRemove(index);
    },
    [onRemove]
  );

  return (
    <View style={s.subTabWrap}>
      <FlatList
        ref={subTabListRef}
        horizontal
        data={selectedDepts}
        keyExtractor={(item, index) => `dept-${item}-${index}`}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.subTabList}
        renderItem={({ item, index }) => {
          const active = index === selectedIndex;
          const deptLabel = CATEGORY_LABEL[item] || item;
          return (
            <Pressable
              onPress={() => onSelect(index)}
              style={({ pressed }) => [
                s.subTabBtn,
                active && s.subTabBtnActive,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={[s.subTabText, active && s.subTabTextActive]}>
                {deptLabel}
              </Text>
              <Pressable
                onPress={(e) => handleRemove(index, e)}
                hitSlop={8}
                style={({ pressed }) => [
                  s.subTabRemoveBtn,
                  pressed && { opacity: 0.6 },
                ]}
              >
                <Ionicons
                  name="close-circle"
                  size={16}
                  color={active ? "#fff" : "#64748b"}
                />
              </Pressable>
            </Pressable>
          );
        }}
        ListFooterComponent={
          <Pressable
            onPress={onAdd}
            style={({ pressed }) => [
              s.subTabAddBtn,
              pressed && { opacity: 0.7 },
            ]}
          >
            <Ionicons name="add-circle" size={20} color={colors.KNU} />
          </Pressable>
        }
      />
    </View>
  );
}

const s = StyleSheet.create({
  subTabWrap: {
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eef0f3",
  },
  subTabList: { paddingHorizontal: 12, paddingVertical: 8, gap: 6 },
  subTabBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#f1f5f9",
  },
  subTabBtnActive: { backgroundColor: colors.KNU },
  subTabText: { fontSize: 13, fontWeight: "700", color: "#334155" },
  subTabTextActive: { color: "#fff" },
  subTabRemoveBtn: {
    marginLeft: 2,
  },
  subTabAddBtn: {
    marginLeft: 6,
    paddingHorizontal: 8,
    paddingVertical: 8,
    justifyContent: "center",
    alignItems: "center",
  },
});
