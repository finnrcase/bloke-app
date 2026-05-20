# Bloke Android Play Store Deployment

## Build Profiles

- `development`: internal APK with Expo development client and demo mode enabled.
- `preview`: internal APK for quick QA and stakeholder review.
- `closed-beta`: Play Store AAB for internal/closed testing with production mode.
- `production`: Play Store AAB for production rollout.

## Required Environment Variables

Set these in EAS before closed beta or production builds:

```sh
npx eas env:create --environment production --name EXPO_PUBLIC_SUPABASE_URL --value "https://YOUR_PROJECT.supabase.co"
npx eas env:create --environment production --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "YOUR_SUPABASE_ANON_KEY"
npx eas env:create --environment production --name EXPO_PUBLIC_DEMO_MODE --value "false"
npx eas env:create --environment production --name EXPO_PUBLIC_MAPBOX_TOKEN --value ""
```

Do not upload `.env` or service-role Supabase keys.

## Android Build Commands

```sh
npm install
npx expo-doctor
npx eas-cli login
npm run build:android:preview
npm run build:android:closed-beta
```

Local native release compile requires a Java runtime and Android SDK:

```sh
java -version
cd android
./gradlew assembleRelease
```

For production after closed beta approval:

```sh
npm run build:android:production
npm run submit:android:production
```

## Play Console Setup Checklist

- Create app in Google Play Console.
- App name: `Bloke`.
- Package name: `com.bloke.app`.
- Default language: English.
- App category: Lifestyle or Health & Fitness, depending on final positioning.
- Content rating questionnaire completed.
- Data Safety form completed.
- Privacy Policy URL: `https://bloke.app/privacy`.
- Support email: `support@bloke.app`.
- Closed testing track created with tester group.
- Upload signed `.aab` from EAS closed-beta build.
- Complete store listing, app access, ads declaration, target audience, and data safety.

## Screenshot Requirements

Minimum recommended set:

- Phone screenshots: at least 4, 1080 x 1920 or similar 9:16 portrait.
- 7-inch tablet screenshots: optional but recommended before public launch.
- 10-inch tablet screenshots: optional unless tablet support is emphasized.

Capture these screens:

- Welcome / demo entry.
- Home dashboard.
- Weekly accountability progress.
- Chapter map / discovery.
- Chapter detail.
- Facilitator approvals or invite code flow.

## Closed Beta Testing Checklist

- Fresh install opens without crash.
- Signup/login works with production Supabase.
- Demo mode is disabled in production profile.
- Onboarding creates a profile.
- Weekly check-in submits and persists.
- Progress streak and consistency update after check-in.
- Chapter map loads without Mapbox token.
- Location permission denial does not block app use.
- Invite code redemption creates pending approval.
- Leader approval creates active membership.
- Invalid, expired, and maxed invite codes show errors.
- Dark/light mode has readable text.
- App resumes from background without auth loss.
- Offline or poor network shows recoverable errors.
- Android back button behaves correctly.
- No secrets are visible in logs or committed files.

## Release Notes Template

```text
Bloke closed beta build.

Includes weekly accountability, chapter discovery, invite requests, leader approvals, and demo-safe public pages.
```

## Known Pre-Launch Placeholders

- Replace placeholder Privacy Policy, Terms, and Support copy with reviewed legal/support content.
- Replace `https://bloke.app/*` URLs if final public domain differs.
- Confirm final Android package name before first Play upload; changing it later requires a new Play app.
