import ErrorBoundary from "@/components/ErrorBoundary";
import { ensurePushTokenAndRegister } from "@/utils/pushRegistration";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as Notifications from "expo-notifications";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import "react-native-reanimated";
import { BookmarksProvider } from "./providers/BookmarksProvider";
import { ReadStatusProvider } from "./providers/ReadStatusProvider";
import { ThemeProvider, useTheme } from "./providers/ThemeProvider";

/**
 * 푸시 알림 권한·기기 등록.
 * - expo-notifications는 Expo Go, 웹, 일부 개발 빌드에서는 동작하지 않을 수 있습니다.
 * - 로직은 @/utils/pushRegistration 에서 재사용됩니다.
 */
const ENABLE_PUSH_REGISTRATION = true;

/** 푸시 알림 클릭 시 공지 상세로 이동 */
function NotificationResponseHandler() {
  const router = useRouter();

  useEffect(() => {
    const handleResponse = (response: Notifications.NotificationResponse) => {
      try {
        const data = response.notification.request.content.data as {
          url?: string;
          id?: string | number;
          category?: string;
        };
        const url = data?.url;
        const noticeId = data?.id != null ? String(data.id) : undefined;
        const title = response.notification.request.content.body?.slice(0, 100);
        if (url) {
          router.push({
            pathname: "/notice-detail",
            params: { url, ...(noticeId && { noticeId }), ...(title && { title }) },
          });
        }
      } catch (e) {
        console.warn("[푸시] 알림 클릭 처리 실패:", e);
      }
    };

    let sub: { remove: () => void } | null = null;
    try {
      sub = Notifications.addNotificationResponseReceivedListener(handleResponse);
      Notifications.getLastNotificationResponseAsync().then((last) => {
        if (last) handleResponse(last);
      });
    } catch (e) {
      console.warn("[푸시] 알림 리스너 등록 실패 (웹/Expo Go 등):", e);
    }

    return () => sub?.remove();
  }, [router]);

  return null;
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
    ensurePushTokenAndRegister({ enableRegistration: ENABLE_PUSH_REGISTRATION });
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <ThemeProvider>
          <BookmarksProvider>
            <ReadStatusProvider>
              <RootNavigation />
              <NotificationResponseHandler />
            </ReadStatusProvider>
          </BookmarksProvider>
        </ThemeProvider>
      </ErrorBoundary>
    </QueryClientProvider>
  );
}