import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type OtherHeaderProps = {
  title: string;
  back?: boolean;
  onBackPress?: () => void;
};

export default function OtherHeader({
  title,
  back = false,
  onBackPress,
}: OtherHeaderProps) {
  const insets = useSafeAreaInsets();

  const handleBack = () => {
    if (onBackPress) return onBackPress();
    router.back();
  };

  return (
    <View style={[styles.wrap, { paddingTop: insets.top }]}>
      <View style={styles.inner}>
        {/* 왼쪽 */}
        {back ? (
          <Pressable
            onPress={handleBack}
            hitSlop={10}
            style={({ pressed }) => [
              styles.iconBtn,
              pressed && { opacity: 0.6 },
            ]}
          >
            <Ionicons name="chevron-back" size={26} color="#111" />
          </Pressable>
        ) : (
          <View style={styles.placeholder} />
        )}

        {/* 가운데 타이틀 */}
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>

        {/* 오른쪽 자리(비워두기: 중앙 정렬 유지) */}
        <View style={styles.placeholder} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: "#fff",
  },
  inner: {
    height: 56,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  placeholder: {
    width: 40,
    height: 40,
  },
  title: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "800",
    color: "#111",
    paddingHorizontal: 8,
  },
});
