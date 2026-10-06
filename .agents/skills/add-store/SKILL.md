---
name: add-store
description: Add a Zustand store for client-owned state (preferences, onboarding flags, drafts), optionally persisted to MMKV, with tests. Use when asked for global/shared client state or a persisted setting. Do NOT use for server data (use a TanStack Query hook, see api-endpoint), tokens (use the auth-store pattern), or state one screen owns (useState).
---

# Add store

## Decide first

| State is... | Use |
|---|---|
| Fetched from the API, cacheable, needs refetch/invalidate | TanStack Query hook (`api-endpoint`) — **not** a store |
| Owned by one component or screen | `useState` |
| Shared across screens, client-owned (theme, onboarding done, draft that survives navigation) | Zustand store (this skill) |
| Survives app restart, non-sensitive | Zustand + `persist` on MMKV (below) |
| Token, credential, PII | `expo-secure-store` via the `src/stores/auth-store.ts` pattern. **Never** MMKV |

Never copy server data into a store: it duplicates the Query cache and goes stale.

## Plain store

One file per domain: `src/stores/<name>-store.ts` plus `<name>-store.test.ts` (required).

- `create<State>()((set, get) => ...)`; state and actions in one typed `State`.
- Subscribe with selectors: `useStore((s) => s.x)`. Never `useStore()` whole.
- A selector returning a new object/array each call loops forever in Zustand 5: wrap it in
  `useShallow` from `zustand/react/shallow`.
- No `AsyncStorage`, no manual memoisation.

## Persisted store (MMKV, synchronous)

1. `src/lib/storage.ts` already exports the MMKV adapter. Import it, do not redefine it:
   `import { zustandStorage } from '@/lib/storage';`
2. Wrap the creator. Persisted data is `unknown` when `migrate` sees it, so parse it with zod (no `as` casts):

```ts
import { z } from 'zod';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { zustandStorage } from '@/lib/storage';

const PersistedSchema = z.object({
  theme: z.enum(['system', 'light', 'dark']).default('system'),
  seenTips: z.array(z.string()).default([]),
});

type PrefsState = z.infer<typeof PersistedSchema> & {
  setTheme: (theme: PrefsState['theme']) => void;
  markTipSeen: (id: string) => void;
};

export const usePrefsStore = create<PrefsState>()(
  persist(
    (set) => ({
      theme: 'system',
      seenTips: [],
      setTheme: (theme) => set({ theme }),
      markTipSeen: (id) => set((s) => (s.seenTips.includes(id) ? s : { seenTips: [...s.seenTips, id] })),
    }),
    {
      name: 'prefs.v1',
      version: 1,
      storage: createJSONStorage(() => zustandStorage),
      // Older or corrupt data is parsed into the current shape; anything unreadable falls back to defaults.
      migrate: (persisted) => {
        const result = PersistedSchema.safeParse(persisted);
        return result.success ? result.data : PersistedSchema.parse({});
      },
      partialize: ({ theme, seenTips }) => ({ theme, seenTips }),
      // `migrate` runs only when the stored version differs, so validate on every hydrate too: a corrupt
      // value saved under the current version must not reach the store (see src/stores/theme-store.ts).
      merge: (persisted, current) => {
        const result = PersistedSchema.safeParse(persisted);
        return result.success ? { ...current, ...result.data } : current;
      },
    },
  ),
);
```

Rules:
- `partialize` to data only — no actions, no `loading`/`error` flags, or the app boots into a stale state.
- Change the persisted shape => bump `version` and extend `migrate`. Without `migrate`, Zustand
  silently **discards** stored data of an older version.
- `merge` as above also covers nested objects: the default merge is shallow, so a nested default would be
  replaced wholesale by an older stored value.
- MMKV is synchronous, so hydration finishes at creation: no `hasHydrated` flag or loading gate.
  Add `onRehydrateStorage` + a flag only for async storage.
- Non-sensitive only. The MMKV instance is unencrypted.

## Test

This repo's Jest setup (`test/setup.ts`) does not mock `react-native-mmkv`, so a test importing a
persisted store must mock `@/lib/storage` (the native module throws otherwise). Pattern:

```ts
import { storage } from '@/lib/storage';

import { usePrefsStore } from './prefs-store';

jest.mock('@/lib/storage', () => {
  const data = new Map<string, string>();
  return {
    storage: {
      getString: (key: string) => data.get(key),
      set: (key: string, value: string) => void data.set(key, value),
      remove: (key: string) => data.delete(key),
      clearAll: () => data.clear(),
    },
    zustandStorage: {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => void data.set(key, value),
      removeItem: (key: string) => void data.delete(key),
    },
  };
});

beforeEach(() => {
  storage.clearAll();
  usePrefsStore.setState(usePrefsStore.getInitialState(), true); // true = replace, resets actions too
});

it('persists data but not actions', () => {
  usePrefsStore.getState().setTheme('dark');
  expect(JSON.parse(storage.getString('prefs.v1') ?? '{}')).toEqual({
    state: { theme: 'dark', seenTips: [] },
    version: 1,
  });
});

it('migrates v0 data instead of dropping it', async () => {
  storage.set('prefs.v1', JSON.stringify({ state: { theme: 'light' }, version: 0 }));
  await usePrefsStore.persist.rehydrate();
  expect(usePrefsStore.getState().theme).toBe('light');
});
```

Unpersisted stores need only the `setState(getInitialState(), true)` reset and
`getState()` calls — no rendering. Follow `src/stores/auth-store.test.ts`. If other stores also need
MMKV, move the mock into `test/setup.ts` instead of repeating it.

## Verify

`bun run verify`. Persisted store: also kill and relaunch the app on a device and confirm the value survives.
