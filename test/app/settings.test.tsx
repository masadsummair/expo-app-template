import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { confirm } from '@/lib/confirm';
import { storage } from '@/lib/storage';
import { toast, toastError } from '@/lib/toast';
import { authProvider } from '@/services/auth';

import SettingsScreen from '@/app/(app)/settings';

import { createQueryWrapper } from '../query-wrapper';

jest.mock('expo-router', () => ({ router: { push: jest.fn() }, Stack: { Screen: () => null } }));
jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@/lib/confirm', () => ({ confirm: jest.fn() }));
jest.mock('@/lib/toast', () => ({ toast: { success: jest.fn() }, toastError: jest.fn() }));
// A stub, so the test can assert that delete-account clears local storage.
jest.mock('@/lib/storage', () => ({
  storage: { clearAll: jest.fn() },
  zustandStorage: { getItem: () => null, setItem: () => undefined, removeItem: () => undefined },
}));
jest.mock('@/services/auth', () => ({
  authProvider: { deleteAccount: jest.fn(), signOut: jest.fn(), onChange: jest.fn() },
}));

async function pressDeleteAccount() {
  const { Wrapper, client } = createQueryWrapper();
  // A finished mutation otherwise holds a 5-minute garbage-collection timer that keeps Jest alive.
  client.setDefaultOptions({ ...client.getDefaultOptions(), mutations: { gcTime: 0 } });
  await render(<SettingsScreen />, { wrapper: Wrapper });
  await fireEvent.press(screen.getByTestId('settings-delete-account'));
}

// Let the mutation finish before the test ends, so its last state update does not land outside act().
async function settled() {
  await waitFor(() =>
    expect(screen.getByTestId('settings-delete-account').props.accessibilityState.busy).toBe(false),
  );
}

beforeEach(() => jest.clearAllMocks());

describe('SettingsScreen delete account', () => {
  it('deletes through the auth provider, then wipes local storage', async () => {
    jest.mocked(confirm).mockResolvedValue(true);
    jest.mocked(authProvider.deleteAccount).mockResolvedValue(undefined);
    await pressDeleteAccount();
    await waitFor(() => expect(storage.clearAll).toHaveBeenCalledTimes(1));
    await settled();
    expect(authProvider.deleteAccount).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalledWith('Account deleted');
  });

  it('signs out again after wiping local storage, so a failed keychain delete is retried', async () => {
    jest.mocked(confirm).mockResolvedValue(true);
    jest.mocked(authProvider.deleteAccount).mockResolvedValue(undefined);
    jest.mocked(authProvider.signOut).mockResolvedValue(undefined);
    await pressDeleteAccount();
    await waitFor(() => expect(authProvider.signOut).toHaveBeenCalledTimes(1));
    await settled();
    const [clearedAt] = jest.mocked(storage.clearAll).mock.invocationCallOrder;
    const [signedOutAt] = jest.mocked(authProvider.signOut).mock.invocationCallOrder;
    expect(signedOutAt).toBeGreaterThan(clearedAt ?? Infinity);
  });

  it('does nothing when the user cancels the confirmation', async () => {
    jest.mocked(confirm).mockResolvedValue(false);
    await pressDeleteAccount();
    await waitFor(() => expect(confirm).toHaveBeenCalledTimes(1));
    await settled();
    expect(authProvider.deleteAccount).not.toHaveBeenCalled();
    expect(storage.clearAll).not.toHaveBeenCalled();
  });

  it('shows the error and keeps local data when deletion fails', async () => {
    const failure = new Error('requires recent login');
    jest.mocked(confirm).mockResolvedValue(true);
    jest.mocked(authProvider.deleteAccount).mockRejectedValue(failure);
    await pressDeleteAccount();
    await waitFor(() => expect(toastError).toHaveBeenCalledWith(failure));
    await settled();
    expect(storage.clearAll).not.toHaveBeenCalled();
  });
});
