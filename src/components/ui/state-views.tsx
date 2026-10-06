import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { announce } from '@/lib/a11y';
import { cn } from '@/lib/cn';

import { Button } from './button';
import { Text } from './text';

type StateViewProps = {
  /** Required: `<screen>-loading`, `<screen>-empty` or `<screen>-error`. */
  testID: string;
  className?: string;
};

export type LoadingViewProps = StateViewProps & { label?: string };

export function LoadingView({ testID, label = 'Loading', className }: LoadingViewProps) {
  // iOS has no live regions; Android announces via accessibilityLiveRegion below.
  useEffect(() => {
    announce(label);
  }, [label]);

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityLiveRegion="polite"
      className={cn('flex-1 items-center justify-center p-6', className)}
      testID={testID}
    >
      <ActivityIndicator size="large" colorClassName="accent-primary" />
    </View>
  );
}

export type EmptyStateProps = StateViewProps & {
  title: string;
  message?: string;
  /** Optional call to action. Its button gets testID `${testID}-action`. */
  action?: { label: string; onPress: () => void };
};

export function EmptyState({ title, message, action, testID, className }: EmptyStateProps) {
  return (
    <View className={cn('flex-1 items-center justify-center gap-2 p-6', className)} testID={testID}>
      <Text variant="heading" className="text-center">
        {title}
      </Text>
      {message ? (
        <Text variant="caption" className="text-center">
          {message}
        </Text>
      ) : null}
      {action ? (
        <Button
          label={action.label}
          onPress={action.onPress}
          testID={`${testID}-action`}
          className="mt-4"
        />
      ) : null}
    </View>
  );
}

export type ErrorStateProps = StateViewProps & {
  message: string;
  onRetry: () => void;
  retryLabel?: string;
};

export function ErrorState({
  message,
  onRetry,
  retryLabel = 'Try again',
  testID,
  className,
}: ErrorStateProps) {
  // role="alert" is silent on iOS and only adds the word "Alert" on Android: announce explicitly
  // on iOS and use a live region on Android.
  useEffect(() => {
    announce(message);
  }, [message]);

  return (
    <View
      accessibilityRole="alert"
      className={cn('flex-1 items-center justify-center gap-2 p-6', className)}
      testID={testID}
    >
      <Text className="text-center text-danger" accessibilityLiveRegion="polite">
        {message}
      </Text>
      <Button
        label={retryLabel}
        variant="secondary"
        onPress={onRetry}
        testID={`${testID}-retry`}
        className="mt-4"
      />
    </View>
  );
}
