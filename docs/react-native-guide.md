# React Native for Senior Web Developers

A practical guide written against this codebase. Every concept is explained by comparing it to what you already know from React/Next.js.

---

## Table of Contents

1. [The Mental Model Shift](#1-the-mental-model-shift)
2. [The Toolchain: What Replaces What](#2-the-toolchain-what-replaces-what)
3. [JSX Elements: No HTML Here](#3-jsx-elements-no-html-here)
4. [Styling: NativeWind and the Tailwind Bridge](#4-styling-nativewind-and-the-tailwind-bridge)
5. [Layout: Flexbox is the Only Model](#5-layout-flexbox-is-the-only-model)
6. [Navigation: No Router, Just State](#6-navigation-no-router-just-state)
7. [Lists: FlatList Instead of .map()](#7-lists-flatlist-instead-of-map)
8. [Modals and Sheets](#8-modals-and-sheets)
9. [Forms and the Keyboard Problem](#9-forms-and-the-keyboard-problem)
10. [Auth: OAuth Without a Browser](#10-auth-oauth-without-a-browser)
11. [Data Fetching: TanStack Query (Identical)](#11-data-fetching-tanstack-query-identical)
12. [The Build Pipeline: Metro, Babel, Expo](#12-the-build-pipeline-metro-babel-expo)
13. [Monorepo Integration: How Shared Code Works](#13-monorepo-integration-how-shared-code-works)
14. [Platform-Specific Code](#14-platform-specific-code)
15. [Things That Don't Exist in React Native](#15-things-that-dont-exist-in-react-native)
16. [Cheat Sheet: Web → Native Equivalents](#16-cheat-sheet-web--native-equivalents)

---

## 1. The Mental Model Shift

On the web, your React components produce HTML elements that a browser renders using CSS and the DOM. The browser gives you layout (block/inline/flex/grid), input handling, scroll, history, and a URL bar for free.

React Native produces **no HTML**. Instead your components describe a **native view hierarchy** — actual iOS `UIView`s and Android `View`s, compiled and rendered by the platform's native UI engine. The JavaScript you write runs in a separate JS thread (Hermes engine by default) and communicates with the native side over a bridge.

This has two practical consequences for you:

1. **No browser APIs.** No `document`, `window`, `localStorage`, `fetch` (well, `fetch` is polyfilled), no CSS files, no `<div>`, no `<input>`, no `href`. Everything is an abstraction over native views.

2. **Performance is different.** Animations and gestures must stay off the JS thread to feel smooth — that's why `react-native-reanimated` exists (it runs animation logic on the UI thread in C++).

Everything else — React itself, hooks, context, TanStack Query, Supabase JS, TypeScript — is **identical**. The React you know works exactly the same way.

---

## 2. The Toolchain: What Replaces What

| Web (your stack)           | React Native (this project)         | Why                                                        |
|----------------------------|-------------------------------------|------------------------------------------------------------|
| Vite / webpack             | **Metro**                           | Metro is RN's bundler; understands native modules          |
| Next.js / TanStack Start   | **Expo**                            | Expo is the meta-framework; manages native builds & SDKs   |
| Browser                    | **iOS Simulator / Android emulator / Expo Go** | The "browser" is the OS                      |
| `vite.config.ts`           | `metro.config.js`                   | Configure the bundler                                      |
| `next.config.js`           | `app.json`                          | Configure the app itself (name, icons, permissions)        |
| PostCSS / Lightning CSS    | **Babel**                           | Transforms JSX + TS (Metro calls Babel per file)           |
| npm / tsconfig paths       | `metro.config.js` resolver config   | Module resolution is Metro's job, not Node's              |

### Expo's Role

Expo is to React Native what Next.js is to React — a framework on top that gives you:
- A managed build pipeline (no need to touch Xcode project files)
- The Expo SDK: pre-built native modules (`expo-auth-session`, `expo-web-browser`, `expo-linking`)
- `expo start` dev server with hot reload
- Over-the-air updates in production

Without Expo you would write native Java/Kotlin and Swift/ObjC configuration files. Expo hides all of that.

---

## 3. JSX Elements: No HTML Here

Every HTML element has a React Native equivalent. These are imported from `react-native`:

```tsx
// Web                        // React Native
<div>                    →    <View>
<span> / <p>             →    <Text>
<button>                 →    <Pressable>  (or <TouchableOpacity>)
<input type="text">      →    <TextInput>
<img>                    →    <Image>
<ul> + .map()            →    <FlatList>  (see section 7)
<ScrollView>             →    <ScrollView>
```

**The critical rule:** Every string that is rendered to the screen **must** be inside a `<Text>` component. On the web, text can be a direct child of `<div>`. In React Native this throws a runtime error.

```tsx
// ✅ Correct
<View>
  <Text>Hello</Text>
</View>

// ❌ Runtime error
<View>
  Hello
</View>
```

**`Pressable` vs `button`:** `Pressable` is the modern touch target. It accepts `onPress` (equivalent to `onClick`) and `hitSlop` — a number that extends the touchable area beyond the visual bounds without changing layout. You'll see `hitSlop={8}` and `hitSlop={12}` throughout the app for small targets like back arrows.

```tsx
// apps/mobile/src/screens/ItemsScreen.tsx
<Pressable onPress={onBack} hitSlop={12}>
  <Text className="text-2xl text-gray-700">←</Text>
</Pressable>
```

---

## 4. Styling: NativeWind and the Tailwind Bridge

### How styling normally works in React Native (without NativeWind)

React Native has its own style system — JavaScript objects passed as props, not CSS strings:

```tsx
// Plain React Native styling (no NativeWind)
<View style={{ flexDirection: 'row', padding: 16, backgroundColor: '#fff' }}>
  <Text style={{ fontSize: 16, color: '#111827' }}>Hello</Text>
</View>
```

Properties are camelCase. There are no cascading styles, no selectors, no inherited styles (except `<Text>` inside `<Text>`). Every view is styled in isolation.

### What NativeWind does

NativeWind translates Tailwind class names into the React Native `style` objects at compile time. This means you write the same Tailwind classes you already know:

```tsx
// With NativeWind — exactly like web Tailwind
<View className="flex-row items-center px-4 py-3 bg-white">
  <Text className="text-base text-gray-900">Hello</Text>
</View>
```

Under the hood, `flex-row` becomes `{ flexDirection: 'row' }`, `px-4` becomes `{ paddingHorizontal: 16 }`, and so on. The mapping is 1:1 for layout and color utilities.

### NativeWind limitations vs web Tailwind

Not every Tailwind class maps to a native style. Things that don't exist in React Native:
- `hover:`, `focus:` variants (no pointer hover on mobile)
- `grid` and `grid-cols-*` (Flexbox only)
- `opacity-*` on hover states
- CSS custom properties / `var()`
- Pseudo-elements (`before:`, `after:`)

The `style` prop still works alongside `className` — use it for dynamic values that can't be expressed as static class names:

```tsx
// apps/mobile/src/screens/ItemsScreen.tsx
<View
  className="w-3.5 h-3.5 rounded-full"
  style={{ backgroundColor: space.color }}   // ← dynamic OKLCH value from DB
/>
```

### The NativeWind setup files

```
global.css          ← @tailwind base/components/utilities (the entry point)
tailwind.config.js  ← presets: [require('nativewind/preset')], content: your files
babel.config.js     ← jsxImportSource: 'nativewind' (makes className work)
metro.config.js     ← withNativeWind(config, { input: './global.css' })
```

The `jsxImportSource: 'nativewind'` in babel is the key — it replaces React's JSX factory so that `className` props are intercepted and compiled to native styles.

---

## 5. Layout: Flexbox is the Only Model

React Native has **only Flexbox**. There is no block, inline, grid, float, or position:absolute in the CSS sense (well, `position: 'absolute'` exists but works differently).

The key default that trips up web developers: **flex direction defaults to `column`, not `row`**. On the web, `display: flex` defaults to row. In React Native, `View` is already flex and defaults to column.

```tsx
// This stacks vertically (column is default):
<View>
  <Text>One</Text>
  <Text>Two</Text>
</View>

// This stacks horizontally:
<View className="flex-row">
  <Text>One</Text>
  <Text>Two</Text>
</View>
```

**`flex-1`** means "take all remaining space" — same as `flex: 1 1 0` on web. You'll see it everywhere because there's no `height: 100vh` or `width: 100%` that works reliably. The pattern for a full-screen layout is:

```tsx
// Full screen container
<View className="flex-1 bg-white">
  {/* Fixed header */}
  <View className="h-14 flex-row items-center px-4">...</View>

  {/* Scrollable content takes remaining space */}
  <FlatList className="flex-1" ... />
</View>
```

---

## 6. Navigation: No Router, Just State

On the web you have URLs and a router (TanStack Router, Next.js `useRouter`). In React Native there is no URL bar — navigation is explicit state management.

This project uses the simplest possible approach: a `useState` discriminated union in `App.tsx`:

```tsx
// apps/mobile/App.tsx
type Screen =
  | { name: 'login' }
  | { name: 'spaces' }
  | { name: 'items'; space: Space }   // ← carries data with it (no URL params needed)

function AppNavigator() {
  const [screen, setScreen] = useState<Screen>({ name: 'spaces' })

  if (screen.name === 'items') {
    return (
      <ItemsScreen
        space={screen.space}          // ← pass data directly as props
        onBack={() => setScreen({ name: 'spaces' })}
      />
    )
  }

  return <SpacesScreen onSelectSpace={(space) => setScreen({ name: 'items', space })} />
}
```

Notice that navigation data (which space was selected) is carried in the screen state — there's no URL param to parse. `onBack` is a callback prop instead of `router.back()`.

For more complex apps, the ecosystem has **React Navigation** (the standard) and **Expo Router** (file-based routing like Next.js, newer). This project doesn't need them because there are only three screens.

---

## 7. Lists: FlatList Instead of .map()

On the web you render lists with `.map()` inside JSX:

```tsx
// Web
{items.map(item => <ItemCard key={item.id} item={item} />)}
```

In React Native, this still works for **short lists**. But for any list that might scroll, you must use `<FlatList>`. The reason: `ScrollView` renders all its children at once (like a web scroll). `FlatList` is **virtualised** — it only renders items near the viewport, recycling off-screen views. On mobile, rendering 200 items at once is a memory and frame-rate problem.

```tsx
// apps/mobile/src/screens/SpacesScreen.tsx
<FlatList
  data={flat}                           // ← the array
  keyExtractor={(item) =>               // ← like React's `key` prop
    item.kind === 'header' ? `h-${item.title}` : item.space.id
  }
  renderItem={({ item }) => (           // ← render function (not .map)
    <SpaceCard space={item.space} />
  )}
  refreshControl={                      // ← pull-to-refresh built in
    <RefreshControl refreshing={isLoading} onRefresh={refetch} />
  }
  ListEmptyComponent={                  // ← shown when data is empty
    <Text>No spaces yet.</Text>
  }
  ListFooterComponent={                 // ← rendered after all items
    <CompletedSection items={done} />
  }
  contentContainerClassName="p-4 gap-2" // ← NativeWind on the inner container
/>
```

**Pull-to-refresh** is native and free — wrap your refetch function in `<RefreshControl>` and pass it to `refreshControl`. There's no web equivalent you'd build manually.

**`ListFooterComponent`** is used in `ItemsScreen` to render the "Done" section below the active items — it avoids nesting a second scrollable inside the first (which is a common mistake).

---

## 8. Modals and Sheets

On the web you'd use a `<dialog>` element, a library like Radix/shadcn Sheet, or a portal. React Native has a built-in `<Modal>` component:

```tsx
// apps/mobile/src/components/AddItemModal.tsx
<Modal
  visible={showAdd}              // controlled visibility
  animationType="slide"          // 'none' | 'slide' | 'fade'
  presentationStyle="pageSheet"  // iOS: half-sheet from bottom
  onRequestClose={onClose}       // Android back button
>
  <View className="flex-1 bg-white">
    {/* content */}
  </View>
</Modal>
```

`presentationStyle="pageSheet"` gives you the iOS bottom sheet (half-screen) that you see in Apple's own apps. It's a native presentation, not a CSS animation.

`onRequestClose` is Android's back button handler — always provide it or the back button does nothing.

---

## 9. Forms and the Keyboard Problem

The mobile keyboard slides up from the bottom and covers the screen. If your form is near the bottom, the keyboard covers the input the user is typing into. This is the single most annoying React Native beginner problem.

The fix is `<KeyboardAvoidingView>`:

```tsx
// apps/mobile/src/components/AddItemModal.tsx
<KeyboardAvoidingView
  behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
  className="flex-1 bg-white"
>
  {/* form content */}
</KeyboardAvoidingView>
```

The `behavior` prop differs by platform:
- **iOS**: `'padding'` — adds padding to the bottom of the view equal to keyboard height
- **Android**: `'height'` — shrinks the view's height

`Platform.OS` is a string: `'ios'` | `'android'` | `'web'`. It's a runtime check, not a compile-time one.

**`TextInput`** props that have no web equivalent:

```tsx
<TextInput
  onChangeText={setTitle}       // ← fires on every keystroke (not onChange + e.target.value)
  returnKeyType="next"          // ← label on the keyboard's return key: 'done' | 'next' | 'go'
  onSubmitEditing={handleAdd}   // ← fires when return key is pressed
  autoFocus                     // ← same as web
  placeholderTextColor="#9ca3af" // ← placeholder color is a prop, not CSS
/>
```

`onChangeText` receives the new string value directly — no synthetic event object, no `e.target.value`. Much cleaner than the web.

---

## 10. Auth: OAuth Without a Browser

On the web, Google OAuth is a browser redirect: you navigate to Google's URL, Google redirects back to your app's URL, you read the token from the URL. The browser owns the URL bar so this is trivial.

On mobile there is no URL bar. The flow has to be different:

```
1. Call supabase.auth.signInWithOAuth({ skipBrowserRedirect: true })
   → Supabase returns the Google auth URL but does NOT open it

2. Open it in a secure in-app browser via WebBrowser.openAuthSessionAsync()
   → A Safari/Chrome sheet slides up within the app
   → User authenticates with Google
   → Google redirects to familyspace://auth (a deep link scheme, not a URL)

3. The OS sees familyspace:// and sends control back to the app
   → openAuthSessionAsync() resolves with the full redirect URL

4. Parse the URL fragment (?access_token=...&refresh_token=...)
   → Call supabase.auth.setSession({ access_token, refresh_token })
   → Supabase stores the tokens; auth state updates
```

The **deep link scheme** (`familyspace://`) is registered in `app.json`:
```json
{ "expo": { "scheme": "familyspace" } }
```

This tells iOS and Android: when a URL starting with `familyspace://` is opened (from a browser or another app), launch this app.

`makeRedirectUri({ scheme: 'familyspace', path: 'auth' })` builds `familyspace://auth` from these pieces.

```tsx
// apps/mobile/src/contexts/auth.tsx
async function signInWithGoogle() {
  const redirectUri = makeRedirectUri({ scheme: 'familyspace', path: 'auth' })

  // Step 1: get the OAuth URL without redirecting
  const { data } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: redirectUri, skipBrowserRedirect: true },
  })

  // Step 2: open in an in-app browser
  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri)
  if (result.type !== 'success') return

  // Step 3 & 4: parse tokens and set session
  const params = Linking.parse(result.url).queryParams as Record<string, string>
  await supabase.auth.setSession({
    access_token: params['access_token'],
    refresh_token: params['refresh_token'],
  })
}
```

Session persistence is handled by Supabase JS automatically (using `AsyncStorage` under the hood on React Native).

---

## 11. Data Fetching: TanStack Query (Identical)

This is the one area that is **completely identical** to your web code. `useQuery`, `useMutation`, `useQueryClient`, `invalidateQueries`, optimistic updates — all of it works the same way.

The shared hooks in `packages/hooks` (e.g. `useSpaces`, `useItems`, `useItemMutationsCore`) are imported and used in the mobile screens exactly as they would be in the web app:

```tsx
// apps/mobile/src/screens/ItemsScreen.tsx
const { data: items = [], isLoading, refetch } = useItems(space.id)
const { complete, reAdd } = useItemMutationsCore(space.id, {
  calendarId: null,
  getToken: () => Promise.resolve(null),  // ← no Google Calendar on mobile yet
})
```

`QueryClientProvider` wraps the app in `App.tsx` exactly as it does in the web `__root.tsx`.

---

## 12. The Build Pipeline: Metro, Babel, Expo

Understanding this chain explains every config file in the project.

```
Your .tsx file
     ↓
  Babel          ← babel.config.js
  - Strips TypeScript
  - Converts JSX (with nativewind jsxImportSource)
  - Applies reanimated worklet transforms
     ↓
  Metro          ← metro.config.js
  - Bundles all files
  - Resolves monorepo packages via watchFolders + nodeModulesPaths
  - Processes global.css through NativeWind → generates native StyleSheets
     ↓
  Expo runtime
  - Serves the bundle to the iOS/Android JS engine (Hermes)
  - Manages native module linking
  - Hot reloads on file change
```

### `metro.config.js` — the key monorepo settings

```js
const monorepoRoot = path.resolve(projectRoot, '../..')

config.watchFolders = [monorepoRoot]
// Without this: Metro doesn't watch packages/* for changes.
// Changes to @family/hooks won't hot-reload in the app.

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
]
// Without this: `import { useSpaces } from '@family/hooks'` fails
// because Metro can only see apps/mobile/node_modules.

config.resolver.sourceExts = [...config.resolver.sourceExts, 'ts', 'tsx']
// Without this: Metro won't process the raw .ts files in packages/*.
// (Packages don't compile to JS — they export source directly.)
```

### `babel.config.js`

```js
presets: [['babel-preset-expo', { jsxImportSource: 'nativewind' }]],
plugins: ['react-native-reanimated/plugin'],
```

`jsxImportSource: 'nativewind'` — replaces the default React JSX factory with NativeWind's. This is what makes `className="flex-row"` work on `<View>`. Without it, React Native ignores the `className` prop entirely.

`react-native-reanimated/plugin` — Reanimated's Babel plugin transforms worklet functions (code that runs on the UI thread). This must come last.

### `app.json`

The equivalent of your Next.js/Expo project manifest. This is what Expo reads to configure the native app — not your bundle, but the native shell:
- App name, icon, splash screen
- `scheme` — the deep link URL scheme
- `plugins` — native code that needs to be linked (e.g. `expo-web-browser` adds an intent filter on Android)

---

## 13. Monorepo Integration: How Shared Code Works

The packages (`@family/types`, `@family/hooks`, etc.) export **raw TypeScript source** — there's no build step, no `dist/` folder. This is non-standard but works because both Vite (web) and Metro (mobile) can transpile TypeScript themselves.

Each package's `package.json` points directly to the source:
```json
{ "exports": { ".": "./src/index.ts" } }
```

For the web app, Vite reads this and transpiles on the fly. For the mobile app, Metro reads this and Babel transpiles each file as it's bundled.

The mobile `tsconfig.json` has path aliases that mirror the package exports:
```json
{
  "paths": {
    "@family/types": ["../../packages/types/src/index.ts"],
    "@family/hooks": ["../../packages/hooks/src/index.ts"]
  }
}
```

TypeScript uses these paths for type-checking. Metro uses `nodeModulesPaths` for actual module resolution at runtime. Both point to the same files.

---

## 14. Platform-Specific Code

Sometimes you need different implementations for iOS vs Android. React Native provides two mechanisms:

### Runtime check

```tsx
import { Platform } from 'react-native'

<KeyboardAvoidingView
  behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
>
```

### Platform-specific files

Metro picks the right file automatically based on the target platform:

```
MyComponent.ios.tsx     ← used on iOS
MyComponent.android.tsx ← used on Android
MyComponent.tsx         ← fallback for both (and web)
```

This project doesn't use platform files yet, but you'd reach for them if iOS and Android need fundamentally different UIs for the same screen.

### Safe Area Insets

Mobile screens have notches (iPhone), punch-holes (Android), and home indicators. Content that extends into these areas is hidden or obscured.

The app currently uses `pt-14` (56px top padding) on screen headers as a hardcoded safe area approximation:

```tsx
<View className="flex-row items-center pt-14 pb-4 px-4">
```

The proper solution is `react-native-safe-area-context` which gives you the exact inset values for the current device. That's a future improvement.

---

## 15. Things That Don't Exist in React Native

Coming from the web, these are the most common "where did it go?" moments:

| Web concept                | React Native reality                                    |
|----------------------------|---------------------------------------------------------|
| `document` / `window`      | Does not exist. Use `Dimensions` API for screen size.   |
| `localStorage`             | Use `AsyncStorage` (async key-value store)              |
| CSS files / `import './styles.css'` | Does not exist. Styles are JS objects or NativeWind. |
| `<a href>` / `Link`        | Use `Linking.openURL(url)` for external URLs            |
| `useRouter` / URL params   | State + props (or React Navigation)                     |
| Browser history / back     | Manual state management                                 |
| `z-index`                  | Render order determines stacking (later = on top)       |
| `cursor: pointer`          | No cursor on mobile                                     |
| `overflow: hidden` on scroll | `FlatList` / `ScrollView` handles this                |
| Dev tools in browser       | Expo Dev Tools, Flipper, or React Native Debugger       |
| `console.log`              | Works — shows in Metro terminal and Expo Go             |
| Hot reload                 | Works — Metro watches files and reloads instantly       |

---

## 16. Cheat Sheet: Web → Native Equivalents

### Components

| Web                           | React Native                      |
|-------------------------------|-----------------------------------|
| `<div>`                       | `<View>`                          |
| `<p>`, `<span>`, `<h1>`       | `<Text>`                          |
| `<button>`                    | `<Pressable>`                     |
| `<input type="text">`         | `<TextInput>`                     |
| `<img>`                       | `<Image source={{ uri: '...' }}>` |
| `<ul>` + `.map()`             | `<FlatList>`                      |
| `<div style="overflow:auto">` | `<ScrollView>`                    |
| `<dialog>` / Sheet            | `<Modal>`                         |
| `<form>`                      | `<View>` + `<KeyboardAvoidingView>` |

### Events

| Web                  | React Native              |
|----------------------|---------------------------|
| `onClick`            | `onPress`                 |
| `onChange`           | `onChangeText` (TextInput)|
| `onSubmit`           | `onSubmitEditing`         |
| `onMouseEnter`       | ❌ (no hover)             |

### Styles

| Web CSS              | React Native / NativeWind |
|----------------------|---------------------------|
| `display: flex`      | default (View is always flex) |
| `flex-direction: row`| `className="flex-row"`    |
| `padding: 16px`      | `className="p-4"`         |
| `color: #111`        | `className="text-gray-900"` (on `<Text>`) |
| `background-color`   | `className="bg-white"`    |
| Dynamic value        | `style={{ color: space.color }}` |

### APIs

| Web                  | React Native                        |
|----------------------|-------------------------------------|
| `window.open(url)`   | `Linking.openURL(url)`              |
| `localStorage`       | `AsyncStorage`                      |
| `window.innerWidth`  | `Dimensions.get('window').width`    |
| `fetch`              | `fetch` (polyfilled, same API)      |
| `window.location`    | `Linking.getInitialURL()`           |

---

## How This App is Structured (End-to-End)

```
App.tsx
├── import './src/lib/supabase'   ← calls initSupabase() with EXPO_PUBLIC_ env vars
├── import './global.css'          ← NativeWind processes Tailwind, generates StyleSheets
├── QueryClientProvider            ← TanStack Query (identical to web)
├── AuthProvider                   ← Supabase session + Google OAuth flow
└── AppNavigator                   ← useState screen stack (no router)
    ├── LoginScreen                ← Google sign-in via expo-web-browser
    ├── SpacesScreen               ← FlatList of spaces, useSpaces() hook
    └── ItemsScreen                ← FlatList of items, useItems() + useItemMutationsCore()
        └── AddItemModal           ← Modal + KeyboardAvoidingView + TextInput
```

All data logic (`useSpaces`, `useItems`, `useItemMutationsCore`, Supabase CRUD) is in shared packages. The mobile app contributes only: native component wrappers, the auth flow, and navigation state. Adding a new screen follows the same pattern as adding a route in the web app — the data layer is already there.
