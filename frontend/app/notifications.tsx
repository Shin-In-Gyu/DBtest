import { getCategories, getSubscriptions, updateSubscriptions } from "@/api/knuNotice";
import OtherHeader from "@/components/OtherHeader";
import { category, useColors } from "@/constants";
import { ensurePushTokenAndRegister, getStoredPushToken } from "@/utils/pushRegistration";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  Text,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const STORAGE_KEY = "@notification_subscriptions";

export default function NotificationScreen() {
  const router = useRouter();
  const colors = useColors();
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
        const token = await getStoredPushToken();
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
        // getCategories 함수를 사용하여 URL 조합 및 로깅 처리
        const data = await getCategories();
        // { general, dept } | 배열 | 기타
        if (data && (Array.isArray((data as any).general) || Array.isArray((data as any).dept)))
          setServerData({ general: (data as any).general ?? [], dept: (data as any).dept ?? [] });
        else if (Array.isArray(data))
          setServerData({ general: data, dept: [] });
        else
          setServerData(null);
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
      let token = await getStoredPushToken();
      // 저장된 토큰이 없으면 권한 요청·토큰 발급을 한 번 더 시도
      if (!token) {
        token = await ensurePushTokenAndRegister();
      }

      if (!token) {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
        Alert.alert(
          "알림 등록 불가",
          "푸시 알림을 쓰려면 '알림 허용'이 필요합니다. 기기 설정에서 앱 알림을 켠 뒤 앱을 다시 실행하고, '완료'를 다시 눌러 주세요."
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
      <OtherHeader 
        title="푸쉬 알림 설정" 
        back={true}
        rightElement={
          <Pressable 
            onPress={handleSave} 
            style={({ pressed }) => [
              styles.doneHeaderBtn,
              pressed && { opacity: 0.7 },
            ]}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color={colors.KNU} />
            ) : (
              <Text style={[styles.doneText, { color: colors.KNU }]}>완료</Text>
            )}
          </Pressable>
        }
      />

      <SafeAreaView style={[styles.safe, { backgroundColor: colors.WHITE }]} edges={["left", "right", "bottom"]}>
        <View style={styles.body}>
          <Text style={[styles.big, { color: colors.TEXT_PRIMARY }]}>
            알림 받고 싶은{"\n"}카테고리를 선택해 주세요
          </Text>

          {/* 탭 전환 섹션 */}
          <View style={[styles.tabRow, { borderBottomColor: colors.BORDER_COLOR }]}>
            <Pressable
              onPress={() => setTab("general")}
              style={[styles.tabBtn, tab === "general" && styles.tabBtnActive(colors)]}
            >
              <Text style={[styles.tabText(colors), tab === "general" && styles.tabTextActive(colors)]}>
                일반 카테고리
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setTab("dept")}
              style={[styles.tabBtn, tab === "dept" && styles.tabBtnActive(colors)]}
            >
              <Text style={[styles.tabText(colors), tab === "dept" && styles.tabTextActive(colors)]}>
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
                  style={[styles.card(colors), isSelected && styles.cardSelected(colors)]}
                >
                  <View style={[styles.iconWrap(colors), isSelected && styles.iconWrapSelected(colors)]}>
                    <Ionicons 
                      name={isSelected ? "checkmark" : item.icon} 
                      size={24} 
                      color={isSelected ? colors.WHITE : colors.TEXT_PRIMARY} 
                    />
                  </View>
                  <Text style={[styles.cardText(colors), isSelected && styles.cardTextSelected(colors)]}>
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

const styles = {
  safe: { flex: 1 },
  doneHeaderBtn: {
    padding: 8,
  },
  doneText: {
    fontSize: 16,
    fontWeight: "800" as const,
  },
  body: { flex: 1, paddingHorizontal: 20, paddingTop: 10 },
  big: { fontSize: 24, fontWeight: "900" as const, lineHeight: 34 },
  
  tabRow: { marginTop: 18, flexDirection: "row" as const, borderBottomWidth: 1 },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: "center" as const, borderBottomWidth: 3, borderBottomColor: "transparent" },
  tabBtnActive: (colors: ReturnType<typeof useColors>) => ({ borderBottomColor: colors.KNU }),
  tabText: (colors: ReturnType<typeof useColors>) => ({ fontSize: 15, fontWeight: "800" as const, color: colors.TEXT_TERTIARY }),
  tabTextActive: (colors: ReturnType<typeof useColors>) => ({ color: colors.KNU }),

  card: (colors: ReturnType<typeof useColors>) => ({
    flex: 1,
    minHeight: 110,
    borderRadius: 16,
    backgroundColor: colors.BACKGROUND_LIGHT,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    gap: 8,
    borderWidth: 2,
    borderColor: "transparent",
  }),
  cardSelected: (colors: ReturnType<typeof useColors>) => ({
    backgroundColor: colors.CARD_BACKGROUND,
    borderColor: colors.KNU,
    shadowColor: colors.KNU,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  }),
  iconWrap: (colors: ReturnType<typeof useColors>) => ({
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.CARD_BACKGROUND,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    borderWidth: 1,
    borderColor: colors.BORDER_COLOR,
  }),
  iconWrapSelected: (colors: ReturnType<typeof useColors>) => ({
    backgroundColor: colors.KNU,
    borderColor: colors.KNU,
  }),
  cardText: (colors: ReturnType<typeof useColors>) => ({ fontSize: 13, fontWeight: "800" as const, color: colors.TEXT_SECONDARY }),
  cardTextSelected: (colors: ReturnType<typeof useColors>) => ({ color: colors.KNU, fontWeight: "900" as const }),
};