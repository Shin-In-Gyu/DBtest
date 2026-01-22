import KNU_API_BASE from "@/api/base-uri";
import { getSubscriptions, updateSubscriptions } from "@/api/knuNotice";
import OtherHeader from "@/components/OtherHeader";
import { category, colors } from "@/constants";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const STORAGE_KEY = "@notification_subscriptions";

export default function NotificationScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<"general" | "dept">("general");
  
  // [New] 서버 데이터 상태
  const [serverData, setServerData] = useState<{ general: any[], dept: any[] } | null>(null);
  
  // [추가] 선택된 카테고리 ID들을 저장하는 상태 (중복 방지를 위해 Set 사용 권장)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);

  // [저장된 구독 불러오기] 서버 우선, 실패 시 로컬(AsyncStorage)
  useEffect(() => {
    const loadSaved = async () => {
      try {
        const token = await AsyncStorage.getItem("@fcm_token");
        let loaded = false;
        if (token) {
          try {
            const res = await getSubscriptions(token);
            if (res?.categories && Array.isArray(res.categories)) {
              setSelectedIds(new Set(res.categories));
              loaded = true;
            }
          } catch {
            // 서버에 GET 구독 API 없거나 실패 시 로컬 사용
          }
        }
        if (!loaded) {
          const raw = await AsyncStorage.getItem(STORAGE_KEY);
          if (raw) {
            try {
              const arr = JSON.parse(raw);
              if (Array.isArray(arr)) setSelectedIds(new Set(arr));
            } catch {
              // ignore
            }
          }
        }
      } catch {
        // ignore
      }
    };
    loadSaved();
  }, []);

  // [New] 카테고리 데이터 Fetch — 백엔드 /api/knu/categories 사용
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch(`${KNU_API_BASE}/categories`);
        if (response.ok) {
          const data = await response.json();
          // { general, dept } | 배열 | 기타
          if (data && (Array.isArray(data.general) || Array.isArray(data.dept)))
            setServerData({ general: data.general ?? [], dept: data.dept ?? [] });
          else if (Array.isArray(data))
            setServerData({ general: data, dept: [] });
          else
            setServerData(null);
        }
      } catch (e) {
        console.log("카테고리 로드 실패 (기본값 사용):", e);
      }
    };
    fetchCategories();
  }, []);

  // [Modified] 서버 데이터 우선 사용 + 로컬 아이콘 매핑 (label: id/name/label 모두 지원)
  const generalCats = useMemo(() => {
    const source = serverData?.general || category.general;
    return (source ?? []).map((item: any) => ({
      ...item,
      label: item.label ?? item.name ?? item.id,
      icon: category.general.find(c => c.id === item.id)?.icon || "school-outline"
    }));
  }, [serverData]);

  const deptCats = useMemo(() => {
    const source = serverData?.dept || category.dept;
    return (source ?? []).map((item: any) => ({
      ...item,
      label: item.label ?? item.name ?? item.id,
      icon: category.dept.find(c => c.id === item.id)?.icon || "school-outline"
    }));
  }, [serverData]);

  const currentData = tab === "general" ? generalCats : deptCats;

  /**
   * [로직] 카테고리 토글 함수
   */
  const toggleCategory = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  /**
   * [로직] 서버에 구독 전송 + 로컬(AsyncStorage)에 체크 상태 저장
   * - 서버 성공: 로컬에도 저장하고, 체크된 카테고리 푸시 수신 가능
   * - 서버 실패(500 등): 로컬에만 저장해 두고, 다음에 '완료' 다시 누르면 재전송
   */
  const handleSave = async () => {
    if (isSaving) return;

    const ids = Array.from(selectedIds);

    try {
      setIsSaving(true);
      const token = await AsyncStorage.getItem("@fcm_token");

      if (!token) {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
        Alert.alert(
          "알림",
          "기기 등록 정보를 찾을 수 없습니다. 앱을 재실행한 뒤 '완료'를 다시 눌러 주세요."
        );
        return;
      }

      await updateSubscriptions({ token, categories: ids });
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(ids));

      Alert.alert("성공", "알림 설정이 저장되었습니다. 선택한 카테고리의 새 공지를 푸시로 받을 수 있습니다.", [
        { text: "확인", onPress: () => router.back() }
      ]);
    } catch (error) {
      console.error("Save Subscriptions Error:", error);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
      Alert.alert(
        "알림",
        "선택한 카테고리가 기기에 저장되었습니다. 푸시 알림 서버와 동기화하지 못했을 수 있으니, 나중에 다시 '완료'를 눌러 주세요."
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      {/* [수정] 우측 상단에 '완료' 버튼 배치 */}
      <View style={styles.headerContainer}>
        <OtherHeader title="푸쉬 알림 설정" back={true} />
        <Pressable 
          onPress={handleSave} 
          style={styles.doneHeaderBtn}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color={colors.KNU} />
          ) : (
            <Text style={styles.doneText}>완료</Text>
          )}
        </Pressable>
      </View>

      <SafeAreaView style={styles.safe} edges={["left", "right", "bottom"]}>
        <View style={styles.body}>
          <Text style={styles.big}>
            알림 받고 싶은{"\n"}카테고리를 선택해 주세요
          </Text>

          {/* 탭 전환 섹션 */}
          <View style={styles.tabRow}>
            <Pressable
              onPress={() => setTab("general")}
              style={[styles.tabBtn, tab === "general" && styles.tabBtnActive]}
            >
              <Text style={[styles.tabText, tab === "general" && styles.tabTextActive]}>
                일반 카테고리
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setTab("dept")}
              style={[styles.tabBtn, tab === "dept" && styles.tabBtnActive]}
            >
              <Text style={[styles.tabText, tab === "dept" && styles.tabTextActive]}>
                학과 카테고리
              </Text>
            </Pressable>
          </View>

          {/* 카테고리 그리드 리스트 */}
          <FlatList
            data={currentData}
            keyExtractor={(item) => item.id}
            numColumns={3}
            columnWrapperStyle={{ gap: 12 }}
            contentContainerStyle={{ paddingTop: 14, paddingBottom: 40, gap: 12 }}
            renderItem={({ item }) => {
              const isSelected = selectedIds.has(item.id);
              return (
                <Pressable 
                  onPress={() => toggleCategory(item.id)}
                  style={[styles.card, isSelected && styles.cardSelected]}
                >
                  <View style={[styles.iconWrap, isSelected && styles.iconWrapSelected]}>
                    <Ionicons 
                      name={isSelected ? "checkmark" : item.icon} 
                      size={24} 
                      color={isSelected ? colors.WHITE : colors.BLACK} 
                    />
                  </View>
                  <Text style={[styles.cardText, isSelected && styles.cardTextSelected]}>
                    {item.label}
                  </Text>
                </Pressable>
              );
            }}
          />
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.WHITE },
  headerContainer: {
    position: 'relative',
    backgroundColor: colors.WHITE,
  },
  doneHeaderBtn: {
    position: 'absolute',
    right: 16,
    top: 55, // OtherHeader의 높이에 맞춰 조정 필요
    zIndex: 10,
    padding: 8,
  },
  doneText: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.KNU,
  },
  body: { flex: 1, paddingHorizontal: 20, paddingTop: 10 },
  big: { fontSize: 24, fontWeight: "900", color: colors.BLACK, lineHeight: 34 },
  
  tabRow: { marginTop: 18, flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: "center", borderBottomWidth: 3, borderBottomColor: "transparent" },
  tabBtnActive: { borderBottomColor: colors.KNU },
  tabText: { fontSize: 15, fontWeight: "800", color: "#9CA3AF" },
  tabTextActive: { color: colors.KNU },

  card: {
    flex: 1,
    minHeight: 110,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    borderWidth: 2,
    borderColor: "transparent",
  },
  cardSelected: {
    backgroundColor: colors.WHITE,
    borderColor: colors.KNU,
    // 선택 시 그림자 효과로 강조
    shadowColor: colors.KNU,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.WHITE,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  iconWrapSelected: {
    backgroundColor: colors.KNU,
    borderColor: colors.KNU,
  },
  cardText: { fontSize: 13, fontWeight: "800", color: "#4B5563" },
  cardTextSelected: { color: colors.KNU, fontWeight: "900" },
});