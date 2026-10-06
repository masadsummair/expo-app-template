import { useFocusEffect } from 'expo-router';
import { useRef } from 'react';

/** Calls `refetch` each time the screen regains focus (e.g. back from a pushed screen), skipping the first mount. */
export function useRefreshOnFocus(refetch: () => unknown): void {
  const firstFocus = useRef(true);

  // Pass a stable function (TanStack Query's `refetch` is). An unstable one makes useFocusEffect
  // re-run on every render and refetch each time; the React Compiler memoizes this closure.
  useFocusEffect(() => {
    if (firstFocus.current) {
      firstFocus.current = false;
      return;
    }
    void refetch();
  });
}
