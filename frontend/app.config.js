// app.config.js - 환경 변수 기반 동적 설정
// app.json을 베이스로 하여 환경 변수로 동적 설정을 추가합니다.
require('dotenv').config();

module.exports = ({ config }) => {
  // .env 파일 또는 환경 변수에서 API URL 가져오기
  // 배포 서버: EXPO_PUBLIC_API_BASE_URL=http://16.184.63.211
  // 로컬 개발: EXPO_PUBLIC_API_BASE_URL=http://localhost:8000
  const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;

  return {
    ...config,
    extra: {
      ...config.extra,
      apiBaseUrl, // 동적 값은 app.config.js에서만 관리
    },
  };
};

