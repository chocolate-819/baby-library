import { useState, useEffect } from 'react';
import { Dimensions, Platform } from 'react-native';

export type DeviceType = 'phone' | 'tablet' | 'desktop';
export type Orientation = 'portrait' | 'landscape';

interface DeviceInfo {
  deviceType: DeviceType;
  orientation: Orientation;
  width: number;
  height: number;
  isPhone: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isWeb: boolean;
  isMobile: boolean;
  safeAreaTop: number;
  safeAreaBottom: number;
}

/**
 * 响应式布局 Hook
 * 自动检测设备类型和屏幕尺寸
 */
export function useDevice(): DeviceInfo {
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
    });

    return () => subscription?.remove();
  }, []);

  const { width, height } = dimensions;

  // 判断设备类型
  const getDeviceType = (): DeviceType => {
    if (Platform.OS === 'web') {
      if (width < 768) return 'phone';
      if (width < 1024) return 'tablet';
      return 'desktop';
    }

    // iOS/Android 平台
    const pixelRatio = Dimensions.get('window').scale || 1;
    const screenWidthInch = width / pixelRatio / 160; // 大致估算英寸

    if (screenWidthInch < 4.5) return 'phone';
    if (screenWidthInch < 7) return 'tablet';
    return 'desktop';
  };

  const deviceType = getDeviceType();
  const orientation: Orientation = height >= width ? 'portrait' : 'landscape';

  // 安全区域（简化处理，实际应使用 react-native-safe-area-context）
  const getSafeArea = () => {
    if (Platform.OS === 'ios') {
      return {
        top: deviceType === 'phone' ? (orientation === 'portrait' ? 44 : 0) : 20,
        bottom: deviceType === 'phone' ? 34 : 20,
      };
    }
    return { top: 0, bottom: 0 };
  };

  const safeArea = getSafeArea();

  return {
    deviceType,
    orientation,
    width,
    height,
    isPhone: deviceType === 'phone',
    isTablet: deviceType === 'tablet',
    isDesktop: deviceType === 'desktop',
    isIOS: Platform.OS === 'ios',
    isAndroid: Platform.OS === 'android',
    isWeb: Platform.OS === 'web',
    isMobile: Platform.OS === 'ios' || Platform.OS === 'android',
    safeAreaTop: safeArea.top,
    safeAreaBottom: safeArea.bottom,
  };
}

/**
 * 响应式样式生成器
 * 根据设备类型返回不同的样式值
 */
export function responsive<T>(
  device: DeviceInfo,
  options: {
    phone?: T;
    tablet?: T;
    desktop?: T;
    default: T;
  }
): T {
  if (device.isPhone && options.phone !== undefined) {
    return options.phone;
  }
  if (device.isTablet && options.tablet !== undefined) {
    return options.tablet;
  }
  if (device.isDesktop && options.desktop !== undefined) {
    return options.desktop;
  }
  return options.default;
}

/**
 * 响应式字体大小
 */
export function responsiveFontSize(device: DeviceInfo, baseSize: number): number {
  if (device.isTablet) return baseSize * 1.2;
  if (device.isDesktop) return baseSize * 1.1;
  return baseSize;
}

/**
 * 响应式间距
 */
export function responsiveSpacing(device: DeviceInfo, baseSpacing: number): number {
  if (device.isTablet) return baseSpacing * 1.3;
  if (device.isDesktop) return baseSpacing * 1.2;
  return baseSpacing;
}
