# Monorepo Migration: Web App → Turborepo + React Native

This document covers the full migration of the Family Space web app from a single-root project to a Turborepo monorepo, and the addition of a React Native (Expo) mobile app that shares code with the web.

---

## Before

```
family-calendar/
├── src/
│   ├── components/
│   ├── contexts/
│   ├── entities/         ← TypeScript types
│   ├── hooks/            ← TanStack Query hooks
│   ├── lib/
│   │   ├── supabase.ts   ← Supabase singleton (import.meta.env)
│   │   ├── supabase/     ← all DB CRUD functions
│   │   ├── google-calendar.ts
│   │   ├── calendar-sync.ts
│   │   ├── config.ts     ← SPACE_COLORS constant
│   │   └── utils.ts      ← formatDate, cn(), getDateStatus, etc.
│   └── routes/
├── package.json          ← single app, all deps here
├── vite.config.ts
└── tsconfig.json
```

**Stack:** TanStack Start (SSR) + React 19 + Supabase + Tailwind CSS v4

---

## After

```
family-calendar/
├── apps/
│   ├── web/              @family/web   ← original app, moved here
│   └── mobile/           @family/mobile ← new Expo app
├── packages/
│   ├── types/            @family/types
│   ├── config/           @family/config
│   ├── utils/            @family/utils
│   ├── api/              @family/api
│   ├── supabase/         @family/supabase
│   └── hooks/            @family/hooks
├── package.json          ← workspace root
├── turbo.json
├── tsconfig.base.json
└── prettier.config.js
```

---

## Why Turborepo

- **Shared packages with no build step** — packages export raw TypeScript source directly (`"exports": { ".": "./src/index.ts" }`). Vite and Metro both transpile them. No tsc compilation pipeline needed.
- **npm workspaces** for dependency hoisting and symlinks between packages.
- **Turbo** for task orchestration (`turbo build` runs all workspace builds in dependency order).
- **Single `package-lock.json`** — one lockfile at the root, one `npm install` for everything.

---

## Migration Phases

### Phase 1 — Convert Root to Turborepo Workspace

**What changed:**
- Created `apps/` and `packages/` directories
- Moved all web app files to `apps/web/` using `git mv` (preserving rename history)
- Created root `package.json` with `"workspaces": ["apps/*", "packages/*"]`
- Created `turbo.json` with `build`, `dev`, `lint`, `test`, `check` tasks
- Created `tsconfig.base.json` with shared compiler options (strict mode, bundler resolution, etc.)
- `apps/web/tsconfig.json` updated to `"extends": "../../tsconfig.base.json"` and adds only web-specific settings (DOM lib, jsx, path aliases)
- `apps/web/package.json` renamed to `@family/web`
- Added `"packageManager": "npm@10.9.4"` to root (required by Turbo 2.x for workspace resolution)
- Added `.turbo` to `.gitignore`

**Turbo outputs needed updating** — the web app outputs to `.vercel/output/` (Vercel preset), not `.output/`. Added `.vercel/**` to `turbo.json` outputs so Turbo can cache build results.

---

### Phase 2 — Extract `@family/types`

Extracted all TypeScript type definitions into a zero-dependency package.

**Files extracted:**
- `Space.ts` — `Space`, `SpaceType`
- `Item.ts` — `Item`, `Recurrence`
- `Activity.ts` — `ActivityEvent`
- `Search.ts` — `SearchResult` (references Item + Space via relative imports)
- `Family.ts` — `Family`, `FamilyMember` (previously defined inline in `lib/supabase/families.ts`)

**Web app:** each `src/entities/*.ts` file became a one-line re-export shim:
```ts
export type { Space, SpaceType } from '@family/types'
```

`lib/supabase/families.ts` was updated to import `Family` and `FamilyMember` from `@family/types` instead of defining them locally.

**tsconfig paths** added to `apps/web/tsconfig.json`:
```json
"@family/types": ["../../packages/types/src/index.ts"]
```
This lets TypeScript resolve the package directly to source without going through `node_modules`, which is faster and avoids needing a build step.

---

### Phase 3 — Extract `@family/config`

Extracted `SPACE_COLORS` (OKLCH color presets) into `packages/config/`.

`apps/web/src/lib/config.ts` became:
```ts
export { SPACE_COLORS } from '@family/config'
```

---

### Phase 4 — Extract `@family/utils`

Extracted all platform-neutral utility functions. `cn()` was explicitly **not** extracted — it uses `clsx` + `tailwind-merge` which are web/Tailwind specific.

**Extracted:**
- `formatDate`, `formatDateFull`, `hasExplicitTime`, `formatTime` → `src/format.ts`
- `extractHue` → `src/color.ts`
- `getDateStatus`, `DateStatus`, `advanceDate` → `src/date.ts`

