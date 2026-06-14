import {
  Anchor,
  Award,
  Building2,
  Calendar,
  CheckCheck,
  Crown,
  Dumbbell,
  Flag,
  Flame,
  Hammer,
  HeartHandshake,
  Mountain,
  Repeat,
  Sprout,
  Trophy,
  Users,
} from 'lucide-react-native';

import { LucideIcon } from '@/constants/icons';

export type BadgeTier = 'bronze' | 'silver' | 'gold';

export type BadgeVisual = {
  icon: LucideIcon;
  tier: BadgeTier;
};

// Keyed by badges.code. Adding a new badge to the seed? Add a row here.
// Future-seed placeholders kept in the comments below.
export const BADGE_VISUALS: Record<string, BadgeVisual> = {
  milestone_initiate: { icon: Flag, tier: 'bronze' },
  consistency_bronze: { icon: Repeat, tier: 'bronze' },
  consistency_silver: { icon: Repeat, tier: 'silver' },
  consistency_gold: { icon: Repeat, tier: 'gold' },
  integrity: { icon: Anchor, tier: 'bronze' },
  environment: { icon: Mountain, tier: 'bronze' },
  discipline: { icon: Dumbbell, tier: 'bronze' },
  milestone_showing_up: { icon: Flame, tier: 'silver' },
  milestone_reliable: { icon: CheckCheck, tier: 'silver' },
  brotherhood: { icon: Users, tier: 'gold' },
  milestone_grounded: { icon: Mountain, tier: 'silver' },
  milestone_capable: { icon: Trophy, tier: 'gold' },
  milestone_leader: { icon: Crown, tier: 'gold' },
  completion_builder: { icon: Hammer, tier: 'gold' },
  leadership_participant: { icon: Sprout, tier: 'bronze' },
  leadership_contributor: { icon: HeartHandshake, tier: 'silver' },
  leadership_leader: { icon: Crown, tier: 'gold' },

  // Future seed candidates (uncomment when the badges row exists):
  // chapter_founder:   { icon: Building2,      tier: 'gold'   },
  // mentor:            { icon: HeartHandshake, tier: 'gold'   },
  // event_attendee:    { icon: Calendar,       tier: 'bronze' },
  // streak_30_day:     { icon: Flame,          tier: 'silver' },
  // week_1_complete:   { icon: Flag,           tier: 'bronze' },
};

export const FALLBACK_BADGE_VISUAL: BadgeVisual = { icon: Award, tier: 'bronze' };

export function getBadgeVisual(code: string | null | undefined): BadgeVisual {
  if (!code) return FALLBACK_BADGE_VISUAL;
  return BADGE_VISUALS[code] ?? FALLBACK_BADGE_VISUAL;
}

// Re-exports so callers that just need the future-seed icons don't have to
// reach into lucide directly.
export const FUTURE_ICONS = {
  chapter_founder: Building2,
  mentor: HeartHandshake,
  event_attendee: Calendar,
};
