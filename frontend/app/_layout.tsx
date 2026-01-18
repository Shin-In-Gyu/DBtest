// frontend/app/_layout.tsx
import React, { useEffect } from "react"; // [수정] useEffect 추가 (TS2304 해결)
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";
import * as Notifications from "expo-notifications"; // [수정] Notifications 추가 (TS2552 해결)
import AsyncStorage from "@react-native-async-storage/async-storage"; // [수정] AsyncStorage 추가 (TS2304 해결)
import KNU_API_BASE from "@/api/base-uri"; // [수정] KNU_API_BASE 추가 (TS2304 해결)
import { BookmarksProvider } from "./providers/BookmarksProvider";
import { ReadStatusProvider } from "./providers/ReadStatusProvider";
import Constants from "expo-constants"; // [추가] 프로젝트 ID 확인용

/**
 * [추가] 푸시 알림 권한 획득 및 기기 등록 로직
 * 알림 설정 시 필요한 @fcm_token을 생성하고 서버에 등록합니다.
 */
async function registerForPushNotificationsAsync() {
  let token;

  // 1. 권한 확인 및 요청
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  if (finalStatus !== "granted") {
    console.warn("🔔 알림 권한이 거부되었습니다.");
    return;
  }

  // 2. 기기 토큰 획득
  try {
    // [수정] Expo Go 및 간편한 배포를 위해 ExpoPushToken 사용으로 변경
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: Constants.expoConfig?.extra?.eas?.projectId,
    });
    token = tokenData.data;
    
    // 3. 로컬 저장소 저장 (notifications.tsx 에서 사용 예정)
    await AsyncStorage.setItem("@fcm_token", token);
    console.log("✅ FCM 토큰 저장 완료:", token);

    // 4. 백엔드 서버에 기기 등록 요청 (이미 구현된 /device/register 호출)
    const registerUrl = `${KNU_API_BASE}/device/register`.replace("/api/knu/api/knu", "/api/knu"); // 중복 경로 방지
    await fetch(registerUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: token }),
    });
    
  } catch (error) {
    console.error("❌ 기기 등록 과정 중 에러 발생:", error);
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
  // [추가] 앱 초기 실행 시 기기 등록 수행
  useEffect(() => {
    registerForPushNotificationsAsync();
  }, []);

  return (
    <>
      <QueryClientProvider client={queryClient}>
        <BookmarksProvider>
          <ReadStatusProvider>
            <RootNavigation />
          </ReadStatusProvider>
        </BookmarksProvider>
      </QueryClientProvider>
    </>
  );
}