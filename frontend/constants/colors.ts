// frontend/constants/colors.ts

// KNU 브랜드 색상 (테마와 무관)
export const KNU_COLORS = {
  KNU: "#006DB8",
  KNU_LIGHT: "rgba(0, 109, 184, 0.08)",
  KNU_DARK: "rgba(0, 109, 184, 0.5)",
};

// 라이트 테마 색상
const lightColors = {
  // KNU 브랜드 색상
  ...KNU_COLORS,

  // 화이트 계열 (숫자 체계)
  WHITE: "#fff",
  WHITE100: "#fff",
  WHITE200: "#f9f9f9",
  WHITE300: "#f9fafb",
  WHITE400: "#f3f4f6",
  WHITE500: "#f5f7fa",
  WHITE600: "#f7f8fa",
  WHITE700: "#f8fafc",

  // 블랙 계열
  BLACK: "#000",
  BLACK100: "#111827",
  BLACK200: "#111",
  BLACK300: "#000",

  // 그레이 계열
  GRAY100: "#9ca3af",
  GRAY200: "#6b7280",
  GRAY300: "#64748b",
  GRAY400: "#555",
  GRAY500: "#888",
  GRAY600: "#666",
  GRAY700: "#374151",
  GRAY800: "#334155",

  // 의미있는 이름 (BORDER_COLOR 등)
  BORDER_COLOR: "#e5e7eb",
  BORDER_COLOR_LIGHT: "#eef0f3",
  DIVIDER_COLOR: "#E0E0E0",
  SHADOW_COLOR: "#000",
  BACKGROUND_LIGHT: "#f1f5f9",
  BACKGROUND: "#f7f8fa",
  PLACEHOLDER_COLOR: "#9CA3AF",
  TEXT_PRIMARY: "#111827",
  TEXT_SECONDARY: "#6b7280",
  TEXT_TERTIARY: "#888",
  CARD_BACKGROUND: "#fff",
  CARD_READ_BACKGROUND: "#f9fafb",

  // 기타 색상
  RED: "#ef4444",
  RED_LIGHT: "#fef2f2",
  YELLOW: "#FEF3C7",
  YELLOW_TEXT: "#92400E",
};

// 다크 테마 색상
const darkColors = {
  // KNU 브랜드 색상
  ...KNU_COLORS,

  // 화이트 계열 → 다크 모드에서는 어두운 색상
  WHITE: "#1a1a1a",
  WHITE100: "#1a1a1a",
  WHITE200: "#222222",
  WHITE300: "#252525",
  WHITE400: "#2a2a2a",
  WHITE500: "#2d2d2d",
  WHITE600: "#2f2f2f",
  WHITE700: "#323232",

  // 블랙 계열 → 다크 모드에서는 밝은 색상
  BLACK: "#ffffff",
  BLACK100: "#f3f4f6",
  BLACK200: "#e5e7eb",
  BLACK300: "#ffffff",

  // 그레이 계열
  GRAY100: "#6b7280",
  GRAY200: "#9ca3af",
  GRAY300: "#9ca3af",
  GRAY400: "#9ca3af",
  GRAY500: "#9ca3af",
  GRAY600: "#9ca3af",
  GRAY700: "#d1d5db",
  GRAY800: "#e5e7eb",

  // 의미있는 이름
  BORDER_COLOR: "#3a3a3a",
  BORDER_COLOR_LIGHT: "#333333",
  DIVIDER_COLOR: "#3a3a3a",
  SHADOW_COLOR: "#000",
  BACKGROUND_LIGHT: "#1a1a1a",
  BACKGROUND: "#121212",
  PLACEHOLDER_COLOR: "#6b7280",
  TEXT_PRIMARY: "#f3f4f6",
  TEXT_SECONDARY: "#d1d5db",
  TEXT_TERTIARY: "#9ca3af",
  CARD_BACKGROUND: "#1a1a1a",
  CARD_READ_BACKGROUND: "#222222",

  // 기타 색상
  RED: "#ef4444",
  RED_LIGHT: "#3a1f1f",
  YELLOW: "#3a2f1f",
  YELLOW_TEXT: "#fbbf24",
};

// 테마별 색상 맵
export const themeColors = {
  light: lightColors,
  dark: darkColors,
};

// 기본 색상 (기존 호환성 유지 - 라이트 모드)
const colors = lightColors;

export default colors;
