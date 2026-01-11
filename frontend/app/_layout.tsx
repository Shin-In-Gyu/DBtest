import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";
import { BookmarksProvider } from "./providers/BookmarksProvider";
import { ReadStatusProvider } from "./providers/ReadStatusProvider";

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
