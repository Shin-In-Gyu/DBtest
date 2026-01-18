// frontend/app/notifications.tsx
import OtherHeader from "@/components/OtherHeader";
import { category, colors } from "@/constants";
import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState, useEffect } from "react";
import { 
  FlatList, 
  Pressable, 
  StyleSheet, 
  Text, 
  View, 
  Alert, 
  ActivityIndicator 
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { updateSubscriptions } from "@/api/knuNotice";
import { useRouter } from "expo-router";
import KNU_API_BASE from "@/api/base-uri";
import * as Notifications from "expo-notifications";

// [New] 앱 실행 중(Foreground)에도 알림이 보이도록 설정
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    // 추가된 부분: Pylance/TypeScript 에러 해결을 위한 필수 필드
    shouldShowBanner: true,   // 화면 상단 배너 표시 (iOS/Android 공통)
    shouldShowList: true,     // 알림 센터 목록에 표시 여부
  }),
});

const SUBSCRIPTION_KEY = "@knu_subscriptions_v1";

export default function NotificationScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<"general" | "dept">("general");
  
  // [New] 서버 데이터 상태
  const [serverData, setServerData] = useState<{ general: any[], dept: any[] } | null>(null);
  
  // [추가] 선택된 카테고리 ID들을 저장하는 상태 (중복 방지를 위해 Set 사용 권장)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true); // [New] 로딩 상태 추가

  // [New] 저장된 구독 설정 불러오기 (UX 개선)
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(SUBSCRIPTION_KEY);
        if (saved) {
          setSelectedIds(new Set(JSON.parse(saved)));
        }
      } catch (e) {
        console.log("로컬 구독 정보 로드 실패:", e);
      }
    })();
  }, []);

  // [New] 카테고리 데이터 Fetch
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`${KNU_API_BASE}/categories`);
        if (response.ok) {
          const data = await response.json();
          setServerData(data);
        }
      } catch (e) {
        console.log("카테고리 로드 실패 (기본값 사용):", e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCategories();
  }, []);

  // [Modified] 서버 데이터 우선 사용 + 로컬 아이콘 매핑
  const generalCats = useMemo(() => {
    const source = serverData?.general || category.general;
    return source.map((item: any) => ({
      ...item,
      icon: category.general.find(c => c.id === item.id)?.icon || "school-outline"
    }));
  }, [serverData]);

  const deptCats = useMemo(() => {
    const source = serverData?.dept || category.dept;
    return source.map((item: any) => ({
      ...item,
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
   * [로직] 서버에 설정 저장
   */
  const handleSave = async () => {
    if (isSaving) return;
    
    try {
      setIsSaving(true);
      // 로컬에 저장된 FCM 토큰 가져오기 (기기 등록 시 저장해둔 값)
      const token = await AsyncStorage.getItem("@fcm_token");
      
      if (!token) {
        Alert.alert("알림", "기기 등록 정보를 찾을 수 없습니다. 앱을 재실행해 주세요.");
        return;
      }

      // 서버로 구독 정보 전송
      await updateSubscriptions({
        token,
        categories: Array.from(selectedIds),
      });

      // 로컬 스토리지 업데이트
      await AsyncStorage.setItem(SUBSCRIPTION_KEY, JSON.stringify(Array.from(selectedIds)));

      Alert.alert("성공", "알림 설정이 저장되었습니다.", [
        { text: "확인", onPress: () => router.back() }
      ]);
    } catch (error) {
      console.error("Save Subscriptions Error:", error);
      Alert.alert("오류", "설정 저장 중 문제가 발생했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  // [New] 로컬 알림 테스트 (기기 권한 및 설정 확인용)
  const handleTestLocalNotification = async () => {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('권한 필요', '알림 권한을 허용해주세요.');
      return;
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "🔔 테스트 알림",
        body: "알림이 정상적으로 도착했습니다! 설정이 완료되었습니다.",
      },
      trigger: null, // 즉시 발송
    });
  };

  // [New] 토큰 확인 (서버 전송용 토큰 디버깅)
  const handleShowToken = async () => {
    const token = await AsyncStorage.getItem("@fcm_token");
    console.log("Device Token:", token);
    Alert.alert("Expo Push Token", token || "토큰이 없습니다. 앱을 재실행해보세요.");
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

          {/* [수정] 로딩 상태 처리 및 리스트 렌더링 */}
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.KNU} />
            </View>
          ) : (
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
              ListFooterComponent={
                <View style={styles.debugFooter}>
                  <Text style={styles.debugTitle}>🛠️ 알림 테스트 도구</Text>
                  <View style={styles.debugBtnRow}>
                    <Pressable onPress={handleTestLocalNotification} style={styles.debugBtn}>
                      <Text style={styles.debugBtnText}>🔔 로컬 알림 발송</Text>
                    </Pressable>
                    <Pressable onPress={handleShowToken} style={styles.debugBtn}>
                      <Text style={styles.debugBtnText}>🔑 토큰 확인</Text>
                    </Pressable>
                  </View>
                </View>
              }
            />
          )}
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
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  
  // [New] 디버그용 스타일
  debugFooter: { marginTop: 40, alignItems: "center", gap: 12, opacity: 0.8 },
  debugTitle: { fontSize: 12, color: "#9CA3AF", fontWeight: "600" },
  debugBtnRow: { flexDirection: "row", gap: 12 },
  debugBtn: { paddingHorizontal: 14, paddingVertical: 8, backgroundColor: "#F3F4F6", borderRadius: 8, borderWidth: 1, borderColor: "#E5E7EB" },
  debugBtnText: { fontSize: 12, color: "#4B5563", fontWeight: "600" },
});