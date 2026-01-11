// frontend/app/(tabs)/index.tsx
import React, { useEffect, useState } from 'react';
import { 
  StyleSheet, 
  View, 
  FlatList, 
  TouchableOpacity, 
  Text, 
  ScrollView, 
  ActivityIndicator,
  RefreshControl 
} from 'react-native';
import { useRouter } from 'expo-router';

import HomeHeader from '@/components/HomeHeader';
import NoticeCard from '@/components/NoticeCard';
import { getKnuNotices, NoticeListItem } from '@/api/knuNotice';
import { categories } from '@/constants';

export default function HomeScreen() {
  const router = useRouter();
  const [notices, setNotices] = useState<NoticeListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false); // 당겨서 새로고침용
  const [selectedCategory, setSelectedCategory] = useState("all");

  useEffect(() => {
    fetchNotices();
  }, [selectedCategory]);

  const fetchNotices = async () => {
    try {
      setLoading(true);
      // 실제 API 호출 (페이지네이션은 추후 추가 가능)
      const res = await getKnuNotices({ page: 1, limit: 20, category: selectedCategory });
      setNotices(Array.isArray(res) ? res : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotices();
  };

  return (
    <View style={styles.container}>
      {/* 1. 커스텀 헤더 */}
      <HomeHeader />

      {/* 2. 카테고리 탭 (가로 스크롤) */}
      <View style={styles.tabContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={styles.tabScroll}
        >
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[styles.tabItem, isSelected && styles.tabItemActive]}
                onPress={() => setSelectedCategory(cat.id)}
                activeOpacity={0.7}
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
      <View style={styles.listContainer}>
        <FlatList
          data={notices}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <NoticeCard 
              item={item} 
              onPress={() => router.push(`/notice-detail?url=${encodeURIComponent(item.link)}`)} 
            />
          )}
          // 성능 최적화 옵션
          initialNumToRender={5}
          windowSize={5}
          // 여백 관리
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#006DB8']} />
          }
          ListEmptyComponent={
            !loading && !refreshing ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="documents-outline" size={48} color="#DDD" />
                <Text style={styles.emptyText}>등록된 공지사항이 없습니다.</Text>
              </View>
            ) : null
          }
          ListFooterComponent={loading && !refreshing ? <ActivityIndicator size="small" color="#999" /> : null}
        />
      </View>
    </View>
  );
}

// 아이콘 사용을 위해 import (ListEmptyComponent용)
import { Ionicons } from '@expo/vector-icons';

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F9F9F9' // 배경색을 아주 연한 회색으로 변경 (카드와 구분감)
  },
  
  // 탭 스타일
  tabContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    paddingBottom: 4,
  },
  tabScroll: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  tabItem: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 24, // 둥근 알약 모양
    backgroundColor: '#F5F5F5',
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tabItemActive: {
    backgroundColor: '#006DB8', // 선택 시 진한 파랑 배경
    borderColor: '#006DB8',
  },
  tabText: {
    fontSize: 15,
    color: '#777',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#fff', // 선택 시 흰색 글자
    fontWeight: '700',
  },

  // 리스트 스타일
  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 100, // [중요] 하단 탭바에 가려지지 않도록 넉넉하게
  },

  // 빈 상태 스타일
  emptyContainer: {
    padding: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: '#AAA',
    fontSize: 15,
    marginTop: 12, 
  }
});