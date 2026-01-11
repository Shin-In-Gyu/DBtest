import Constants from "expo-constants";
import { Platform } from "react-native";
const API_HOST = "https://tippable-brigid-ctenoid.ngrok-free.dev";
// const API_HOST =
//   (Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined)
//     ?.apiBaseUrl ??
//   (Platform.OS === "android"
//     ? "http://10.0.2.2:8000"
//     : "http://localhost:8000");

// prefix
const KNU_API_BASE = `${API_HOST}/api/knu`.replace(/([^:]\/)\/+/g, "$1");

export default KNU_API_BASE;
