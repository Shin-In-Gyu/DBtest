import OtherHeader from "@/components/OtherHeader";
import { useSegments } from "expo-router";
import React from "react";

/**
 * more 탭용 헤더. open-source 화면에서는 헤더를 숨긴다.
 * (해당 화면이 자체 "사용된 오픈소스" 헤더를 사용하므로)
 */
export default function MoreTabHeader() {
  const segments = useSegments() as string[];
  const isOpenSource = segments.includes("open-source");

  if (isOpenSource) return null;
  return <OtherHeader title="더보기" />;
}
