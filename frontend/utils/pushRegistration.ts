/**
 * 푸시 알림 권한·토큰 획득·기기 등록 공통 로직.
 * - 앱 시작 시(_layout)와 알림 설정 "완료" 시(notifications)에서 재사용.
 * - expo-notifications는 Expo Go, 웹, 일부 개발 빌드에서는 동작하지 않을 수 있습니다.
 */
import { registerDevice } from "@/api/knuNotice";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

const FCM_TOKEN_KEY = "@fcm_token";

/** 저장된 푸시 토큰이 있으면 반환, 없으면 null */
export async function getStoredPushToken(): Promise<string | null> {
  return AsyncStorage.getItem(FCM_TOKEN_KEY);
}

/**
 * 푸시 권한 요청 후 Expo Push Token을 받아 저장하고 서버에 기기 등록.
 * @returns 성공 시 토큰 문자열, 실패 시 null
 */
export async function ensurePushTokenAndRegister(options?: {
  enableRegistration?: boolean;
}): Promise<string | null> {
  const enable = options?.enableRegistration ?? true;
  if (!enable) return null;

  try {
    console.log("🔑 [푸시] 토큰 발급 시도 시작");
    const Notifications = await import("expo-notifications");
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== "granted") {
      console.log("🔑 [푸시] 토큰 미발급: 알림 권한 거부됨");
      return null;
    }
    console.log("🔑 [푸시] 알림 권한 허용됨, 토큰 요청 중...");

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    console.log("🔑 [푸시] projectId:", projectId ?? "(없음)");

    let token: string | null = null;
    try {
      const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
      token = tokenData?.data || null;
    } catch (tokenError: unknown) {
      const message =
        tokenError && typeof (tokenError as any).message === "string"
          ? (tokenError as any).message
          : String(tokenError);
      if (message.includes("FirebaseApp") || message.includes("Firebase")) {
        // app.json에서 useFCM: false 이므로 Firebase 없이 Expo Push만 사용합니다. 에러 아님.
        console.log(
          "🔑 [푸시] 토큰 미발급: Firebase 예외 (Expo Push만 사용 설정). 'npx expo prebuild --clean' 후 앱 다시 빌드해 보세요."
        );
        return null;
      }
      throw tokenError;
    }

    if (!token) {
      console.log("🔑 [푸시] 토큰 미발급: getExpoPushTokenAsync가 빈 값 반환");
      return null;
    }

    const tokenPreview = token.length > 24 ? `${token.slice(0, 24)}...` : token;
    console.log("🔑 [푸시] 토큰 발급됨:", tokenPreview);

    await AsyncStorage.setItem(FCM_TOKEN_KEY, token);
    await registerDevice(token);
    console.log("🔑 [푸시] 토큰 저장 및 서버 기기등록 완료");
    return token;
  } catch (e: unknown) {
    const message = e && typeof (e as any).message === "string" ? (e as any).message : String(e);
    if (message.includes("FirebaseApp") || message.includes("Firebase")) {
      console.log("🔑 [푸시] 토큰 미발급: Firebase 관련 예외 (Expo Push만 사용 설정, 무시 가능)");
    } else {
      console.log("🔑 [푸시] 토큰 미발급 — 등록 실패:", e);
    }
    return null;
  }
}
