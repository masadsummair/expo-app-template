import { ActivityIndicator, Pressable, type PressableProps } from 'react-native';

import { cn } from '@/lib/cn';
import * as haptics from '@/lib/haptics';

import { Text } from './text';

const containerVariants = {
  primary: 'bg-primary',
  secondary: 'bg-surface border border-border',
  ghost: 'bg-transparent',
  danger: 'bg-danger',
} as const;

const labelVariants = {
  primary: 'text-primary-foreground',
  secondary: 'text-foreground',
  ghost: 'text-primary',
  // primary-foreground is white in light and near-black in dark: both pass AA on the danger token.
  danger: 'text-primary-foreground',
} as const;

export type ButtonProps = Omit<PressableProps, 'children'> & {
  label: string;
  /** Required: e2e tests and agents select elements by testID. */
  testID: string;
  variant?: keyof typeof containerVariants;
  loading?: boolean;
  /** Light haptic tap on press (default on). Turn off where a more specific haptic fires instead. */
  haptic?: boolean;
};

export function Button({
  label,
  variant = 'primary',
  loading = false,
  disabled,
  className,
  accessibilityState,
  haptic = true,
  onPress,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      // Merge so callers can add state (e.g. `selected` for a radio) without losing disabled/busy.
      accessibilityState={{ ...accessibilityState, disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={(event) => {
        if (haptic) haptics.tap();
        onPress?.(event);
      }}
      className={cn(
        'min-h-12 flex-row items-center justify-center rounded-xl px-5 active:opacity-80',
        containerVariants[variant],
        isDisabled && 'opacity-50',
        className,
      )}
      {...props}
    >
      {/* The label stays laid out (invisible while loading) so the button keeps its width. */}
      <Text
        numberOfLines={1}
        // One line, shrinking to fit at large text sizes, instead of breaking mid-word in narrow buttons.
        adjustsFontSizeToFit
        minimumFontScale={0.6}
        className={cn('font-semibold', labelVariants[variant], loading && 'opacity-0')}
      >
        {label}
      </Text>
      {loading ? (
        <ActivityIndicator
          accessibilityLabel="Loading"
          className="absolute"
          colorClassName={variant === 'primary' || variant === 'danger' ? 'accent-primary-foreground' : 'accent-foreground'}
        />
      ) : null}
    </Pressable>
  );
}
