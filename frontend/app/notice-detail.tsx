// frontend/app/notice-detail.tsx
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
  StatusBar,
  Share, // [추가] 공유 기능
} from "react-native";
// [개선] 기기별 세이프 에어리어 수치를 직접 가져오기 위해 필수
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const IMAGE_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
};

async function openUrl(url: string) {
  const can = await Linking.canOpenURL(url);
  if (!can) throw new Error("링크를 열 수 없습니다.");
  await Linking.openURL(url);
}

/**
 * [개선] 이미지 로딩 및 자동 비율 조정 컴포넌트
 * 원본 이미지의 너비/높이를 계산하여 리스트에서 잘림 없이 보여줍니다.
 */
function ImageWithLoading({
  imageUrl,
  onPress,
  isFullWidth = true,
}: {
  imageUrl: string;
  onPress?: () => void;
  isFullWidth?: boolean;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [aspectRatio, setAspectRatio] = useState(1);

  const content = (
    <View style={s.imageContainer}>
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
          source={{ uri: imageUrl, headers: IMAGE_HEADERS }}
          style={[
            isFullWidth ? s.fullWidthImageBase : s.galleryImageBase,
            { aspectRatio },
            loading && { position: "absolute", opacity: 0 },
          ]}
          resizeMode="contain"
          onLoad={(e) => {
            const { width, height } = e.nativeEvent.source;
            if (width && height) setAspectRatio(width / height);
            setLoading(false);
          }}
          onError={() => {
            setLoading(false);
            setError(true);
          }}
        />
      )}
    </View>
  );

  if (onPress) {
    return <TouchableOpacity activeOpacity={0.9} onPress={onPress}>{content}</TouchableOpacity>;
  }
  return content;
}

/**
 * [최종 개선] 전체 화면 이미지 뷰어
 * 1. absoluteFill을 통해 이미지가 밀려나는 현상 방지
 * 2. 핀치 줌 지원
 * 3. 아이폰 노치(Safe Area) 대응 오버레이
 */
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
  const insets = useSafeAreaInsets(); // [수정] 아이폰 상단 여백 확보

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  // [추가] 이미지 공유 핸들러
  const handleShare = async () => {
    try {
      const currentImage = images[currentIndex];
      await Share.share({
        url: currentImage, // iOS
        message: currentImage, // Android
      });
    } catch (error) {
      console.log("Share error:", error);
    }
  };

  if (!visible || images.length === 0) return null;

  return (
    <Modal 
      visible={visible} 
      transparent 
      animationType="fade" 
      onRequestClose={onClose}
      statusBarTranslucent // [수정] 상태바 영역까지 화면 확장
    >
      <View style={s.fullScreenContainer}>
        <StatusBar barStyle="light-content" />

        {/* [Layer 1] 이미지 영역: absoluteFill로 전체 화면 고정 (밀림 방지 핵심) */}
        <View style={StyleSheet.absoluteFill}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => {
              const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
              setCurrentIndex(index);
            }}
            contentOffset={{ x: currentIndex * SCREEN_WIDTH, y: 0 }}
          >
            {images.map((imageUrl, index) => (
              <View key={`full-wrap-${index}`} style={s.fullScreenImageWrapper}>
                <ScrollView
                  maximumZoomScale={5}
                  minimumZoomScale={1}
                  centerContent={true} // [iOS 전용] 확대 시 중앙 정렬 보장
                  showsHorizontalScrollIndicator={false}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={s.zoomScrollViewContent}
                >
                  <Image
                    source={{ uri: imageUrl, headers: IMAGE_HEADERS }}
                    style={s.fullScreenImage}
                    resizeMode="contain"
                  />
                </ScrollView>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* [Layer 2] UI 영역: 이미지와 별개로 상단에 띄움 (absolute) */}
        <View style={[s.fullScreenHeaderOverlay, { top: insets.top + 10 }]}>
          <View style={s.headerCounterWrap}>
            <Text style={s.fullScreenHeaderText}>
              {currentIndex + 1} / {images.length}
            </Text>
          </View>
          
          {/* [수정] 우측 상단 버튼 그룹 (공유, 닫기) */}
          <View style={s.headerBtnGroup}>
            <TouchableOpacity onPress={handleShare} style={s.fullScreenIconBtn}>
              <Ionicons name="share-outline" size={26} color={colors.WHITE} />
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={onClose} 
              style={s.fullScreenIconBtn}
            >
              <Ionicons name="close" size={30} color={colors.WHITE} />
            </TouchableOpacity>
          </View>
        </View>

        {/* [Layer 3] 인디케이터 영역 */}
        {images.length > 1 && (
          <View style={[s.fullScreenIndicatorOverlay, { bottom: insets.bottom + 20 }]}>
            {images.map((_, index) => (
              <View
                key={`indicator-${index}`}
                style={[s.indicatorDot, index === currentIndex && s.indicatorDotActive]}
              />
            ))}
          </View>
        )}
      </View>
    </Modal>
  );
}

