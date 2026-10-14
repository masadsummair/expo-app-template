import { Platform, type PressableProps } from 'react-native';
import { useCSSVariable } from 'uniwind';

/** Half of the 48dp touch target: a borderless ripple on an icon button stays inside its box. */
const ICON_BUTTON_RIPPLE_RADIUS = 24;

/** A colour token as a string, for props that cannot take a className (tint, ripple, caret). */
export function useColorToken(name: `--color-${string}`): string | undefined {
  const value = useCSSVariable(name);
  return typeof value === 'string' ? value : undefined;
}

/**
 * Android press feedback. Bounded to the view by default (rows, buttons); icon buttons pass `borderless`. The
 * ripple draws in the pressable's own background, which its own `overflow-hidden` does not clip: wrap a rounded
 * pressable in a `View` with the same radius and `overflow-hidden` (see Button). iOS and web get undefined: they
 * use `active:` classes instead.
 */
export function useRipple(borderless = false): PressableProps['android_ripple'] {
  const color = useColorToken('--color-ripple');
  if (Platform.OS !== 'android') return undefined;
  return borderless
    ? { color, borderless, radius: ICON_BUTTON_RIPPLE_RADIUS }
    : { color, borderless };
}
