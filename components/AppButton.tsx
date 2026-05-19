import { Href } from 'expo-router';
import { ComponentType } from 'react';

import { AppButton as UiAppButton } from '@/components/ui/AppButton';

type AppButtonProps = {
  href: Href;
  icon?: ComponentType<{ color?: string; size?: number; strokeWidth?: number }>;
  label: string;
  variant?: 'primary' | 'secondary' | 'accent' | 'ghost';
};

export function AppButton(props: AppButtonProps) {
  return <UiAppButton {...props} />;
}
