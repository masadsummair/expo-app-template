import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { reportError } from '@/lib/crash-reporting';
import * as haptics from '@/lib/haptics';
import { mockAuthProvider } from '@/services/auth/mock';
import { useAuthStore } from '@/stores/auth-store';

import SignInScreen from '@/app/sign-in';

jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
let mockAppEnv = 'development';
jest.mock('@/config/env', () => ({
  env: {
    get APP_ENV() {
      return mockAppEnv;
    },
  },
}));
jest.mock('@/lib/crash-reporting', () => ({ reportError: jest.fn(), setCrashUser: jest.fn() }));
jest.mock('@/lib/haptics');
// The screen signs in through the mock module and the store follows `@/services/auth`: pin the second to
// the first's instance, so the test still holds on an auth variant whose index exports a real provider.
jest.mock('@/services/auth', () => ({
  authProvider:
    jest.requireActual<typeof import('@/services/auth/mock')>('@/services/auth/mock')
      .mockAuthProvider,
}));

const flags = globalThis as unknown as { __DEV__: boolean };
const realDev = flags.__DEV__;

async function submit() {
  await render(<SignInScreen />);
  await fireEvent.changeText(screen.getByTestId('sign-in-email'), 'ada@example.com');
  await fireEvent.changeText(screen.getByTestId('sign-in-password'), 'password123');
  await fireEvent.press(screen.getByTestId('sign-in-submit'));
}

let disconnect: () => void;

beforeEach(async () => {
  jest.clearAllMocks();
  jest.spyOn(console, 'error').mockImplementation(() => {});
  // The root layout connects the store to the provider; do the same here.
  disconnect = useAuthStore.getState().connect();
  await mockAuthProvider.signOut();
  await waitFor(() => expect(useAuthStore.getState().status).toBe('signed-out'));
});
afterEach(() => {
  disconnect();
  flags.__DEV__ = realDev;
  mockAppEnv = 'development';
  jest.restoreAllMocks();
});

describe('SignInScreen', () => {
  it('signs in with the mock in dev builds', async () => {
    flags.__DEV__ = true;
    await submit();
    await waitFor(() => expect(useAuthStore.getState().status).toBe('signed-in'));
    expect(haptics.success).toHaveBeenCalledTimes(1);
    expect(haptics.error).not.toHaveBeenCalled();
  });

  it('signs in with the mock in preview builds', async () => {
    flags.__DEV__ = false;
    mockAppEnv = 'preview';
    await submit();
    await waitFor(() => expect(useAuthStore.getState().status).toBe('signed-in'));
  });

  it('signs in with the mock in release builds made for e2e (APP_ENV development)', async () => {
    flags.__DEV__ = false;
    mockAppEnv = 'development';
    await submit();
    await waitFor(() => expect(useAuthStore.getState().status).toBe('signed-in'));
  });

  it('refuses the mock in production builds', async () => {
    flags.__DEV__ = false;
    mockAppEnv = 'production';
    await submit();
    expect(await screen.findByTestId('sign-in-error')).toBeTruthy();
    expect(useAuthStore.getState().status).not.toBe('signed-in');
    await expect(mockAuthProvider.getAccessToken()).resolves.toBeNull();
    expect(haptics.error).toHaveBeenCalledTimes(1);
    expect(haptics.success).not.toHaveBeenCalled();
  });

  it('shows an error and reports it when the keychain write fails', async () => {
    flags.__DEV__ = true;
    const failure = new Error('keystore invalidated');
    jest.spyOn(mockAuthProvider, 'signInWithPassword').mockRejectedValue(failure);
    await submit();
    expect(await screen.findByText('Could not sign you in. Please try again.')).toBeTruthy();
    expect(reportError).toHaveBeenCalledWith(failure, { where: 'sign-in' });
    expect(haptics.error).toHaveBeenCalledTimes(1);
    expect(haptics.success).not.toHaveBeenCalled();
  });
});
