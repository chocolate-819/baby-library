import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
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

interface GameLevel {
  id: number;
  name: string;
  description: string | null;
  required_books_count: number;
  level_id: number;
  order: number;
  reward: string | null;
  is_active: boolean;
  book_levels?: {
    name: string;
  };
}

interface UserProgress {
  game_level_id: number;
  completed: boolean;
  stars: number;
}

interface Overview {
  completedLevels: number;
  totalLevels: number;
  totalStars: number;
  levels: Array<{
    id: number;
    name: string;
    order: number;
    completed: boolean;
    stars: number;
  }>;
}

export default function GameScreen() {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useSafeRouter();

  const [overview, setOverview] = useState<Overview | null>(null);
  const [levels, setLevels] = useState<GameLevel[]>([]);
  const [userProgress, setUserProgress] = useState<Record<number, UserProgress>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [userId] = useState('demo-user-001');

  const fetchData = async () => {
    try {
      // 获取关卡列表
      const levelsRes = await fetch(`${EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/game/levels`);
      const levelsData = await levelsRes.json();
      setLevels(levelsData.data || []);

      // 获取用户游戏概览
      const overviewRes = await fetch(`${EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/game/overview?userId=${userId}`);
      const overviewData = await overviewRes.json();
      setOverview(overviewData.data || null);
    } catch (error) {
      console.error('Failed to fetch game data:', error);
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

  const handleLevelPress = (level: GameLevel, isUnlocked: boolean) => {
    if (!isUnlocked) return;
    // TODO: 导航到关卡详情或游戏页面
    console.log('Level pressed:', level.name);
  };

  const renderStars = (stars: number, maxStars: number = 3) => {
    return (
      <View style={styles.starsContainer}>
        {[...Array(maxStars)].map((_, i) => (
          <FontAwesome6
            key={i}
            name="star"
            size={16}
            color={i < stars ? theme.warning : theme.border}
            solid={i < stars}
            style={{ marginRight: 2 }}
          />
        ))}
      </View>
    );
  };

  const renderLevel = (level: GameLevel, index: number) => {
    const progress = overview?.levels.find((l) => l.id === level.id);
    const isCompleted = progress?.completed || false;
    const stars = progress?.stars || 0;
    // 简化解锁逻辑：第一关解锁，后续关卡需要前一关完成
    const isUnlocked = index === 0 || (overview?.levels[index - 1]?.completed ?? false);

    return (
      <TouchableOpacity
        key={level.id}
        style={[styles.levelCard, !isUnlocked && styles.levelCardLocked]}
        onPress={() => handleLevelPress(level, isUnlocked)}
        activeOpacity={isUnlocked ? 0.7 : 1}
      >
        <View style={styles.levelHeader}>
          <View style={styles.levelIcon}>
            <FontAwesome6
              name={isCompleted ? 'trophy' : isUnlocked ? 'gamepad' : 'lock'}
              size={24}
              color={isCompleted ? theme.warning : isUnlocked ? theme.primary : theme.textMuted}
            />
          </View>
          <View style={styles.levelInfo}>
            <ThemedText variant="title" color={theme.textPrimary}>
              {level.name}
            </ThemedText>
            <ThemedText variant="small" color={theme.textSecondary} style={styles.levelDesc}>
              {level.description || `完成 ${level.required_books_count} 本书籍`}
            </ThemedText>
          </View>
        </View>

        <View style={styles.levelStatus}>
          {isCompleted ? (
            <>
              {renderStars(stars)}
              <View style={[styles.progressBadge, styles.progressBadgeComplete]}>
                <ThemedText variant="caption" color={theme.success} style={styles.progressTextComplete}>
                  已完成
                </ThemedText>
              </View>
            </>
          ) : isUnlocked ? (
            <View style={styles.progressBadge}>
              <ThemedText variant="caption" color={theme.textPrimary} style={styles.progressText}>
                等待挑战
              </ThemedText>
            </View>
          ) : (
            <View style={styles.lockedBadge}>
              <FontAwesome6 name="lock" size={12} color={theme.textMuted} />
              <ThemedText variant="caption" color={theme.textMuted} style={styles.lockedText}>
                完成上一关解锁
              </ThemedText>
            </View>
          )}
        </View>

        {level.reward && (
          <View style={styles.levelReward}>
            <FontAwesome6 name="gift" size={14} color="#B45309" />
            <ThemedText variant="caption" color="#B45309" style={styles.rewardText}>
              奖励: {level.reward}
            </ThemedText>
          </View>
        )}
      </TouchableOpacity>
    );
  };

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
            闯关游戏
          </ThemedText>
          <ThemedText variant="small" color={theme.textSecondary} style={styles.subtitle}>
            完成阅读，解锁关卡，赢取奖励
          </ThemedText>
        </View>

        {/* Stats Card */}
        <View style={styles.statsCard}>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <View style={styles.statIcon}>
                <FontAwesome6 name="flag-checkered" size={22} color={theme.primary} />
              </View>
              <ThemedText variant="h3" color={theme.textPrimary} style={styles.statValue}>
                {overview?.completedLevels || 0}
              </ThemedText>
              <ThemedText variant="caption" color={theme.textSecondary} style={styles.statLabel}>
                已通关
              </ThemedText>
            </View>
            <View style={styles.statItem}>
              <View style={styles.statIcon}>
                <FontAwesome6 name="star" size={22} color={theme.warning} />
              </View>
              <ThemedText variant="h3" color={theme.textPrimary} style={styles.statValue}>
                {overview?.totalStars || 0}
              </ThemedText>
              <ThemedText variant="caption" color={theme.textSecondary} style={styles.statLabel}>
                总星星
              </ThemedText>
            </View>
            <View style={styles.statItem}>
              <View style={styles.statIcon}>
                <FontAwesome6 name="medal" size={22} color={theme.accent} />
              </View>
              <ThemedText variant="h3" color={theme.textPrimary} style={styles.statValue}>
                {overview?.totalLevels || 0}
              </ThemedText>
              <ThemedText variant="caption" color={theme.textSecondary} style={styles.statLabel}>
                总关卡
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Level List */}
        <View style={styles.sectionHeader}>
          <ThemedText variant="title" color={theme.textPrimary}>
            关卡列表
          </ThemedText>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.primary} />
          }
        >
          {levels.map((level, index) => renderLevel(level, index))}
        </ScrollView>
      </ThemedView>
    </Screen>
  );
}
