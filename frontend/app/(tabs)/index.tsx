import { colors } from "@/constants";
import Constants from "expo-constants";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

type NoticeListItem = {
  title: string;
  detailUrl: string;
};

type NoticeListResponse = {
  count: number;
  items: NoticeListItem[];
};

type NoticeDetail = {
  title: string;
  content: string;
  files: { name: string; url: string }[];
};


const API_HOST = "http://192.168.45.205:8000";

// ✅ 여기만 추가: KNU 라우터 prefix
const KNU_API_BASE = `${API_HOST}/api/knu`.replace(/([^:]\/)\/+/g, "$1");

export default function HomeScreen() {
  const [notices, setNotices] = useState<NoticeListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<NoticeDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchNotices = useCallback(async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    setError(null);

    try {
      // ✅ 변경: /api/knu/notices
      const url = `${KNU_API_BASE}/notices?searchMenuSeq=0`;
      const response = await fetch(url);

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(
          `공지 목록을 불러오지 못했습니다. (${response.status})\n${text.slice(0, 300)}`,
        );
      }

      const data: NoticeListResponse = await response.json();
      setNotices(data.items ?? []);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.",
      );
    } finally {
      isRefresh ? setRefreshing(false) : setLoading(false);
    }
  }, []);

  const fetchDetail = useCallback(async (detailUrl: string) => {
    setDetail(null);
    setDetailLoading(true);

    try {
      // ✅ 변경: /api/knu/notice
      const url = `${KNU_API_BASE}/notice?url=${encodeURIComponent(detailUrl)}`;
      const response = await fetch(url);

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(
          `상세를 불러오지 못했습니다. (${response.status})\n${text.slice(0, 300)}`,
        );
      }

      const data: NoticeDetail = await response.json();
      setDetail(data);
    } catch (err) {
      console.error(err);
      Alert.alert(
        "상세 불러오기 실패",
        err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.",
      );
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchNotices();
  }, [fetchNotices]);

  const closeDetail = () => {
    setDetail(null);
    setDetailLoading(false);
  };

  const renderItem = ({ item }: { item: NoticeListItem }) => (
    <Pressable
      onPress={() => fetchDetail(item.detailUrl)}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <Text style={styles.cardTitle} numberOfLines={2}>
        {item.title}
      </Text>
      <Text style={styles.cardMeta}>자세히 보기</Text>
    </Pressable>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.KNU} />
        <Text style={styles.helperText}>공지사항을 불러오는 중입니다...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable
            style={({ pressed }) => [
              styles.retryBtn,
              pressed && { opacity: 0.7 },
            ]}
            onPress={() => fetchNotices()}
          >
            <Text style={styles.retryText}>다시 시도</Text>
          </Pressable>
        </View>
      )}

      <FlatList
        data={notices}
        keyExtractor={(item, index) => item.detailUrl || `${index}`}
        renderItem={renderItem}
        contentContainerStyle={
          notices.length === 0 ? styles.emptyContainer : styles.listContent
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchNotices(true)}
            tintColor={colors.KNU}
          />
        }
        ListEmptyComponent={
          <Text style={styles.helperText}>표시할 공지사항이 없습니다.</Text>
        }
      />

      <Modal
        visible={detailLoading || !!detail}
        animationType="slide"
        transparent
        onRequestClose={closeDetail}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            {detailLoading && !detail ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator size="large" color={colors.KNU} />
                <Text style={styles.helperText}>
                  상세를 불러오는 중입니다...
                </Text>
              </View>
            ) : detail ? (
              <ScrollView contentContainerStyle={styles.modalContent}>
                <Text style={styles.modalTitle}>
                  {detail.title || "제목 없음"}
                </Text>
                <Text style={styles.modalBody}>
                  {detail.content || "내용 없음"}
                </Text>

                {detail.files?.length ? (
                  <View style={styles.files}>
                    <Text style={styles.sectionTitle}>첨부파일</Text>
                    {detail.files.map((file, index) => (
                      <Pressable
                        key={`${file.url}-${index}`}
                        onPress={() => Linking.openURL(file.url)}
                        style={({ pressed }) => [
                          styles.fileLink,
                          pressed && styles.cardPressed,
                        ]}
                      >
                        <Text style={styles.fileText} numberOfLines={1}>
                          {file.name}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                ) : null}
              </ScrollView>
            ) : null}

            <Pressable
              onPress={closeDetail}
              style={({ pressed }) => [
                styles.closeBtn,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={styles.closeText}>닫기</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f7f8fa",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#f7f8fa",
  },
  helperText: {
    color: "#6b7280",
    fontSize: 14,
    marginTop: 4,
  },
  errorBox: {
    backgroundColor: "#fff1f2",
    borderColor: "#fecdd3",
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    margin: 12,
    borderRadius: 12,
  },
  errorText: {
    color: "#b91c1c",
    fontWeight: "600",
    marginBottom: 8,
  },
  retryBtn: {
    alignSelf: "flex-start",
    backgroundColor: colors.KNU,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  retryText: {
    color: colors.WHITE,
    fontWeight: "700",
  },
  listContent: {
    padding: 12,
    gap: 10,
  },
  emptyContainer: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  card: {
    backgroundColor: colors.WHITE,
    borderRadius: 14,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  cardPressed: {
    opacity: 0.8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  cardMeta: {
    marginTop: 6,
    color: colors.KNU,
    fontWeight: "600",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },
  modalCard: {
    maxHeight: "85%",
    backgroundColor: colors.WHITE,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 8,
  },
  modalLoading: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 8,
  },
  modalContent: {
    gap: 14,
    paddingBottom: 18,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
  },
  modalBody: {
    fontSize: 15,
    lineHeight: 22,
    color: "#1f2937",
  },
  files: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  fileLink: {
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  fileText: {
    color: colors.KNU,
    fontWeight: "700",
  },
  closeBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    marginTop: 8,
  },
  closeText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
});