import { useReadStatus } from "@/app/providers/ReadStatusProvider";
import { colors } from "@/constants";
import { useKnuNoticeDetail } from "@/hooks/useKNUNoticeDetail";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

async function openUrl(url: string) {
  const can = await Linking.canOpenURL(url);
  if (!can) throw new Error("링크를 열 수 없습니다.");
  await Linking.openURL(url);
}

// 이미지 로딩 상태를 처리하는 컴포넌트
function ImageWithLoading({
  imageUrl,
  style,
  onPress,
}: {
  imageUrl: string;
  style: any;
  onPress?: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const content = (
    <View style={[style, s.imageContainer]}>
      {loading && (
        <View style={s.imageLoadingContainer}>
          <ActivityIndicator size="small" color={colors.KNU} />
        </View>
      )}
      {error ? (
        <View style={s.imageErrorContainer}>
          <Text style={s.imageErrorText}>이미지를 불러올 수 없습니다</Text>
        </View>
      ) : (
        <Image
          source={{ uri: imageUrl }}
          style={style}
          resizeMode="contain"
          onLoadStart={() => {
            setLoading(true);
            setError(false);
          }}
          onLoadEnd={() => setLoading(false)}
          onError={() => {
            setLoading(false);
            setError(true);
          }}
        />
      )}
    </View>
  );

  if (onPress) {
    return <TouchableOpacity onPress={onPress}>{content}</TouchableOpacity>;
  }

  return content;
}

// 전체 화면 이미지 뷰어
function FullScreenImageViewer({
  visible,
  images,
  initialIndex,
  onClose,
}: {
  visible: boolean;
  images: string[];
  initialIndex: number;
  onClose: () => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  if (!visible || images.length === 0) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={s.fullScreenContainer}>
        <SafeAreaView style={s.fullScreenSafeArea}>
          {/* 헤더 */}
          <View style={s.fullScreenHeader}>
            <Text style={s.fullScreenHeaderText}>
              {currentIndex + 1} / {images.length}
            </Text>
            <TouchableOpacity onPress={onClose} style={s.fullScreenCloseBtn}>
              <Ionicons name="close" size={28} color={colors.WHITE} />
            </TouchableOpacity>
          </View>

          {/* 이미지 */}
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => {
              const index = Math.round(
                e.nativeEvent.contentOffset.x / SCREEN_WIDTH
              );
              setCurrentIndex(index);
            }}
            contentOffset={{ x: currentIndex * SCREEN_WIDTH, y: 0 }}
          >
            {images.map((imageUrl, index) => (
              <View key={`full-${index}`} style={s.fullScreenImageWrapper}>
                <Image
                  source={{ uri: imageUrl }}
                  style={s.fullScreenImage}
                  resizeMode="contain"
                />
              </View>
            ))}
          </ScrollView>

          {/* 인디케이터 */}
          {images.length > 1 && (
            <View style={s.fullScreenIndicator}>
              {images.map((_, index) => (
                <View
                  key={`indicator-${index}`}
                  style={[
                    s.indicatorDot,
                    index === currentIndex && s.indicatorDotActive,
                  ]}
                />
              ))}
            </View>
          )}
        </SafeAreaView>
      </View>
    </Modal>
  );
}

