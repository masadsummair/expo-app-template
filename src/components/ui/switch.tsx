import { Pressable, Switch as RNSwitch, type SwitchProps as RNSwitchProps } from 'react-native';

import { cn } from '@/lib/cn';
import * as haptics from '@/lib/haptics';

import { Text } from './text';
import { useColorToken } from './tokens';

export type SwitchProps = Omit<RNSwitchProps, 'value' | 'onValueChange'> & {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  /** Required: e2e tests and agents select elements by testID. */
  testID: string;
  className?: string;
};

export function Switch({
  label,
  value,
  onValueChange,
  disabled,
  className,
  testID,
  ...props
}: SwitchProps) {
  const primary = useColorToken('--color-primary');
  const border = useColorToken('--color-border');

  return (
    // The whole row is the control (label included); the native switch is only the visual indicator.
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value, disabled: Boolean(disabled) }}
      disabled={disabled}
      onPress={() => {
        const next = !value;
        haptics.toggle(next);
        onValueChange(next);
      }}
      testID={testID}
      className={cn('min-h-12 flex-row items-center justify-between gap-3', className)}
    >
      <Text className={cn('flex-1', disabled && 'opacity-disabled')}>{label}</Text>
      <RNSwitch
        accessible={false}
        importantForAccessibility="no-hide-descendants"
        value={value}
        disabled={disabled}
        trackColor={{ false: border, true: primary }}
        {...props}
        // After the spread: the row handles touches, so a caller's style must not make the switch tappable.
        style={[props.style, { pointerEvents: 'none' }]}
      />
    </Pressable>
  );
}
