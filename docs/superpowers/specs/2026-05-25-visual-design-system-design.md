# BLOKE Visual Design System — Design

**Date:** 2026-05-25
**Scope:** Lock in the typography (Space Grotesk + Manrope), centralise the icon system (lucide concept map), and create the badge framework (medal component + per-badge visual map + tier palette). Touch the four core UI primitives (`SectionHeader`, `FormTextInput`, `EmptyState`, `AppButton`) so the new typography is visible without sweeping every screen.

---

## 1. Typography — "Modern Brotherhood"

### Families and weights to load

- **Display: Space Grotesk** — `SpaceGrotesk_500Medium`, `_600SemiBold`, `_700Bold`
- **Body: Manrope** — `Manrope_400Regular`, `_500Medium`, `_600SemiBold`, `_700Bold`, `_800ExtraBold`

These are the weights the codebase actually targets (`fontWeight: '500'..'900'`). Manrope tops out at 800 ExtraBold; the existing `fontWeight: '900'` ends up rendering at the closest available variant (800 ExtraBold once loaded). That's the right call — no 900 cut exists for Manrope and synthesizing one looks worse than topping at 800.

### Theme integration (`constants/theme.ts`)

New `fonts` module exported alongside the existing tokens:

```ts
export const fonts = {
  display: {
    medium:    'SpaceGrotesk_500Medium',
    semibold:  'SpaceGrotesk_600SemiBold',
    bold:      'SpaceGrotesk_700Bold',
  },
  body: {
    regular:   'Manrope_400Regular',
    medium:    'Manrope_500Medium',
    semibold:  'Manrope_600SemiBold',
    bold:      'Manrope_700Bold',
    heavy:     'Manrope_800ExtraBold',
  },
} as const;
```

