import OtherHeader from "@/components/OtherHeader";
import { category, colors } from "@/constants";
import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function NotificationScreen() {
  const [tab, setTab] = useState<"general" | "dept">("general");

  const generalCats = useMemo(() => category.general, []);
  const deptCats = useMemo(() => category.dept, []);

  const data = tab === "general" ? generalCats : deptCats;

  return (
    <>
      <OtherHeader title="푸쉬 알림 설정" back={true} />
      <SafeAreaView style={styles.safe} edges={["left", "right", "bottom"]}>
        <View style={styles.body}>
          <Text style={styles.big}>
            알림 받고 싶은{"\n"}카테고리를 선택해 주세요
          </Text>

          {/* 탭 */}
          <View style={styles.tabRow}>
            <Pressable
              onPress={() => setTab("general")}
              style={[styles.tabBtn, tab === "general" && styles.tabBtnActive]}
            >
              <Text
                style={[
                  styles.tabText,
                  tab === "general" && styles.tabTextActive,
                ]}
              >
                일반 카테고리
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setTab("dept")}
              style={[styles.tabBtn, tab === "dept" && styles.tabBtnActive]}
            >
              <Text
                style={[styles.tabText, tab === "dept" && styles.tabTextActive]}
              >
                학과 카테고리
              </Text>
            </Pressable>
          </View>

          {/* 그리드 */}
          <FlatList
            data={data}
            keyExtractor={(item) => item.id}
            numColumns={3}
            columnWrapperStyle={{ gap: 12 }}
            contentContainerStyle={{ paddingTop: 14, gap: 12 }}
            renderItem={({ item }) => (
              <Pressable style={styles.card}>
                <View style={styles.iconWrap}>
                  <Ionicons name={item.icon} size={26} color={colors.BLACK} />
                </View>
                <Text style={styles.cardText}>{item.label}</Text>
              </Pressable>
            )}
          />
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

  topBar: {
    height: 52,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  topBtn: {
    width: 60,
    height: 40,
    justifyContent: "center",
  },
  topTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.BLACK,
  },
  done: {
    color: colors.KNU,
    fontWeight: "800",
    textAlign: "right",
  },

  body: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  big: {
    fontSize: 28,
    fontWeight: "900",
    color: colors.BLACK,
    lineHeight: 38,
  },

  tabRow: {
    marginTop: 18,
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 3,
    borderBottomColor: "transparent",
  },
  tabBtnActive: {
    borderBottomColor: colors.KNU,
  },
  tabText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#9CA3AF",
  },
  tabTextActive: {
    color: colors.KNU,
  },
  card: {
    flex: 1,
    minHeight: 112,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
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
  cardText: {
    fontSize: 14,
    fontWeight: "900",
    color: colors.BLACK,
  },
});
