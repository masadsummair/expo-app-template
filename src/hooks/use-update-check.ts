import * as Updates from 'expo-updates';
import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { reportError } from '@/lib/crash-reporting';

const MIN_INTERVAL_MS = 30 * 60 * 1000;

// Module-level so callers get a stable reference (safe to list in effect dependencies).
const reload = () => Updates.reloadAsync();

/**
 * Checks for an OTA update when the app becomes active (and once at launch), at most every
 * 30 minutes, only in builds where expo-updates is enabled. Downloads it in the background and
 * reports `updateReady`; the app decides when to call `reload` (never force-reloads).
 */
export function useUpdateCheck(): { updateReady: boolean; reload: () => Promise<void> } {
  const [updateReady, setUpdateReady] = useState(false);
  const lastCheck = useRef(0);
  const running = useRef(false);

  useEffect(() => {
    if (__DEV__ || !Updates.isEnabled) return;

    async function check() {
      const now = Date.now();
      if (running.current || now - lastCheck.current < MIN_INTERVAL_MS) return;
      running.current = true;
      lastCheck.current = now;
      try {
        const result = await Updates.checkForUpdateAsync();
        if (!result.isAvailable) return;
        const fetched = await Updates.fetchUpdateAsync();
        if (fetched.isNew) setUpdateReady(true);
      } catch (e) {
        reportError(e);
      } finally {
        running.current = false;
      }
    }

    void check();
    const subscription = AppState.addEventListener('change', (status) => {
      if (status === 'active') void check();
    });
    return () => subscription.remove();
  }, []);

  return { updateReady, reload };
}
