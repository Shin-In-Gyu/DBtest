import { colors } from "@/constants";
import { Stack } from "expo-router";

export default function CampusLayout() {
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
          title: "캠퍼스맵",
          headerShown: false,
        }}
      />
    </Stack>
  );
}
