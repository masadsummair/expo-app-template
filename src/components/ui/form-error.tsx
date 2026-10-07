import { useEffect } from 'react';

import { announce } from '@/lib/a11y';

import { Text } from './text';

export type FormErrorProps = {
  /** Form-level error (not tied to one field). Renders nothing when empty. */
  message?: string;
  testID: string;
};

/** Form-level error that screen readers hear: iOS needs the explicit announce, Android the live region. */
export function FormError({ message, testID }: FormErrorProps) {
  useEffect(() => {
    if (message) announce(message);
  }, [message]);

  if (!message) return null;
  return (
    <Text variant="caption" className="text-danger" accessibilityLiveRegion="polite" testID={testID}>
      {message}
    </Text>
  );
}
