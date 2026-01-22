import HomeHeader from "@/components/HomeHeader";
import MoreTabHeader from "@/components/MoreTabHeader";
import OtherHeader from "@/components/OtherHeader";
import { colors } from "@/constants";
import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React from "react";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.KNU,
        tabBarStyle: {
          backgroundColor: colors.WHITE,
        },
        tabBarLabelStyle: { fontSize: 11 },
        headerShown: false,
      }}
    >
      {/* 홈 */}
      <Tabs.Screen
        name="index"
        options={{
          title: "홈",
          headerShown: true,
          header: () => <HomeHeader />,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "home" : "home-outline"}
              size={26}
              color={color}
            />
          ),
        }}
      />

      {/* 북마크 */}
      <Tabs.Screen
        name="bookmarks"
        options={{
          title: "북마크",
          headerShown: true,
          header: () => <OtherHeader title="북마크" />,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "bookmark" : "bookmark-outline"}
              size={26}
              color={color}
            />
          ),
        }}
      />

      {/* 캠퍼스맵 */}
      <Tabs.Screen
        name="campus-map"
        options={{
          title: "캠퍼스맵",
          headerShown: true,
          header: () => <OtherHeader title="캠퍼스맵" />,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "map" : "map-outline"}
              size={26}
              color={color}
            />
          ),
        }}
      />

      {/* 더보기 */}
      <Tabs.Screen
        name="more"
        options={{
          title: "더보기",
          headerShown: true,
          header: () => <MoreTabHeader />,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "ellipsis-horizontal" : "ellipsis-horizontal-outline"}
              size={26}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
