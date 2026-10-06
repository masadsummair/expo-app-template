import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { cn } from '@/lib/cn';

const variants = {
  title: 'text-3xl font-bold text-foreground',
  heading: 'text-xl font-semibold text-foreground',
  body: 'text-base text-foreground',
  caption: 'text-sm text-muted',
} as const;

/*
 * Cap dynamic type so layouts survive the largest accessibility sizes. Large text already
 * grows a lot in absolute terms, so headings get a tighter cap than body copy.
 */
const maxFontScale = {
  title: 1.5,
  heading: 1.5,
  body: 2,
  caption: 2,
} as const satisfies Record<keyof typeof variants, number>;

export type TextProps = RNTextProps & {
  variant?: keyof typeof variants;
};

export function Text({ variant = 'body', className, ...props }: TextProps) {
  // Titles and headings are announced as headers so screen-reader users can jump between sections.
  const isHeading = variant === 'title' || variant === 'heading';
  return (
    <RNText
      accessibilityRole={isHeading ? 'header' : undefined}
      allowFontScaling
      maxFontSizeMultiplier={maxFontScale[variant]}
      className={cn(variants[variant], className)}
      {...props}
    />
  );
}
