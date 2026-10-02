@AGENTS.md

# Project rules (layered on top of AGENTS.md)

When a rule here conflicts with a vendored skill in `.claude/skills/`, this file wins — in particular, read
every `npx`/`npm install` in a vendored skill as `bunx` / `bunx expo install` (a hook denies npx and npm installs).

## Stack — fixed, do not swap without asking

Expo SDK 57 · React Native 0.86 · React 19.2 (React Compiler on) · TypeScript strict · Expo Router (`src/app`) ·
Uniwind (Tailwind 4) · Zustand · TanStack Query · React Hook Form + zod · MMKV · expo-secure-store ·
Sentry · Jest + React Native Testing Library · Maestro · EAS · **bun** (never npm/yarn/pnpm).

Runs in a **development build**, not Expo Go (MMKV, Sentry, keyboard-controller are native).
After adding a native dependency, rebuild: `bun run ios` / `bun run android`.

## Done means verified

Run `bun run verify` (typecheck + lint + jest) before saying a task is done, and paste the result.
For UI changes, also check the screen in the simulator (`app-tester` agent or agent-device MCP).
Never describe behaviour as working from reading code alone.

## Layout

```
src/app/            routes only (Expo Router). (app)/ = signed-in, guarded in _layout.tsx
src/components/ui/  design-system primitives: Screen, Text, Button, TextField
src/services/api/   client.ts (request → ApiResult, never throws), one file per resource
src/stores/         Zustand stores (auth-store: token in SecureStore)
src/lib/            storage (MMKV), query-client, crash-reporting, cn
src/config/env.ts   zod-validated EXPO_PUBLIC_* env
src/global.css      design tokens (light + dark)
.maestro/           E2E flows            .eas/workflows/  CI on EAS
```

## Conventions

- **Components:** named functions; `ref` as a prop (no `forwardRef`, no `React.FC`); no `useMemo`/`useCallback`/`memo`.
  Use `@/components/ui` instead of raw RN `Text`/`TextInput`/`Button` (ESLint enforces it).
- **Styling:** Uniwind `className` + semantic tokens only (`bg-surface`, `text-muted`, `bg-primary`). No hex, no Tailwind
  palette colours. New tokens go in **both** `@variant light` and `@variant dark` in `src/global.css`. Merge with `cn()`.
- **Data:** TanStack Query hooks over `requestOrThrow` + a zod schema. Never `useEffect` + `fetch`. Handle every
  state: loading, error, empty, success. See the `api-endpoint` skill.
- **Lists:** FlashList for unbounded data. Never `ScrollView` + `.map`.
- **Storage:** secrets/tokens → `expo-secure-store`; everything else → `@/lib/storage`. Never AsyncStorage.
- **Types:** no `any`, no `as` to silence errors — fix the type or widen the zod schema.
- **Files:** kebab-case. Imports via `@/`.

## Testability (non-negotiable)

Every interactive element has a unique kebab-case `testID` (`<screen>-<element>`) plus `accessibilityRole` and
`accessibilityLabel` — `Button` and `TextField` require `testID` at the type level. Maestro and agent-device
select by testID; label text is unreliable in React Native. New logic in `src/services|stores|lib` gets a Jest test.

## Env and secrets

- `EXPO_PUBLIC_*` is inlined into the bundle in plain text: publishable values only. Real secrets live on a server.
- Read each var as a literal `process.env.EXPO_PUBLIC_X` (destructuring breaks inlining). Add it to `src/config/env.ts`
  and `.env.example`. Never commit `.env*` (only `.env.example`).
- `.env` is local only. EAS builds read EAS environment variables; `app.config.ts` fails preview/production builds
  that lack `EXPO_PUBLIC_API_URL`, and `env.ts` requires https outside development.
- `src/app/sign-in.tsx` is a mock that accepts any credentials and refuses production builds — replace it
  with the real auth provider before release.

## Native, builds, releases

- `ios/` and `android/` are generated — change native behaviour in `app.config.ts` or a config plugin.
- Variants: `APP_ENV=development|preview|production` → separate bundle ids and names (`app.config.ts`, `eas.json`).
- OTA: `runtimeVersion` uses the `fingerprint` policy; publish to the channel matching the build profile.
  EAS Update is off until `EAS_PROJECT_ID` is set in `app.config.ts`.
- The URL `scheme` must stay lowercase (uppercase breaks EAS Update).

## Gotchas found in this template

- `bunx expo install pkg -- --dev`: package names go **before** `--`. Names after it skip Expo's version resolution.
- TypeScript 6 no longer auto-loads `@types/*`: add to `compilerOptions.types` (jest is there already).
- `expo-env.d.ts` and `src/uniwind-types.d.ts` are generated and gitignored; `src/types/*.d.ts` keeps `tsc` working on a
  fresh clone and in CI.
- Uniwind `className` does not reach third-party components — wrap them with `withUniwind()` or use a styled inner View.
  This includes `SafeAreaView` from react-native-safe-area-context: it typechecks but is silently unstyled
  (`Screen` uses `useSafeAreaInsets()` padding for that reason).
- Expo replaces global `fetch` with `expo/fetch`: network failures are `FetchError` (not `TypeError`) and the
  abort reason sits in `error.cause` — `problemFromError` handles both.
- Tests that fail a query while signing out must set `gcTime: 0`, or the orphaned GC timer keeps Jest alive.
- React Compiler lint (`react-hooks/set-state-in-effect`) rejects setState called directly in an effect body.

## Agents and skills

| Use | When |
|---|---|
| `rn-reviewer` agent | before every commit/PR — give it the base branch, intent, and any agreed constraints |
| `mobile-security-auditor` agent | change touches auth, tokens, storage, deep links, env, network, permissions |
| `app-tester` agent | after UI/navigation changes — drives the simulator, then writes the Maestro flow |
| `new-screen`, `new-component`, `api-endpoint`, `e2e-flow`, `debug-rn` | project workflows |
| `expo-*`, `eas-*`, `react-native-*` skills | vendored upstream reference (see `.claude/skills/SOURCES.md`) |

## Git

Feature branches only (a hook blocks commits on main). Conventional commits: `type(scope): description`, ≤100 chars.
Run `rn-reviewer` before opening a PR.
