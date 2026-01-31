import { useTheme } from "@/app/providers/ThemeProvider";
import { FeedbackModal } from "@/components/FeedbackModal";
import { Divider, MenuItem, SectionHeader } from "@/components/MoreTabMenu";
import { useColors } from "@/constants";
import { APP_INTRO_URL, NEW_CONTENT_URL, PRIVACY_POLICY_URL, TERMS_OF_SERVICE_URL } from "@/constants/link";
import Constants from "expo-constants";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import React, { useState } from "react";
import { Alert, ScrollView, StyleSheet, Switch } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function MoreScreen() {
  const colors = useColors();
  const { isDark, toggleTheme } = useTheme();
  const [feedbackModalVisible, setFeedbackModalVisible] = useState(false);

  const appVersion = Constants.expoConfig?.version || "1.0.0";

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.CARD_BACKGROUND }]} edges={["left", "right"]}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>

        {/* 알림 설정 */}
        <MenuItem
          icon="notifications-outline"
          label="알림 설정"
          onPress={() => {
            router.push("/notifications");
          }}
        />

        <Divider />

        {/* 이용 안내 섹션 */}
        <SectionHeader title="이용 안내" />
        <MenuItem
          icon="star-outline"
          label="새로운 내용"
          onPress={() => {
            Linking.openURL(NEW_CONTENT_URL).catch((err) => {
              console.error("Failed to open new content:", err);
              Alert.alert("오류", "링크를 열 수 없습니다.");
            });
          }}
        />
        <MenuItem
          icon="information-circle-outline"
          label="개인정보 처리방침"
          onPress={() => {
            Linking.openURL(PRIVACY_POLICY_URL).catch((err) => {
              console.error("Failed to open privacy policy:", err);
              Alert.alert("오류", "링크를 열 수 없습니다.");
            });
          }}
        />
        <MenuItem
          icon="document-text-outline"
          label="서비스 이용약관"
          onPress={() => {
            Linking.openURL(TERMS_OF_SERVICE_URL).catch((err) => {
              console.error("Failed to open terms of service:", err);
              Alert.alert("오류", "링크를 열 수 없습니다.");
            });
          }}
        />
        <MenuItem
          icon="information-circle-outline"
          label="앱 소개"
          onPress={() => {
            Linking.openURL(APP_INTRO_URL).catch((err) => {
              console.error("Failed to open app intro:", err);
              Alert.alert("오류", "링크를 열 수 없습니다.");
            });
          }}
        />

        <Divider />

        {/* 앱 설정 섹션 */}
        <SectionHeader title="앱 설정" />
        <MenuItem
          icon={isDark ? "moon" : "moon-outline"}
          label="다크 모드"
          rightElement={
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: colors.BORDER_COLOR, true: colors.KNU }}
              thumbColor={colors.WHITE}
            />
          }
        />
        <MenuItem icon="rocket-outline" label="앱 버전" value={appVersion} />

        <Divider />

        {/* 기타 섹션 */}
        <SectionHeader title="기타" />
        <MenuItem
          icon="folder-outline"
          label="사용된 오픈소스"
          onPress={() => {
            router.push("./more/open-source");
          }}
        />
        <MenuItem
          icon="mail-outline"
          label="피드백 보내기"
          onPress={() => {
            setFeedbackModalVisible(true);
          }}
        />
      </ScrollView>

      <FeedbackModal
        visible={feedbackModalVisible}
        onClose={() => setFeedbackModalVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12 },
});
