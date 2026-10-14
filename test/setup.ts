// Env is validated at import time (src/config/env.ts), so tests need a valid baseline.
process.env.EXPO_PUBLIC_API_URL = 'https://api.test';

// Importing the real SDK starts background timers that keep Jest from exiting.
jest.mock('@sentry/react-native', () => ({
  init: jest.fn(),
  captureException: jest.fn(),
  setUser: jest.fn(),
  wrap: <T>(component: T) => component,
}));

// Reanimated 4 / Worklets need their native module; use the official Jest mocks instead.
jest.mock('react-native-worklets', () => jest.requireActual('react-native-worklets/src/mock'));
jest.mock('react-native-reanimated', () => jest.requireActual('react-native-reanimated/mock'));

// MMKV swaps in its own in-memory store under Jest, but its import still loads Nitro's native module.
jest.mock('react-native-nitro-modules', () => ({ NitroModules: {} }));

jest.mock('expo-secure-store', () => {
  const store = new Map<string, string>();
  return {
    // Exported so tests can assert the accessibility option the app passes (undefined === undefined would pass vacuously).
    AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 'after-first-unlock-this-device-only',
    getItemAsync: jest.fn(async (key: string) => store.get(key) ?? null),
    setItemAsync: jest.fn(async (key: string, value: string) => void store.set(key, value)),
    deleteItemAsync: jest.fn(async (key: string) => void store.delete(key)),
  };
});
