# Stack and what's in the app

## What's in the app

| Part | Details |
|---|---|
| UI kit (`@/components/ui`) | Screen, Text, Button, TextField, FormError, Card, Divider, ListItem, Icon, Image, Avatar, Badge, Switch, LoadingView, EmptyState, ErrorState, RefreshableList, PressableScale, SheetHeader. Each has a testID, accessibility role and label, 44pt/48dp tap targets and both themes. |
| Screens | mock sign-in (keyboard flow, inline validation), Home, Settings (theme, sign out, delete account with confirmation), About form sheet, route error boundaries, offline banner |
| Layout | `Screen` caps content at 576dp and centres it on tablets and foldables, applies safe-area insets on every side, and pins a form's main button above the keyboard. Checked at 360dp, 800dp, iPhone SE and large text. |
| Helpers (`src/lib`) | API client (typed results, cancellable, refuses other hosts and `..` paths), error messages, toast and confirm, haptics, motion presets, screen-reader announcements, analytics adapter, crash reporting, storage |
| Hooks (`src/hooks`) | online status, refresh on focus, debounced value, OTA update check |
| Config | zod-validated env (`src/config/env.ts`), feature flags, three variants (development, preview, production) with their own bundle ids, iOS privacy manifest, export-compliance flag |

## Tools by category

### App framework

| Tool | What it does here |
|---|---|
| Expo SDK 57 | native modules, config plugins, development builds (not Expo Go) |
| React Native 0.86 · React 19.2 | New Architecture, Hermes, React Compiler (no manual memoisation) |
| TypeScript (strict) | the whole app, scripts and hooks |
| Expo Router | file-based routes in `src/app`, native Stack, `Stack.Protected` auth guard, native form sheets |

### UI, styling and motion

| Tool | What it does here |
|---|---|
| Uniwind (Tailwind 4) | `className` styling with light/dark design tokens in `src/global.css` |
| Reanimated 4 + Worklets | animations, with presets in `src/lib/motion.ts` that follow reduce-motion |
| Gesture Handler | gestures and the root gesture view |
| react-native-keyboard-controller | keyboard-aware scrolling and a footer pinned above the keyboard |
| react-native-safe-area-context | safe-area insets (Android is edge-to-edge) |
| FlashList | long lists, with pull to refresh |
| expo-image | images with caching and recycling |
| expo-symbols | icons: SF Symbols on iOS, Material Symbols on Android |
| sonner-native + react-native-svg | toasts |
| expo-haptics | haptics with native constants per platform |
| expo-splash-screen · expo-status-bar · expo-system-ui | splash, status bar and root background per theme |

### Data, state and forms

| Tool | What it does here |
|---|---|
| TanStack Query | server data, wired to network status and app focus |
| zod | validates API responses, env vars, forms and persisted state |
| Zustand | client state (auth, theme) |
| react-native-mmkv | fast local storage for persisted state |
| expo-secure-store | the auth token (device-only) |
| React Hook Form + `@hookform/resolvers` | forms with zod validation |
| expo-network | online/offline detection and the offline banner |

### Errors, updates and app info

| Tool | What it does here |
|---|---|
| Sentry (`@sentry/react-native`) | crash reporting, on only when `EXPO_PUBLIC_SENTRY_DSN` is set |
| expo-updates | OTA updates with an in-app "Restart" prompt |
| expo-constants · expo-linking · expo-font | app version, deep links, icon font preloading |

### Build and release

| Tool | What it does here |
|---|---|
| EAS Build / Submit / Update (`bun run eas`) | cloud builds, store submission, OTA updates; eas-cli pinned to one version |
| expo-dev-client | the development build you run day to day |
| expo-build-properties | R8 minification and resource shrinking for Android release builds |
| `@expo/fingerprint` | runtime versions and the "native change, no OTA" gate |
| expo-doctor | dependency and config checks |

### Testing and quality

| Tool | What it does here |
|---|---|
| Jest + React Native Testing Library | unit and component tests |
| tester-army `e2e` | on-device e2e tests and the `e2e` MCP server (agents drive the device) |
| ESLint (expo config) | lint, including React Compiler rules |
| `scripts/check-contrast.ts` | WCAG AA contrast for every colour pair, both themes |
| `scripts/check-privacy-manifest.ts` | iOS privacy-manifest reasons for every native dependency |
| `scripts/check-docs.ts` · `scripts/lint-claude.ts` | docs match the repo; skills and agents are valid |

### Repo

| Tool | What it does here |
|---|---|
| bun | package manager and script runner (never npm, yarn or pnpm) |
| git pre-commit hook (`.githooks/pre-commit`) | runs `bun run verify` before every commit; turned on by `bun install` |
| `.gitattributes` · `.editorconfig` | LF line endings, so Windows checkouts don't break scripts |
