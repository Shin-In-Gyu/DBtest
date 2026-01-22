import { toUserFriendlyMessage } from "@/utils/errorMessage";
import React, { Component, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

type Props = { children: ReactNode };
type State = { error: unknown | null };

/**
 * 렌더 중 발생한 에러(예: .map of undefined)를 잡아
 * 기술 문구 대신 한글 안내를 보여줍니다.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(err: unknown): State {
    return { error: err };
  }

  componentDidCatch(err: unknown, info: React.ErrorInfo) {
    if (__DEV__) {
      console.warn("[ErrorBoundary]", err, info.componentStack);
    }
  }

  onRetry = () => this.setState({ error: null });

  render() {
    if (this.state.error !== null) {
      return (
        <View style={s.container}>
          <Text style={s.title}>일시적인 문제가 발생했어요</Text>
          <Text style={s.message}>
            {toUserFriendlyMessage(this.state.error)}
          </Text>
          <Pressable
            onPress={this.onRetry}
            style={({ pressed }) => [s.btn, pressed && { opacity: 0.8 }]}
          >
            <Text style={s.btnText}>다시 시도</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "#fff",
  },
  title: { fontSize: 18, fontWeight: "800", color: "#111", marginBottom: 8 },
  message: {
    fontSize: 15,
    color: "#555",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 22,
  },
  btn: {
    backgroundColor: "#006DB8",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