`advanceDate` was moved here from `lib/date-utils.ts` (which originally imported `Recurrence` from the entities). Now it imports `Recurrence` from `@family/types`.

`apps/web/src/lib/utils.ts` kept only `cn()` and re-exports everything else from `@family/utils`.
`apps/web/src/lib/date-utils.ts` became a one-line re-export.

---

### Phase 5 — Extract `@family/api`

Extracted the Google Calendar REST API wrapper (`google-calendar.ts`) — pure `fetch` calls, no platform dependencies.

Also moved `calendar-sync.ts` (the `tryCreate/Delete/syncOnUpdate` helpers) into this package since it wraps the API functions. This was important because `useItemMutationsCore` (moving to `@family/hooks` in Phase 7) imports these helpers.

**Package exports both:**
```ts
// Raw API
export { createCalendarEvent, updateCalendarEvent, deleteCalendarEvent }
// Higher-level sync helpers
export { tryDeleteCalendarEvent, tryCreateCalendarEvent, syncCalendarOnUpdate }
```

---

### Phase 6 — Extract `@family/supabase` (Biggest Change)

**The problem:** The existing `lib/supabase.ts` used `import.meta.env` (Vite-specific) to read env vars and created the Supabase client as a module-level singleton:

```ts
// Before — Vite-specific, not portable
export const supabase = createClient(
  import.meta.env['VITE_SUPABASE_URL'],
  import.meta.env['VITE_SUPABASE_ANON_KEY'],
)
```

This can't be shared with React Native, where env vars use `process.env.EXPO_PUBLIC_*`.

**The solution — `initSupabase()` pattern:**

```ts
// packages/supabase/src/client.ts
let _client: SupabaseClient | null = null

export function initSupabase(url: string | undefined, key: string | undefined) {
  if (!url || !key) throw new Error('Missing Supabase credentials')
  _client = createClient(url, key)
}

export function getSupabaseClient(): SupabaseClient {
  if (!_client) throw new Error('Call initSupabase() first')
  return _client
}
```

Each platform initialises the client with its own env var prefix:
```ts
// apps/web/src/lib/supabase.ts
initSupabase(import.meta.env['VITE_SUPABASE_URL'], import.meta.env['VITE_SUPABASE_ANON_KEY'])

// apps/mobile/src/lib/supabase.ts
initSupabase(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY)
```

**Each CRUD function** was updated to call `getSupabaseClient()` at invocation time rather than using a module-level variable:
```ts
// Before
import { supabase } from '#/lib/supabase'

// After
import { getSupabaseClient } from './client'
export async function fetchSpaces(familyId: string) {
  const supabase = getSupabaseClient()
  // ...
}
```

Five files were migrated: `spaces.ts`, `items.ts`, `families.ts`, `activity.ts`, `invites.ts`.

---

### Phase 7 — Extract `@family/hooks`

**Pre-work already done:** `useItemMutations` had previously been split into:
- `useItemMutationsCore(spaceId, opts)` — portable, accepts `calendarId` and `getToken` as parameters instead of reading from context
- `useItemMutations(spaceId)` — web wrapper that fills those params from `useBoardContext` + `useAuthContext`

**Moved to `@family/hooks`:**
- `useSpaces`, `useSpaceMutations`
- `useItems`, `useItemMutationsCore`, `useSearchItems`
- `useUserFamily`, `useFamilyMembers`
- `useFamily`, `useActivityFeed`

**Stayed in `apps/web`:**
- `useItemMutations` (web wrapper with context injection)
- `useIsDark` (uses `MutationObserver` on `<html>` — browser-only)

**Peer dependencies** declared in `packages/hooks/package.json`:
```json
"peerDependencies": {
  "@tanstack/react-query": "^5.0.0",
  "react": "^19.0.0",
  "sonner": "^2.0.0"
}
```

Each original hook file in `apps/web/src/hooks/` became a re-export shim:
```ts
export { useSpaces } from '@family/hooks'
```

---

### Phase 8 — Web Parity Check

Ran `turbo build` from root. All three Vite build environments (client, SSR, Nitro) passed. No functional changes to the web app — it still imports from the same `#/` paths, which are now thin re-export shims.

---

### Phase 9 — Bootstrap `apps/mobile`

```bash
npx create-expo-app@latest apps/mobile --template blank-typescript
```

**Key configuration for the monorepo — `metro.config.js`:**

```js
const { getDefaultConfig } = require('expo/metro-config')
const path = require('path')

const projectRoot = __dirname
const monorepoRoot = path.resolve(projectRoot, '../..')

let config = getDefaultConfig(projectRoot)

config.watchFolders = [monorepoRoot]
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
]
```

Without `watchFolders`, Metro won't detect changes in `packages/`. Without `nodeModulesPaths`, Metro can't find packages hoisted to the root `node_modules`.

