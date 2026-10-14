import { Platform, Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { cn } from '@/lib/cn';

const variants = {
  title: 'text-3xl font-bold text-foreground',
  heading: 'text-xl font-semibold text-foreground',
  // text-body: 17pt on iOS, 16sp on Android (@variant ios / android in src/global.css).
  body: 'text-body text-foreground',
  caption: 'text-sm text-muted',
  // Fixed-size chrome (badges, tab labels): it sits in a box that cannot grow.
  chrome: 'text-xs text-foreground',
} as const;

/*
 * The largest system text scale each role follows (maxFontSizeMultiplier). iOS body is uncapped: Dynamic Type
 * reaches ~3.6x at AX5 and a cap locks those users out. Android's system maximum is 2x. Headings are already
 * large, and chrome cannot grow without breaking its box. Exported for TextField, which is body text.
 */
export function maxFontScale(variant: keyof typeof variants): number | undefined {
  switch (variant) {
    case 'title':
    case 'heading':
      return 1.5;
    case 'chrome':
      return 1.3;
    case 'body':
    case 'caption':
      return Platform.select<number | undefined>({ ios: undefined, default: 2 });
  }
}

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
      maxFontSizeMultiplier={maxFontScale(variant)}
      className={cn(variants[variant], className)}
      {...props}
    />
  );
}
