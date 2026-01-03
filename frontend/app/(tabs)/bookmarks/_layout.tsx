import { colors } from "@/constants";
import { Stack } from "expo-router";

export default function BookmarksLayout() {
  return (
    <Stack
      screenOptions={{
        contentStyle: {
          backgroundColor: colors.WHITE,
        },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "북마크",
          headerShown: false,
        }}
      />
    </Stack>
  );
}
