export const Colors = {
  light: {
    // 黏土风格配色
    textPrimary: "#2D2B3D", // 深紫灰
    textSecondary: "#8B87A0", // 中灰紫
    textMuted: "#A8A4B8", // 浅灰紫
    primary: "#7C5CFC", // 黏土紫
    accent: "#FF8FAB", // 黏土粉
    success: "#5ED6A0", // 黏土绿
    warning: "#FFCB57", // 黏土黄
    error: "#FF6B8A", // 黏土红
    backgroundRoot: "#F0EDFA", // 浅薰衣草灰
    backgroundDefault: "#FFFFFF", // 纯白
    backgroundTertiary: "#EDE8FF", // 淡紫背景
    buttonPrimaryText: "#FFFFFF",
    tabIconSelected: "#7C5CFC",
    border: "#E5E0F5",
    borderLight: "#F0EDFA",
  },
  dark: {
    textPrimary: "#FAFAF9",
    textSecondary: "#A8A29E",
    textMuted: "#6F767E",
    primary: "#818CF8",
    accent: "#A78BFA",
    success: "#34D399",
    warning: "#FBBF24",
    error: "#F87171",
    backgroundRoot: "#09090B",
    backgroundDefault: "#1C1C1E",
    backgroundTertiary: "#1F1F22",
    buttonPrimaryText: "#09090B",
    tabIconSelected: "#818CF8",
    border: "#3F3F46",
    borderLight: "#27272A",
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  "4xl": 40,
  "5xl": 48,
  "6xl": 64,
};

export const BorderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 28,
  "4xl": 32,
  full: 9999,
};

export const Typography = {
  display: {
    fontSize: 112,
    lineHeight: 112,
    fontWeight: "200" as const,
    letterSpacing: -4,
  },
  displayLarge: {
    fontSize: 112,
    lineHeight: 112,
    fontWeight: "200" as const,
    letterSpacing: -2,
  },
  displayMedium: {
    fontSize: 48,
    lineHeight: 56,
    fontWeight: "200" as const,
  },
  h1: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: "800" as const, // 黏土风格用更粗字重
  },
  h2: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: "800" as const,
  },
  h3: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: "700" as const,
  },
  h4: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: "700" as const,
  },
  title: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "800" as const,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "500" as const,
  },
  bodyMedium: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "600" as const,
  },
  small: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500" as const,
  },
  smallMedium: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600" as const,
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "500" as const,
  },
  captionMedium: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600" as const,
  },
  label: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700" as const,
    letterSpacing: 2,
    textTransform: "uppercase" as const,
  },
  labelSmall: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700" as const,
    letterSpacing: 1,
    textTransform: "uppercase" as const,
  },
  labelTitle: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "800" as const,
    letterSpacing: 2,
    textTransform: "uppercase" as const,
  },
  link: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "500" as const,
  },
  stat: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "700" as const,
  },
  tiny: {
    fontSize: 10,
    lineHeight: 14,
    fontWeight: "500" as const,
  },
  navLabel: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "700" as const,
  },
};

export type Theme = typeof Colors.light;
