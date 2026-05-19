import { ComponentType } from 'react';

import { AppButton } from '@/components/ui/AppButton';

type AppPressButtonProps = {
  disabled?: boolean;
  icon?: ComponentType<{ color?: string; size?: number; strokeWidth?: number }>;
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'accent' | 'ghost';
};

export function AppPressButton(props: AppPressButtonProps) {
  return <AppButton {...props} />;
}
