import { useColors } from "@/constants";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type OtherHeaderProps = {
  title: string;
  back?: boolean;
  onBackPress?: () => void;
  rightElement?: React.ReactNode;
};

export default function OtherHeader({
  title,
  back = false,
  onBackPress,
  rightElement,
}: OtherHeaderProps) {
  const insets = useSafeAreaInsets();
  const colors = useColors();

  const handleBack = () => {
    if (onBackPress) return onBackPress();
    router.back();
  };

  return (
    <View style={[styles.wrap, { paddingTop: insets.top, backgroundColor: colors.CARD_BACKGROUND }]}>
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
            <Ionicons name="chevron-back" size={26} color={colors.TEXT_PRIMARY} />
          </Pressable>
        ) : (
          <View style={styles.placeholder} />
        )}

        {/* 가운데 타이틀 */}
        <Text style={[styles.title, { color: colors.TEXT_PRIMARY }]} numberOfLines={1}>
          {title}
        </Text>

        {/* 오른쪽 */}
        {rightElement || <View style={styles.placeholder} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {},
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
    paddingHorizontal: 8,
  },
});
