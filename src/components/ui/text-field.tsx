import type { Ref } from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';

import { cn } from '@/lib/cn';

import { Text } from './text';

export type TextFieldProps = TextInputProps & {
  label: string;
  /** Required: Maestro flows and agent-device select elements by testID. */
  testID: string;
  error?: string;
  ref?: Ref<TextInput>;
};

export function TextField({ label, error, className, ref, ...props }: TextFieldProps) {
  return (
    <View className="gap-1.5">
      <Text variant="caption">{label}</Text>
      <TextInput
        ref={ref}
        accessibilityLabel={label}
        accessibilityHint={error}
        placeholderTextColorClassName="accent-muted"
        className={cn(
          'min-h-12 rounded-xl border border-border bg-surface px-4 text-base text-foreground',
          error && 'border-danger',
          className,
        )}
        {...props}
      />
      {error ? (
        <Text variant="caption" className="text-danger" testID={`${props.testID}-error`}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}
