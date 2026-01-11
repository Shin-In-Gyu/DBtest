import { colors } from "@/constants";
import { BUILDINGS, CAMPUS_CENTER } from "@/constants/knuSources";
import { Building } from "@/types";
import {
  NaverMapMarkerOverlay,
  NaverMapView,
  type Camera,
  type NaverMapViewRef,
} from "@mj-studio/react-native-naver-map";
import React, { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function CampusMapScreen() {
  const insets = useSafeAreaInsets();
  const mapRef = useRef<NaverMapViewRef>(null);

  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(
    BUILDINGS[0],
  );

  const center = selectedBuilding || BUILDINGS[0];
  const initialCamera: Camera = {
    latitude: center.lat ?? CAMPUS_CENTER.lat,
    longitude: center.lng ?? CAMPUS_CENTER.lng,
    zoom: selectedBuilding?.code ? 18 : 16,
  };

  useEffect(() => {
    if (selectedBuilding?.lat && selectedBuilding.lng && mapRef.current) {
      const zoom = selectedBuilding.code ? 18 : 16;
      mapRef.current.animateCameraTo({
        latitude: selectedBuilding.lat!,
        longitude: selectedBuilding.lng!,
        zoom,
      });
    }
  }, [selectedBuilding]);

  const handleBuildingSelect = (building: Building) => {
    setSelectedBuilding(building);
  };

  return (
    <View style={styles.container}>
      {/* 상단: 네이버 지도 */}
      <View style={styles.mapWrap}>
        <NaverMapView
          ref={mapRef}
          style={styles.map}
          initialCamera={initialCamera}
          isShowZoomControls={true}
          minZoom={14}
          maxZoom={20}
        >
          {/* 건물 마커 표시 */}
          {BUILDINGS.filter((b) => b.code && b.lat && b.lng).map((building) => (
            <NaverMapMarkerOverlay
              key={`${building.name}-${building.code}`}
              latitude={building.lat!}
              longitude={building.lng!}
              caption={{
                text: building.name,
                align: "Bottom",
              }}
              onTap={() => handleBuildingSelect(building)}
            />
          ))}
        </NaverMapView>
      </View>

      {/* 하단: 건물 선택 탭바 */}
      <View
        style={[
          styles.tabBar,
          { paddingBottom: Math.max(insets.bottom, 10) },
        ]}
      >
        <ScrollView
          horizontal
          contentContainerStyle={styles.tabBarContent}
          showsHorizontalScrollIndicator={false}
        >
          {BUILDINGS.map((building) => {
            const active =
              selectedBuilding?.name === building.name ||
              (building.code === undefined &&
                selectedBuilding?.code === undefined);
            return (
              <Pressable
                key={`${building.name}-${building.code ?? "all"}`}
                onPress={() => handleBuildingSelect(building)}
                style={({ pressed }) => [
                  styles.tab,
                  active && styles.tabActive,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text style={[styles.tabText, active && styles.tabTextActive]}>
                  {building.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  mapWrap: { flex: 1 },
  map: { flex: 1, width: "100%", height: "100%" },
  tabBar: {
    backgroundColor: colors.WHITE,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingTop: 12,
  },
  tabBarContent: {
    paddingHorizontal: 12,
    gap: 8,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#f8fafc",
  },
  tabActive: {
    borderColor: colors.KNU,
    backgroundColor: colors.KNU,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334155",
  },
  tabTextActive: {
    color: colors.WHITE,
    fontWeight: "700",
  },
});
