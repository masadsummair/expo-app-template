import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/** Fire-and-forget haptics: a missing motor or denied setting never throws. */
function run(effect: () => Promise<void>): void {
  try {
    effect().catch(() => undefined);
  } catch {
    // synchronous native failure — haptics are decoration, ignore
  }
}

/*
 * Each helper uses the platform's own vocabulary: iOS UIFeedbackGenerator styles, and Android
 * HapticFeedbackConstants via performAndroidHapticsAsync (Expo discourages the Vibrator path on
 * Android: it ignores the system haptics setting and feels buzzy on most motors).
 */
const isAndroid = () => Platform.OS === 'android';
const android = (type: Haptics.AndroidHaptics) => Haptics.performAndroidHapticsAsync(type);

/** Light tap for button presses. */
export const tap = () =>
  run(() =>
    isAndroid()
      ? android(Haptics.AndroidHaptics.Virtual_Key)
      : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  );

/** Tick for picker/segment changes. */
export const select = () =>
  run(() => (isAndroid() ? android(Haptics.AndroidHaptics.Segment_Tick) : Haptics.selectionAsync()));

/** Switch flipped on or off. */
export const toggle = (on: boolean) =>
  run(() =>
    isAndroid()
      ? android(on ? Haptics.AndroidHaptics.Toggle_On : Haptics.AndroidHaptics.Toggle_Off)
      : Haptics.selectionAsync(),
  );

export const success = () =>
  run(() =>
    isAndroid()
      ? android(Haptics.AndroidHaptics.Confirm)
      : Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  );

export const error = () =>
  run(() =>
    isAndroid()
      ? android(Haptics.AndroidHaptics.Reject)
      : Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
  );
