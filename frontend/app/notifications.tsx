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

export default function NotificationScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<"general" | "dept">("general");
  
  // [추가] 선택된 카테고리 ID들을 저장하는 상태 (중복 방지를 위해 Set 사용 권장)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);

  const generalCats = useMemo(() => category.general, []);
  const deptCats = useMemo(() => category.dept, []);
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