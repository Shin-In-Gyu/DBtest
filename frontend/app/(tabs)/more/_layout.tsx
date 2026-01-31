import { useColors } from "@/constants";
import { Stack } from "expo-router";

export default function MoreLayout() {
  const colors = useColors();
  return (
    <Stack
      screenOptions={{
        contentStyle: {
          backgroundColor: colors.CARD_BACKGROUND,
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
      <Stack.Screen
        name="open-source"
        options={{
          title: "사용된 오픈소스",
          headerShown: false,
        }}
      />
    </Stack>
  );
}

