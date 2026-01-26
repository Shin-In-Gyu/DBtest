import { submitFeedback } from "@/api/knuNotice";
import { useTheme } from "@/app/providers/ThemeProvider";
import { useColors } from "@/constants";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const PRIVACY_POLICY_URL = "https://troubled-buffet-fd9.notion.site/2ef8cd322ea380b2a2d8e306c410c52b?source=copy_link";
const TERMS_OF_SERVICE_URL = "https://troubled-buffet-fd9.notion.site/2ef8cd322ea380fbac20cfa69e0450d1?source=copy_link";
const APP_INTRO_URL = "https://troubled-buffet-fd9.notion.site/2ef8cd322ea38076bf76f192daeb78be?source=copy_link";
const NEW_CONTENT_URL = "https://troubled-buffet-fd9.notion.site/2f08cd322ea380069501dd327cf569ab?source=copy_link";

interface MenuItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  onPress?: () => void;
}

function MenuItem({ icon, label, value, onPress, rightElement }: MenuItemProps & { rightElement?: React.ReactNode }) {
  const colors = useColors();
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
        <Text style={[styles.menuText, { color: colors.TEXT_PRIMARY }]}>{label}</Text>
      </View>
      {value && <Text style={[styles.menuValue, { color: colors.TEXT_SECONDARY }]}>{value}</Text>}
      {rightElement || (onPress && (
        <Ionicons name="chevron-forward-outline" size={20} color={colors.TEXT_TERTIARY} />
      ))}
    </Pressable>
  );
}

function SectionHeader({ title }: { title: string }) {
  const colors = useColors();
  return <Text style={[styles.sectionHeader, { color: colors.TEXT_SECONDARY }]}>{title}</Text>;
}

function Divider() {
  const colors = useColors();
  return <View style={[styles.divider, { backgroundColor: colors.DIVIDER_COLOR }]} />;
}

export default function MoreScreen() {
  const colors = useColors();
  const { isDark, toggleTheme } = useTheme();
  const [feedbackModalVisible, setFeedbackModalVisible] = useState(false);
  const [feedbackTitle, setFeedbackTitle] = useState("");
  const [feedbackContent, setFeedbackContent] = useState("");
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);

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
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.BACKGROUND }]} edges={["left", "right", "bottom"]}>
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
          <Pressable style={[styles.feedbackModalCard, { backgroundColor: colors.CARD_BACKGROUND }]} onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.modalTitle, { color: colors.TEXT_PRIMARY }]}>피드백 보내기</Text>
            <Text style={[styles.modalHint, { color: colors.TEXT_SECONDARY }]}>
              앱에 대한 의견이나 개선사항을 알려주세요.
            </Text>

            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: colors.TEXT_PRIMARY }]}>제목</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.CARD_BACKGROUND, borderColor: colors.BORDER_COLOR, color: colors.TEXT_PRIMARY }]}
                placeholder="피드백 제목을 입력하세요"
                placeholderTextColor={colors.PLACEHOLDER_COLOR}
                value={feedbackTitle}
                onChangeText={setFeedbackTitle}
                editable={!feedbackSubmitting}
                maxLength={100}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: colors.TEXT_PRIMARY }]}>내용</Text>
              <TextInput
                style={[styles.input, styles.textArea, { backgroundColor: colors.CARD_BACKGROUND, borderColor: colors.BORDER_COLOR, color: colors.TEXT_PRIMARY }]}
                placeholder="피드백 내용을 입력하세요"
                placeholderTextColor={colors.PLACEHOLDER_COLOR}
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
                  { backgroundColor: colors.BACKGROUND_LIGHT, borderColor: colors.BORDER_COLOR },
                  pressed && { opacity: 0.8 },
                  feedbackSubmitting && styles.buttonDisabled,
                ]}
                onPress={handleCloseFeedbackModal}
                disabled={feedbackSubmitting}
              >
                <Text style={[styles.feedbackCancelBtnText, { color: colors.TEXT_PRIMARY }]}>취소</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.feedbackSubmitBtn,
                  { backgroundColor: colors.KNU },
                  pressed && { opacity: 0.8 },
                  feedbackSubmitting && styles.buttonDisabled,
                ]}
                onPress={handleSubmitFeedback}
                disabled={feedbackSubmitting}
              >
                {feedbackSubmitting ? (
                  <ActivityIndicator color={colors.WHITE} size="small" />
                ) : (
                  <Text style={[styles.feedbackSubmitBtnText, { color: colors.WHITE }]}>전송</Text>
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
  safe: { flex: 1 },
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  
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

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    padding: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: "800", marginBottom: 10 },
  modalHint: { fontSize: 13, marginBottom: 12, lineHeight: 20 },

  feedbackModalCard: {
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
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
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
    borderWidth: 1,
  },
  feedbackCancelBtnText: {
    fontWeight: "600",
    fontSize: 15,
  },
  feedbackSubmitBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  feedbackSubmitBtnText: {
    fontWeight: "700",
    fontSize: 15,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
