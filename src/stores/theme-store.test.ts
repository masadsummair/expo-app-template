import { Uniwind } from 'uniwind';

import { storage } from '@/lib/storage';

import { applyStoredTheme, THEME_STORAGE_KEY, useThemeStore } from './theme-store';

jest.mock('uniwind', () => ({ Uniwind: { setTheme: jest.fn() } }));

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

const setTheme = jest.mocked(Uniwind.setTheme);

beforeEach(() => {
  storage.clearAll();
  setTheme.mockClear();
  useThemeStore.setState(useThemeStore.getInitialState(), true);
});

describe('theme store', () => {
  it('defaults to following the system', () => {
    expect(useThemeStore.getState().preference).toBe('system');
  });

  it('setPreference persists the value (not the action) and applies it to Uniwind', () => {
    useThemeStore.getState().setPreference('dark');

    expect(useThemeStore.getState().preference).toBe('dark');
    expect(setTheme).toHaveBeenCalledWith('dark');
    expect(JSON.parse(storage.getString(THEME_STORAGE_KEY) ?? '{}')).toEqual({
      state: { preference: 'dark' },
      version: 1,
    });
  });

  it('applyStoredTheme restores the stored preference on launch', async () => {
    storage.set(THEME_STORAGE_KEY, JSON.stringify({ state: { preference: 'light' }, version: 1 }));
    await useThemeStore.persist.rehydrate();

    applyStoredTheme();

    expect(setTheme).toHaveBeenCalledWith('light');
  });

  it('applyStoredTheme passes system through when nothing is stored', () => {
    applyStoredTheme();
    expect(setTheme).toHaveBeenCalledWith('system');
  });

  it('falls back to system when stored data from an old version is corrupt (migrate)', async () => {
    storage.set(THEME_STORAGE_KEY, JSON.stringify({ state: { preference: 'neon' }, version: 0 }));
    await useThemeStore.persist.rehydrate();
    expect(useThemeStore.getState().preference).toBe('system');
  });

  it('ignores corrupt data saved under the current version (merge)', async () => {
    useThemeStore.setState({ preference: 'system' });
    storage.set(THEME_STORAGE_KEY, JSON.stringify({ state: { preference: 'neon' }, version: 1 }));
    await useThemeStore.persist.rehydrate();
    expect(useThemeStore.getState().preference).toBe('system');
  });
});
