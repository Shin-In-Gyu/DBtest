import { useColors } from "@/constants";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  ImageStyle,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export const IMAGE_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
};

export type ImageWithLoadingProps = {
  imageUrl: string;
  onPress?: () => void;
  /** When provided, used as image (and wrapper) style; aspect ratio is not applied. */
  style?: ViewStyle | ImageStyle;
  imageHeaders?: Record<string, string>;
  /** When true and no style, image uses dynamic aspect ratio. Default true. */
  useAspectRatio?: boolean;
};

export function ImageWithLoading({
  imageUrl,
  onPress,
  style: styleProp,
  imageHeaders = IMAGE_HEADERS,
  useAspectRatio = true,
}: ImageWithLoadingProps) {
  const colors = useColors();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [aspectRatio, setAspectRatio] = useState(1);

  const useStyleOnly = styleProp != null;
  const effectiveUseAspectRatio = useAspectRatio && !useStyleOnly;

  const dynamicStyles = useMemo(
    () =>
      StyleSheet.create({
        imageLoadingContainer: {
          height: 200,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: colors.WHITE200,
          borderRadius: 8,
        },
        loadingOverlay: {
          ...StyleSheet.absoluteFillObject,
          backgroundColor: colors.WHITE200,
          zIndex: 1,
        },
        imageErrorText: {
          color: colors.GRAY200,
          fontSize: 13,
        },
      }),
    [colors]
  );

  const content = (
    <View style={[styles.imageContainer, useStyleOnly && [styles.styleOnlyContainer, styleProp]]}>
      {loading && (
        <View style={[dynamicStyles.imageLoadingContainer, useStyleOnly && dynamicStyles.loadingOverlay]}>
          <ActivityIndicator size="small" color={colors.KNU} />
        </View>
      )}
      {error ? (
        <View style={styles.imageErrorContainer}>
          <Text style={dynamicStyles.imageErrorText}>이미지를 불러올 수 없습니다</Text>
        </View>
      ) : (
        <Image
          source={{ uri: imageUrl, headers: imageHeaders }}
          style={
            useStyleOnly
              ? (styleProp as ImageStyle)
              : [
                  styles.fullWidthImageBase,
                  { aspectRatio },
                ]
          }
          resizeMode="contain"
          onLoad={(e) => {
            if (effectiveUseAspectRatio) {
              const { width, height } = e.nativeEvent.source;
              if (width && height) setAspectRatio(width / height);
            }
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
    return (
      <TouchableOpacity activeOpacity={0.9} onPress={onPress}>
        {content}
      </TouchableOpacity>
    );
  }
  return content;
}

const styles = StyleSheet.create({
  imageContainer: {
    width: "100%",
    marginVertical: 4,
    overflow: "hidden",
  },
  styleOnlyContainer: {
    position: "relative",
  },
  fullWidthImageBase: {
    width: SCREEN_WIDTH - 36,
    borderRadius: 8,
  },
  imageErrorContainer: {
    height: 100,
    justifyContent: "center",
    alignItems: "center",
  },
});
