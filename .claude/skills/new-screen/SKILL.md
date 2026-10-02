---
name: new-screen
description: Create a new screen/route in this Expo Router app with the project's layout, states, and testIDs. Use when asked to add a screen, page, route, tab, or modal.
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

- `Screen` handles safe area and background. `preset="scroll"` for forms or long content (keyboard-aware).
  Use `edges={['bottom']}` when a native header is shown (the header already covers the top inset).
- Title via `<Stack.Screen options>` — no custom header components.

## Required

1. **Every state rendered:** loading, error (with retry), empty, and success. Data comes from a
   TanStack Query hook in `src/services/api/` (see the `api-endpoint` skill) — never `useEffect` + `fetch`.
2. **testIDs:** the screen root is `<screen>-screen`; interactive elements are `<screen>-<element>`,
   kebab-case, unique on the screen (`orders-retry`, `orders-row-${order.id}`).
3. **Lists:** `FlashList` from `@shopify/flash-list` for anything unbounded; never `ScrollView` + `.map`.
4. **Styling:** Uniwind `className` with semantic tokens only (`bg-surface`, `text-muted`). No hex colours.
5. **No manual memoisation** (`useMemo`/`useCallback`/`memo`) — React Compiler is on.

## Verify

`bun run verify`, then open the screen in the simulator with agent-device and check each state.
For a user-facing flow, add a Maestro flow (`e2e-flow` skill).
