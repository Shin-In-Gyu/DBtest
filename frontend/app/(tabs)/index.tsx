import { DeptSubTabs } from "@/components/DeptSubTabs";
import { NoticeListPage } from "@/components/NoticeListPage";
import { colors } from "@/constants";
import { categories } from "@/constants/knuSources";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useBookmarks } from "../providers/BookmarksProvider";
import { useReadStatus } from "../providers/ReadStatusProvider";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type TabItem = { id: string; label: string };

const DEPT_STORAGE_KEY_V1 = "@knu_selected_dept_v1";
const DEPT_STORAGE_KEY_V2 = "@knu_selected_depts_v2";

export default function HomeScreen() {
  const tabs: TabItem[] = useMemo(() => {
    const deptTab = { id: "dept", label: "학과" };
    const idx = categories.findIndex((t) => t.id === "all");
    if (idx === -1) return [deptTab, ...categories];
    return [...categories.slice(0, idx + 1), deptTab, ...categories.slice(idx + 1)];
  }, []);

  const [tabKey, setTabKey] = useState<TabItem["id"]>(tabs[0]?.id ?? "all");
  const [selectedDepts, setSelectedDepts] = useState<string[]>([]);
  const [selectedDeptIndex, setSelectedDeptIndex] = useState<number>(0);

  const pagerRef = useRef<FlatList>(null);
  const tabListRef = useRef<FlatList>(null);

  // 데이터 마이그레이션 및 로드
  useFocusEffect(
    useCallback(() => {
      (async () => {
        try {
          // v2 데이터 먼저 확인
          const v2Data = await AsyncStorage.getItem(DEPT_STORAGE_KEY_V2);
          if (v2Data) {
            const parsed = JSON.parse(v2Data);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setSelectedDepts(parsed);
              setSelectedDeptIndex(0);
              return;
            }
          }

          // v1 데이터가 있으면 v2로 마이그레이션
          const v1Data = await AsyncStorage.getItem(DEPT_STORAGE_KEY_V1);
          if (v1Data) {
            const migrated = [v1Data];
            await AsyncStorage.setItem(DEPT_STORAGE_KEY_V2, JSON.stringify(migrated));
            setSelectedDepts(migrated);
            setSelectedDeptIndex(0);
            // v1 데이터는 유지 (선택사항)
          }
        } catch (error) {
          console.error("학과 데이터 로드 실패:", error);
        }
      })();
    }, [])
  );

  // 선택된 학과 저장
  const saveSelectedDepts = useCallback(async (depts: string[]) => {
    try {
      await AsyncStorage.setItem(DEPT_STORAGE_KEY_V2, JSON.stringify(depts));
      setSelectedDepts(depts);
    } catch (error) {
      console.error("학과 데이터 저장 실패:", error);
    }
  }, []);

  // 학과 추가
  const handleAddDept = useCallback(() => {
    router.push({
      pathname: "/dept-select",
      params: {
        selectedIds: JSON.stringify(selectedDepts),
      },
    });
  }, [selectedDepts]);

  // 학과 삭제
  const handleRemoveDept = useCallback(
    (index: number) => {
      const newDepts = selectedDepts.filter((_, i) => i !== index);
      saveSelectedDepts(newDepts);

      // 삭제된 항목이 현재 선택이었으면 인덱스 조정
      if (newDepts.length === 0) {
        setSelectedDeptIndex(0);
      } else if (index === selectedDeptIndex) {
        // 삭제된 항목이 현재 선택이면 이전 항목 선택 (없으면 첫 번째)
        setSelectedDeptIndex(Math.max(0, index - 1));
      } else if (index < selectedDeptIndex) {
        // 삭제된 항목이 현재 선택보다 앞이면 인덱스 감소
        setSelectedDeptIndex(selectedDeptIndex - 1);
      }
    },
    [selectedDepts, selectedDeptIndex, saveSelectedDepts]
  );

  // 학과 선택 (하위 탭에서)
  const handleSelectDept = useCallback((index: number) => {
    setSelectedDeptIndex(index);
  }, []);

  // 학과 추가 후 콜백 (dept-select에서 돌아올 때)
  useFocusEffect(
    useCallback(() => {
      const checkForNewDept = async () => {
        try {
          const stored = await AsyncStorage.getItem(DEPT_STORAGE_KEY_V2);
          if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) {
              const currentStr = JSON.stringify(selectedDepts);
              const storedStr = JSON.stringify(parsed);
              
              // 데이터가 변경되었는지 확인
              if (currentStr !== storedStr) {
                setSelectedDepts(parsed);
                
                // 새로운 학과가 추가되었는지 확인
                if (parsed.length > selectedDepts.length) {
                  // 새로 추가된 학과 선택
                  setSelectedDeptIndex(parsed.length - 1);
                } else if (selectedDeptIndex >= parsed.length) {
                  // 현재 선택된 인덱스가 범위를 벗어나면 조정
                  setSelectedDeptIndex(Math.max(0, parsed.length - 1));
                }
              }
            }
          }
        } catch {}
      };
      checkForNewDept();
    }, [selectedDepts, selectedDeptIndex])
  );

  const { isBookmarked, toggleBookmark } = useBookmarks();
  const { isRead } = useReadStatus();

  const onTabPress = (id: string, index: number) => {
    setTabKey(id);
    pagerRef.current?.scrollToIndex({ index, animated: true });
  };

  const onMomentumScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextIndex = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    const nextTab = tabs[nextIndex];
    if (nextTab && nextTab.id !== tabKey) {
      setTabKey(nextTab.id);
      tabListRef.current?.scrollToIndex({
        index: nextIndex,
        animated: true,
        viewPosition: 0.5,
      });
    }
  };

  const currentDeptKey =
    tabKey === "dept" && selectedDepts.length > 0
      ? selectedDepts[selectedDeptIndex] ?? null
      : null;

  return (
    <View style={s.container}>
      <View style={s.tabWrap}>
        <FlatList
          ref={tabListRef}
          horizontal
          data={tabs}
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.tabList}
          renderItem={({ item, index }) => {
            const active = item.id === tabKey;
            return (
              <Pressable
                onPress={() => onTabPress(item.id, index)}
                style={({ pressed }) => [
                  s.tabBtn,
                  active && s.tabBtnActive,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text style={[s.tabText, active && s.tabTextActive]}>{item.label}</Text>
              </Pressable>
            );
          }}
        />
      </View>

      {/* 학과 탭일 때만 하위 탭 바 표시 */}
      {tabKey === "dept" && selectedDepts.length > 0 && (
        <DeptSubTabs
          selectedDepts={selectedDepts}
          selectedIndex={selectedDeptIndex}
          onSelect={handleSelectDept}
          onAdd={handleAddDept}
          onRemove={handleRemoveDept}
        />
      )}

      <FlatList
        ref={pagerRef}
        data={tabs}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => `page-${item.id}`}
        onMomentumScrollEnd={onMomentumScrollEnd}
        renderItem={({ item }) => (
          <NoticeListPage
            tabKey={item.id}
            deptKey={item.id === "dept" ? currentDeptKey : null}
            selectedDepts={selectedDepts}
            onAddDept={handleAddDept}
            isBookmarked={isBookmarked}
            isRead={isRead}
            toggleBookmark={toggleBookmark}
          />
        )}
        windowSize={3}
        initialNumToRender={1}
        getItemLayout={(_, index) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * index,
          index,
        })}
      />
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
});