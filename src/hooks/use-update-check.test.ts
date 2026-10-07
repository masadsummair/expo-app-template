import { act, renderHook } from '@testing-library/react-native';
import { onlineManager } from '@tanstack/react-query';
import * as Updates from 'expo-updates';
import { AppState } from 'react-native';

import { reportError } from '@/lib/crash-reporting';

import { useUpdateCheck } from './use-update-check';

let appState: ((s: string) => void) | null = null;


jest.mock('expo-updates', () => ({
  isEnabled: true,
  checkForUpdateAsync: jest.fn(),
  fetchUpdateAsync: jest.fn(),
  reloadAsync: jest.fn(async () => undefined),
}));

jest.mock('@/lib/crash-reporting', () => ({ reportError: jest.fn() }));

const flags = globalThis as unknown as { __DEV__: boolean };
const realDev = flags.__DEV__;

beforeEach(() => {
  flags.__DEV__ = false;
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-01-01T00:00:00Z'));
  jest.spyOn(AppState, 'addEventListener').mockImplementation(((_: string, l: (s: string) => void) => {
    appState = l;
    return { remove: jest.fn() };
  }) as never);
  jest.mocked(Updates.checkForUpdateAsync).mockReset();
  jest.mocked(Updates.fetchUpdateAsync).mockReset();
  jest.mocked(reportError).mockClear();
});
afterEach(() => {
  jest.restoreAllMocks();
  flags.__DEV__ = realDev;
  jest.useRealTimers();
});

describe('useUpdateCheck', () => {
  it('does nothing in dev builds', async () => {
    flags.__DEV__ = true;
    await renderHook(() => useUpdateCheck());
    expect(Updates.checkForUpdateAsync).not.toHaveBeenCalled();
  });

  it('fetches an available update, flags it ready, and reloads only on request', async () => {
    jest.mocked(Updates.checkForUpdateAsync).mockResolvedValue({ isAvailable: true } as never);
    jest.mocked(Updates.fetchUpdateAsync).mockResolvedValue({ isNew: true } as never);
    const { result } = await renderHook(() => useUpdateCheck());
    await act(async () => {});
    expect(result.current.updateReady).toBe(true);
    expect(Updates.reloadAsync).not.toHaveBeenCalled();
    await result.current.reload();
    expect(Updates.reloadAsync).toHaveBeenCalled();
  });

  it('throttles to once per 30 minutes', async () => {
    jest.mocked(Updates.checkForUpdateAsync).mockResolvedValue({ isAvailable: false } as never);
    await renderHook(() => useUpdateCheck());
    await act(async () => {});
    expect(Updates.checkForUpdateAsync).toHaveBeenCalledTimes(1);

    await act(async () => appState?.('active'));
    expect(Updates.checkForUpdateAsync).toHaveBeenCalledTimes(1);

    jest.setSystemTime(Date.now() + 31 * 60 * 1000);
    await act(async () => appState?.('active'));
    expect(Updates.checkForUpdateAsync).toHaveBeenCalledTimes(2);
  });

  it('retries on the next foreground after a failed check instead of waiting 30 minutes', async () => {
    jest.mocked(Updates.checkForUpdateAsync).mockRejectedValueOnce(new Error('boom'));
    jest.mocked(Updates.checkForUpdateAsync).mockResolvedValue({ isAvailable: false } as never);
    await renderHook(() => useUpdateCheck());
    await act(async () => {});
    expect(reportError).toHaveBeenCalledWith(expect.any(Error), { where: 'update-check' });

    await act(async () => appState?.('active'));
    expect(Updates.checkForUpdateAsync).toHaveBeenCalledTimes(2);
  });

  it('does not report a failed check while offline', async () => {
    jest.spyOn(onlineManager, 'isOnline').mockReturnValue(false);
    jest.mocked(Updates.checkForUpdateAsync).mockRejectedValue(new Error('offline'));
    await renderHook(() => useUpdateCheck());
    await act(async () => {});
    expect(Updates.checkForUpdateAsync).toHaveBeenCalledTimes(1);
    expect(reportError).not.toHaveBeenCalled();
  });
});
