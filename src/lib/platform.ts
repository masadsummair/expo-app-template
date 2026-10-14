import { Platform } from 'react-native';

/**
 * iOS 26 draws form sheets and bars with Liquid Glass. Leave their background alone there; earlier iOS and
 * Android need the app's own surface colour. A function, not a constant, so tests can switch platform.
 */
export function hasLiquidGlass(): boolean {
  return Platform.OS === 'ios' && Number.parseInt(String(Platform.Version), 10) >= 26;
}

/**
 * `contentStyle` for a native form sheet. Native-stack always paints the sheet's Screen view with the
 * theme background, which hides the Liquid Glass, so iOS 26 needs it transparent. Elsewhere return
 * undefined and keep that background.
 */
export function sheetContentStyle(): { backgroundColor: 'transparent' } | undefined {
  return hasLiquidGlass() ? { backgroundColor: 'transparent' } : undefined;
}
