import { submitFeedback } from "@/api/knuNotice";
import { colors } from "@/constants";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import Constants from "expo-constants";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const EXPO_PUSH_TEST_URL = "https://expo.dev/notifications";
const PRIVACY_POLICY_URL = "https://troubled-buffet-fd9.notion.site/2ef8cd322ea380b2a2d8e306c410c52b?source=copy_link";
const TERMS_OF_SERVICE_URL = "https://troubled-buffet-fd9.notion.site/2ef8cd322ea380fbac20cfa69e0450d1?source=copy_link";
const APP_INTRO_URL = "https://troubled-buffet-fd9.notion.site/2ef8cd322ea38076bf76f192daeb78be?source=copy_link";

interface MenuItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  onPress?: () => void;
}

function MenuItem({ icon, label, value, onPress }: MenuItemProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.menuItem,
        pressed && styles.menuItemPressed,
      ]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.menuItemLeft}>
        <Ionicons name={icon} size={22} color="#374151" />
        <Text style={styles.menuText}>{label}</Text>
      </View>
      {value && <Text style={styles.menuValue}>{value}</Text>}
      {onPress && (
        <Ionicons name="chevron-forward-outline" size={20} color="#9ca3af" />
      )}
    </Pressable>
  );
}

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

function Divider() {
  return <View style={styles.divider} />;
}

