import { View, type ViewProps } from 'react-native';

import { cn } from '@/lib/cn';

export type CardProps = ViewProps;

/** Plain surface container. It has no role: put roles on the content inside. */
export function Card({ className, ...props }: CardProps) {
  return <View className={cn('rounded-xl bg-surface p-4', className)} {...props} />;
}
