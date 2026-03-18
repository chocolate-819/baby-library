import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useTheme } from '@/hooks/useTheme';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FontAwesome6 } from '@expo/vector-icons';
import { createStyles } from './styles';

const EXPO_PUBLIC_BACKEND_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_BASE_URL;

interface ReadingProgress {
  id: number;
  book_id: number;
  current_page: number;
  completed: boolean;
  last_read_at: string;
  books: {
    id: number;
    title: string;
    cover_image: string | null;
    total_pages: number;
  };
}

interface Stats {
  completedBooks: number;
  readingBooks: number;
  levelStats: Record<number, { completed: number; total: number }>;
}

export default function ProfileScreen() {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useSafeRouter();

  const [stats, setStats] = useState<Stats | null>(null);
  const [recentBooks, setRecentBooks] = useState<ReadingProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [userId] = useState('demo-user-001');

  const fetchData = async () => {
    try {
      // 获取统计数据
      const statsRes = await fetch(`${EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/progress/stats/overview?userId=${userId}`);
      const statsData = await statsRes.json();
      setStats(statsData.data || null);

      // 获取最近阅读
      const recentRes = await fetch(`${EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/progress?userId=${userId}`);
      const recentData = await recentRes.json();
      setRecentBooks(recentData.data?.slice(0, 5) || []);
    } catch (error) {
      console.error('Failed to fetch profile data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleBookPress = (bookId: number) => {
    router.push('/reader', { bookId });
  };

  const menuItems = [
    {
      icon: 'link',
      label: '绑定百度网盘',
      color: '#7C5CFC',
      bgColor: '#EDE8FF',
      onPress: () => {
        router.push('/baidu-bind');
      },
    },
    {
      icon: 'folder-open',
      label: '资源管理',
      color: '#FF8FAB',
      bgColor: '#FFE8EE',
      onPress: () => {
        router.push('/resource-manager');
      },
    },
    {
      icon: 'gear',
      label: '设置',
      color: '#8B87A0',
      bgColor: '#F0EDFA',
      onPress: () => {
        // TODO: 导航到设置页面
      },
    },
  ];

  if (loading) {
    return (
      <Screen backgroundColor={theme.backgroundRoot} statusBarStyle={isDark ? 'light' : 'dark'}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen backgroundColor={theme.backgroundRoot} statusBarStyle={isDark ? 'light' : 'dark'}>
      <ThemedView level="root" style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <ThemedText variant="h1" color={theme.textPrimary} style={styles.title}>
            我的
          </ThemedText>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.primary} />
          }
        >
          {/* Profile Card */}
          <View style={styles.profileCard}>
            <View style={styles.avatar}>
              <FontAwesome6 name="user" size={36} color={theme.primary} />
            </View>
            <ThemedText variant="title" color={theme.textPrimary} style={styles.userName}>
              小读者
            </ThemedText>
            <ThemedText variant="small" color={theme.textSecondary} style={styles.userLevel}>
              阅读达人 Lv.1
            </ThemedText>
          </View>

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: '#E0F8EC' }]}>
                <FontAwesome6 name="book" size={20} color={theme.success} />
              </View>
              <ThemedText variant="h3" color={theme.textPrimary} style={styles.statValue}>
                {stats?.completedBooks || 0}
              </ThemedText>
              <ThemedText variant="caption" color={theme.textSecondary} style={styles.statLabel}>
                已完成
              </ThemedText>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: '#FFE8EE' }]}>
                <FontAwesome6 name="book-open" size={20} color={theme.accent} />
              </View>
              <ThemedText variant="h3" color={theme.textPrimary} style={styles.statValue}>
                {stats?.readingBooks || 0}
              </ThemedText>
              <ThemedText variant="caption" color={theme.textSecondary} style={styles.statLabel}>
                阅读中
              </ThemedText>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: '#FFF4DD' }]}>
                <FontAwesome6 name="clock" size={20} color={theme.warning} />
              </View>
              <ThemedText variant="h3" color={theme.textPrimary} style={styles.statValue}>
                12
              </ThemedText>
              <ThemedText variant="caption" color={theme.textSecondary} style={styles.statLabel}>
                小时
              </ThemedText>
            </View>
          </View>

          {/* Recent Reading */}
          <View style={styles.sectionHeader}>
            <ThemedText variant="title" color={theme.textPrimary}>
              最近阅读
            </ThemedText>
          </View>

          {recentBooks.length > 0 ? (
            <View style={styles.recentList}>
              {recentBooks.map((item) => {
                const progressPercent = item.books.total_pages > 0
                  ? Math.round((item.current_page / item.books.total_pages) * 100)
                  : 0;

                return (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.recentItem}
                    onPress={() => handleBookPress(item.book_id)}
                  >
                    <View style={styles.recentBookCover}>
                      {item.books.cover_image ? (
                        <Image source={{ uri: item.books.cover_image }} style={{ width: '100%', height: '100%', borderRadius: 8 }} />
                      ) : (
                        <FontAwesome6 name="book" size={20} color={theme.textMuted} />
                      )}
                    </View>
                    <View style={styles.recentBookInfo}>
                      <ThemedText variant="smallMedium" color={theme.textPrimary} numberOfLines={1}>
                        {item.books.title}
                      </ThemedText>
                      <ThemedText variant="caption" color={theme.textSecondary} style={styles.recentBookProgress}>
                        {item.completed ? '已完成' : `${progressPercent}% · 第 ${item.current_page} 页`}
                      </ThemedText>
                    </View>
                    <FontAwesome6 name="chevron-right" size={14} color={theme.textMuted} />
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <ThemedText variant="small" color={theme.textSecondary} style={styles.emptyText}>
                暂无阅读记录
              </ThemedText>
            </View>
          )}

          {/* Menu */}
          <View style={styles.menuSection}>
            {menuItems.map((item, index) => (
              <TouchableOpacity key={index} style={styles.menuItem} onPress={item.onPress}>
                <View style={[styles.menuIcon, { backgroundColor: item.bgColor }]}>
                  <FontAwesome6 name={item.icon} size={20} color={item.color} />
                </View>
                <ThemedText variant="body" color={theme.textPrimary} style={styles.menuText}>
                  {item.label}
                </ThemedText>
                <FontAwesome6 name="chevron-right" size={14} color={theme.textMuted} style={styles.menuArrow} />
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </ThemedView>
    </Screen>
  );
}
