import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { reportError } from '@/lib/crash-reporting';
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
jest.mock('@/lib/crash-reporting', () => ({ reportError: jest.fn() }));

const flags = globalThis as unknown as { __DEV__: boolean };
const realDev = flags.__DEV__;

async function submit() {
  await render(<SignInScreen />);
  await fireEvent.changeText(screen.getByTestId('sign-in-email'), 'ada@example.com');
  await fireEvent.changeText(screen.getByTestId('sign-in-password'), 'password123');
  await fireEvent.press(screen.getByTestId('sign-in-submit'));
}

beforeEach(async () => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  await useAuthStore.getState().signOut();
});
afterEach(() => {
  flags.__DEV__ = realDev;
  mockAppEnv = 'development';
  jest.restoreAllMocks();
});

describe('SignInScreen', () => {
  it('signs in with the mock in dev builds', async () => {
    flags.__DEV__ = true;
    await submit();
    await waitFor(() => expect(useAuthStore.getState().status).toBe('signed-in'));
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
  });

  it('shows an error and reports it when the keychain write fails', async () => {
    flags.__DEV__ = true;
    const failure = new Error('keystore invalidated');
    const { signIn } = useAuthStore.getState();
    useAuthStore.setState({ signIn: jest.fn().mockRejectedValue(failure) });
    try {
      await submit();
      expect(await screen.findByText('Could not sign you in. Please try again.')).toBeTruthy();
      expect(reportError).toHaveBeenCalledWith(failure, { where: 'sign-in' });
    } finally {
      useAuthStore.setState({ signIn });
    }
  });
});
