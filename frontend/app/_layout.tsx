// frontend/app/_layout.tsx
import ErrorBoundary from "@/components/ErrorBoundary";
import { ensurePushTokenAndRegister } from "@/utils/pushRegistration";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
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
            </ReadStatusProvider>
          </BookmarksProvider>
        </ThemeProvider>
      </ErrorBoundary>
    </QueryClientProvider>
  );
}