import { Pressable, View } from 'react-native';

import { cn } from '@/lib/cn';

import { Icon, type IconName } from './icon';
import { Text } from './text';

const chevron: IconName = { ios: 'chevron.right', android: 'chevron_right' };

type ListItemBaseProps = {
  title: string;
  subtitle?: string;
  /** Optional leading icon. */
  icon?: IconName;
  className?: string;
};

// A pressable row must be addressable by e2e tests, so `onPress` and `testID` come together.
export type ListItemProps = ListItemBaseProps &
  (
    | { onPress: () => void; testID: string; disabled?: boolean }
    | { onPress?: undefined; testID?: string; disabled?: undefined }
  );

export function ListItem({ title, subtitle, icon, className, ...rest }: ListItemProps) {
  const content = (
    <>
      {icon ? <Icon name={icon} colorClassName="accent-muted" /> : null}
      <View className="flex-1">
        <Text>{title}</Text>
        {subtitle ? <Text variant="caption">{subtitle}</Text> : null}
      </View>
    </>
  );
  // 16px side inset matches iOS grouped lists and Material list items; callers can override via className.
  const rowClass = cn('min-h-12 flex-row items-center gap-3 px-4 py-3', className);

  if (!rest.onPress) {
    return (
      <View className={rowClass} testID={rest.testID}>
        {content}
      </View>
    );
  }

  const { onPress, testID, disabled } = rest;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      onPress={onPress}
      className={cn(rowClass, 'active:opacity-80', disabled && 'opacity-50')}
      testID={testID}
    >
      {content}
      <Icon name={chevron} size={16} colorClassName="accent-muted" testID={`${testID}-chevron`} />
    </Pressable>
  );
}
