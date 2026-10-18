# Deployment & Testing Guide

---

## Table of Contents

1. [Running Locally](#1-running-locally)
2. [Web — Vercel Deployment](#2-web--vercel-deployment)
3. [Mobile — Testing on a Device](#3-mobile--testing-on-a-device)
4. [Mobile — EAS Build & App Store](#4-mobile--eas-build--app-store)

---

## 1. Running Locally

### Both apps at once (recommended)

From the repo root:

```bash
npm run dev
```

Turbo runs both in parallel:
- Web → `http://localhost:3000`
- Expo Metro → `http://localhost:8081`

### Web only

```bash
cd apps/web && npm run dev
# or from root:
npx turbo dev --filter=@family/web
```

### Mobile only

```bash
cd apps/mobile && npx expo start
```

Then press:
- `i` — open iOS Simulator (requires Xcode)
- `a` — open Android emulator (requires Android Studio)
- Scan the QR code with your phone to open in **Expo Go** (no simulator needed)

---

## 2. Web — Vercel Deployment

No new GitHub repo or Vercel project needed beyond your existing one. Vercel supports Turborepo monorepos natively — you just point it at the right subdirectory.

### One-time setup

1. Push this repo to GitHub if you haven't already
2. Go to [vercel.com](https://vercel.com) → **Add New Project** → import your GitHub repo
3. Before clicking Deploy, set **Root Directory** to `apps/web`
4. Add environment variables (Settings → Environment Variables):
   ```
   VITE_SUPABASE_URL      # bundled into client (public)
   VITE_SUPABASE_ANON_KEY # bundled into client (public)
   GOOGLE_CLIENT_ID       # server-only — never use VITE_ prefix
   GOOGLE_CLIENT_SECRET   # server-only — never use VITE_ prefix
   ```
   `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are used exclusively in the server-side
   token-refresh function (`src/lib/server/refresh-google-token.ts`) and are never bundled
   into the client JS. If you have any `VITE_GOOGLE_*` vars set in Vercel, they can be deleted.
5. Click **Deploy**

Vercel auto-detects Vite and sets the correct build command (`vite build`) and output directory.

### Known build issues

**1. Missing Linux native binaries (`Cannot find native binding` / `Cannot find module`)**

npm has a bug where optional platform-specific binaries are not installed correctly in monorepos. On Vercel (Linux), this causes crashes like:
- `Cannot find module '@rollup/rollup-linux-x64-gnu'`
- `Cannot find native binding` from `@tailwindcss/oxide`

Fix: declare the Linux binaries as `optionalDependencies` in `apps/web/package.json` — npm installs whichever matches the platform and skips the rest, so this is safe on macOS too. Already done for Rollup and Tailwind oxide. If a new package hits this error, add its `-linux-x64-gnu` and `-linux-x64-musl` variants the same way.

**2. Env vars stripped by Turbo (`VITE_* missing from turbo.json`)**

Turbo treats env vars as cache inputs — any var not listed in `turbo.json`'s `build.env` array is stripped before the task runs and will be `undefined` at build time. If Vercel warns that a var is missing from `turbo.json`, add it to the `env` array in the root `turbo.json`. Already done for all four `VITE_*` vars.

### After setup

Every push to `main` triggers a production deploy automatically. Every pull request gets its own preview URL.

### Build commands (Vercel uses these automatically)

| Setting         | Value          |
|-----------------|----------------|
| Root Directory  | `apps/web`     |
| Build Command   | `npm run build`|
| Output Directory| `.vercel/output` (auto-detected) |

---

## 3. Mobile — Testing on a Device

### Supabase redirect URL (required once)

Before Google sign-in works on mobile, add the deep link scheme to Supabase's allowlist:

1. Go to **supabase.com** → your project → **Authentication** → **URL Configuration**
2. Under **Redirect URLs**, add: `familyspace://auth`
3. Save

Without this, Supabase ignores the `redirect_to` parameter and falls back to the Site URL (localhost), so the in-app browser never redirects back to the app.

### Option A: Expo Go (fastest, no build required)

Expo Go is a free app on the App Store / Play Store. It lets you run your app instantly over your local network — no simulator, no build, no Apple developer account needed.

```bash
cd apps/mobile && npx expo start
```

1. Install **Expo Go** on your phone
2. Scan the QR code shown in the terminal
3. The app loads on your device

**Limitation:** Expo Go only supports the Expo SDK's built-in native modules. If you add a custom native module later, you'll need a development build instead.

### Option B: iOS Simulator (requires Xcode on Mac)

```bash
cd apps/mobile && npx expo start --ios
```

Xcode must be installed from the Mac App Store. After installing, run:
```bash
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
```

### Option B2: Android Emulator (requires Android Studio)

1. Download and install **Android Studio** from [developer.android.com/studio](https://developer.android.com/studio)
2. Open Android Studio → **More Actions** → **Virtual Device Manager**
3. Click **Create Device**, pick a model (e.g. Pixel 9), select API 35, and click **Finish**
4. Start the emulator, then run:

```bash
cd apps/mobile && npx expo start --android
# or
npm run android
```

### Option C: Development Build (Expo Go replacement on real device)

A development build is your own version of Expo Go — a native app shell that includes your specific native modules. Use this once you've outgrown Expo Go.

```bash
npm install -g eas-cli
eas login
eas build --profile development --platform ios
```

Install the resulting `.ipa` on your device via the EAS link. From then on, `npx expo start` connects to it instead of Expo Go.

### Environment variables on mobile

The mobile app reads from `apps/mobile/.env`. Copy from the web `.env` and rename the keys:

```bash
# apps/mobile/.env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Note: Expo requires the `EXPO_PUBLIC_` prefix for variables that are bundled into the app. These are public — do not put secrets here.

---

## 4. Mobile — EAS Build & App Store

EAS (Expo Application Services) is Expo's cloud build service. It compiles your app to a native `.ipa` (iOS) or `.aab` (Android) without needing Xcode or Android Studio locally.

### Prerequisites

- Apple Developer account ($99/year) for iOS
- Google Play Developer account ($25 one-time) for Android
- EAS CLI installed: `npm install -g eas-cli`

### Initial EAS setup (one-time)

```bash
cd apps/mobile
eas login
eas init          # creates a project on expo.dev and adds projectId to app.json
```

This creates an `eas.json` config file with build profiles.

### Build for the App Store

```bash
# iOS production build (.ipa)
eas build --platform ios --profile production

# Android production build (.aab)
eas build --platform android --profile production
```

The build runs in Expo's cloud — you don't need a Mac for iOS builds. EAS handles code signing automatically if you let it (recommended).

### Submit to stores

```bash
# Submit to Apple App Store Connect
eas submit --platform ios

# Submit to Google Play
eas submit --platform android
```

EAS uploads the binary directly to App Store Connect / Google Play Console. You still need to fill in the store listing (screenshots, description, age rating) on the respective developer portals before the app goes live.

### Over-the-air (OTA) updates

For JS-only changes (no new native modules), you can push updates directly to users without a new App Store submission:

```bash
eas update --branch production --message "Fix item sorting"
```

Users get the update the next time they open the app. This is the main reason to use Expo in production — it bypasses the App Store review cycle for most changes.
