// frontend/app/_layout.tsx
import KNU_API_BASE from "@/api/base-uri";
import ErrorBoundary from "@/components/ErrorBoundary";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Constants from "expo-constants";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import "react-native-reanimated";
import { BookmarksProvider } from "./providers/BookmarksProvider";
import { ReadStatusProvider } from "./providers/ReadStatusProvider";
import { ThemeProvider, useTheme } from "./providers/ThemeProvider";

/**
 * 푸시 알림 권한·기기 등록.
 * - expo-notifications는 ExpoPushTokenManager 네이티브 모듈이 필요합니다.
 *   Expo Go, 웹, 일부 개발 빌드에는 이 모듈이 없어 에러가 납니다.
 *
 * 사용하려면:
 * 1. app.json에 "expo-notifications" 플러그인 추가 후 `expo prebuild` + 네이티브 빌드
 * 2. 아래 ENABLE_PUSH_REGISTRATION 을 true 로 바꾸기
 */
const ENABLE_PUSH_REGISTRATION = true;

async function registerForPushNotificationsAsync() {
  if (!ENABLE_PUSH_REGISTRATION) return;
  try {
    const Notifications = await import("expo-notifications");
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== "granted") return;

    // [수정] Expo Go 알림 테스트를 위해 ExpoPushToken 사용
    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = tokenData?.data;
    
    console.log("✅ Expo Push Token:", token);

    if (!token) return;

    await AsyncStorage.setItem("@fcm_token", token);
    const registerUrl = `${KNU_API_BASE}/device/register`.replace(
      "/api/knu/api/knu",
      "/api/knu"
    );
    await fetch(registerUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
  } catch (e) {
    console.log("❌ 알림 등록 실패:", e);
  }
}

export const unstable_settings = {
  anchor: "(tabs)",
};

function RootNavigation() {
  const { isDark } = useTheme();
  return (
    <>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="search" options={{ headerShown: false }} />
        <Stack.Screen name="notifications" options={{ headerShown: false }} />
        <Stack.Screen name="dept-select" options={{ headerShown: false }} />
        <Stack.Screen name="notice-detail" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style={isDark ? "light" : "dark"} />
    </>
  );
}

const queryClient = new QueryClient();

export default function RootLayout() {
  useEffect(() => {
    registerForPushNotificationsAsync();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <ThemeProvider>
          <BookmarksProvider>
            <ReadStatusProvider>
              <RootNavigation />
            </ReadStatusProvider>
          </BookmarksProvider>
        </ThemeProvider>
      </ErrorBoundary>
    </QueryClientProvider>
  );
}