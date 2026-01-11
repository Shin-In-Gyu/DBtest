// frontend/app/notice-detail.tsx
import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, Image, TouchableOpacity, ActivityIndicator, Alert, Linking, Dimensions } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { getKnuNoticeDetail, NoticeDetail } from '../api/knuNotice'; // [수정] API 모듈 임포트

// 화면 너비 (이미지 비율 조정을 위해)
const { width } = Dimensions.get('window');

export default function NoticeDetailScreen() {
  const params = useLocalSearchParams();
  const noticeUrl = params.url as string;
  
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<NoticeDetail | null>(null);

  useEffect(() => {
    if (noticeUrl) {
      fetchDetail();
    }  
  }, [noticeUrl]);

  const fetchDetail = async () => {
    try {
      setLoading(true);
      // [수정] 하드코딩된 fetch 제거하고 중앙화된 API 함수 사용
      const result = await getKnuNoticeDetail(noticeUrl);
      setData(result);
    } catch (e) {
      console.error(e);
      Alert.alert('오류', '데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileDownload = (url: string) => {
    Linking.openURL(url).catch(err => 
      Alert.alert("오류", "파일을 열 수 없습니다.")
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={{ marginTop: 10 }}>내용을 가져오는 중입니다...</Text>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.center}>
        <Text>내용을 표시할 수 없습니다.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <Stack.Screen options={{ title: '공지 상세' }} />
      
      {/* 1. 제목 영역 */}
      <View style={styles.header}>
        <Text style={styles.title}>{data.title}</Text>
        {/* 날짜 정보 등이 있다면 여기에 추가 가능 */}
      </View>

      {/* 2. 첨부파일 영역 */}
      {data.files && data.files.length > 0 && (
        <View style={styles.fileSection}>
          <Text style={styles.sectionTitle}>첨부파일</Text>
          {data.files.map((file, idx) => (
            <TouchableOpacity key={idx} style={styles.fileButton} onPress={() => handleFileDownload(file.url)}>
              <Text style={styles.fileText} numberOfLines={1}>📎 {file.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* 3. 본문 텍스트 및 이미지 */}
      <View style={styles.content}>
        {/* 백엔드 응답 구조에 맞게 렌더링 (texts 배열 사용) */}
        {data.texts?.map((text, idx) => (
           <Text key={`txt-${idx}`} style={styles.bodyText}>{text}</Text>
        ))}

        {data.images?.map((imgUrl, idx) => (
          <Image 
            key={`img-${idx}`} 
            source={{ uri: imgUrl }} 
            style={styles.contentImage}
            resizeMode="contain" 
          />
        ))}
        
        {/* texts/images가 없고 content만 있는 경우(구조 대비) */}
        {!data.texts && data.content && (
           <Text style={styles.bodyText}>{data.content}</Text>
        )}
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#f8f9fa',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    lineHeight: 28,
  },
  fileSection: {
    padding: 15,
    backgroundColor: '#f0f5ff',
    margin: 15,
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#0056b3',
  },
  fileButton: {
    paddingVertical: 8,
  },
  fileText: {
    fontSize: 14,
    color: '#007AFF',
    textDecorationLine: 'underline',
  },
  content: {
    padding: 20,
  },
  bodyText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
    marginBottom: 15,
  },
  contentImage: {
    width: '100%', 
    height: 300, 
    marginBottom: 20,
    borderRadius: 8,
    backgroundColor: '#eee'
  }
});