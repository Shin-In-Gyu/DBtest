import { colors } from "@/constants";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Linking from "expo-linking";
import React from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface OpenSourceLibrary {
  name: string;
  version: string;
  license: string;
  repository?: string;
  description?: string;
}

const OPEN_SOURCE_LIBRARIES: OpenSourceLibrary[] = [
  {
    name: "React",
    version: "19.1.0",
    license: "MIT",
    repository: "https://github.com/facebook/react",
    description: "A JavaScript library for building user interfaces",
  },
  {
    name: "React Native",
    version: "0.81.5",
    license: "MIT",
    repository: "https://github.com/facebook/react-native",
    description: "A framework for building native apps with React",
  },
  {
    name: "Expo",
    version: "~54.0.30",
    license: "MIT",
    repository: "https://github.com/expo/expo",
    description: "An open-source platform for making universal native apps",
  },
  {
    name: "Expo Router",
    version: "~6.0.21",
    license: "MIT",
    repository: "https://github.com/expo/router",
    description: "File-based routing for React Native",
  },
  {
    name: "@tanstack/react-query",
    version: "^5.90.16",
    license: "MIT",
    repository: "https://github.com/TanStack/query",
    description: "Powerful data synchronization for React",
  },
  {
    name: "@expo/vector-icons",
    version: "^15.0.3",
    license: "MIT",
    repository: "https://github.com/expo/vector-icons",
    description: "Icon library for Expo and React Native",
  },
  {
    name: "@react-native-async-storage/async-storage",
    version: "2.2.0",
    license: "MIT",
    repository: "https://github.com/react-native-async-storage/async-storage",
    description: "Asynchronous, persistent, key-value storage system",
  },
  {
    name: "@react-navigation/native",
    version: "^7.1.8",
    license: "MIT",
    repository: "https://github.com/react-navigation/react-navigation",
    description: "Routing and navigation for React Native apps",
  },
  {
    name: "react-native-safe-area-context",
    version: "~5.6.0",
    license: "MIT",
    repository: "https://github.com/th3rdwave/react-native-safe-area-context",
    description: "A flexible way to handle safe area, also works on Android and web",
  },
  {
    name: "react-native-screens",
    version: "~4.16.0",
    license: "MIT",
    repository: "https://github.com/software-mansion/react-native-screens",
    description: "Native navigation primitives for your React Native app",
  },
  {
    name: "react-native-gesture-handler",
    version: "~2.28.0",
    license: "MIT",
    repository: "https://github.com/software-mansion/react-native-gesture-handler",
    description: "Declarative API exposing platform native touch and gesture system",
  },
  {
    name: "react-native-reanimated",
    version: "~4.1.1",
    license: "MIT",
    repository: "https://github.com/software-mansion/react-native-reanimated",
    description: "React Native's Animated library reimplemented",
  },
  {
    name: "@mj-studio/react-native-naver-map",
    version: "^2.7.0",
    license: "MIT",
    repository: "https://github.com/mj-studio/react-native-naver-map",
    description: "React Native Naver Map Component",
  },
  {
    name: "react-native-webview",
    version: "13.15.0",
    license: "MIT",
    repository: "https://github.com/react-native-webview/react-native-webview",
    description: "React Native WebView component",
  },
  {
    name: "expo-notifications",
    version: "~0.32.16",
    license: "MIT",
    repository: "https://github.com/expo/expo",
    description: "Provides an API to fetch push notification tokens and to present, schedule, receive and respond to notifications",
  },
  {
    name: "expo-linking",
    version: "~8.0.11",
    license: "MIT",
    repository: "https://github.com/expo/expo",
    description: "Create deep links into your app",
  },
  {
    name: "expo-clipboard",
    version: "~8.0.8",
    license: "MIT",
    repository: "https://github.com/expo/expo",
    description: "Provides an interface for getting and setting clipboard content",
  },
];

function LibraryItem({ library }: { library: OpenSourceLibrary }) {
  return (
    <View style={styles.libraryItem}>
      <View style={styles.libraryHeader}>
        <Text style={styles.libraryName}>{library.name}</Text>
        <View style={styles.versionBadge}>
          <Text style={styles.versionText}>{library.version}</Text>
        </View>
      </View>
      {library.description && (
        <Text style={styles.libraryDescription}>{library.description}</Text>
      )}
      <View style={styles.libraryFooter}>
        <View style={styles.licenseContainer}>
          <Ionicons name="document-text-outline" size={16} color="#6b7280" />
          <Text style={styles.licenseText}>{library.license}</Text>
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
            <Text style={styles.repositoryText}>Repository</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

export default function OpenSourceScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [styles.backButton, pressed && { opacity: 0.7 }]}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back-outline" size={24} color="#111" />
        </Pressable>
        <Text style={styles.headerTitle}>사용된 오픈소스</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.introText}>
          이 앱은 다음과 같은 오픈소스 라이브러리를 사용하고 있습니다.
        </Text>

        {OPEN_SOURCE_LIBRARIES.map((library, index) => (
          <LibraryItem key={`${library.name}-${index}`} library={library} />
        ))}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            모든 오픈소스 라이브러리의 라이선스는 각각의 저장소에서 확인할 수 있습니다.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.WHITE,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111",
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  introText: {
    fontSize: 14,
    color: "#6b7280",
    lineHeight: 20,
    marginBottom: 24,
  },
  libraryItem: {
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
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
    color: "#111",
    flex: 1,
  },
  versionBadge: {
    backgroundColor: "#e5e7eb",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  versionText: {
    fontSize: 12,
    color: "#374151",
    fontWeight: "500",
  },
  libraryDescription: {
    fontSize: 13,
    color: "#6b7280",
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
    color: "#6b7280",
    fontWeight: "500",
  },
  repositoryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  repositoryText: {
    fontSize: 13,
    color: colors.KNU,
    fontWeight: "600",
  },
  footer: {
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  footerText: {
    fontSize: 12,
    color: "#9ca3af",
    textAlign: "center",
    lineHeight: 18,
  },
});

