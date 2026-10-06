import { useEffect, type Ref } from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';

import { announce } from '@/lib/a11y';
import { cn } from '@/lib/cn';

import { Text } from './text';

export type TextFieldProps = TextInputProps & {
  label: string;
  /** Required: e2e tests and agents select elements by testID. */
  testID: string;
  error?: string;
  ref?: Ref<TextInput>;
};

/*
 * Keyboard flow: pass `returnKeyType="next"` + `submitBehavior="submit"` + `onSubmitEditing` that
 * focuses the next field, and `returnKeyType="done"`/`"go"` on the last one (see src/app/sign-in.tsx).
 */
export function TextField({ label, error, className, ref, ...props }: TextFieldProps) {
  // VoiceOver has no live regions: announce a new error explicitly (Android uses the live region below).
  useEffect(() => {
    if (error) announce(error);
  }, [error]);

  return (
    <View className="gap-1.5">
      {/* Visual label only: the input carries the same label, so screen readers don't hear it twice. */}
      <Text variant="caption" accessibilityElementsHidden importantForAccessibility="no">
        {label}
      </Text>
      <TextInput
        ref={ref}
        // The error is part of the label so it is read whenever the field gets focus, on both platforms.
        accessibilityLabel={error ? `${label}, ${error}` : label}
        maxFontSizeMultiplier={2}
        placeholderTextColorClassName="accent-muted"
        className={cn(
          'min-h-12 rounded-xl border border-border bg-surface px-4 text-base text-foreground',
          // Focus is visible, but an error keeps its red border while the user fixes it.
          error ? 'border-danger' : 'focus:border-primary',
          className,
        )}
        {...props}
      />
      {error ? (
        <Text
          variant="caption"
          className="text-danger"
          testID={`${props.testID}-error`}
          // Android: the live region announces it; iOS: announce() above. Keep it in the accessibility tree:
          // hiding it (accessibilityElementsHidden) also hides it from XCUITest, so iOS e2e can't find it.
          accessibilityLiveRegion="polite"
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
}
