import { IMAGE_HEADERS } from "@/components/ImageWithLoading";
import { colors } from "@/constants";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  Dimensions,
  Image,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export type FullScreenImageViewerProps = {
  visible: boolean;
  images: string[];
  initialIndex: number;
  onClose: () => void;
};

export function FullScreenImageViewer({
  visible,
  images,
  initialIndex,
  onClose,
}: FullScreenImageViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const insets = useSafeAreaInsets();

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
      statusBarTranslucent
    >
      <View style={styles.fullScreenContainer}>
        <StatusBar barStyle="light-content" />

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
              <View key={`full-wrap-${index}`} style={styles.fullScreenImageWrapper}>
                <ScrollView
                  maximumZoomScale={5}
                  minimumZoomScale={1}
                  centerContent
                  showsHorizontalScrollIndicator={false}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.zoomScrollViewContent}
                >
                  <Image
                    source={{ uri: imageUrl, headers: IMAGE_HEADERS }}
                    style={styles.fullScreenImage}
                    resizeMode="contain"
                  />
                </ScrollView>
              </View>
            ))}
          </ScrollView>
        </View>

        <View style={[styles.fullScreenHeaderOverlay, { top: insets.top + 10 }]}>
          <View style={styles.headerCounterWrap}>
            <Text style={styles.fullScreenHeaderText}>
              {currentIndex + 1} / {images.length}
            </Text>
          </View>
          <TouchableOpacity
            onPress={onClose}
            style={styles.fullScreenCloseBtn}
            hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
          >
            <Ionicons name="close" size={32} color={colors.WHITE} />
          </TouchableOpacity>
        </View>

        {images.length > 1 && (
          <View style={[styles.fullScreenIndicatorOverlay, { bottom: insets.bottom + 20 }]}>
            {images.map((_, index) => (
              <View
                key={`indicator-${index}`}
                style={[styles.indicatorDot, index === currentIndex && styles.indicatorDotActive]}
              />
            ))}
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fullScreenContainer: {
    flex: 1,
    backgroundColor: "#000",
  },
  fullScreenHeaderOverlay: {
    position: "absolute",
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
  fullScreenHeaderText: {
    color: colors.WHITE,
    fontSize: 15,
    fontWeight: "600",
  },
  fullScreenCloseBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: 22,
  },
  fullScreenImageWrapper: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  zoomScrollViewContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
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
  indicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
  },
  indicatorDotActive: {
    backgroundColor: colors.WHITE,
  },
});
