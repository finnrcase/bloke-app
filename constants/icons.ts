import {
  Award,
  BookOpen,
  Flag,
  MapPin,
  MessageSquare,
  Newspaper,
  NotebookPen,
  ShieldCheck,
  Target,
  User,
  Users,
} from 'lucide-react-native';
import { ComponentType } from 'react';

// Single source for the app's concept->icon mapping. Use these everywhere a
// section header, tab, or feature card references one of these concepts so
// the visual language stays consistent.

export type LucideIcon = ComponentType<{ color?: string; size?: number; strokeWidth?: number }>;

export const ICONS = {
  curriculum: BookOpen,
  activities: Target,
  reflections: NotebookPen,
  community: Users,
  chapters: MapPin,
  profile: User,
  goals: Flag,
  achievements: Award,
  admin: ShieldCheck,
  feed: Newspaper,
  messages: MessageSquare,
} as const;

export type IconName = keyof typeof ICONS;
