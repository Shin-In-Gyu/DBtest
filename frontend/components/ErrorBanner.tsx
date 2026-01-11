import { colors } from "@/constants";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

export default function ErrorBanner({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <View style={s.box}>
      <Text style={s.text}>{message}</Text>
      <Pressable
        style={({ pressed }) => [s.btn, pressed && { opacity: 0.7 }]}
        onPress={onRetry}
      >
        <Text style={s.btnText}>다시 시도</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  box: {
    backgroundColor: "#fff1f2",
    borderColor: "#fecdd3",
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    margin: 12,
    borderRadius: 12,
  },
  text: { color: "#b91c1c", fontWeight: "600", marginBottom: 8 },
  btn: {
    alignSelf: "flex-start",
    backgroundColor: colors.KNU,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  btnText: { color: colors.WHITE, fontWeight: "700" },
});
