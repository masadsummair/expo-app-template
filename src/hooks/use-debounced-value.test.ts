import { act, renderHook } from '@testing-library/react-native';

import { useDebouncedValue } from './use-debounced-value';

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe('useDebouncedValue', () => {
  it('returns the initial value immediately', async () => {
    const { result } = await renderHook(() => useDebouncedValue('a'));
    expect(result.current).toBe('a');
  });

  it('updates only after the delay and restarts on each change', async () => {
    const { result, rerender } = await renderHook((v: string) => useDebouncedValue(v, 300), {
      initialProps: 'a',
    });
    await rerender('b');
    await act(async () => {
      jest.advanceTimersByTime(200);
    });
    await rerender('c');
    await act(async () => {
      jest.advanceTimersByTime(200);
    });
    expect(result.current).toBe('a');
    await act(async () => {
      jest.advanceTimersByTime(100);
    });
    expect(result.current).toBe('c');
  });
});