export default function NoticeDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ url: string; noticeId?: string; title?: string; }>();
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

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <View style={s.container}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.BLACK} />
          </TouchableOpacity>
          <Text style={s.headerTitle} numberOfLines={1}>공지사항</Text>
          <View style={s.headerRight} />
        </View>

        {loading && !detail ? (
          <View style={s.loading}>
            <ActivityIndicator size="large" color={colors.KNU} />
            <Text style={s.helper}>상세를 불러오는 중입니다...</Text>
          </View>
        ) : detail ? (
          <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
            <Text style={s.title}>{detail.title || "제목 없음"}</Text>
            {typeof detail.views === "number" && detail.views >= 0 && (
              <Text style={s.views}>조회 {detail.views.toLocaleString("ko-KR")}</Text>
            )}

            {detail.is_image_only && detail.images && detail.images.length > 0 ? (
              <View style={s.imageOnlyContainer}>
                {detail.images.map((url, idx) => (
                  <ImageWithLoading key={idx} imageUrl={url} onPress={() => openFullScreenImage(idx)} />
                ))}
              </View>
            ) : detail.is_image_heavy && detail.images && detail.images.length > 0 ? (
              <View style={s.imageHeavyContainer}>
                <View style={s.imageGallery}>
                  {detail.images.map((url, idx) => (
                    <ImageWithLoading key={idx} imageUrl={url} isFullWidth onPress={() => openFullScreenImage(idx)} />
                  ))}
                </View>
                {detail.content && (
                  <View style={s.minimalTextContainer}>
                    <Text style={s.minimalText}>{detail.content}</Text>
                  </View>
                )}
              </View>
            ) : (
              <>
                <Text style={s.body}>{detail.content || "내용 없음"}</Text>
                {detail.images && detail.images.length > 0 && (
                  <View style={s.inlineImages}>
                    {detail.images.map((url, idx) => (
                      <ImageWithLoading key={idx} imageUrl={url} onPress={() => openFullScreenImage(idx)} />
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
                    key={idx}
                    onPress={() => openUrl(file.url)}
                    style={({ pressed }) => [s.fileLink, pressed && { opacity: 0.8 }]}
                  >
                    <Text style={s.fileText} numberOfLines={1}>{file.name}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </ScrollView>
        ) : (
          <View style={s.errorContainer}>
            <Text style={s.errorText}>공지사항을 불러올 수 없습니다.</Text>
            <TouchableOpacity onPress={() => router.back()} style={s.errorButton}>
              <Text style={s.errorButtonText}>돌아가기</Text>
            </TouchableOpacity>
          </View>
        )}
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

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.WHITE },
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backButton: { padding: 4 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: "800", color: colors.BLACK, textAlign: "center" },
  headerRight: { width: 32 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  helper: { color: "#6b7280", fontSize: 14, marginTop: 4 },
  content: { padding: 18, gap: 14, paddingBottom: 32 },
  title: { fontSize: 20, fontWeight: "800", color: "#111827", lineHeight: 28 },
  views: { fontSize: 13, color: "#6b7280", marginTop: -4 },
  body: { fontSize: 16, lineHeight: 24, color: "#1f2937" },
  files: { gap: 8, marginTop: 8 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#111827" },
  fileLink: { backgroundColor: "#f3f4f6", paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10 },
  fileText: { color: colors.KNU, fontWeight: "700" },

  imageContainer: { width: "100%", marginVertical: 4, overflow: "hidden" },
  fullWidthImageBase: { width: SCREEN_WIDTH - 36, borderRadius: 8 }, 
  galleryImageBase: { width: SCREEN_WIDTH - 36, borderRadius: 8 },
  
  imageLoadingContainer: {
    height: 200,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
  },
  imageErrorContainer: { height: 100, justifyContent: "center", alignItems: "center" },
  imageErrorText: { color: "#6b7280", fontSize: 13 },

  imageOnlyContainer: { width: "100%", gap: 12 },
  imageHeavyContainer: { width: "100%" },
  imageGallery: { width: "100%", gap: 16, marginBottom: 16 },
  minimalTextContainer: { padding: 12, backgroundColor: "#f9f9f9", borderRadius: 8, marginTop: 8 },
  minimalText: { fontSize: 14, color: "#666", lineHeight: 20 },
  inlineImages: { marginTop: 16, gap: 12 },

  // 전체 화면 뷰어 레이아웃 핵심 설정
  fullScreenContainer: { flex: 1, backgroundColor: "#000" },
  fullScreenHeaderOverlay: {
    position: "absolute", // [수정] 이미지를 밀어내지 않도록 absolute 사용
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    zIndex: 1000,
  },
  headerCounterWrap: {
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  fullScreenHeaderText: { color: colors.WHITE, fontSize: 15, fontWeight: "600" },
  headerBtnGroup: { flexDirection: "row", gap: 12 },
  fullScreenIconBtn: { 
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: 22,
  },
  fullScreenImageWrapper: { 
    width: SCREEN_WIDTH, 
    height: SCREEN_HEIGHT,
  },
  zoomScrollViewContent: { 
    flexGrow: 1, 
    justifyContent: "center", // [수정] 이미지를 정중앙에 위치시킴
    alignItems: "center" 
  },
  fullScreenImage: { 
    width: SCREEN_WIDTH, 
    height: SCREEN_HEIGHT,
  },
  fullScreenIndicatorOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    zIndex: 1000,
  },
  indicatorDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "rgba(255, 255, 255, 0.3)" },
  indicatorDotActive: { backgroundColor: colors.WHITE },

  errorContainer: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 16 },
  errorText: { fontSize: 16, color: "#6b7280", textAlign: "center" },
  errorButton: { backgroundColor: colors.KNU, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  errorButtonText: { color: colors.WHITE, fontSize: 16, fontWeight: "700" },
});