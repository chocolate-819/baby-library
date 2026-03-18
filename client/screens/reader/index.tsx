import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useSafeRouter, useSafeSearchParams } from '@/hooks/useSafeRouter';
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
  total_pages: number;
  book_levels?: {
    name: string;
  };
}

interface Resource {
  id: number;
  resource_type: 'pdf' | 'audio' | 'video';
  file_name: string;
  file_size: number;
  duration: number;
  download_url: string | null;
}

export default function ReaderScreen() {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useSafeRouter();
  const params = useSafeSearchParams<{ bookId: number }>();
  const bookId = params?.bookId;

  const [book, setBook] = useState<Book | null>(null);
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [currentResource, setCurrentResource] = useState<Resource | null>(null);

  const [userId] = useState('demo-user-001');

  useEffect(() => {
    if (!bookId) return;

    const fetchBook = async () => {
      try {
        const res = await fetch(`${EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/books/${bookId}`);
        const data = await res.json();
        setBook(data.data || null);
        setResources(data.data?.resources || []);
      } catch (error) {
        console.error('Failed to fetch book:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBook();
  }, [bookId]);

  const handleBack = () => {
    router.back();
  };

  const handlePlayResource = (resource: Resource) => {
    if (currentResource?.id === resource.id) {
      setPlaying(!playing);
    } else {
      setCurrentResource(resource);
      setPlaying(true);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getResourceIcon = (type: string) => {
    switch (type) {
      case 'pdf':
        return 'file-pdf';
      case 'audio':
        return 'music';
      case 'video':
        return 'video';
      default:
        return 'file';
    }
  };

  const getResourceColor = (type: string) => {
    switch (type) {
      case 'pdf':
        return theme.error;
      case 'audio':
        return theme.primary;
      case 'video':
        return theme.accent;
      default:
        return theme.textMuted;
    }
  };

  const pdfResource = resources.find((r) => r.resource_type === 'pdf');
  const audioResource = resources.find((r) => r.resource_type === 'audio');
  const videoResource = resources.find((r) => r.resource_type === 'video');

  if (loading) {
    return (
      <Screen backgroundColor={theme.backgroundRoot} statusBarStyle={isDark ? 'light' : 'dark'}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </Screen>
    );
  }

  if (!book) {
    return (
      <Screen backgroundColor={theme.backgroundRoot} statusBarStyle={isDark ? 'light' : 'dark'}>
        <View style={styles.loadingContainer}>
          <ThemedText variant="body" color={theme.textSecondary}>
            书籍不存在
          </ThemedText>
        </View>
      </Screen>
    );
  }

  return (
    <Screen backgroundColor={theme.backgroundRoot} statusBarStyle={isDark ? 'light' : 'dark'}>
      <ThemedView level="root" style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <FontAwesome6 name="arrow-left" size={16} color={theme.textPrimary} />
          </TouchableOpacity>
          <ThemedText variant="title" color={theme.textPrimary} style={styles.headerTitle} numberOfLines={1}>
            {book.title}
          </ThemedText>
        </View>

        <ScrollView style={styles.content}>
          {/* PDF 预览区域 */}
          <View style={styles.pdfContainer}>
            {pdfResource ? (
              <View style={styles.emptyContainer}>
                <View style={[styles.playerIcon, { backgroundColor: '#FFEEF0' }]}>
                  <FontAwesome6 name="file-pdf" size={32} color={theme.error} />
                </View>
                <ThemedText variant="body" color={theme.textSecondary} style={styles.emptyText}>
                  PDF 阅读器需要配置百度网盘后使用
                </ThemedText>
                <TouchableOpacity
                  style={[styles.playButton, { marginTop: 20 }]}
                  onPress={() => handlePlayResource(pdfResource)}
                >
                  <FontAwesome6 name="download" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <FontAwesome6 name="book" size={48} color={theme.textMuted} />
                <ThemedText variant="body" color={theme.textSecondary} style={styles.emptyText}>
                  暂无 PDF 资源
                </ThemedText>
              </View>
            )}
          </View>

          {/* 音频播放器 */}
          {audioResource && (
            <View style={styles.playerCard}>
              <View style={styles.playerHeader}>
                <View style={[styles.playerIcon, { backgroundColor: '#EDE8FF' }]}>
                  <FontAwesome6 name="music" size={22} color={theme.primary} />
                </View>
                <View style={styles.playerTitle}>
                  <ThemedText variant="smallMedium" color={theme.textPrimary}>
                    配套音频
                  </ThemedText>
                  <ThemedText variant="caption" color={theme.textSecondary} style={styles.playerSubtitle}>
                    {formatDuration(audioResource.duration)}
                  </ThemedText>
                </View>
                <TouchableOpacity
                  style={styles.playButton}
                  onPress={() => handlePlayResource(audioResource)}
                >
                  <FontAwesome6
                    name={playing && currentResource?.id === audioResource.id ? 'pause' : 'play'}
                    size={20}
                    color="#FFFFFF"
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: '30%' }]} />
                </View>
                <View style={styles.timeRow}>
                  <ThemedText variant="tiny" color={theme.textMuted} style={styles.timeText}>
                    1:23
                  </ThemedText>
                  <ThemedText variant="tiny" color={theme.textMuted} style={styles.timeText}>
                    {formatDuration(audioResource.duration)}
                  </ThemedText>
                </View>
              </View>

              <View style={styles.controlsRow}>
                <TouchableOpacity style={styles.controlButton}>
                  <FontAwesome6 name="backward" size={18} color={theme.textPrimary} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.controlButton}>
                  <FontAwesome6 name="forward" size={18} color={theme.textPrimary} />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* 资源列表 */}
          <View style={styles.resourcesCard}>
            <ThemedText variant="smallMedium" color={theme.textPrimary} style={{ marginBottom: 12 }}>
              所有资源
            </ThemedText>
            {resources.map((resource) => (
              <TouchableOpacity
                key={resource.id}
                style={styles.resourceItem}
                onPress={() => handlePlayResource(resource)}
              >
                <View
                  style={[
                    styles.resourceIcon,
                    { backgroundColor: getResourceColor(resource.resource_type) + '20' },
                  ]}
                >
                  <FontAwesome6
                    name={getResourceIcon(resource.resource_type)}
                    size={18}
                    color={getResourceColor(resource.resource_type)}
                  />
                </View>
                <View style={styles.resourceInfo}>
                  <ThemedText variant="small" color={theme.textPrimary} style={styles.resourceTitle}>
                    {resource.file_name}
                  </ThemedText>
                  <ThemedText variant="tiny" color={theme.textMuted} style={styles.resourceSize}>
                    {formatFileSize(resource.file_size)}
                    {resource.duration > 0 && ` · ${formatDuration(resource.duration)}`}
                  </ThemedText>
                </View>
                <FontAwesome6 name="circle-play" size={24} color={theme.primary} />
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Bottom Bar */}
        <View style={styles.bottomBar}>
          <TouchableOpacity style={styles.bottomButton}>
            <View style={styles.bottomIcon}>
              <FontAwesome6 name="list" size={20} color={theme.textPrimary} />
            </View>
            <ThemedText variant="navLabel" color={theme.textSecondary} style={styles.bottomText}>
              目录
            </ThemedText>
          </TouchableOpacity>
          <TouchableOpacity style={styles.bottomButton}>
            <View style={styles.bottomIcon}>
              <FontAwesome6 name="bookmark" size={20} color={theme.textPrimary} />
            </View>
            <ThemedText variant="navLabel" color={theme.textSecondary} style={styles.bottomText}>
              书签
            </ThemedText>
          </TouchableOpacity>
          <TouchableOpacity style={styles.bottomButton}>
            <View style={[styles.bottomIcon, { backgroundColor: '#E0F8EC' }]}>
              <FontAwesome6 name="check" size={20} color={theme.success} />
            </View>
            <ThemedText variant="navLabel" color={theme.textSecondary} style={styles.bottomText}>
              标记完成
            </ThemedText>
          </TouchableOpacity>
        </View>
      </ThemedView>
    </Screen>
  );
}