export default function NoticeDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    url: string;
    noticeId?: string;
    title?: string;
  }>();

  const { markAsRead } = useReadStatus();
  const detailUrl = params.url;
  const noticeId = params.noticeId ? parseInt(params.noticeId, 10) : undefined;

  const detailQuery = useKnuNoticeDetail({
    detailUrl: detailUrl ?? null,
    noticeId,
  });

  const [fullScreenImageVisible, setFullScreenImageVisible] = useState(false);
  const [fullScreenImageIndex, setFullScreenImageIndex] = useState(0);

  // 읽음 표시
  useEffect(() => {
    if (detailUrl && markAsRead) {
      markAsRead(detailUrl);
    }
  }, [detailUrl, markAsRead]);

  const detail = detailQuery.data;
  const loading = detailQuery.isLoading;

  const openFullScreenImage = (index: number) => {
    setFullScreenImageIndex(index);
    setFullScreenImageVisible(true);
  };

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <View style={s.container}>
        {/* 헤더 */}
        <View style={s.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={s.backButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={24} color={colors.BLACK} />
          </TouchableOpacity>
          <Text style={s.headerTitle} numberOfLines={1}>
            공지사항
          </Text>
          <View style={s.headerRight} />
        </View>

        {loading && !detail ? (
          <View style={s.loading}>
            <ActivityIndicator size="large" color={colors.KNU} />
            <Text style={s.helper}>상세를 불러오는 중입니다...</Text>
          </View>
        ) : detail ? (
          <ScrollView
            contentContainerStyle={s.content}
            showsVerticalScrollIndicator={false}
          >
            <Text style={s.title}>{detail.title || "제목 없음"}</Text>
            {typeof detail.views === "number" && detail.views >= 0 && (
              <Text style={s.views}>
                조회 {detail.views.toLocaleString("ko-KR")}
              </Text>
            )}

            {/* 이미지만 있는 경우 */}
            {detail.is_image_only && detail.images && detail.images.length > 0 ? (
              <View style={s.imageOnlyContainer}>
                {detail.images.map((imageUrl, index) => (
                  <ImageWithLoading
                    key={`image-${index}`}
                    imageUrl={imageUrl}
                    style={s.fullWidthImage}
                    onPress={() => openFullScreenImage(index)}
                  />
                ))}
              </View>
            ) : detail.is_image_heavy &&
              detail.images &&
              detail.images.length > 0 ? (
              /* 이미지가 주로 이루고 있는 경우 */
              <View style={s.imageHeavyContainer}>
                <View style={s.imageGallery}>
                  {detail.images.map((imageUrl, index) => (
                    <ImageWithLoading
                      key={`image-${index}`}
                      imageUrl={imageUrl}
                      style={s.galleryImage}
                      onPress={() => openFullScreenImage(index)}
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
                        onPress={() => openFullScreenImage(index)}
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
        ) : (
          <View style={s.errorContainer}>
            <Text style={s.errorText}>공지사항을 불러올 수 없습니다.</Text>
            <TouchableOpacity
              onPress={() => router.back()}
              style={s.errorButton}
            >
              <Text style={s.errorButtonText}>돌아가기</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* 전체 화면 이미지 뷰어 */}
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

const s = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.WHITE,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "800",
    color: colors.BLACK,
    textAlign: "center",
    marginHorizontal: 16,
  },
  headerRight: {
    width: 32,
  },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  helper: {
    color: "#6b7280",
    fontSize: 14,
    marginTop: 4,
  },
  content: {
    padding: 18,
    gap: 14,
    paddingBottom: 32,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
    lineHeight: 28,
  },
  views: {
    fontSize: 13,
    color: "#6b7280",
    marginTop: -4,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    color: "#1f2937",
  },
  files: {
    gap: 8,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  fileLink: {
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  fileText: {
    color: colors.KNU,
    fontWeight: "700",
  },
  // 이미지 관련 스타일
  imageContainer: {
    position: "relative",
    backgroundColor: colors.WHITE,
    borderRadius: 8,
    overflow: "hidden",
  },
  imageLoadingContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.WHITE,
    zIndex: 1,
  },
  imageErrorContainer: {
    width: "100%",
    height: 200,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.WHITE,
  },
  imageErrorText: {
    color: "#6b7280",
    fontSize: 14,
  },
  // 이미지만 있는 경우
  imageOnlyContainer: {
    width: "100%",
    gap: 12,
  },
  fullWidthImage: {
    width: "100%",
    minHeight: 400,
    maxHeight: SCREEN_HEIGHT * 0.6,
    borderRadius: 8,
  },
  // 이미지가 주로 이루고 있는 경우
  imageHeavyContainer: {
    width: "100%",
  },
  imageGallery: {
    width: "100%",
    gap: 16,
    marginBottom: 16,
  },
  galleryImage: {
    width: "100%",
    minHeight: 400,
    maxHeight: SCREEN_HEIGHT * 0.6,
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
    minHeight: 300,
    maxHeight: SCREEN_HEIGHT * 0.5,
    borderRadius: 8,
  },
  // 전체 화면 이미지 뷰어
  fullScreenContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.95)",
  },
  fullScreenSafeArea: {
    flex: 1,
  },
  fullScreenHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  fullScreenHeaderText: {
    color: colors.WHITE,
    fontSize: 16,
    fontWeight: "600",
  },
  fullScreenCloseBtn: {
    padding: 4,
  },
  fullScreenImageWrapper: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: "center",
    alignItems: "center",
  },
  fullScreenImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  fullScreenIndicator: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    paddingVertical: 16,
  },
  indicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
  },
  indicatorDotActive: {
    backgroundColor: colors.WHITE,
  },
  // 에러 상태
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 16,
  },
  errorText: {
    fontSize: 16,
    color: "#6b7280",
    textAlign: "center",
  },
  errorButton: {
    backgroundColor: colors.KNU,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  errorButtonText: {
    color: colors.WHITE,
    fontSize: 16,
    fontWeight: "700",
  },
});
