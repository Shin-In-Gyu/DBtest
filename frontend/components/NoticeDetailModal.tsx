import { ImageWithLoading } from "@/components/ImageWithLoading";
import { colors } from "@/constants";
import type { NoticeDetail } from "@/types";
import React, { useEffect } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { openUrl } from "@/utils/linking";

export default function NoticeDetailModal({
  visible,
  loading,
  detail,
  detailUrl,
  onClose,
  onMarkAsRead,
}: {
  visible: boolean;
  loading: boolean;
  detail?: NoticeDetail;
  detailUrl?: string;
  onClose: () => void;
  onMarkAsRead?: (url: string) => void;
}) {
  // 모달이 열리고 detailUrl이 있으면 읽음으로 표시
  useEffect(() => {
    if (visible && detailUrl && onMarkAsRead) {
      onMarkAsRead(detailUrl);
    }
  }, [visible, detailUrl, onMarkAsRead]);
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
              {typeof detail.views === "number" && (
                <Text style={s.views}>조회 {detail.views}</Text>
              )}
              
              {/* 이미지만 있는 경우 */}
              {detail.is_image_only && detail.images && detail.images.length > 0 ? (
                <View style={s.imageOnlyContainer}>
                  {detail.images.map((imageUrl, index) => (
                    <ImageWithLoading
                      key={`image-${index}`}
                      imageUrl={imageUrl}
                      style={s.fullWidthImage}
                    />
                  ))}
                </View>
              ) : detail.is_image_heavy && detail.images && detail.images.length > 0 ? (
                /* 이미지가 주로 이루고 있는 경우 */
                <View style={s.imageHeavyContainer}>
                  <View style={s.imageGallery}>
                    {detail.images.map((imageUrl, index) => (
                      <ImageWithLoading
                        key={`image-${index}`}
                        imageUrl={imageUrl}
                        style={s.galleryImage}
                      />
                    ))}
                  </View>
                  {detail.content && detail.content.trim() && (
                    <View style={s.minimalTextContainer}>
                      <Text style={s.minimalText}>{detail.content}</Text>
                    </View>
                  )}
                </View>
              ) : (
                /* 일반적인 공지사항 (텍스트 중심) */
                <>
                  <Text style={s.body}>{detail.content || "내용 없음"}</Text>
                  {detail.images && detail.images.length > 0 && (
                    <View style={s.inlineImages}>
                      {detail.images.map((imageUrl, index) => (
                        <ImageWithLoading
                          key={`image-${index}`}
                          imageUrl={imageUrl}
                          style={s.inlineImage}
                        />
                      ))}
                    </View>
                  )}
                </>
              )}

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
  views: { fontSize: 13, color: "#6b7280", marginTop: -4 },
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
  imageOnlyContainer: {
    width: "100%",
    gap: 8,
  },
  fullWidthImage: {
    width: "100%",
    height: 300,
    borderRadius: 8,
  },
  // 이미지가 주로 이루고 있는 경우
  imageHeavyContainer: {
    width: "100%",
  },
  imageGallery: {
    width: "100%",
    gap: 12,
    marginBottom: 16,
  },
  galleryImage: {
    width: "100%",
    height: 250,
    borderRadius: 8,
  },
  minimalTextContainer: {
    padding: 12,
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
    marginTop: 8,
  },
  minimalText: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
  // 일반적인 공지사항의 인라인 이미지
  inlineImages: {
    marginTop: 16,
    gap: 12,
  },
  inlineImage: {
    width: "100%",
    height: 200,
    borderRadius: 8,
  },
});
