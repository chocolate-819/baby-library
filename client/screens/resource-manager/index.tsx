import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  FlatList,
  Image,
  Alert,
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
  book_levels?: {
    name: string;
  };
}

interface Resource {
  id: number;
  resource_type: 'pdf' | 'audio' | 'video';
  file_name: string;
  file_size: number;
  baidu_path: string;
}

interface BaiduFile {
  path: string;
  name: string;
  size: number;
  isDir: boolean;
  type: 'pdf' | 'audio' | 'video' | 'unknown';
}

export default function ResourceManagerScreen() {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useSafeRouter();

  const [books, setBooks] = useState<Book[]>([]);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [currentResources, setCurrentResources] = useState<Resource[]>([]);
  const [baiduFiles, setBaiduFiles] = useState<BaiduFile[]>([]);
  const [currentPath, setCurrentPath] = useState('/');
  const [loading, setLoading] = useState(true);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [bookPickerVisible, setBookPickerVisible] = useState(false);

  const [userId] = useState('demo-user-001');

  // 加载书籍列表
  useEffect(() => {
    const fetchBooks = async () => {
      try {
        const res = await fetch(`${EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/books`);
        const data = await res.json();
        setBooks(data.data || []);
        if (data.data?.length > 0) {
          setSelectedBook(data.data[0]);
        }
      } catch (error) {
        console.error('Failed to fetch books:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchBooks();
  }, []);

  // 加载选中书籍的资源
  useEffect(() => {
    if (!selectedBook) return;

    const fetchResources = async () => {
      try {
        const res = await fetch(`${EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/books/${selectedBook.id}`);
        const data = await res.json();
        setCurrentResources(data.data?.resources || []);
      } catch (error) {
        console.error('Failed to fetch resources:', error);
      }
    };
    fetchResources();
  }, [selectedBook]);

  // 加载百度网盘文件
  useEffect(() => {
    const fetchBaiduFiles = async () => {
      setLoadingFiles(true);
      try {
        const res = await fetch(
          `${EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/baidu/files?userId=${userId}&path=${encodeURIComponent(currentPath)}`
        );
        const data = await res.json();
        setBaiduFiles(data.data?.files || []);
      } catch (error) {
        console.error('Failed to fetch baidu files:', error);
      } finally {
        setLoadingFiles(false);
      }
    };
    fetchBaiduFiles();
  }, [currentPath, userId]);

  const handleBack = () => {
    router.back();
  };

  const handleSelectBook = (book: Book) => {
    setSelectedBook(book);
    setBookPickerVisible(false);
  };

  const handleFilePress = (file: BaiduFile) => {
    if (file.isDir) {
      setCurrentPath(file.path);
    }
  };

  const handleLinkFile = async (file: BaiduFile) => {
    if (!selectedBook) {
      Alert.alert('提示', '请先选择一本书籍');
      return;
    }

    if (file.type === 'unknown') {
      Alert.alert('提示', '不支持的文件类型');
      return;
    }

    try {
      const res = await fetch(
        `${EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/books/${selectedBook.id}/resources`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            resourceType: file.type,
            baiduPath: file.path,
            fileName: file.name,
            fileSize: file.size,
          }),
        }
      );

      if (res.ok) {
        Alert.alert('成功', `已将 ${file.name} 关联到《${selectedBook.title}》`);
        // 刷新资源列表
        const bookRes = await fetch(`${EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/books/${selectedBook.id}`);
        const bookData = await bookRes.json();
        setCurrentResources(bookData.data?.resources || []);
      } else {
        const error = await res.json();
        Alert.alert('失败', error.error || '关联失败');
      }
    } catch (error) {
      console.error('Link file error:', error);
      Alert.alert('失败', '关联失败，请重试');
    }
  };

  const handleRemoveResource = async (resource: Resource) => {
    Alert.alert(
      '确认删除',
      `确定要移除 ${resource.file_name} 吗？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            // TODO: 实现删除 API
            setCurrentResources(currentResources.filter((r) => r.id !== resource.id));
            Alert.alert('已删除', '资源已移除');
          },
        },
      ]
    );
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

  const isFileLinked = (file: BaiduFile) => {
    return currentResources.some((r) => r.baidu_path === file.path);
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
      <ThemedView level="root" style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <FontAwesome6 name="arrow-left" size={16} color={theme.textPrimary} />
          </TouchableOpacity>
          <ThemedText variant="title" color={theme.textPrimary} style={styles.title}>
            资源管理
          </ThemedText>
        </View>

        <ScrollView style={styles.content}>
          {/* Book Selector */}
          <View style={styles.bookSelector}>
            <ThemedText variant="smallMedium" color={theme.textSecondary} style={styles.bookSelectorLabel}>
              当前书籍
            </ThemedText>
            <TouchableOpacity style={styles.bookSelectorButton} onPress={() => setBookPickerVisible(true)}>
              {selectedBook ? (
                <ThemedText variant="body" color={theme.textPrimary} style={styles.bookSelectorText}>
                  《{selectedBook.title}》
                </ThemedText>
              ) : (
                <ThemedText variant="body" color={theme.textMuted} style={styles.bookSelectorPlaceholder}>
                  点击选择书籍
                </ThemedText>
              )}
              <FontAwesome6 name="chevron-down" size={14} color={theme.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Current Resources */}
          <View style={styles.sectionHeader}>
            <ThemedText variant="smallMedium" color={theme.textPrimary} style={styles.sectionTitle}>
              已关联资源
            </ThemedText>
          </View>

          <View style={styles.currentResources}>
            {currentResources.length > 0 ? (
              currentResources.map((resource) => (
                <View key={resource.id} style={styles.resourceItem}>
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
                    <ThemedText variant="tiny" color={theme.textMuted} style={styles.resourceType}>
                      {resource.resource_type === 'pdf' ? 'PDF' : resource.resource_type === 'audio' ? '音频' : '视频'}
                    </ThemedText>
                    <ThemedText variant="small" color={theme.textPrimary} style={styles.resourceName}>
                      {resource.file_name}
                    </ThemedText>
                  </View>
                  <TouchableOpacity style={styles.removeButton} onPress={() => handleRemoveResource(resource)}>
                    <FontAwesome6 name="xmark" size={14} color={theme.accent} />
                  </TouchableOpacity>
                </View>
              ))
            ) : (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIcon}>
                  <FontAwesome6 name="folder-open" size={32} color={theme.textMuted} />
                </View>
                <ThemedText variant="small" color={theme.textSecondary} style={styles.emptyText}>
                  暂无关联资源
                </ThemedText>
              </View>
            )}
          </View>

          {/* Baidu Files */}
          <View style={styles.sectionHeader}>
            <ThemedText variant="smallMedium" color={theme.textPrimary} style={styles.sectionTitle}>
              百度网盘文件
            </ThemedText>
          </View>

          {/* Path Bar */}
          <View style={styles.pathBar}>
            <FontAwesome6 name="folder" size={14} color={theme.primary} />
            <ThemedText variant="small" color={theme.textSecondary} style={[styles.pathText, { marginLeft: 8 }]}>
              {currentPath}
            </ThemedText>
          </View>

          {loadingFiles ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.primary} />
            </View>
          ) : (
            <View style={styles.fileList}>
              {baiduFiles.length > 0 ? (
                baiduFiles.map((file, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[styles.fileItem, isFileLinked(file) && styles.fileItemLinked]}
                    onPress={() => handleFilePress(file)}
                  >
                    <View
                      style={[
                        styles.fileIcon,
                        {
                          backgroundColor: file.isDir
                            ? '#FFF4DD'
                            : getResourceColor(file.type) + '20',
                        },
                      ]}
                    >
                      <FontAwesome6
                        name={file.isDir ? 'folder' : getResourceIcon(file.type)}
                        size={20}
                        color={file.isDir ? theme.warning : getResourceColor(file.type)}
                      />
                    </View>
                    <View style={styles.fileInfo}>
                      <ThemedText variant="small" color={theme.textPrimary} style={styles.fileName}>
                        {file.name}
                      </ThemedText>
                      <ThemedText variant="tiny" color={theme.textMuted} style={styles.fileSize}>
                        {file.isDir ? '文件夹' : formatFileSize(file.size)}
                      </ThemedText>
                    </View>
                    {file.isDir ? (
                      <FontAwesome6 name="chevron-right" size={14} color={theme.textMuted} />
                    ) : isFileLinked(file) ? (
                      <View style={styles.linkedBadge}>
                        <FontAwesome6 name="check" size={10} color={theme.success} />
                        <ThemedText variant="tiny" color={theme.success} style={styles.linkedText}>
                          已关联
                        </ThemedText>
                      </View>
                    ) : (
                      <TouchableOpacity style={styles.linkButton} onPress={() => handleLinkFile(file)}>
                        <ThemedText variant="tiny" color="#FFFFFF" style={styles.linkButtonText}>
                          关联
                        </ThemedText>
                      </TouchableOpacity>
                    )}
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.emptyContainer}>
                  <View style={styles.emptyIcon}>
                    <FontAwesome6 name="cloud" size={32} color={theme.textMuted} />
                  </View>
                  <ThemedText variant="small" color={theme.textSecondary} style={styles.emptyText}>
                    暂无支持的文件
                  </ThemedText>
                </View>
              )}
            </View>
          )}
        </ScrollView>

        {/* Book Picker Modal */}
        <Modal
          visible={bookPickerVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setBookPickerVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <ThemedText variant="title" color={theme.textPrimary} style={styles.modalTitle}>
                  选择书籍
                </ThemedText>
                <TouchableOpacity onPress={() => setBookPickerVisible(false)}>
                  <FontAwesome6 name="xmark" size={20} color={theme.textMuted} />
                </TouchableOpacity>
              </View>
              <FlatList
                data={books}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.bookOption, selectedBook?.id === item.id && styles.bookOptionSelected]}
                    onPress={() => handleSelectBook(item)}
                  >
                    {item.cover_image ? (
                      <Image source={{ uri: item.cover_image }} style={styles.bookCover} />
                    ) : (
                      <View style={styles.bookCover}>
                        <FontAwesome6 name="book" size={16} color={theme.textMuted} />
                      </View>
                    )}
                    <View>
                      <ThemedText variant="smallMedium" color={theme.textPrimary} style={styles.bookOptionTitle}>
                        {item.title}
                      </ThemedText>
                      <ThemedText variant="caption" color={theme.textSecondary} style={styles.bookOptionLevel}>
                        {item.book_levels?.name || '未分类'}
                      </ThemedText>
                    </View>
                    {selectedBook?.id === item.id && (
                      <FontAwesome6 name="check" size={16} color={theme.primary} style={{ marginLeft: 'auto' }} />
                    )}
                  </TouchableOpacity>
                )}
              />
            </View>
          </View>
        </Modal>
      </ThemedView>
    </Screen>
  );
}
