import { colors } from "@/constants";
import { Stack } from "expo-router";

export default function MoreLayout() {
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
          title: "더보기",
          headerShown: false,
        }}
      />
    </Stack>
  );
}
