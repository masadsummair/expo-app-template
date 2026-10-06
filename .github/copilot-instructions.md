# Copilot instructions

The canonical project rules are in [`AGENTS.md`](../AGENTS.md). Read it first; the Copilot coding agent loads it
automatically. This file exists because Copilot code review may not follow that reference, so the review-critical rules
are repeated below. If they disagree with `AGENTS.md`, `AGENTS.md` wins and this file is stale — fix this file.

When reviewing a pull request, flag:

- `npm`, `yarn`, `pnpm` or `npx` usage anywhere (this repo uses `bun` and `bunx`; add packages with `bunx expo install`),
  and unpinned `@latest` runners (pinned CLIs run as `bunx --no-install <cli>`).
- Hand edits under `ios/` or `android/`, committed `.env*` files (only `.env.example` is allowed), and committed keystores,
  Firebase config files or API keys.
- Raw React Native `Text`/`TextInput`/`Button` instead of `@/components/ui`; hex or Tailwind palette colours or arbitrary
  values (`p-[13px]`) instead of tokens; `allowFontScaling={false}`; `forwardRef`, `React.FC`, `useMemo`/`useCallback`/`memo`.
- `useEffect` + `fetch` instead of TanStack Query; `queryKey`/`queryFn` written inline in a component; a `queryFn` that
  ignores TanStack's `signal`; a screen that does not render loading, error, empty and success.
- `ScrollView` + `.map` for unbounded lists; AsyncStorage; tokens stored anywhere except `expo-secure-store`; secrets in
  `EXPO_PUBLIC_*` variables.
- Fixed widths or heights on containers that hold text; tap targets under 44pt/48dp; a form's submit button that can be
  hidden by the keyboard (use the `Screen` `footer`).
- Interactive elements without a unique kebab-case `testID`, `accessibilityRole` and `accessibilityLabel`.
- `any` or `as` used to silence a type error; new logic in `src/services`, `src/stores` or `src/lib` without a Jest test.
- Edits to `.claude/skills/` without the regenerated `.agents/skills/` copy (`bun run skills:sync`).