Update the existing `fontWeights` tokens to use Manrope families (today they're `'System'`):

```ts
fontWeights: {
  regular: { fontFamily: fonts.body.regular },
  medium:  { fontFamily: fonts.body.medium  },
  bold:    { fontFamily: fonts.body.bold    },
  heavy:   { fontFamily: fonts.body.heavy   },
}
```

Drop `fontWeight` from these tokens — when `fontFamily` already encodes the weight variant, RN ignores `fontWeight` anyway.

### Loading (`app/_layout.tsx`)

Load both families via `@expo-google-fonts/space-grotesk` and `@expo-google-fonts/manrope`, gate `SplashScreen.hideAsync()` on the combined `loaded`. Keep `SpaceMono` for now (referenced in default template — harmless).

### Component adoption this round

Four core primitives get explicit font wiring so the new typography is visible immediately:

- **`SectionHeader`** — `title` → `fonts.display.bold`, `subtitle` → `fonts.body.medium`, `eyebrow` → `fonts.body.bold`.
- **`FormTextInput`** — `label` → `fonts.body.bold`, input → `fonts.body.medium`.
- **`EmptyState`** — `title` → `fonts.display.bold`, `body` → `fonts.body.regular`.
- **UI `AppButton`** — label → `fonts.body.bold`.

Everything else still inherits the system font until a screen-by-screen sweep is done. Spec section 6 lists this as the explicit follow-up so it doesn't get forgotten.

---

## 2. Icons — single lucide map

### `constants/icons.ts` (new)

```ts
import {
  Award, BookOpen, Flag, MapPin, MessageSquare, Newspaper,
  NotebookPen, ShieldCheck, Target, User, Users,
} from 'lucide-react-native';

export const ICONS = {
  curriculum:   BookOpen,
  activities:   Target,
  reflections:  NotebookPen,
  community:    Users,
  chapters:     MapPin,
  profile:      User,
  goals:        Flag,
  achievements: Award,
  admin:        ShieldCheck,
  feed:         Newspaper,
  messages:     MessageSquare,
} as const;

export type IconName = keyof typeof ICONS;
```

Standard render: `<ICONS.curriculum size={22} strokeWidth={2.5} color={theme.accent} />`. Matches the existing call sites (already use `size={22}` + `strokeWidth={2.5}` consistently).

No wrapper component — explicit is fine and keeps tree-shaking clean.

---

## 3. Badge framework

### Tier palette (added to both themes)

```
bronze:  #A37B4D  (warm copper)
silver:  #B8B5AB  (warm steel)
gold:    #D1A24F  (existing accent — re-used)
```

Plus muted variants for locked state — fall back to existing `theme.disabled`.

### Visual concept

A circular "Bloke Medal":
1. **Outer ring** — 4-6px tier-tinted gradient (LinearGradient from expo-linear-gradient, already installed).
2. **Inner field** — dark surface (`theme.cardInverted`).
3. **Icon** — lucide icon at ~50% diameter, tier-color stroke.
4. **Optional shimmer** — `theme.subtleGlow` background for recently earned / gold tier.
5. **Locked state** — desaturated gray ring + grayed icon.

### `components/ui/BadgeMedal.tsx` (new)

```ts
type BadgeMedalProps = {
  icon: LucideIcon;
  label?: string;
  locked?: boolean;
  size?: 'sm' | 'md' | 'lg';      // 40 / 56 / 88px
  tier?: 'bronze' | 'silver' | 'gold';
};
```

Renders the circular medal + optional label below. SVG-free — pure RN Views with `LinearGradient` for the ring.

### Badge code → visual map (`constants/badgeVisuals.ts` new)

Keyed by the badge `code` already seeded in the DB:

| Code | Icon | Tier |
|---|---|---|
| `milestone_initiate` | `Flag` | bronze |
| `consistency_bronze` | `Repeat` | bronze |
| `consistency_silver` | `Repeat` | silver |
| `consistency_gold` | `Repeat` | gold |
| `integrity` | `Anchor` | bronze |
| `environment` | `Mountain` | bronze |
| `discipline` | `Dumbbell` | bronze |
| `milestone_showing_up` | `Flame` | silver |
| `milestone_reliable` | `CheckCheck` | silver |
| `brotherhood` | `Users` | gold |
| `milestone_grounded` | `Mountain` | silver |
| `milestone_capable` | `Trophy` | gold |
| `milestone_leader` | `Crown` | gold |
| `completion_builder` | `Hammer` | gold |
| `leadership_participant` | `Sprout` | bronze |
| `leadership_contributor` | `HeartHandshake` | silver |
| `leadership_leader` | `Crown` | gold |

A `fallback: { icon: Award, tier: 'bronze' }` for any future badge code not yet mapped.

Future placeholders called out in the prompt (Chapter Founder → `Building2`/gold, Mentor → `HeartHandshake`/gold, Event Attendee → `Calendar`/bronze, 30-Day Streak → `Flame`/silver, Week 1 Complete → `Flag`/bronze) are documented in the map's comments so the codes can be added when the seed catches up.

---

## 4. Files added or touched

| File | Action |
|---|---|
| `package.json` | + `@expo-google-fonts/space-grotesk`, `@expo-google-fonts/manrope` |
| `app/_layout.tsx` | Load combined font set, gate splash on it |
| `constants/theme.ts` | Add `fonts` export, tier palette, update `fontWeights` |
| `constants/icons.ts` | NEW |
| `constants/badgeVisuals.ts` | NEW |
| `components/ui/SectionHeader.tsx` | Explicit fonts |
| `components/ui/EmptyState.tsx` | Explicit fonts |
| `components/FormTextInput.tsx` | Explicit fonts |
| `components/ui/AppButton.tsx` | Explicit fonts |
| `components/ui/BadgeMedal.tsx` | NEW |

---

## 5. Verification

- `npx tsc --noEmit` clean.
- Fonts load on web — verified by Metro `env: load .env` + a `loaded=true` log.
- `SectionHeader` renders Space Grotesk Bold title + Manrope Medium subtitle visibly (manual eyeball).
- `BadgeMedal` snapshot per tier (`size='md'`, `tier='bronze'|'silver'|'gold'`) renders without RN warnings.

---

## 6. Follow-ups explicitly NOT done this round

- **Screen-by-screen typography sweep.** Inline `fontWeight: '900'` instances across `app/(tabs)/*.tsx`, admin screens, and onboarding still use the system font for now. They render unchanged. Sweeping them to use `fonts.body.bold` / `fonts.display.bold` is the next round.
- **Badge wiring on `progress.tsx` and `profile.tsx`.** The `BadgeMedal` component is built and ready; mapping it into the progress/profile views and replacing the existing `BadgePill` / `BadgeCard` usages is its own scoped change.
- **Section header icon sweep.** `ICONS` map is shipped; updating every `SectionHeader` call site to pass `icon={ICONS.X}` is a follow-up.
- **Custom badge artwork (PNG/SVG)** beyond the lucide-icon medallion concept.
