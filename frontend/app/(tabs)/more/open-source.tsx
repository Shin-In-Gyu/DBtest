import { LibraryItem } from "@/components/LibraryItem";
import { useColors } from "@/constants";
import { OPEN_SOURCE_LIBRARIES } from "@/constants/open-source-url";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function OpenSourceScreen() {
  const colors = useColors();
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.BACKGROUND }]} edges={["top", "left", "right"]}>
      <View style={[styles.header, { borderBottomColor: colors.BORDER_COLOR }]}>
        <Pressable
          style={({ pressed }) => [styles.backButton, pressed && { opacity: 0.7 }]}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back-outline" size={24} color={colors.TEXT_PRIMARY} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.TEXT_PRIMARY }]}>사용된 오픈소스</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={[styles.introText, { color: colors.TEXT_SECONDARY }]}>
          이 앱은 다음과 같은 오픈소스 라이브러리를 사용하고 있습니다.
        </Text>

        {OPEN_SOURCE_LIBRARIES.map((library, index) => (
          <LibraryItem key={`${library.name}-${index}`} library={library} />
        ))}

        <View style={[styles.footer, { borderTopColor: colors.BORDER_COLOR }]}>
          <Text style={[styles.footerText, { color: colors.TEXT_TERTIARY }]}>
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
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerSpacer: {
    width: 40,
    height: 40,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
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
    lineHeight: 20,
    marginBottom: 24,
  },
  footer: {
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: 1,
  },
  footerText: {
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
  },
});

