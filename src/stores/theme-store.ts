import { Uniwind } from 'uniwind';
import { z } from 'zod';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { zustandStorage } from '@/lib/storage';

export const THEME_STORAGE_KEY = 'theme.v1';

const PersistedSchema = z.object({
  preference: z.enum(['system', 'light', 'dark']).default('system'),
});

export type ThemePreference = z.infer<typeof PersistedSchema>['preference'];

type ThemeState = {
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      preference: 'system',
      setPreference: (preference) => {
        set({ preference });
        // 'light' / 'dark' also call Appearance.setColorScheme, so the navigation theme follows.
        Uniwind.setTheme(preference);
      },
    }),
    {
      name: THEME_STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => zustandStorage),
      partialize: ({ preference }) => ({ preference }),
      migrate: (persisted) => {
        const result = PersistedSchema.safeParse(persisted);
        return result.success ? result.data : PersistedSchema.parse({});
      },
      // migrate only runs on a version change; validate every hydrate so a corrupt value saved under
      // the current version can't reach Uniwind.setTheme.
      merge: (persisted, current) => {
        const result = PersistedSchema.safeParse(persisted);
        return result.success ? { ...current, ...result.data } : current;
      },
    },
  ),
);

/**
 * Apply the stored preference to Uniwind. MMKV is synchronous, so the store is already hydrated
 * when this runs: call it once at module scope in the root layout, before the first render,
 * so the first frame uses the right theme.
 */
export function applyStoredTheme(): void {
  Uniwind.setTheme(useThemeStore.getState().preference);
}
