---
name: new-screen
description: Create a new screen/route in this Expo Router app with the project's layout, states, and testIDs. Use when asked to add a screen, page, route, tab, or modal. Do not use for a whole feature with data and tests (use new-feature) or for a reusable component (use new-component).
---

# New screen

Routes live in `src/app/` (Expo Router, typed routes on). Read the `expo-router` skill for navigation
APIs (stacks, tabs, modals, `formSheet`, params) — this skill covers the project conventions.

## Where the file goes

| Screen is for | Path |
|---|---|
| Signed-in users | `src/app/(app)/<name>.tsx` — protected by `Stack.Protected` in `src/app/_layout.tsx` |
| Signed-out users (auth flow) | `src/app/<name>.tsx`, then add a `Stack.Screen` inside the `signed-out` guard |
| Dynamic segment | `src/app/(app)/<resource>/[id].tsx`, read with `useLocalSearchParams<{ id: string }>()` |

File names are kebab-case. Routes contain **screen composition only** — components go in
`src/components/`, data access in `src/services/`, state in `src/stores/`.

## Template

```tsx
import { Stack } from 'expo-router';

import { Screen, Text } from '@/components/ui';

export default function OrdersScreen() {
  return (
    <Screen testID="orders-screen" edges={['bottom']}>
      <Stack.Screen options={{ title: 'Orders' }} />
      <Text variant="heading">Orders</Text>
    </Screen>
  );
}
```

- `Screen` handles safe area and background, caps content at `max-w-xl` (576dp) centred, and always applies
  left/right insets. `preset="scroll"` for forms or long content (keyboard-aware). `footer` pins a primary
  action above the keyboard. Use `edges={['bottom']}` when a native header is shown (the header already covers
  the top inset); `edges` only governs top/bottom.
- Title via `<Stack.Screen options>` — no custom header components.
- A `formSheet` is exempt: it uses a plain `View` + `SheetHeader` (see `src/app/(app)/about.tsx`), not `Screen`.

## Required

1. **Every state rendered:** loading, error (with retry), empty, and success. Data comes from a
   TanStack Query hook in `src/services/api/` (see the `api-endpoint` skill, which has a complete screen) —
   never `useEffect` + `fetch`. Props of the state views (`@/components/ui`, all take a required `testID`):

   | Component | Props |
   |---|---|
   | `LoadingView` | `testID`, `label?` (default `Loading`, announced to screen readers) |
   | `ErrorState` | `testID`, `message`, `onRetry`, `retryLabel?`; retry button gets `${testID}-retry` |
   | `EmptyState` | `testID`, `title`, `message?`, `action?: { label, onPress }`; button gets `${testID}-action` |
   | `RefreshableList` | FlashList props plus required `testID`, `refreshing`, `onRefresh`; `ListEmptyComponent` for the empty state |

   Use `message={errorMessage(error)}` from `@/lib/error-message`, never raw error text. Pass
   `refreshing={isRefetching}` (not `isFetching`).
2. **testIDs:** the screen root is `<screen>-screen`; interactive elements are `<screen>-<element>`,
   kebab-case, unique on the screen (`orders-retry`, `orders-row-${order.id}`).
3. **Lists:** `RefreshableList` (FlashList) for anything unbounded; never `ScrollView` + `.map`.
4. **Styling:** Uniwind `className` with semantic tokens only (`bg-surface`, `text-muted`). No hex colours.
5. **No manual memoisation** (`useMemo`/`useCallback`/`memo`) — React Compiler is on.

## Layout rules

- Use `Screen`; it keeps content in a centred `max-w-xl` column, so nothing stretches edge to edge on a tablet,
  foldable or Android 16 window (Android ignores the portrait lock at 600dp and wider).
- No fixed pixel widths on containers that hold text; use flex, `%` or `max-w-*`. Use `min-h-*`, not `h-*`, so
  text can grow. No arbitrary values (`w-[220px]`), no `allowFontScaling={false}`.
- Icon-only controls need `min-h-12 min-w-12` (48dp). Fixed sizes are fine for icon and avatar boxes.
- Primary actions in a form go in `footer`, not at the bottom of a scroll view.

## Verify

`bun run verify`, then check the screen on a device with the `app-tester` agent (e2e MCP) in each state, and at:
360dp wide (Android: `adb shell wm size 360x640`), font scale 2 (`adb shell settings put system font_scale 2.0`),
and 600dp wide or more (a tablet AVD or the resizable emulator), in light and dark. Nothing may clip, overlap, or
sit under the keyboard. Reset with `adb shell wm size reset`, `adb shell wm density reset` and
`adb shell settings put system font_scale 1.0`. On iOS use an iPhone SE simulator and Larger Text.
For a user-facing flow, add an e2e test in `e2e/` (`e2e-flow` skill).
