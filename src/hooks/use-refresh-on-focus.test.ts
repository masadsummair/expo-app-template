import { useFocusEffect } from 'expo-router';
import { renderHook } from '@testing-library/react-native';

import { useRefreshOnFocus } from './use-refresh-on-focus';

jest.mock('expo-router', () => ({ useFocusEffect: jest.fn() }));

describe('useRefreshOnFocus', () => {
  it('skips the first focus and refetches on later ones', async () => {
    const refetch = jest.fn();
    await renderHook(() => useRefreshOnFocus(refetch));

    const effect = jest.mocked(useFocusEffect).mock.calls[0]?.[0];
    if (!effect) throw new Error('useFocusEffect was not called');

    effect();
    expect(refetch).not.toHaveBeenCalled();
    effect();
    expect(refetch).toHaveBeenCalledTimes(1);
  });
});
