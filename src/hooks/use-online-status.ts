import { useNetworkState } from 'expo-network';

/**
 * True unless the device reports no connection. Optimistic while the state is still loading
 * (`isConnected` undefined). Deliberately ignores `isInternetReachable`: on iOS it always equals
 * `isConnected`, and on Android it can be false behind captive portals or while validating,
 * which would show a false "offline" banner.
 */
export function useOnlineStatus(): boolean {
  const { isConnected } = useNetworkState();
  return isConnected !== false;
}
