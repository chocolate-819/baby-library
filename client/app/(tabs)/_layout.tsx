import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesome6 } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';

export default function TabLayout() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 0,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          shadowColor: '#7C5CFC',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
          elevation: 12,
          height: Platform.OS === 'web' ? 70 : 60 + insets.bottom,
          paddingBottom: Platform.OS === 'web' ? 0 : insets.bottom,
        },
        tabBarActiveTintColor: '#7C5CFC',
        tabBarInactiveTintColor: '#C5C0DB',
        tabBarItemStyle: {
          height: Platform.OS === 'web' ? 70 : undefined,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          marginTop: 4,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '书架',
          tabBarIcon: ({ color }) => (
            <FontAwesome6 name="book" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="game"
        options={{
          title: '闯关',
          tabBarIcon: ({ color }) => (
            <FontAwesome6 name="gamepad" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: '我的',
          tabBarIcon: ({ color }) => (
            <FontAwesome6 name="user" size={22} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
