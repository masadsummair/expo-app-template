import { focusManager, onlineManager } from '@tanstack/react-query';
import { addNetworkStateListener, getNetworkStateAsync } from 'expo-network';
import { AppState } from 'react-native';

/*
 * Wires TanStack Query's two environment managers to React Native:
 *  - onlineManager follows expo-network, so queries pause offline and refetch on reconnect.
 *  - focusManager follows AppState, so `refetchOnWindowFocus` means "app returned to foreground".
 *
 * Importing this module runs `setupQueryManagers()` once. The function is idempotent, so a second
 * call (Fast Refresh, tests) is a no-op. Import it before the first query runs (src/app/_layout.tsx).
 */
let installed = false;

export function setupQueryManagers(): void {
  if (installed) return;
  installed = true;

  onlineManager.setEventListener((setOnline) => {
    // The initial async read must not clobber a newer event that arrived while it was in flight.
    let sawEvent = false;
    const subscription = addNetworkStateListener((state) => {
      sawEvent = true;
      setOnline(state.isConnected !== false);
    });
    getNetworkStateAsync()
      .then((state) => {
        if (!sawEvent) setOnline(state.isConnected !== false);
      })
      .catch(() => undefined); // unknown state: stay optimistic (online), the default
    return () => subscription.remove();
  });

  focusManager.setEventListener((handleFocus) => {
    const subscription = AppState.addEventListener('change', (status) => {
      handleFocus(status === 'active');
    });
    return () => subscription.remove();
  });
}

setupQueryManagers();