**tsconfig** keeps `expo/tsconfig.base` (handles React Native types) and adds `@family/*` path aliases pointing directly to package source files.

**The scaffolded `node_modules`** (created inside `apps/mobile/` by `create-expo-app`) was deleted and re-installed from the workspace root so all packages are properly deduplicated and symlinked.

---

### Phase 10 — Mobile Auth + Screens

Google OAuth on React Native uses `expo-auth-session` + `expo-web-browser` instead of Supabase's web redirect flow:

```ts
// Open the OAuth URL in a system browser
const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri)

// Parse the access_token from the callback URL fragment
const params = Linking.parse(result.url).queryParams
await supabase.auth.setSession({ access_token, refresh_token })
```

`app.json` needed a `"scheme": "familyspace"` entry to handle the deep link callback.

Screens built: `LoginScreen`, `SpacesScreen`, `ItemsScreen`.
Navigation: simple `useState` stack — no Expo Router or React Navigation needed for this scope.

---

### Phase 11 — NativeWind + UI Polish

NativeWind v4 setup for Expo:
1. `global.css` with `@tailwind` directives
2. `tailwind.config.js` with `presets: [require('nativewind/preset')]`
3. `babel.config.js` — `jsxImportSource: 'nativewind'` + `react-native-reanimated/plugin`
4. `metro.config.js` wrapped with `withNativeWind({ input: './global.css' })`
5. `tsconfig.json` adds `"types": ["nativewind/types"]`

All screens rewritten to use `className` props. Added pull-to-refresh (`RefreshControl`) and `AddItemModal` (React Native `Modal` with title + quantity fields).

---

## Challenges

### 1. Tailwind v3 vs v4 Version Conflict

**Problem:** The web app uses Tailwind CSS v4 (`@tailwindcss/vite`). NativeWind v4 requires Tailwind CSS v3. When the mobile app was added to the workspace, npm hoisted Tailwind v3 to the root `node_modules`, replacing v4. The web build broke with:

```
SyntaxError: Named export 'compileAst' not found.
The requested module 'tailwindcss' is a CommonJS module...
```

**Root cause:** `compileAst` is a Tailwind v4 API. After npm hoisted v3, the web's `@tailwindcss/vite` plugin couldn't find it.

**Solution:** Pin Tailwind v4 explicitly in the **root** `package.json` devDependencies:
```json
{
  "devDependencies": {
    "tailwindcss": "^4.1.18"
  }
}
```

npm's hoisting algorithm now keeps v4 at the root (used by the web app) and installs v3 in `apps/mobile/node_modules/` (used by NativeWind). Both coexist at the file-system level — but there's a second problem.

**Second problem:** NativeWind is hoisted to root `node_modules/nativewind/` (because multiple workspaces depend on it). When Metro runs NativeWind's metro plugin at startup, `require('tailwindcss')` resolves from nativewind's directory upward — finding v4 at root, not v3 in `apps/mobile/node_modules/`. This causes:

```
Error: NativeWind only supports Tailwind CSS v3
    at tailwindConfig (node_modules/nativewind/src/metro/tailwind/index.ts:20:11)
```

**Solution:** Use a `postinstall` script to force-install tailwindcss@3 nested _inside_ nativewind's own `node_modules/`, so Node.js module resolution finds it first:

```json
{
  "scripts": {
    "postinstall": "npm install --prefix node_modules/nativewind tailwindcss@^3.4.19 --no-save 2>/dev/null || true"
  },
  "overrides": {
    "nativewind": {
      "tailwindcss": "^3.4.19"
    }
  }
}
```

The `overrides` field documents intent; the `postinstall` script enforces it by creating `node_modules/nativewind/node_modules/tailwindcss/` which wins the Node module resolution race.

**Key insight:** npm hoisting is workspace-wide. When two packages in the same workspace require different _incompatible_ major versions of the same dependency, and one of those packages (nativewind) is also hoisted to root, no amount of workspace-level configuration fixes the resolution path for the hoisted package. The only reliable solution is a nested `node_modules` inside nativewind itself.

---

### 2. TypeScript Type Casts in Supabase Package

