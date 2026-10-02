import { ActivityIndicator, Pressable, type PressableProps } from 'react-native';

import { cn } from '@/lib/cn';

import { Text } from './text';

const containerVariants = {
  primary: 'bg-primary',
  secondary: 'bg-surface border border-border',
  ghost: 'bg-transparent',
} as const;

const labelVariants = {
  primary: 'text-primary-foreground',
  secondary: 'text-foreground',
  ghost: 'text-primary',
} as const;

export type ButtonProps = Omit<PressableProps, 'children'> & {
  label: string;
  /** Required: Maestro flows and agent-device select elements by testID. */
  testID: string;
  variant?: keyof typeof containerVariants;
  loading?: boolean;
};

export function Button({
  label,
  variant = 'primary',
  loading = false,
  disabled,
  className,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      className={cn(
        'min-h-12 flex-row items-center justify-center rounded-xl px-5 active:opacity-80',
        containerVariants[variant],
        isDisabled && 'opacity-50',
        className,
      )}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          colorClassName={variant === 'primary' ? 'accent-primary-foreground' : 'accent-foreground'}
        />
      ) : (
        <Text className={cn('font-semibold', labelVariants[variant])}>{label}</Text>
      )}
    </Pressable>
  );
}
