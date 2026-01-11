// src/components/NoticeDetailModal.tsx
import type { NoticeDetail } from "@/api/knuNotice";
import { colors } from "@/constants";
import React from "react";
import {
    ActivityIndicator,
    Linking,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";

async function openUrl(url: string) {
  const can = await Linking.canOpenURL(url);
  if (!can) throw new Error("링크를 열 수 없습니다.");
  await Linking.openURL(url);
}

export default function NoticeDetailModal({
  visible,
  loading,
  detail,
  onClose,
}: {
  visible: boolean;
  loading: boolean;
  detail?: NoticeDetail;
  onClose: () => void;
}) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={s.backdrop}>
        <View style={s.card}>
          {loading && !detail ? (
            <View style={s.loading}>
              <ActivityIndicator size="large" color={colors.KNU} />
              <Text style={s.helper}>상세를 불러오는 중입니다...</Text>
            </View>
          ) : detail ? (
            <ScrollView contentContainerStyle={s.content}>
              <Text style={s.title}>{detail.title || "제목 없음"}</Text>
              <Text style={s.body}>{detail.content || "내용 없음"}</Text>

              {detail.files?.length ? (
                <View style={s.files}>
                  <Text style={s.sectionTitle}>첨부파일</Text>
                  {detail.files.map((file, idx) => (
                    <Pressable
                      key={`${file.url}-${idx}`}
                      onPress={() => openUrl(file.url)}
                      style={({ pressed }) => [
                        s.fileLink,
                        pressed && { opacity: 0.8 },
                      ]}
                    >
                      <Text style={s.fileText} numberOfLines={1}>
                        {file.name}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </ScrollView>
          ) : null}

          <Pressable
            onPress={onClose}
            style={({ pressed }) => [s.closeBtn, pressed && { opacity: 0.7 }]}
          >
            <Text style={s.closeText}>닫기</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },
  card: {
    maxHeight: "85%",
    backgroundColor: colors.WHITE,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 8,
  },
  loading: { alignItems: "center", paddingVertical: 40, gap: 8 },
  helper: { color: "#6b7280", fontSize: 14, marginTop: 4 },
  content: { gap: 14, paddingBottom: 18 },
  title: { fontSize: 18, fontWeight: "800", color: "#111827" },
  body: { fontSize: 15, lineHeight: 22, color: "#1f2937" },
  files: { gap: 8 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#111827" },
  fileLink: {
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  fileText: { color: colors.KNU, fontWeight: "700" },
  closeBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    marginTop: 8,
  },
  closeText: { fontSize: 16, fontWeight: "700", color: "#111827" },
});
