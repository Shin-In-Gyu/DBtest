// frontend/app/(tabs)/index.tsx
import React, { useEffect, useState } from 'react';
import { StyleSheet, View, FlatList, TouchableOpacity, Text, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';

// [구조 개선] 분리된 헤더 컴포넌트 임포트
import HomeHeader from '@/components/HomeHeader';
import NoticeCard from '@/components/NoticeCard';
import { getKnuNotices, NoticeListItem } from '@/api/knuNotice';
import { categories } from '@/constants';

export default function HomeScreen() {
  const router = useRouter();
  const [notices, setNotices] = useState<NoticeListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("all");

  useEffect(() => {
    fetchNotices();
  }, [selectedCategory]);

  const fetchNotices = async () => {
    try {
      setLoading(true);
      const res = await getKnuNotices({ page: 1, limit: 20, category: selectedCategory });
      setNotices(Array.isArray(res) ? res : []);
    } catch (e) {
      console.error("[HomeScreen] Fetch Error:", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* 1. 독립된 헤더 컴포넌트 사용 */}
      <HomeHeader />

      {/* 2. 카테고리 탭 영역 */}
      <View style={styles.tabContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[styles.tabItem, isSelected && styles.tabItemActive]}
                onPress={() => setSelectedCategory(cat.id)}
              >
                <Text style={[styles.tabText, isSelected && styles.tabTextActive]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
      
      {/* 3. 공지사항 리스트 */}
      <View style={styles.content}>
        <FlatList
          data={notices}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <NoticeCard 
              item={item} 
              onPress={() => router.push(`/notice-detail?url=${encodeURIComponent(item.link)}`)} 
            />
          )}
          onRefresh={fetchNotices}
          refreshing={loading}
          contentContainerStyle={{ paddingBottom: 20 }}
          ListEmptyComponent={
            !loading ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>등록된 공지사항이 없습니다.</Text>
              </View>
            ) : <ActivityIndicator style={{ marginTop: 20 }} />
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { flex: 1, paddingHorizontal: 16 },
  tabContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    backgroundColor: '#fff',
  },
  tabScroll: { paddingHorizontal: 10, paddingVertical: 12 },
  tabItem: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    marginRight: 8,
  },
  tabItemActive: { backgroundColor: '#E6F4FE', borderWidth: 1, borderColor: '#006DB8' },
  tabText: { fontSize: 14, color: '#666' },
  tabTextActive: { color: '#006DB8', fontWeight: 'bold' },
  emptyContainer: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#999', fontSize: 14 },
});