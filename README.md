# Bloke

Bloke is a simple mentorship and discipline app for young men. The MVP guides participants through a weekly rhythm: learn a principle, take one action, log reflection, and stay accountable with a local chapter.

## Tech Stack

- Expo React Native
- TypeScript
- Expo Router
- Supabase Auth and Postgres
- Supabase Row Level Security
- AsyncStorage-backed Supabase sessions
- lucide-react-native icons
- iOS, Android, and web from one codebase

## Setup

1. Install dependencies:

   ```sh
   npm install
   ```

2. Copy the environment example:

   ```sh
   cp .env.example .env
   ```

3. Fill in Supabase values, or enable demo mode for local UI review.

## Environment Variables

```sh
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_DEMO_MODE=false
```

Use `EXPO_PUBLIC_DEMO_MODE=true` to run the app without Supabase. Demo mode uses local mock profile, curriculum, progress, badges, and chapter data.

Never put a Supabase `service_role` key in this client app.

## Supabase Setup

1. Create a Supabase project.
2. Copy the project URL into `EXPO_PUBLIC_SUPABASE_URL`.
3. Copy the publishable or anon key into `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
4. Apply the SQL migrations in `supabase/migrations`.
5. Apply `supabase/seed.sql` to seed curriculum weeks and badge definitions.
6. Confirm Row Level Security is enabled on all MVP tables.
7. In Auth settings, configure the site URL and redirect URLs for your development and production builds.

### Make Your Account Admin

Run this manually in the Supabase SQL editor as the project owner, replacing the placeholder with your Auth user ID:

```sql
update public.profiles
set role = 'admin'
where id = '<MY_AUTH_USER_ID>';
```

Do not run this from the frontend. Do not expose the Supabase `service_role` key in the app.

## Run

Web:

```sh
npm run web
```

iOS simulator:

```sh
npm run ios
```

Android emulator:

```sh
npm run android
```

Expo dev server:

```sh
npm run start
```

## Folder Structure

```text
app/           Expo Router routes
assets/        Icons, splash, fonts, and static assets
components/    Shared UI and route guard components
constants/     Theme tokens
context/       Auth/session context
hooks/         Reserved for reusable hooks
lib/           Supabase client, auth helpers, demo data, badge helpers
supabase/      SQL migrations and seed data
types/         Shared TypeScript types
```

## MVP Features

- Email signup and login with Supabase Auth
- Auth redirect flow: welcome, onboarding, protected app
- Participant tabs: Home, Curriculum, Progress, Community, Profile
- Facilitator dashboard for chapter leaders and admins
- Onboarding profile creation and invite-code chapter join
- Weekly curriculum completion and journal logging
- Server-side badge award logic through Supabase triggers
- Demo mode for Supabase-free walkthroughs

## Known Limitations

- Demo mode is local and does not persist across refreshes.
- Offline-first sync is planned but not implemented.
- Push notifications are installed for future use but not yet wired to user flows.
- App icons and splash assets are placeholders.
- Privacy policy URL is a placeholder in `app.json`.
- Open DMs, public feeds, payments, AI chat, and complex animations are intentionally out of scope for the MVP.

## Future Roadmap

- Offline-friendly curriculum and journal draft storage
- Facilitator chapter setup flow
- Notification preferences and reminders
- Supabase Storage for approved media assets
- Better analytics for chapter health
- Production app icons, screenshots, and store metadata

## Troubleshooting

If the app says Supabase is not configured, check `.env` and restart Expo. Expo public environment variables are read at bundle time.

If auth redirects feel stuck, clear the Expo dev cache and confirm the profile row exists for the signed-in user:

```sh
npx expo start --clear
```

If web does not load after changing routes, restart `npm run web`.

If database writes fail, check Supabase RLS policies and confirm the signed-in user owns the row or belongs to the chapter they are trying to access.

If you only need a product demo, set:

```sh
EXPO_PUBLIC_DEMO_MODE=true
```
