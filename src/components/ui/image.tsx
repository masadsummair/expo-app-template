import { Image as ExpoImage } from 'expo-image';
import type { ComponentProps } from 'react';
import { withUniwind } from 'uniwind';

const UniwindImage = withUniwind(ExpoImage);

export type ImageProps = ComponentProps<typeof UniwindImage>;

/** expo-image with `className` support. Decorative (hidden from screen readers) unless `accessibilityLabel` is set. */
export function Image({ transition = 200, accessibilityLabel, ...props }: ImageProps) {
  const labelled = Boolean(accessibilityLabel);
  return (
    <UniwindImage
      transition={transition}
      accessible={labelled}
      accessibilityRole={labelled ? 'image' : undefined}
      accessibilityLabel={accessibilityLabel}
      accessibilityElementsHidden={!labelled}
      importantForAccessibility={labelled ? 'yes' : 'no'}
      {...props}
    />
  );
}
