import { useColors } from "@/constants";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

export interface MenuItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
}

export function MenuItem({
  icon,
  label,
  value,
  onPress,
  rightElement,
}: MenuItemProps) {
  const colors = useColors();
  const showChevron = onPress != null && rightElement == null;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.menuItem,
        pressed && { backgroundColor: colors.BACKGROUND_LIGHT },
      ]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.menuItemLeft}>
        <Ionicons name={icon} size={22} color={colors.TEXT_SECONDARY} />
        <Text style={[styles.menuText, { color: colors.TEXT_PRIMARY }]}>
          {label}
        </Text>
      </View>
      {value != null && value !== "" && (
        <Text style={[styles.menuValue, { color: colors.TEXT_SECONDARY }]}>
          {value}
        </Text>
      )}
      {rightElement ??
        (showChevron && (
          <Ionicons
            name="chevron-forward-outline"
            size={20}
            color={colors.TEXT_TERTIARY}
          />
        ))}
    </Pressable>
  );
}

export function SectionHeader({ title }: { title: string }) {
  const colors = useColors();
  return (
    <Text style={[styles.sectionHeader, { color: colors.TEXT_SECONDARY }]}>
      {title}
    </Text>
  );
}

export function Divider() {
  const colors = useColors();
  return (
    <View style={[styles.divider, { backgroundColor: colors.DIVIDER_COLOR }]} />
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    fontSize: 13,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderRadius: 8,
  },
  menuItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  menuText: { fontSize: 16, fontWeight: "500" },
  menuValue: { fontSize: 14, marginRight: 8 },
  divider: {
    height: 1,
    marginVertical: 8,
    marginHorizontal: 4,
  },
});
