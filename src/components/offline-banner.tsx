import { useEffect } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { announce } from '@/lib/a11y';

const MESSAGE = 'You are offline. Changes will sync when you reconnect.';

/**
 * Pinned to the bottom of signed-in screens while the device has no connection (queries pause
 * meanwhile). Pads by the safe-area insets so it clears the home indicator / Android nav bar, and
 * side cutouts when an Android large screen shows the app in landscape. It owns the bottom inset
 * while visible and reports its height so Screen can drop its own (see BottomBannerHeightContext).
 */
export function OfflineBanner({ onHeightChange }: { onHeightChange: (height: number) => void }) {
  const online = useOnlineStatus();
  const { bottom, left, right } = useSafeAreaInsets();

  // VoiceOver has no live regions: announce going offline explicitly (Android uses the live region).
  useEffect(() => {
    if (!online) announce(MESSAGE);
  }, [online]);

  useEffect(() => {
    if (online) onHeightChange(0);
  }, [online, onHeightChange]);

  if (online) return null;
  return (
    <View
      testID="offline-banner"
      onLayout={(event) => onHeightChange(event.nativeEvent.layout.height)}
      className="bg-warning pt-2"
      style={{ paddingBottom: bottom + 8, paddingLeft: left + 16, paddingRight: right + 16 }}
    >
      <Text variant="caption" className="text-center text-background" accessibilityLiveRegion="polite">
        {MESSAGE}
      </Text>
    </View>
  );
}
