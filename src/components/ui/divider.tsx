import { View, type ViewProps } from 'react-native';

import { cn } from '@/lib/cn';

export type DividerProps = Omit<ViewProps, 'children'>;

/** Decorative hairline: hidden from screen readers. */
export function Divider({ className, ...props }: DividerProps) {
  return (
    <View
      accessible={false}
      importantForAccessibility="no"
      className={cn('w-full border-t border-divider', className)}
      {...props}
    />
  );
}
