import { useColors } from "@/constants";
import type { OpenSourceLibrary } from "@/constants/open-source-url";
import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import React from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

export function LibraryItem({ library }: { library: OpenSourceLibrary }) {
  const colors = useColors();
  return (
    <View style={[styles.libraryItem, { backgroundColor: colors.CARD_BACKGROUND, borderColor: colors.BORDER_COLOR }]}>
      <View style={styles.libraryHeader}>
        <Text style={[styles.libraryName, { color: colors.TEXT_PRIMARY }]}>{library.name}</Text>
        <View style={[styles.versionBadge, { backgroundColor: colors.BACKGROUND_LIGHT }]}>
          <Text style={[styles.versionText, { color: colors.TEXT_SECONDARY }]}>{library.version}</Text>
        </View>
      </View>
      {library.description && (
        <Text style={[styles.libraryDescription, { color: colors.TEXT_SECONDARY }]}>{library.description}</Text>
      )}
      <View style={styles.libraryFooter}>
        <View style={styles.licenseContainer}>
          <Ionicons name="document-text-outline" size={16} color={colors.TEXT_TERTIARY} />
          <Text style={[styles.licenseText, { color: colors.TEXT_TERTIARY }]}>{library.license}</Text>
        </View>
        {library.repository && (
          <Pressable
            style={({ pressed }) => [
              styles.repositoryButton,
              pressed && { opacity: 0.7 },
            ]}
            onPress={() => {
              Linking.openURL(library.repository!).catch((err) => {
                console.error("Failed to open repository:", err);
                Alert.alert("오류", "링크를 열 수 없습니다.");
              });
            }}
          >
            <Ionicons name="open-outline" size={16} color={colors.KNU} />
            <Text style={[styles.repositoryText, { color: colors.KNU }]}>Repository</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  libraryItem: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  libraryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  libraryName: {
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
  },
  versionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  versionText: {
    fontSize: 12,
    fontWeight: "500",
  },
  libraryDescription: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  libraryFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  licenseContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  licenseText: {
    fontSize: 13,
    fontWeight: "500",
  },
  repositoryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  repositoryText: {
    fontSize: 13,
    fontWeight: "600",
  },
});
