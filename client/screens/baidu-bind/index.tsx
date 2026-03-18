import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useTheme } from '@/hooks/useTheme';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FontAwesome6 } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { createStyles } from './styles';

const EXPO_PUBLIC_BACKEND_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_BASE_URL;

export default function BaiduBindScreen() {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useSafeRouter();

  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

  const [userId] = useState('demo-user-001');

  // 检查绑定状态
  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch(`${EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/baidu/status?userId=${userId}`);
      const data = await res.json();
      setConnected(data.data?.connected || false);
    } catch (error) {
      console.error('Failed to check status:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  // 开始绑定流程
  const handleBind = async () => {
    setConnecting(true);
    try {
      // 获取授权 URL
      const res = await fetch(
        `${EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/baidu/auth-url?userId=${userId}&redirectUri=http://localhost:9091/api/v1/baidu/callback`
      );
      const data = await res.json();

      if (data.data?.authUrl) {
        // 打开浏览器进行授权
        const result = await WebBrowser.openAuthSessionAsync(
          data.data.authUrl,
          'kidreader://baidu-callback'
        );

        if (result.type === 'success') {
          // 授权成功，检查状态
          await checkStatus();
          Alert.alert('绑定成功', '百度网盘已成功绑定！', [
            { text: '好的', onPress: () => router.back() }
          ]);
        }
      }
    } catch (error) {
      console.error('Bind error:', error);
      Alert.alert('绑定失败', '请稍后重试');
    } finally {
      setConnecting(false);
    }
  };

  // 解绑
  const handleUnbind = () => {
    Alert.alert(
      '解绑确认',
      '确定要解绑百度网盘吗？解绑后需要重新授权才能使用网盘资源。',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确定',
          style: 'destructive',
          onPress: async () => {
            // TODO: 实现解绑逻辑
            setConnected(false);
            Alert.alert('已解绑', '百度网盘已解绑');
          },
        },
      ]
    );
  };

  const handleBack = () => {
    router.back();
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
            绑定百度网盘
          </ThemedText>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Status Card */}
          <View style={styles.statusCard}>
            <View
              style={[
                styles.statusIcon,
                {
                  backgroundColor: connected ? '#E0F8EC' : '#FFE8EE',
                },
              ]}
            >
              <FontAwesome6
                name={connected ? 'check' : 'link'}
                size={36}
                color={connected ? theme.success : theme.accent}
              />
            </View>
            <ThemedText variant="title" color={theme.textPrimary} style={styles.statusTitle}>
              {connected ? '已绑定' : '未绑定'}
            </ThemedText>
            <ThemedText variant="small" color={theme.textSecondary} style={styles.statusText}>
              {connected
                ? '你的百度网盘已成功绑定，可以使用网盘中的资源了'
                : '绑定百度网盘后，可以使用网盘中的 PDF、音频、视频资源'}
            </ThemedText>
          </View>

          {/* Info Card */}
          <View style={styles.infoCard}>
            <ThemedText variant="smallMedium" color={theme.textPrimary} style={styles.infoTitle}>
              绑定后可以做什么？
            </ThemedText>
            <View style={styles.infoItem}>
              <View style={[styles.infoIcon, { backgroundColor: '#FFEEF0' }]}>
                <FontAwesome6 name="file-pdf" size={16} color={theme.error} />
              </View>
              <ThemedText variant="small" color={theme.textSecondary} style={styles.infoText}>
                使用网盘中的 PDF 绘本进行阅读
              </ThemedText>
            </View>
            <View style={styles.infoItem}>
              <View style={[styles.infoIcon, { backgroundColor: '#EDE8FF' }]}>
                <FontAwesome6 name="music" size={16} color={theme.primary} />
              </View>
              <ThemedText variant="small" color={theme.textSecondary} style={styles.infoText}>
                播放配套音频，边听边读
              </ThemedText>
            </View>
            <View style={styles.infoItem}>
              <View style={[styles.infoIcon, { backgroundColor: '#FFE8EE' }]}>
                <FontAwesome6 name="video" size={16} color={theme.accent} />
              </View>
              <ThemedText variant="small" color={theme.textSecondary} style={styles.infoText}>
                观看配套视频动画
              </ThemedText>
            </View>
          </View>

          {/* Action Button */}
          {connected ? (
            <>
              <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/resource-manager')}>
                <ThemedText variant="body" color="#FFFFFF" style={styles.actionButtonText}>
                  管理网盘资源
                </ThemedText>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryButton} onPress={handleUnbind}>
                <ThemedText variant="small" color={theme.textSecondary} style={styles.secondaryButtonText}>
                  解除绑定
                </ThemedText>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={[styles.actionButton, connecting && { opacity: 0.7 }]}
              onPress={handleBind}
              disabled={connecting}
            >
              {connecting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <ThemedText variant="body" color="#FFFFFF" style={styles.actionButtonText}>
                  绑定百度网盘
                </ThemedText>
              )}
            </TouchableOpacity>
          )}
        </ScrollView>
      </ThemedView>
    </Screen>
  );
}
