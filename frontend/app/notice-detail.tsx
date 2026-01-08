import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, Image, TouchableOpacity, ActivityIndicator, Alert, Linking, Dimensions } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';

// 화면 너비 (이미지 비율 조정을 위해)
const { width } = Dimensions.get('window');

interface NoticeDetail {
  title: string;
  texts: string[];
  images: string[];
  files: { name: string; url: string }[];
  error?: string;
}

export default function NoticeDetailScreen() {
  const params = useLocalSearchParams();
  const noticeUrl = params.url as string;
  
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<NoticeDetail | null>(null);

  useEffect(() => {
    fetchDetail();
  }, []);

  const fetchDetail = async () => {
    try {
      // [주의] 실제 테스트 시 localhost 대신 내 IP주소 사용 (예: 192.168.0.x:8000)
      // Android 에뮬레이터는 10.0.2.2:8000
      const apiUrl = `http://localhost:8000/knu/notice/detail?url=${encodeURIComponent(noticeUrl)}`;
      const response = await fetch(apiUrl);
      const json = await response.json();
      setData(json);
    } catch (e) {
      Alert.alert('오류', '데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileDownload = (url: string) => {
    // PDF 등 첨부파일은 외부 브라우저나 뷰어로 연결
    Linking.openURL(url);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={{ marginTop: 10 }}>내용을 가져오는 중입니다...</Text>
      </View>
    );
  }

  if (!data || data.error) {
    return (
      <View style={styles.center}>
        <Text>내용을 표시할 수 없습니다.</Text>
        <Text style={{fontSize: 12, color: '#999'}}>{noticeUrl}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <Stack.Screen options={{ title: '공지 상세' }} />
      
      {/* 1. 제목 영역 */}
      <View style={styles.header}>
        <Text style={styles.title}>{data.title}</Text>
      </View>

      {/* 2. 첨부파일 영역 (있을 경우에만) */}
      {data.files.length > 0 && (
        <View style={styles.fileSection}>
          <Text style={styles.sectionTitle}>첨부파일</Text>
          {data.files.map((file, idx) => (
            <TouchableOpacity key={idx} style={styles.fileButton} onPress={() => handleFileDownload(file.url)}>
              <Text style={styles.fileText} numberOfLines={1}>📎 {file.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* 3. 본문 텍스트 및 이미지 혼합 배치 */}
      <View style={styles.content}>
        {/* 이미지가 있으면 먼저 크게 보여주거나, 텍스트 사이사이에 넣을 수 있음.
            여기서는 텍스트 -> 이미지 순서로 배치 (단순화) */}
        
        {data.texts.map((text, idx) => (
           <Text key={idx} style={styles.bodyText}>{text}</Text>
        ))}

        {data.images.map((imgUrl, idx) => (
          <Image 
            key={idx} 
            source={{ uri: imgUrl }} 
            style={styles.contentImage}
            resizeMode="contain" // 비율 유지
          />
        ))}
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
    height: 300, // 높이는 이미지 비율에 따라 동적으로 조절하면 더 좋음 (AutoHeightImage 라이브러리 추천)
    marginBottom: 20,
    borderRadius: 8,
    backgroundColor: '#eee'
  }
});