**Problem:** The supabase CRUD files used type casts like:
```ts
const space = row.spaces as { name: string; color: string }
```
These compiled fine under Vite (which doesn't run `tsc`, only transpiles), but failed under `tsc --noEmit` run by the mobile app's TypeScript check:

```
error TS2352: Conversion of type '{ name: any; color: any; }[]' to type
'{ name: string; color: string; }' may be a mistake...
```

The Supabase JS client types Postgres join results as arrays in some cases (even for `!inner` joins), making the direct cast unsafe.

**Solution:** Add `unknown` as an intermediate cast:
```ts
const space = row.spaces as unknown as { name: string; color: string }
```

**Key insight:** Vite's build silently ignores these errors. Running `tsc --noEmit` on the mobile app exposed type errors that had always existed in the packages. The mobile app effectively gave us a free type audit of the shared packages.

---

### 3. Metro Can't Find Workspace Packages Without Configuration

**Problem:** After wiring up `@family/*` packages in `apps/mobile/package.json`, Metro couldn't resolve them at runtime. It looked only in `apps/mobile/node_modules/` and didn't know about the symlinked packages in the root `node_modules/@family/`.

**Solution:** Two settings in `metro.config.js`:
```js
config.watchFolders = [monorepoRoot]           // watch packages/* for file changes
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),   // local (mobile-specific)
  path.resolve(monorepoRoot, 'node_modules'),  // root (workspace-hoisted)
]
```

---

### 4. Metro + TypeScript Source Packages (No Build Step)

**Problem:** The packages export raw `.ts` files (`"exports": { ".": "./src/index.ts" }`). Metro's default `sourceExts` doesn't include `.ts` for files outside the project root.

**Solution:** Explicitly extend source extensions:
```js
config.resolver.sourceExts = [...config.resolver.sourceExts, 'ts', 'tsx']
```

Note: Modern Metro (bundled with Expo 55) handles `.ts` by default within the project root, but for files resolved from `watchFolders` paths the explicit extension list is needed.

---

### 5. Supabase Client Singleton Across Platforms

**Problem:** The original `lib/supabase.ts` read `import.meta.env` at module load time — a Vite-specific global that doesn't exist in React Native (Metro/Hermes).

**Solution:** The `initSupabase()` / `getSupabaseClient()` pattern defers client creation until explicitly called, accepts env vars as plain arguments, and throws a clear error if called before initialisation. Each platform's entry point calls `initSupabase()` with its own env var source before any hooks run.

The critical detail: the mobile app imports `'./src/lib/supabase'` as the **first** import in `App.tsx`, before any component renders, ensuring the client is ready before any TanStack Query hook fires.

---

### 6. Google OAuth Redirect Flow Differs on Mobile

**Problem:** Supabase's standard web OAuth flow uses `window.location` redirects, which don't exist in React Native.

**Solution:**
- `signInWithOAuth({ options: { skipBrowserRedirect: true } })` — returns the URL without redirecting
- Open it with `WebBrowser.openAuthSessionAsync(url, redirectUri)` — system browser handles the OAuth dance
- On success, parse the `access_token` and `refresh_token` from the callback URL fragment
- Call `supabase.auth.setSession()` to establish the session

The app needs a registered deep link scheme (`familyspace://`) in `app.json` for the callback URL to route back to the app.

---

### 7. Turbo Requiring `packageManager` Field

**Problem:** Running `npx turbo build` failed with:
```
Could not resolve workspaces. Missing `packageManager` field in package.json
```

Turbo 2.x requires the `packageManager` field to identify which package manager is managing the workspace.

**Solution:** Add to root `package.json`:
```json
{ "packageManager": "npm@10.9.4" }
```

---

## Package Dependency Graph

```
@family/types       ← no internal deps
@family/config      ← no internal deps
@family/utils       ← date-fns, @family/types
@family/api         ← no internal deps (pure fetch)
@family/supabase    ← @supabase/supabase-js, @family/types
@family/hooks       ← @family/api, @family/supabase, @family/types, @family/utils
                       peerDeps: react, @tanstack/react-query, sonner

apps/web            ← all packages, plus web-specific: tailwindcss v4, dnd-kit,
                       @tanstack/react-start, next-themes, etc.
apps/mobile         ← all packages, plus mobile-specific: expo, react-native,
                       nativewind, expo-auth-session, etc.
```

---

## Things That Stayed Web-Only

These were intentionally **not** extracted to shared packages:

| File | Reason |
|------|--------|
| `src/contexts/auth.tsx` | Uses `import.meta.env`, `window.location` — Vite/browser specific |
| `src/contexts/board.tsx` | Provides web-specific `familyId`/`calendarId` to hooks via context |
| `src/hooks/items/useItemMutations.ts` | Web wrapper that reads from board + auth contexts |
| `src/hooks/useIsDark.ts` | Uses `MutationObserver` on `<html>` element — browser only |
| `src/lib/utils.ts` (`cn()`) | Uses `tailwind-merge` — tailwind-specific |
| `src/lib/google-auth.ts` | Uses Supabase's web OAuth redirect pattern |
| `src/components/ui/*` | shadcn/ui — React DOM + Radix, not React Native |

---

## Running the Monorepo

```bash
# Install everything from root
npm install

# Build all apps
npx turbo build

# Run web app dev server
cd apps/web && npm run dev

# Run mobile app (iOS)
cd apps/mobile && npm run ios

# Type check everything
cd apps/web && npx tsc --noEmit
cd apps/mobile && npx tsc --noEmit
```
