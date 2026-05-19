import { Search } from 'lucide-react-native';
import { StyleSheet } from 'react-native';

import { AppScreen } from '@/components/AppScreen';
import { ChapterDiscovery } from '@/components/community/ChapterDiscovery';
import { RouteGuard } from '@/components/RouteGuard';
import { HeroSection } from '@/components/ui/HeroSection';
import { spacing } from '@/constants/theme';
import { usePreferences } from '@/context/PreferencesContext';

export default function ChapterDirectoryScreen() {
  const { t } = usePreferences();

  return (
    <RouteGuard mode="protected">
      <AppScreen contentStyle={styles.screenContent}>
        <HeroSection
          eyebrow={t('chapterDirectory')}
          icon={Search}
          subtitle="Discover public chapters visually. No precise location required."
          title="Find your group"
        />
        <ChapterDiscovery />
      </AppScreen>
    </RouteGuard>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    gap: spacing.lg,
    justifyContent: 'flex-start',
  },
});