export default function MoreScreen() {
  const [tokenLoading, setTokenLoading] = useState(false);
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [feedbackModalVisible, setFeedbackModalVisible] = useState(false);
  const [feedbackTitle, setFeedbackTitle] = useState("");
  const [feedbackContent, setFeedbackContent] = useState("");
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);

  const copyTokenToClipboard = async () => {
    if (!expoPushToken) return;
    try {
      await Clipboard.setStringAsync(expoPushToken);
      Alert.alert("복사 완료", "토큰이 클립보드에 복사되었습니다.");
    } catch (error) {
      console.error("Copy error:", error);
      Alert.alert("오류", "토큰 복사에 실패했습니다.");
    }
  };

  const fetchExpoPushTokenForTest = async () => {
    setTokenLoading(true);
    setExpoPushToken(null);
    try {
      const Notifications = await import("expo-notifications");
      const { status: existing } = await Notifications.getPermissionsAsync();
      let final = existing;
      if (existing !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        final = status;
      }
      if (final !== "granted") {
        Alert.alert("권한 필요", "알림 테스트를 위해 알림 권한을 허용해 주세요.");
        return;
      }
      const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
      const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
      if (!token) {
        Alert.alert("오류", "Expo Push 토큰을 가져올 수 없습니다.");
        return;
      }
      setExpoPushToken(token);
    } catch (error) {
      console.error("Token fetch error:", error);
      Alert.alert(
        "오류",
        "토큰을 가져올 수 없습니다. 실기기에서 Expo Go 또는 EAS 개발 빌드로 실행해 주세요. (시뮬레이터/웹 미지원)"
      );
    } finally {
      setTokenLoading(false);
    }
  };

  const appVersion = Constants.expoConfig?.version || "1.0.0";

  const handleSubmitFeedback = async () => {
    if (!feedbackTitle.trim() || !feedbackContent.trim()) {
      Alert.alert("입력 필요", "제목과 내용을 모두 입력해주세요.");
      return;
    }

    setFeedbackSubmitting(true);
    try {
      await submitFeedback({
        title: feedbackTitle.trim(),
        content: feedbackContent.trim(),
      });
      Alert.alert("전송 완료", "피드백이 성공적으로 전송되었습니다.", [
        {
          text: "확인",
          onPress: () => {
            setFeedbackModalVisible(false);
            setFeedbackTitle("");
            setFeedbackContent("");
          },
        },
      ]);
    } catch (error) {
      console.error("Feedback submission error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "피드백 전송에 실패했습니다.";
      Alert.alert("전송 실패", errorMessage);
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  const handleCloseFeedbackModal = () => {
    if (feedbackSubmitting) return;
    setFeedbackModalVisible(false);
    setFeedbackTitle("");
    setFeedbackContent("");
  };

  return (
    <SafeAreaView style={styles.safe} edges={["left", "right", "bottom"]}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>

        {/* 알림 설정 */}
        <MenuItem
          icon="notifications-outline"
          label="알림 설정"
          onPress={() => {
            // TODO: 알림 설정 페이지로 이동
          }}
        />

        <Divider />

        {/* 이용 안내 섹션 */}
        <SectionHeader title="이용 안내" />
        <MenuItem
          icon="star-outline"
          label="새로운 내용"
          onPress={() => {
            // TODO: 새로운 내용 페이지로 이동
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
        <MenuItem icon="rocket-outline" label="앱 버전" value={appVersion} />

        <Divider />

        {/* 기타 섹션 */}
        <SectionHeader title="기타" />
        <MenuItem
          icon="folder-outline"
          label="사용된 오픈소스"
          onPress={() => {
            router.push("/(tabs)/more/open-source");
          }}
        />
        <MenuItem
          icon="mail-outline"
          label="피드백 보내기"
          onPress={() => {
            setFeedbackModalVisible(true);
          }}
        />

        <Divider />

        {/* 개발자 옵션 섹션 */}
        {Platform.OS !== "web" && (
          <>
            <SectionHeader title="개발자 옵션" />
            <MenuItem
              icon="code-outline"
              label="알림 테스트"
              onPress={fetchExpoPushTokenForTest}
            />
          </>
        )}
      </ScrollView>

      {/* 토큰 모달 */}
      <Modal
        visible={!!expoPushToken}
        transparent
        animationType="fade"
        onRequestClose={() => setExpoPushToken(null)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setExpoPushToken(null)}
        >
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Expo Push 토큰</Text>
            <Text style={styles.modalHint}>
              아래 토큰을 클릭하면 자동으로 복사됩니다. expo.dev/notifications의 Recipient에 붙여넣으세요.
            </Text>
            <Pressable
              style={styles.tokenContainer}
              onPress={copyTokenToClipboard}
            >
              <ScrollView style={styles.tokenScroll} horizontal>
                <Text selectable style={styles.tokenText}>
                  {expoPushToken}
                </Text>
              </ScrollView>
              <Text style={styles.copyHint}>클릭하여 복사</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.modalBtn, pressed && { opacity: 0.8 }]}
              onPress={() => Linking.openURL(EXPO_PUSH_TEST_URL)}
            >
              <Text style={styles.modalBtnText}>expo.dev/notifications 열기</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.modalBtnSecondary, pressed && { opacity: 0.8 }]}
              onPress={() => setExpoPushToken(null)}
            >
              <Text style={styles.modalBtnSecondaryText}>닫기</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* 피드백 모달 */}
      <Modal
        visible={feedbackModalVisible}
        transparent
        animationType="fade"
        onRequestClose={handleCloseFeedbackModal}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={handleCloseFeedbackModal}
        >
          <Pressable style={styles.feedbackModalCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>피드백 보내기</Text>
            <Text style={styles.modalHint}>
              앱에 대한 의견이나 개선사항을 알려주세요.
            </Text>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>제목</Text>
              <TextInput
                style={styles.input}
                placeholder="피드백 제목을 입력하세요"
                value={feedbackTitle}
                onChangeText={setFeedbackTitle}
                editable={!feedbackSubmitting}
                maxLength={100}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>내용</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="피드백 내용을 입력하세요"
                value={feedbackContent}
                onChangeText={setFeedbackContent}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                editable={!feedbackSubmitting}
                maxLength={1000}
              />
            </View>

            <View style={styles.feedbackButtonRow}>
              <Pressable
                style={({ pressed }) => [
                  styles.feedbackCancelBtn,
                  pressed && { opacity: 0.8 },
                  feedbackSubmitting && styles.buttonDisabled,
                ]}
                onPress={handleCloseFeedbackModal}
                disabled={feedbackSubmitting}
              >
                <Text style={styles.feedbackCancelBtnText}>취소</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.feedbackSubmitBtn,
                  pressed && { opacity: 0.8 },
                  feedbackSubmitting && styles.buttonDisabled,
                ]}
                onPress={handleSubmitFeedback}
                disabled={feedbackSubmitting}
              >
                {feedbackSubmitting ? (
                  <ActivityIndicator color={colors.WHITE} size="small" />
                ) : (
                  <Text style={styles.feedbackSubmitBtnText}>전송</Text>
                )}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.WHITE },
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  
  sectionHeader: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6b7280",
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
  menuItemPressed: { backgroundColor: "#f3f4f6" },
  menuItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  menuText: { fontSize: 16, color: "#111", fontWeight: "500" },
  menuValue: { fontSize: 14, color: "#6b7280", marginRight: 8 },
  
  divider: {
    height: 1,
    backgroundColor: "#e5e7eb",
    marginVertical: 8,
    marginHorizontal: 4,
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: colors.WHITE,
    borderRadius: 16,
    padding: 20,
    maxWidth: 400,
    alignSelf: "center",
  },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#111", marginBottom: 10 },
  modalHint: { fontSize: 13, color: "#6b7280", marginBottom: 12, lineHeight: 20 },
  tokenContainer: {
    backgroundColor: "#f3f4f6",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  tokenScroll: { maxHeight: 80, marginBottom: 8 },
  tokenText: { fontSize: 12, color: "#374151", fontFamily: "monospace" },
  copyHint: {
    fontSize: 11,
    color: "#6b7280",
    textAlign: "center",
    marginTop: 4,
    fontStyle: "italic",
  },
  modalBtn: {
    backgroundColor: colors.KNU,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 8,
  },
  modalBtnText: { color: colors.WHITE, fontWeight: "700", fontSize: 15 },
  modalBtnSecondary: { paddingVertical: 12, alignItems: "center" },
  modalBtnSecondaryText: { color: "#6b7280", fontWeight: "600", fontSize: 15 },

  feedbackModalCard: {
    backgroundColor: colors.WHITE,
    borderRadius: 16,
    padding: 20,
    maxWidth: 400,
    width: "100%",
    alignSelf: "center",
    maxHeight: "80%",
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#111",
    backgroundColor: "#fff",
  },
  textArea: {
    minHeight: 120,
    paddingTop: 12,
  },
  feedbackButtonRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  feedbackCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    backgroundColor: "#f3f4f6",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  feedbackCancelBtnText: {
    color: "#374151",
    fontWeight: "600",
    fontSize: 15,
  },
  feedbackSubmitBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    backgroundColor: colors.KNU,
  },
  feedbackSubmitBtnText: {
    color: colors.WHITE,
    fontWeight: "700",
    fontSize: 15,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
