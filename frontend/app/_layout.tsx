// frontend/app/_layout.tsx
import KNU_API_BASE from "@/api/base-uri";
import ErrorBoundary from "@/components/ErrorBoundary";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import "react-native-reanimated";
import { BookmarksProvider } from "./providers/BookmarksProvider";
import { ReadStatusProvider } from "./providers/ReadStatusProvider";

/**
 * 푸시 알림 권한·기기 등록.
 * - expo-notifications는 ExpoPushTokenManager 네이티브 모듈이 필요합니다.
 *   Expo Go, 웹, 일부 개발 빌드에는 이 모듈이 없어 에러가 납니다.
 *
 * 사용하려면:
 * 1. app.json에 "expo-notifications" 플러그인 추가 후 `expo prebuild` + 네이티브 빌드
 * 2. 아래 ENABLE_PUSH_REGISTRATION 을 true 로 바꾸기
 */
const ENABLE_PUSH_REGISTRATION = false;

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

    const tokenData = await Notifications.getDevicePushTokenAsync();
    const token = tokenData?.data;
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
  } catch {
    // 네이티브 모듈 미지원 환경. 앱 동작에는 영향 없음.
  }
}

export const unstable_settings = {
  anchor: "(tabs)",
};

function RootNavigation() {
  return (
    <>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="search" options={{ headerShown: false }} />
        <Stack.Screen name="notifications" options={{ headerShown: false }} />
        <Stack.Screen name="dept-select" options={{ headerShown: false }} />
        <Stack.Screen name="notice-detail" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="auto" />
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
        <BookmarksProvider>
          <ReadStatusProvider>
            <RootNavigation />
          </ReadStatusProvider>
        </BookmarksProvider>
      </ErrorBoundary>
    </QueryClientProvider>
  );
}