import { ComponentType } from 'react';

import { AppButton } from '@/components/ui/AppButton';

type FloatingCTAProps = {
  disabled?: boolean;
  icon?: ComponentType<{ color?: string; size?: number; strokeWidth?: number }>;
  label: string;
  onPress: () => void;
};

export function FloatingCTA(props: FloatingCTAProps) {
  return <AppButton {...props} variant="accent" />;
}
