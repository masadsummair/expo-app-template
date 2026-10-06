// Env is validated at import time (src/config/env.ts), so tests need a valid baseline.
process.env.EXPO_PUBLIC_API_URL = 'https://api.test';

// Importing the real SDK starts background timers that keep Jest from exiting.
jest.mock('@sentry/react-native', () => ({
  init: jest.fn(),
  captureException: jest.fn(),
  wrap: <T>(component: T) => component,
}));

// Reanimated 4 / Worklets need their native module; use the official Jest mocks instead.
jest.mock('react-native-worklets', () => require('react-native-worklets/src/mock'));
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

jest.mock('expo-secure-store', () => {
  const store = new Map<string, string>();
  return {
    getItemAsync: jest.fn(async (key: string) => store.get(key) ?? null),
    setItemAsync: jest.fn(async (key: string, value: string) => void store.set(key, value)),
    deleteItemAsync: jest.fn(async (key: string) => void store.delete(key)),
  };
});
