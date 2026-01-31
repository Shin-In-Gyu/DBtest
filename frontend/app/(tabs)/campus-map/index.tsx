import { useColors } from "@/constants";
import { BUILDINGS, CAMPUS_CENTER } from "@/constants/knuSources";
import { Building } from "@/types";
import {
  NaverMapMarkerOverlay,
  NaverMapView,
  type Camera,
  type NaverMapViewRef,
} from "@mj-studio/react-native-naver-map";
import React, { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function CampusMapScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
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
    <View style={[styles.container, { backgroundColor: colors.BACKGROUND }]}>
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
          styles.tabBar(colors),
          { paddingBottom: Math.max(insets.bottom, 4) },
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
                  styles.tab(colors),
                  active && styles.tabActive(colors),
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text style={[styles.tabText(colors), active && styles.tabTextActive(colors)]}>
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

const styles = {
  container: { flex: 1 },
  mapWrap: { flex: 1 },
  map: { flex: 1 },
  tabBar: (colors: ReturnType<typeof useColors>) => ({
    backgroundColor: colors.CARD_BACKGROUND,
    borderTopWidth: 1,
    borderTopColor: colors.BORDER_COLOR,
    paddingTop: 12,
  }),
  tabBarContent: {
    paddingHorizontal: 12,
    gap: 8,
  },
  tab: (colors: ReturnType<typeof useColors>) => ({
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.BORDER_COLOR,
    backgroundColor: colors.BACKGROUND_LIGHT,
  }),
  tabActive: (colors: ReturnType<typeof useColors>) => ({
    borderColor: colors.KNU,
    backgroundColor: colors.KNU,
  }),
  tabText: (colors: ReturnType<typeof useColors>) => ({
    fontSize: 14,
    fontWeight: "600" as const,
    color: colors.TEXT_SECONDARY,
  }),
  tabTextActive: (colors: ReturnType<typeof useColors>) => ({
    color: colors.WHITE,
    fontWeight: "700" as const,
  }),
};
