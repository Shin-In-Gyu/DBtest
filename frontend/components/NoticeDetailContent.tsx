import { ImageWithLoading } from "@/components/ImageWithLoading";
import { useColors } from "@/constants";
import type { NoticeDetail } from "@/types";
import { openUrl } from "@/utils/linking";
import React, { useMemo } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export type NoticeDetailContentProps = {
  detail: NoticeDetail | undefined;
  loading: boolean;
  onOpenFullScreen: (index: number) => void;
  onBack: () => void;
};

export function NoticeDetailContent({
  detail,
  loading,
  onOpenFullScreen,
  onBack,
}: NoticeDetailContentProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        loading: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
        helper: { color: colors.GRAY200, fontSize: 14, marginTop: 4 },
        content: {
          padding: 18,
          gap: 14,
          paddingBottom: Math.max(32, 24 + insets.bottom),
        },
        title: { fontSize: 20, fontWeight: "800", color: colors.TEXT_PRIMARY, lineHeight: 28 },
        views: { fontSize: 13, color: colors.GRAY200, marginTop: -4 },
        body: { fontSize: 16, lineHeight: 24, color: colors.TEXT_PRIMARY },
        files: { gap: 8, marginTop: 8 },
        sectionTitle: { fontSize: 16, fontWeight: "700", color: colors.TEXT_PRIMARY },
        fileLink: {
          backgroundColor: colors.WHITE400,
          paddingHorizontal: 12,
          paddingVertical: 10,
          borderRadius: 10,
        },
        fileText: { color: colors.KNU, fontWeight: "700" },

        imageOnlyContainer: { width: "100%", gap: 12 },
        imageHeavyContainer: { width: "100%" },
        imageGallery: { width: "100%", gap: 16, marginBottom: 16 },
        minimalTextContainer: {
          padding: 12,
          backgroundColor: colors.WHITE200,
          borderRadius: 8,
          marginTop: 8,
        },
        minimalText: { fontSize: 14, color: colors.GRAY600, lineHeight: 20 },
        inlineImages: { marginTop: 16, gap: 12 },

        errorContainer: {
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          padding: 32,
          gap: 16,
        },
        errorText: { fontSize: 16, color: colors.GRAY200, textAlign: "center" },
        errorButton: {
          backgroundColor: colors.KNU,
          paddingHorizontal: 24,
          paddingVertical: 12,
          borderRadius: 10,
        },
        errorButtonText: { color: colors.WHITE, fontSize: 16, fontWeight: "700" },
      }),
    [colors, insets.bottom]
  );

  if (loading && !detail) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.KNU} />
        <Text style={styles.helper}>상세를 불러오는 중입니다...</Text>
      </View>
    );
  }

  if (!detail) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>공지사항을 불러올 수 없습니다.</Text>
        <TouchableOpacity onPress={onBack} style={styles.errorButton}>
          <Text style={styles.errorButtonText}>돌아가기</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>{detail.title || "제목 없음"}</Text>
      {typeof detail.views === "number" && detail.views >= 0 && (
        <Text style={styles.views}>조회 {detail.views.toLocaleString("ko-KR")}</Text>
      )}

      {detail.is_image_only && detail.images && detail.images.length > 0 ? (
        <View style={styles.imageOnlyContainer}>
          {detail.images.map((url, idx) => (
            <ImageWithLoading
              key={idx}
              imageUrl={url}
              onPress={() => onOpenFullScreen(idx)}
            />
          ))}
        </View>
      ) : detail.is_image_heavy && detail.images && detail.images.length > 0 ? (
        <View style={styles.imageHeavyContainer}>
          <View style={styles.imageGallery}>
            {detail.images.map((url, idx) => (
              <ImageWithLoading
                key={idx}
                imageUrl={url}
                onPress={() => onOpenFullScreen(idx)}
              />
            ))}
          </View>
          {detail.content && (
            <View style={styles.minimalTextContainer}>
              <Text style={styles.minimalText}>{detail.content}</Text>
            </View>
          )}
        </View>
      ) : (
        <>
          <Text style={styles.body}>{detail.content || ""}</Text>
          {detail.images && detail.images.length > 0 && (
            <View style={styles.inlineImages}>
              {detail.images.map((url, idx) => (
                <ImageWithLoading
                  key={idx}
                  imageUrl={url}
                  onPress={() => onOpenFullScreen(idx)}
                />
              ))}
            </View>
          )}
        </>
      )}

      {detail.files?.length ? (
        <View style={styles.files}>
          <Text style={styles.sectionTitle}>첨부파일</Text>
          {detail.files.map((file, idx) => (
            <Pressable
              key={idx}
              onPress={() => openUrl(file.url)}
              style={({ pressed }) => [styles.fileLink, pressed && { opacity: 0.8 }]}
            >
              <Text style={styles.fileText} numberOfLines={1}>
                {file.name}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}
