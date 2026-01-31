export interface OpenSourceLibrary {
    name: string;
    version: string;
    license: string;
    repository?: string;
    description?: string;
  }
  
export const OPEN_SOURCE_LIBRARIES: OpenSourceLibrary[] = [
    {
      name: "React",
      version: "19.1.0",
      license: "MIT",
      repository: "https://github.com/facebook/react",
      description: "A JavaScript library for building user interfaces",
    },
    {
      name: "React Native",
      version: "0.81.5",
      license: "MIT",
      repository: "https://github.com/facebook/react-native",
      description: "A framework for building native apps with React",
    },
    {
      name: "Expo",
      version: "~54.0.30",
      license: "MIT",
      repository: "https://github.com/expo/expo",
      description: "An open-source platform for making universal native apps",
    },
    {
      name: "Expo Router",
      version: "~6.0.21",
      license: "MIT",
      repository: "https://github.com/expo/router",
      description: "File-based routing for React Native",
    },
    {
      name: "@tanstack/react-query",
      version: "^5.90.16",
      license: "MIT",
      repository: "https://github.com/TanStack/query",
      description: "Powerful data synchronization for React",
    },
    {
      name: "@expo/vector-icons",
      version: "^15.0.3",
      license: "MIT",
      repository: "https://github.com/expo/vector-icons",
      description: "Icon library for Expo and React Native",
    },
    {
      name: "@react-native-async-storage/async-storage",
      version: "2.2.0",
      license: "MIT",
      repository: "https://github.com/react-native-async-storage/async-storage",
      description: "Asynchronous, persistent, key-value storage system",
    },
    {
      name: "@react-navigation/native",
      version: "^7.1.8",
      license: "MIT",
      repository: "https://github.com/react-navigation/react-navigation",
      description: "Routing and navigation for React Native apps",
    },
    {
      name: "react-native-safe-area-context",
      version: "~5.6.0",
      license: "MIT",
      repository: "https://github.com/th3rdwave/react-native-safe-area-context",
      description: "A flexible way to handle safe area, also works on Android and web",
    },
    {
      name: "react-native-screens",
      version: "~4.16.0",
      license: "MIT",
      repository: "https://github.com/software-mansion/react-native-screens",
      description: "Native navigation primitives for your React Native app",
    },
    {
      name: "react-native-gesture-handler",
      version: "~2.28.0",
      license: "MIT",
      repository: "https://github.com/software-mansion/react-native-gesture-handler",
      description: "Declarative API exposing platform native touch and gesture system",
    },
    {
      name: "react-native-reanimated",
      version: "~4.1.1",
      license: "MIT",
      repository: "https://github.com/software-mansion/react-native-reanimated",
      description: "React Native's Animated library reimplemented",
    },
    {
      name: "@mj-studio/react-native-naver-map",
      version: "^2.7.0",
      license: "MIT",
      repository: "https://github.com/mj-studio/react-native-naver-map",
      description: "React Native Naver Map Component",
    },
    {
      name: "react-native-webview",
      version: "13.15.0",
      license: "MIT",
      repository: "https://github.com/react-native-webview/react-native-webview",
      description: "React Native WebView component",
    },
    {
      name: "expo-notifications",
      version: "~0.32.16",
      license: "MIT",
      repository: "https://github.com/expo/expo",
      description: "Provides an API to fetch push notification tokens and to present, schedule, receive and respond to notifications",
    },
    {
      name: "expo-linking",
      version: "~8.0.11",
      license: "MIT",
      repository: "https://github.com/expo/expo",
      description: "Create deep links into your app",
    },
    {
      name: "expo-clipboard",
      version: "~8.0.8",
      license: "MIT",
      repository: "https://github.com/expo/expo",
      description: "Provides an interface for getting and setting clipboard content",
    },
  ];
  