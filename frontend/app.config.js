// app.config.js - 환경 변수 기반 동적 설정
// app.json을 베이스로 하여 환경 변수로 동적 설정을 추가합니다.
require('dotenv').config();

module.exports = ({ config }) => {
  // .env 파일 또는 환경 변수에서 API URL 가져오기 (없으면 null로 설정하여 기본값 사용)
  const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || null;

  return {
    ...config,
    extra: {
      ...config.extra,
      apiBaseUrl, // 동적 값은 app.config.js에서만 관리
    },
  };
};

