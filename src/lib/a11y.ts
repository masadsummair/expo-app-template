import { AccessibilityInfo, Platform } from 'react-native';

/*
 * Screen-reader announcements with VoiceOver/TalkBack parity.
 * `accessibilityLiveRegion` only exists on Android, so content that appears without focus (field
 * errors, loading, error states) is silent on iOS unless announced explicitly. On Android, keep the
 * live region on the visible node and announce only for things that have no node (toasts), so
 * TalkBack doesn't read the same text twice.
 */
type Target = 'ios' | 'all';

export function announce(message: string, target: Target = 'ios'): void {
  if (!message) return;
  if (target === 'ios' && Platform.OS !== 'ios') return;
  // queue: don't cut off what VoiceOver is currently reading (iOS only; ignored on Android).
  AccessibilityInfo.announceForAccessibilityWithOptions(message, { queue: true });
}
