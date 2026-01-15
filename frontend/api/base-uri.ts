import Constants from "expo-constants";
import { Platform } from "react-native";
// const API_HOST = "https://tippable-brigid-ctenoid.ngrok-free.dev";
// 1. 개발 서버의 주소를 자동으로 감지 (Expo Go 환경에서 매우 유용)
const debuggerHost = Constants.expoConfig?.hostUri; 
const localhost = debuggerHost ? debuggerHost.split(":")[0] : "localhost";

const API_HOST =
  (Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined)?.apiBaseUrl ??
  (Platform.OS === "android" && !Constants.isDevice // 에뮬레이터인 경우
    ? "http://10.0.2.2:8000"
    : `http://${localhost}:8000`); // 실제 기기 또는 iOS

// 2. 경로 합치기 (정규식으로 중복 슬래시 방지)
const KNU_API_BASE = `${API_HOST}/api/knu`.replace(/([^:]\/)\/+/g, "$1");

export default KNU_API_BASE;