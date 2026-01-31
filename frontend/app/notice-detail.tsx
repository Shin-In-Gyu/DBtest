// frontend/app/notice-detail.tsx
import { useReadStatus } from "@/app/providers/ReadStatusProvider";
import { useColors } from "@/constants";
import { useKnuNoticeDetail } from "@/hooks/useKNUNoticeDetail";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FullScreenImageViewer } from "@/components/FullScreenImageViewer";
import { NoticeDetailContent } from "@/components/NoticeDetailContent";

export default function NoticeDetailScreen() {
  const colors = useColors();
  const router = useRouter();
  const params = useLocalSearchParams<{ url: string; noticeId?: string; title?: string }>();
  const { markAsRead } = useReadStatus();
  const detailUrl = params.url;
  const noticeId = params.noticeId ? parseInt(params.noticeId, 10) : undefined;

  const detailQuery = useKnuNoticeDetail({ detailUrl: detailUrl ?? null, noticeId });
  const [fullScreenImageVisible, setFullScreenImageVisible] = useState(false);
  const [fullScreenImageIndex, setFullScreenImageIndex] = useState(0);

  useEffect(() => {
    if (detailUrl && markAsRead) markAsRead(detailUrl);
  }, [detailUrl, markAsRead]);

  const detail = detailQuery.data;
  const loading = detailQuery.isLoading;

  const openFullScreenImage = (index: number) => {
    setFullScreenImageIndex(index);
    setFullScreenImageVisible(true);
  };

  const s = useMemo(
    () =>
      StyleSheet.create({
        safe: { flex: 1, backgroundColor: colors.BACKGROUND },
        container: { flex: 1 },
        header: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: colors.BORDER_COLOR,
        },
        backButton: { padding: 4 },
        headerTitle: {
          flex: 1,
          fontSize: 18,
          fontWeight: "800",
          color: colors.TEXT_PRIMARY,
          textAlign: "center",
        },
        headerRight: { width: 32 },
      }),
    [colors]
  );

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <View style={s.container}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.TEXT_PRIMARY} />
          </TouchableOpacity>
          <Text style={s.headerTitle} numberOfLines={1}>
            공지사항
          </Text>
          <View style={s.headerRight} />
        </View>

        <NoticeDetailContent
          detail={detail}
          loading={loading}
          onOpenFullScreen={openFullScreenImage}
          onBack={() => router.back()}
        />
      </View>

      {detail?.images && detail.images.length > 0 && (
        <FullScreenImageViewer
          visible={fullScreenImageVisible}
          images={detail.images}
          initialIndex={fullScreenImageIndex}
          onClose={() => setFullScreenImageVisible(false)}
        />
      )}
    </SafeAreaView>
  );
}