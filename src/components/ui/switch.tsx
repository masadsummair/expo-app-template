import { Switch as RNSwitch, View, type SwitchProps as RNSwitchProps } from 'react-native';
import { useCSSVariable } from 'uniwind';

import { cn } from '@/lib/cn';
import * as haptics from '@/lib/haptics';

import { Text } from './text';

export type SwitchProps = Omit<RNSwitchProps, 'value' | 'onValueChange'> & {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  /** Required: e2e tests and agents select elements by testID. */
  testID: string;
  className?: string;
};

function asColor(value: string | number | undefined): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

export function Switch({
  label,
  value,
  onValueChange,
  disabled,
  className,
  testID,
  ...props
}: SwitchProps) {
  const primary = asColor(useCSSVariable('--color-primary'));
  const border = asColor(useCSSVariable('--color-border'));

  return (
    <View className={cn('min-h-12 flex-row items-center justify-between gap-3', className)}>
      {/* The Switch below carries the label; hide the visible copy so it is not read twice. */}
      <Text
        className={cn('flex-1', disabled && 'opacity-50')}
        accessibilityElementsHidden
        importantForAccessibility="no"
      >
        {label}
      </Text>
      <RNSwitch
        accessibilityRole="switch"
        accessibilityLabel={label}
        accessibilityState={{ checked: value, disabled: Boolean(disabled) }}
        value={value}
        onValueChange={(next) => {
          haptics.toggle(next);
          onValueChange(next);
        }}
        disabled={disabled}
        trackColor={{ false: border, true: primary }}
        testID={testID}
        {...props}
      />
    </View>
  );
}
