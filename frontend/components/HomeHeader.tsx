// frontend/components/HomeHeader.tsx
import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function HomeHeader() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.content}>
        {/* 로고 영역 */}
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>Knoti</Text>
          <View style={styles.dot} />
        </View>
        
        {/* 아이콘 버튼 그룹 */}
        <View style={styles.iconGroup}>
          <TouchableOpacity 
            style={styles.iconButton} 
            onPress={() => router.push('/search')}
            activeOpacity={0.7}
          >
            <Ionicons name="search-outline" size={24} color="#333" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.iconButton} 
            onPress={() => router.push('/notifications')}
            activeOpacity={0.7}
          >
            <Ionicons name="notifications-outline" size={24} color="#333" />
            {/* 알림 배지 예시 (나중에 로직 연결 가능) */}
            {/* <View style={styles.badge} /> */}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    // iOS 그림자
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    // Android 그림자
    elevation: 3,
    zIndex: 10,
  },
  content: {
    height: 56, // 안드로이드 표준 헤더 높이
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20, // 좌우 여백 넉넉하게
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  logoText: {
    fontSize: 24,
    fontWeight: '800', // 굵게 강조
    color: '#006DB8', // 경북대 메인 컬러 (혹은 앱 테마 컬러)
    letterSpacing: -0.5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FF4B4B', // 포인트 컬러
    marginLeft: 2,
    marginBottom: 4,
  },
  iconGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    padding: 8, // 터치 영역 확보
    marginLeft: 8,
  },
  badge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF4B4B',
    borderWidth: 1,
    borderColor: '#fff',
  }
});