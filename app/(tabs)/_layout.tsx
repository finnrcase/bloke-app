import { BookOpen, Home, MessageSquare, User, TrendingUp } from 'lucide-react-native';
import { Tabs } from 'expo-router';

import { RouteGuard } from '@/components/RouteGuard';
import { colors } from '@/constants/theme';

export default function TabsLayout() {
  return (
    <RouteGuard mode="protected">
      <Tabs
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: '900' },
          sceneStyle: { backgroundColor: colors.background },
          tabBarActiveTintColor: colors.gold,
          tabBarInactiveTintColor: colors.mutedText,
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
          },
        }}>
        <Tabs.Screen
          name="home"
          options={{
            title: 'Home',
            tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="curriculum"
          options={{
            title: 'Curriculum',
            tabBarIcon: ({ color, size }) => <BookOpen color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="progress"
          options={{
            title: 'Progress',
            tabBarIcon: ({ color, size }) => <TrendingUp color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="community"
          options={{
            title: 'Community',
            tabBarIcon: ({ color, size }) => <MessageSquare color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
          }}
        />
      </Tabs>
    </RouteGuard>
  );
}
