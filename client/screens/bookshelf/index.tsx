import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  FlatList,
} from 'react-native';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useTheme } from '@/hooks/useTheme';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FontAwesome6 } from '@expo/vector-icons';
import { createStyles } from './styles';

const EXPO_PUBLIC_BACKEND_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_BASE_URL;

interface Book {
  id: number;
  title: string;
  cover_image: string | null;
  description: string | null;
  level_id: number;
  total_pages: number;
  book_levels?: {
    name: string;
    description: string | null;
  };
}

interface Level {
  id: number;
  name: string;
  description: string | null;
  order: number;
}

interface ReadingProgress {
  book_id: number;
  current_page: number;
  completed: boolean;
}

export default function BookshelfScreen() {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useSafeRouter();

  const [levels, setLevels] = useState<Level[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [progress, setProgress] = useState<Record<number, ReadingProgress>>({});
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // 获取用户ID（设备ID）
  const [userId] = useState('demo-user-001'); // 简化演示，实际应从 AsyncStorage 获取

  const fetchData = async () => {
    try {
      // 获取分级列表
      const levelsRes = await fetch(`${EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/levels`);
      const levelsData = await levelsRes.json();
      setLevels(levelsData.data || []);

      // 获取书籍列表
      const booksRes = await fetch(`${EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/books`);
      const booksData = await booksRes.json();
      setBooks(booksData.data || []);

      // 获取阅读进度
      const progressRes = await fetch(`${EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/progress?userId=${userId}`);
      const progressData = await progressRes.json();
      if (progressData.data) {
        const progressMap: Record<number, ReadingProgress> = {};
        progressData.data.forEach((p: any) => {
          progressMap[p.book_id] = {
            book_id: p.book_id,
            current_page: p.current_page || 0,
            completed: p.completed || false,
          };
        });
        setProgress(progressMap);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredBooks = useMemo(() => {
    if (!selectedLevel) return books;
    return books.filter((book) => book.level_id === selectedLevel);
  }, [books, selectedLevel]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleBookPress = (book: Book) => {
    router.push('/reader', { bookId: book.id });
  };

  const renderBook = ({ item }: { item: Book }) => {
    const bookProgress = progress[item.id];
    const progressPercent = bookProgress && item.total_pages > 0
      ? Math.round((bookProgress.current_page / item.total_pages) * 100)
      : 0;

    return (
      <TouchableOpacity style={styles.bookCard} onPress={() => handleBookPress(item)}>
        {item.cover_image ? (
          <Image source={{ uri: item.cover_image }} style={styles.bookCover} resizeMode="cover" />
        ) : (
          <View style={styles.bookCover}>
            <FontAwesome6 name="book" size={40} color={theme.textMuted} />
          </View>
        )}
        <View style={styles.bookInfo}>
          <ThemedText variant="smallMedium" color={theme.textPrimary} numberOfLines={2}>
            {item.title}
          </ThemedText>
          <ThemedText variant="caption" color={theme.textSecondary}>
            {item.book_levels?.name || '未分类'}
          </ThemedText>
          {bookProgress && !bookProgress.completed && progressPercent > 0 && (
            <View style={styles.bookProgress}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
              </View>
              <ThemedText variant="tiny" color={theme.success}>
                {progressPercent}%
              </ThemedText>
            </View>
          )}
          {bookProgress?.completed && (
            <View style={styles.bookProgress}>
              <FontAwesome6 name="circle-check" size={14} color={theme.success} />
              <ThemedText variant="tiny" color={theme.success} style={{ marginLeft: 4 }}>
                已完成
              </ThemedText>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      );
    }

    return (
      <>
        {/* Hero Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroBadge}>
            <FontAwesome6 name="star" size={14} color={theme.warning} solid />
            <ThemedText variant="labelSmall" color={theme.warning}>
              今日推荐
            </ThemedText>
          </View>
          <ThemedText variant="h3" color="#FFFFFF" style={styles.heroTitle}>
            开启阅读之旅
          </ThemedText>
          <ThemedText variant="small" color="rgba(255,255,255,0.7)" style={styles.heroSubtitle}>
            每一本书都是一次新的冒险
          </ThemedText>
        </View>

        {/* Level Tabs */}
        <View style={styles.levelTabs}>
          <ThemedText variant="smallMedium" color={theme.textSecondary} style={styles.levelTabsLabel}>
            选择级别
          </ThemedText>
          <View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.levelTabsScroll}>
            <TouchableOpacity
              style={[styles.levelTab, !selectedLevel && styles.levelTabActive]}
              onPress={() => setSelectedLevel(null)}
            >
              <ThemedText
                variant="smallMedium"
                color={!selectedLevel ? '#FFFFFF' : theme.textPrimary}
              >
                全部
              </ThemedText>
            </TouchableOpacity>
            {levels.map((level) => (
              <TouchableOpacity
                key={level.id}
                style={[styles.levelTab, selectedLevel === level.id && styles.levelTabActive]}
                onPress={() => setSelectedLevel(level.id)}
              >
                <ThemedText
                  variant="smallMedium"
                  color={selectedLevel === level.id ? '#FFFFFF' : theme.textPrimary}
                >
                  {level.name}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </ScrollView>
          </View>
        </View>

        {/* Book List */}
        <View style={styles.sectionHeader}>
          <ThemedText variant="title" color={theme.textPrimary}>
            我的书架
          </ThemedText>
          <ThemedText variant="small" color={theme.primary}>
            {filteredBooks.length} 本
          </ThemedText>
        </View>

        {filteredBooks.length > 0 ? (
          <View>
            <FlatList
              data={filteredBooks}
              renderItem={renderBook}
              keyExtractor={(item) => item.id.toString()}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.bookGrid}
            />
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
              <FontAwesome6 name="book-open" size={32} color={theme.textMuted} />
            </View>
            <ThemedText variant="body" color={theme.textSecondary}>
              暂无书籍
            </ThemedText>
          </View>
        )}
      </>
    );
  };

  return (
    <Screen backgroundColor={theme.backgroundRoot} statusBarStyle={isDark ? 'light' : 'dark'}>
      <ThemedView level="root" style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.greeting}>
            <FontAwesome6 name="hand-sparkles" size={16} color={theme.accent} />
            <ThemedText variant="smallMedium" color={theme.textSecondary} style={{ marginLeft: 8 }}>
              小朋友好
            </ThemedText>
          </View>
          <ThemedText variant="h1" color={theme.textPrimary} style={styles.title}>
            电子书架
          </ThemedText>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.primary} />
          }
        >
          {renderContent()}
        </ScrollView>
      </ThemedView>
    </Screen>
  );
}
