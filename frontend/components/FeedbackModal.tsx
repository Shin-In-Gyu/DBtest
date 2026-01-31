import { submitFeedback } from "@/api/knuNotice";
import { useColors } from "@/constants";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

interface FeedbackModalProps {
  visible: boolean;
  onClose: () => void;
}

export function FeedbackModal({ visible, onClose }: FeedbackModalProps) {
  const colors = useColors();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) {
      Alert.alert("입력 필요", "제목과 내용을 모두 입력해주세요.");
      return;
    }

    setSubmitting(true);
    try {
      await submitFeedback({
        title: title.trim(),
        content: content.trim(),
      });
      Alert.alert("전송 완료", "피드백이 성공적으로 전송되었습니다.", [
        {
          text: "확인",
          onPress: () => {
            resetAndClose();
          },
        },
      ]);
    } catch (error) {
      console.error("Feedback submission error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "피드백 전송에 실패했습니다.";
      Alert.alert("전송 실패", errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const resetAndClose = () => {
    setTitle("");
    setContent("");
    onClose();
  };

  const handleRequestClose = () => {
    if (submitting) return;
    resetAndClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleRequestClose}
    >
      <Pressable style={styles.backdrop} onPress={handleRequestClose}>
        <Pressable
          style={[styles.card, { backgroundColor: colors.CARD_BACKGROUND }]}
          onPress={(e) => e.stopPropagation()}
        >
          <Text style={[styles.title, { color: colors.TEXT_PRIMARY }]}>
            피드백 보내기
          </Text>
          <Text style={[styles.hint, { color: colors.TEXT_SECONDARY }]}>
            앱에 대한 의견이나 개선사항을 알려주세요.
          </Text>

          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { color: colors.TEXT_PRIMARY }]}>
              제목
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.CARD_BACKGROUND,
                  borderColor: colors.BORDER_COLOR,
                  color: colors.TEXT_PRIMARY,
                },
              ]}
              placeholder="피드백 제목을 입력하세요"
              placeholderTextColor={colors.PLACEHOLDER_COLOR}
              value={title}
              onChangeText={setTitle}
              editable={!submitting}
              maxLength={100}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { color: colors.TEXT_PRIMARY }]}>
              내용
            </Text>
            <TextInput
              style={[
                styles.input,
                styles.textArea,
                {
                  backgroundColor: colors.CARD_BACKGROUND,
                  borderColor: colors.BORDER_COLOR,
                  color: colors.TEXT_PRIMARY,
                },
              ]}
              placeholder="피드백 내용을 입력하세요"
              placeholderTextColor={colors.PLACEHOLDER_COLOR}
              value={content}
              onChangeText={setContent}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              editable={!submitting}
              maxLength={1000}
            />
          </View>

          <View style={styles.buttonRow}>
            <Pressable
              style={({ pressed }) => [
                styles.cancelBtn,
                {
                  backgroundColor: colors.BACKGROUND_LIGHT,
                  borderColor: colors.BORDER_COLOR,
                },
                pressed && { opacity: 0.8 },
                submitting && styles.buttonDisabled,
              ]}
              onPress={handleRequestClose}
              disabled={submitting}
            >
              <Text
                style={[styles.cancelBtnText, { color: colors.TEXT_PRIMARY }]}
              >
                취소
              </Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.submitBtn,
                { backgroundColor: colors.KNU },
                pressed && { opacity: 0.8 },
                submitting && styles.buttonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color={colors.WHITE} size="small" />
              ) : (
                <Text style={[styles.submitBtnText, { color: colors.WHITE }]}>
                  전송
                </Text>
              )}
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    padding: 20,
  },
  card: {
    borderRadius: 16,
    padding: 20,
    maxWidth: 400,
    width: "100%",
    alignSelf: "center",
    maxHeight: "80%",
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 10,
  },
  hint: {
    fontSize: 13,
    marginBottom: 12,
    lineHeight: 20,
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
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
  },
  cancelBtnText: {
    fontWeight: "600",
    fontSize: 15,
  },
  submitBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  submitBtnText: {
    fontWeight: "700",
    fontSize: 15,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
