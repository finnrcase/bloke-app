import { BookOpen, FileText, Home, MessageSquare, Newspaper, User, TrendingUp } from 'lucide-react-native';
import { Tabs } from 'expo-router';

import { RouteGuard } from '@/components/RouteGuard';
import { shadows } from '@/constants/theme';
import { usePreferences } from '@/context/PreferencesContext';
import { useTheme } from '@/hooks/useTheme';

export default function TabsLayout() {
  const { t } = usePreferences();
  const theme = useTheme();

  return (
    <RouteGuard mode="protected">
      <Tabs
        screenOptions={{
          headerShadowVisible: false,
          headerStyle: { backgroundColor: theme.background },
          headerTintColor: theme.textPrimary,
          headerTitleStyle: { fontWeight: '900' },
          sceneStyle: { backgroundColor: theme.background },
          tabBarActiveTintColor: theme.accent,
          tabBarInactiveTintColor: theme.textMuted,
          tabBarLabelStyle: { fontSize: 12, fontWeight: '800' },
          tabBarStyle: {
            backgroundColor: theme.surface,
            borderTopColor: theme.border,
            minHeight: 70,
            paddingBottom: 10,
            paddingTop: 8,
            ...shadows.card,
          },
        }}>
        <Tabs.Screen
          name="home"
          options={{
            title: t('home'),
            tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="curriculum"
          options={{
            title: t('curriculum'),
            tabBarIcon: ({ color, size }) => <BookOpen color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="feed"
          options={{
            title: t('feed'),
            tabBarIcon: ({ color, size }) => <Newspaper color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="progress"
          options={{
            title: t('progress'),
            tabBarIcon: ({ color, size }) => <TrendingUp color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="journal"
          options={{
            title: t('journal'),
            tabBarIcon: ({ color, size }) => <FileText color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="community"
          options={{
            title: t('community'),
            tabBarIcon: ({ color, size }) => <MessageSquare color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: t('profile'),
            tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
          }}
        />
      </Tabs>
    </RouteGuard>
  );
}
