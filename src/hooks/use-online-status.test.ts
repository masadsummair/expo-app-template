import { renderHook } from '@testing-library/react-native';
import { useNetworkState } from 'expo-network';

import { useOnlineStatus } from './use-online-status';

jest.mock('expo-network', () => ({ useNetworkState: jest.fn() }));

describe('useOnlineStatus', () => {
  it.each([
    [{ isConnected: true }, true],
    [{ isConnected: false }, false],
    [{}, true], // still loading: optimistic
    [{ isConnected: true, isInternetReachable: false }, true],
  ])('%j -> %s', async (state, expected) => {
    jest.mocked(useNetworkState).mockReturnValue(state);
    const { result } = await renderHook(() => useOnlineStatus());
    expect(result.current).toBe(expected);
  });
});
