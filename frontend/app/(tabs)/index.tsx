// frontend/app/(tabs)/index.tsx
import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, View, FlatList, TouchableOpacity, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import HomeHeader from '@/components/HomeHeader';
import NoticeCard from '@/components/NoticeCard';
import { getKnuNotices, NoticeListItem } from '@/api/knuNotice';
import { categories, colors } from '@/constants';

export default function HomeScreen() {
  const router = useRouter();
  const [notices, setNotices] = useState<NoticeListItem[]>([]);
  const [loading, setLoading] = useState(false);
  
  // [New] 선택된 카테고리 (기본값: all)
  const [selectedCategory, setSelectedCategory] = useState("all");

  useEffect(() => {
    fetchNotices();
  }, [selectedCategory]); // 카테고리가 바뀔 때마다 재조회

  const fetchNotices = async () => {
    try {
      setLoading(true);
      // [수정] searchMenuSeq 대신 category 전달
      const res = await getKnuNotices({ page: 1, limit: 20, category: selectedCategory });
      
      // [수정] 이제 res가 바로 배열입니다.
      if (Array.isArray(res)) {
         setNotices(res);
      } else {
         setNotices([]); 
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleNoticePress = (url: string) => {
    router.push(`/notice-detail?url=${encodeURIComponent(url)}`);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 1. 헤더 */}
      <HomeHeader />

      {/* 2. [New] 카테고리 탭 (가로 스크롤) */}
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
          keyExtractor={(item) => String(item.id)} // id를 문자열로 변환
          renderItem={({ item }) => (
            <NoticeCard item={item} onPress={() => handleNoticePress(item.link)} />
          )}
          onRefresh={fetchNotices}
          refreshing={loading}
          contentContainerStyle={{ paddingBottom: 20 }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>등록된 공지사항이 없습니다.</Text>
            </View>
          }
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { flex: 1, paddingHorizontal: 16 },
  
  // 탭 스타일
  tabContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    backgroundColor: '#fff',
  },
  tabScroll: {
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  tabItem: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tabItemActive: {
    backgroundColor: '#E6F4FE', // 연한 파란색 배경
    borderColor: '#006DB8',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#006DB8',
    fontWeight: 'bold',
  },
  
  // 데이터 없을 때
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#999',
    fontSize: 14,
  }
});