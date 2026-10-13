import { ActivityIndicator, Platform, Pressable, type PressableProps, View } from 'react-native';

import { cn } from '@/lib/cn';
import * as haptics from '@/lib/haptics';

import { Text } from './text';
import { useRipple } from './tokens';

// Every variant has the same 1dp border (transparent where it has no outline; the fill shows through it), so
// buttons of different variants side by side are the same height.
const containerVariants = {
  primary: 'bg-primary border-transparent',
  secondary: 'bg-surface border-border',
  ghost: 'bg-transparent border-transparent',
  danger: 'bg-danger border-transparent',
} as const;

const labelVariants = {
  primary: 'text-primary-foreground',
  secondary: 'text-foreground',
  ghost: 'text-primary',
  // primary-foreground is white in light and near-black in dark: both pass AA on the danger token.
  danger: 'text-primary-foreground',
} as const;

// iOS pressed state. A fade would drop a solid fill's label below 4.5:1 (see scripts/check-contrast.ts), so
// solid fills swap to a pressed token; outlined and text buttons fade. Android shows the ripple instead.
const pressedVariants = {
  primary: 'active:bg-primary-pressed',
  secondary: 'active:opacity-pressed',
  ghost: 'active:opacity-pressed',
  danger: 'active:bg-danger-pressed',
} as const;

export type ButtonProps = Omit<PressableProps, 'children'> & {
  label: string;
  /** Required: e2e tests and agents select elements by testID. */
  testID: string;
  variant?: keyof typeof containerVariants;
  loading?: boolean;
  /**
   * Light haptic tap on press. Off by default: haptics mark outcomes (success, error, selection), not every
   * tap (HIG). Opt in only where no outcome haptic follows.
   */
  haptic?: boolean;
  /**
   * Layout in the parent (margin, `flex-1`, `self-*`, width): goes on the rounded wrapper that clips the Android
   * ripple. `className` goes on the pressable itself (padding, height).
   */
  wrapperClassName?: string;
};

export function Button({
  label,
  variant = 'primary',
  loading = false,
  disabled,
  className,
  wrapperClassName,
  accessibilityState,
  haptic = false,
  onPress,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const ripple = useRipple();
  return (
    // The Android ripple is drawn in the pressable's own background, which its own overflow-hidden does not
    // clip (that clips children only). This rounded overflow-hidden parent clips it to the corners.
    <View className={cn('overflow-hidden rounded-xl', wrapperClassName)}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        // Merge so callers can add state (e.g. `selected` for a radio) without losing disabled/busy.
        accessibilityState={{ ...accessibilityState, disabled: isDisabled, busy: loading }}
        android_ripple={ripple}
        disabled={isDisabled}
        onPress={(event) => {
          if (haptic) haptics.tap();
          onPress?.(event);
        }}
        className={cn(
          // Don't add `grow`: in a parent that sizes the wrapper to fit (a centred empty state) it fills the screen.
          'min-h-12 flex-row items-center justify-center rounded-xl border px-5 py-3',
          containerVariants[variant],
          Platform.OS === 'ios' && pressedVariants[variant],
          isDisabled && 'opacity-disabled',
          className,
        )}
        {...props}
      >
        {/* The label stays laid out (invisible while loading) so the button keeps its width. It wraps at large
          text sizes (HIG: reflow, don't shrink); `shrink` lets it wrap inside the row instead of overflowing. */}
        <Text
          className={cn(
            'shrink text-center font-semibold',
            labelVariants[variant],
            loading && 'opacity-0',
          )}
        >
          {label}
        </Text>
        {loading ? (
          <ActivityIndicator
            accessibilityLabel="Loading"
            className="absolute"
            colorClassName={
              variant === 'primary' || variant === 'danger'
                ? 'accent-primary-foreground'
                : 'accent-foreground'
            }
          />
        ) : null}
      </Pressable>
    </View>
  );
}
