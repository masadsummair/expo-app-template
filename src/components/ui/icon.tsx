import type { AndroidSymbol, SFSymbol } from 'expo-symbols';
import { SymbolView } from 'expo-symbols';
import type { ComponentProps } from 'react';
import { Platform, useWindowDimensions, View } from 'react-native';
import { withUniwind } from 'uniwind';

const UniwindSymbolView = withUniwind(SymbolView);

/** SF Symbol name on iOS, Material Symbol name on Android. Both are required so neither platform renders blank. */
export type IconName = { ios: SFSymbol; android: AndroidSymbol };

export type IconProps = Omit<
  ComponentProps<typeof UniwindSymbolView>,
  'name' | 'size' | 'tintColor' | 'tintColorClassName' | 'accessibilityLabel'
> & {
  name: IconName;
  size?: number;
  /** Uniwind accent class that sets the tint, e.g. `accent-primary`. */
  colorClassName?: string;
  /** Set only for meaningful icons; decorative icons stay hidden from screen readers. */
  accessibilityLabel?: string;
};

/** iOS icons beside text grow with it, up to the same 2x as body text. Android icons keep their size. */
const MAX_ICON_SCALE = 2;

/*
 * Accessibility lives on a wrapping View: expo-symbols on Android (SDK 57) drops a11y props on the
 * glyph it renders, so labelling the SymbolView itself would only work on iOS.
 *
 * Scaling: iOS draws the SF Symbol into its frame and does not follow Dynamic Type (expo-symbols renders a
 * UIImageView with a fixed point size), so the frame is scaled here. Android draws a font glyph that the
 * system text scale grows, non-linearly on Android 14+: at font scale 2 a 24dp glyph filled only ~61% of a
 * 2x box (API 36 emulator). So Android divides the scale back out and pins the box: icons keep their size.
 */
export function Icon({
  name,
  size = 24,
  colorClassName = 'accent-foreground',
  accessibilityLabel,
  testID,
  ...props
}: IconProps) {
  const labelled = Boolean(accessibilityLabel);
  const { fontScale } = useWindowDimensions();
  const box = size * Math.min(fontScale, MAX_ICON_SCALE);
  const android = Platform.OS === 'android';
  return (
    <View
      testID={testID}
      accessible={labelled}
      accessibilityRole={labelled ? 'image' : undefined}
      accessibilityLabel={accessibilityLabel}
      accessibilityElementsHidden={!labelled}
      importantForAccessibility={labelled ? 'yes' : 'no-hide-descendants'}
    >
      <UniwindSymbolView
        name={name}
        size={android ? size / fontScale : box}
        style={android ? { width: size, height: size } : undefined}
        tintColorClassName={colorClassName}
        accessible={false}
        importantForAccessibility="no-hide-descendants"
        {...props}
      />
    </View>
  );
}
