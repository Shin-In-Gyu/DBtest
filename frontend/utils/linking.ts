import { Linking } from "react-native";

export async function openUrl(url: string): Promise<void> {
  const can = await Linking.canOpenURL(url);
  if (!can) throw new Error("링크를 열 수 없습니다.");
  await Linking.openURL(url);
}
