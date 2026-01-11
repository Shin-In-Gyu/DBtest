// frontend/components/NoticeCard.tsx
import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { NoticeListItem } from '@/api/knuNotice';

interface Props {
  item: NoticeListItem;
  onPress: (link: string) => void;
}

export default function NoticeCard({ item, onPress }: Props) {
  return (
    <TouchableOpacity 
      style={styles.card} 
      onPress={() => onPress(item.link)}
      activeOpacity={0.7}
    >
      {/* 1. 상단: 제목 */}
      <Text style={styles.title} numberOfLines={2}>
        {item.title}
      </Text>
      
      {/* 2. 하단: 메타 정보 (카테고리 | 날짜 | 조회수) 한 줄 배치 */}
      <View style={styles.metaRow}>
        <View style={styles.badgeContainer}>
          <Text style={styles.categoryBadge}>{item.category}</Text>
        </View>

        <Text style={styles.divider}>|</Text>
        
        <Text style={styles.date}>{item.date}</Text>
        
        <Text style={styles.divider}>|</Text>
        
        {/* [수정] 조회수를 날짜 옆에 배치 (univ_views 사용) */}
        <Text style={styles.views}>조회 {item.univ_views ?? 0}</Text>
        
        {/* 작성자는 공간 부족 시 생략하거나 제일 뒤에 배치 */}
        {/* <Text style={styles.author}>{item.author}</Text> */}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12, // 라운드 약간 줄임 (세련된 느낌)
    paddingVertical: 14, // 상하 여백 축소 (기존 20 -> 14)
    paddingHorizontal: 16,
    marginBottom: 10, // 카드 간 간격 축소 (기존 16 -> 10)
    
    // 얇은 테두리와 약한 그림자로 깔끔하게
    borderWidth: 1,
    borderColor: '#F0F0F0',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  title: {
    fontSize: 15, // 폰트 사이즈 조절
    fontWeight: '600', // 너무 두껍지 않게
    color: '#222',
    lineHeight: 22,
    marginBottom: 8, // 제목과 하단 정보 사이 간격 줄임
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeContainer: {
    backgroundColor: '#F5F7FA',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  categoryBadge: {
    fontSize: 11,
    color: '#555',
    fontWeight: '600',
  },
  divider: {
    marginHorizontal: 6,
    color: '#E0E0E0',
    fontSize: 10,
  },
  date: {
    fontSize: 12,
    color: '#888',
  },
  views: {
    fontSize: 12,
    color: '#888',
  },
  author: {
    marginLeft: 'auto', // 우측 끝으로 밀기
    fontSize: 12,
    color: '#999',
  }
});