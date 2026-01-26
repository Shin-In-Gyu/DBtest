import Constants from "expo-constants";

// 환경 변수에서 API URL 가져오기
// .env 파일에 EXPO_PUBLIC_API_BASE_URL 설정 필요
const apiBaseUrl = Constants.expoConfig?.extra?.apiBaseUrl as string | undefined;

if (!apiBaseUrl) {
  throw new Error(
    "EXPO_PUBLIC_API_BASE_URL 환경 변수가 설정되지 않았습니다. .env 파일을 확인하세요."
  );
}

const API_HOST = apiBaseUrl;
const KNU_API_BASE = `${API_HOST}/api/knu`.replace(/([^:]\/)\/+/g, "$1");

console.log(KNU_API_BASE);

export default KNU_API_BASE;
