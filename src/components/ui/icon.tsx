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

/*
 * Accessibility lives on a wrapping View: expo-symbols on Android (SDK 57) drops a11y props on the
 * glyph it renders, so labelling the SymbolView itself would only work on iOS.
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
  // Android draws symbols as font glyphs, which the system text-size setting scales inside a fixed
  // box (clipping them at large text). Divide it back out and pin the box so icons keep their size.
  const androidGlyph = Platform.OS === 'android' && fontScale !== 1;
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
        size={androidGlyph ? size / fontScale : size}
        style={androidGlyph ? { width: size, height: size } : undefined}
        tintColorClassName={colorClassName}
        accessible={false}
        importantForAccessibility="no-hide-descendants"
        {...props}
      />
    </View>
  );
}
