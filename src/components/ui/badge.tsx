import { View, type ViewProps } from 'react-native';

import { cn } from '@/lib/cn';

import { Text } from './text';

const containerVariants = {
  default: 'bg-surface border border-border',
  primary: 'bg-primary',
  danger: 'bg-surface border border-danger',
} as const;

const labelVariants = {
  default: 'text-foreground',
  primary: 'text-primary-foreground',
  danger: 'text-danger',
} as const;

export type BadgeProps = Omit<ViewProps, 'children'> & {
  label: string;
  variant?: keyof typeof containerVariants;
};

/** Hidden from screen readers: the parent (e.g. a ListItem label) must carry the meaning. */
export function Badge({ label, variant = 'default', className, ...props }: BadgeProps) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className={cn('self-start rounded-full px-2.5 py-0.5', containerVariants[variant], className)}
      {...props}
    >
      <Text className={cn('text-xs font-medium', labelVariants[variant])}>{label}</Text>
    </View>
  );
}
