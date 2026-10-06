---
name: add-form
description: Add a validated form (React Hook Form + zod 4 + TextField) to a screen, with server errors, submit state, keyboard handling and tests. Use when asked for a form, sign-up/edit/create screen, input validation, or "save" flow. Do NOT use for read-only screens or a single search box (use a plain TextField).
---

# Add form

The reference implementation is `src/app/sign-in.tsx`. Copy its shape; this skill covers what it doesn't.
Create the screen with `new-screen` first, and the mutation with `api-endpoint`.

## Rules

1. **One zod schema per form**, values type from `z.infer`. Use `z.email()` (top-level in zod 4).
   Put the schema above the component, or in `src/services/api/<resource>.ts` when the API request uses it too.
2. `useForm` with `zodResolver(schema)`, `mode: 'onTouched'` and `defaultValues` for **every** field (no
   uncontrolled inputs). `onTouched` validates a field when it first loses focus and on every change after
   that, so users aren't shown errors while they type their first attempt.
3. **`Controller` for every input** (RN inputs have no ref registration). Map `field.onChange` to
   `onChangeText`, pass `onBlur`, show `errors.<field>?.message` through `TextField`'s `error` prop, and pass
   `ref={field.ref}`: `setFocus` and `shouldFocus` only work on a registered ref.
4. `Screen preset="scroll"` — it already provides `KeyboardAwareScrollView` and
   `keyboardShouldPersistTaps="handled"`. Do not add `KeyboardAvoidingView` on top.
5. **Submit button in `Screen`'s `footer` prop**, as in `sign-in.tsx`: it is pinned above the keyboard, so it
   stays reachable on short screens and at large text sizes. Do not leave it inline at the bottom of the form.
   `onSubmit` must be `async` and `await` the mutation (`mutateAsync`), otherwise `isSubmitting` ends
   immediately. `Button` keeps its width while `loading`.
6. **Keyboard flow:** every field but the last gets `returnKeyType="next"`, `submitBehavior="submit"` and
   `onSubmitEditing={() => setFocus('<nextField>')}`. The last field gets `returnKeyType="done"` (`"go"` for
   sign-in) and submits with `handleSubmit(onSubmit)`.
7. **Keyboard and autofill props on every field:** `keyboardType` (`email-address`, `phone-pad`, `numeric`),
   `autoCapitalize` (`none` for email and usernames, `words` for names), `autoComplete` and `textContentType`
   (`name`/`name`, `email`/`emailAddress`, `new-password`/`newPassword`, `current-password`/`password`).
   They pick the right keyboard and enable password-manager autofill.
8. No `useCallback`/`useMemo` around render props (React Compiler). Derive UI from `useWatch` or
   `formState`, not `watch()`.

## Template

The mutation, in `src/services/api/profile.ts` (see `api-endpoint`):

```ts
import { useMutation } from '@tanstack/react-query';
import { z } from 'zod';

import { requestOrThrow } from './client';

export const ProfileSchema = z.object({ name: z.string(), email: z.string() });
export type Profile = z.infer<typeof ProfileSchema>;

export function useUpdateProfile() {
  return useMutation({
    mutationFn: (values: Profile) =>
      requestOrThrow({ path: '/profile', method: 'PUT', body: values, schema: ProfileSchema }),
  });
}
```

The screen, in `src/app/(app)/profile-edit.tsx`:

```tsx
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { View } from 'react-native';
import { z } from 'zod';

import { Button, Screen, Text, TextField } from '@/components/ui';
import { ApiError } from '@/services/api/api-problem';
import { useUpdateProfile } from '@/services/api/profile';

const schema = z.object({
  name: z.string().trim().min(1, 'Enter your name'),
  email: z.email('Enter a valid email'),
});
type FormValues = z.infer<typeof schema>;

export default function ProfileEditScreen() {
  const updateProfile = useUpdateProfile();
  const {
    control, handleSubmit, setError, setFocus, clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: 'onTouched',
    defaultValues: { name: '', email: '' },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      await updateProfile.mutateAsync(values);
    } catch (error) {
      if (error instanceof ApiError && error.problem.kind === 'rejected') {
        setError('email', { type: 'server', message: 'That email is taken' }, { shouldFocus: true });
        return;
      }
      setError('root.serverError', { type: 'server', message: 'Could not save. Try again.' });
    }
  };

  return (
    <Screen
      preset="scroll"
      testID="profile-edit-screen"
      className="gap-4"
      footer={
        <Button
          label="Save"
          testID="profile-edit-submit"
          loading={isSubmitting}
          onPress={handleSubmit(onSubmit)}
        />
      }
    >
      <View className="gap-4">
        <Controller
          control={control}
          name="name"
          render={({ field: { onChange, onBlur, value, ref } }) => (
            <TextField
              ref={ref}
              label="Name"
              testID="profile-edit-name"
              value={value}
              onBlur={onBlur}
              onChangeText={(text) => {
                clearErrors('root.serverError');
                onChange(text);
              }}
              error={errors.name?.message}
              autoCapitalize="words"
              autoComplete="name"
              textContentType="name"
              returnKeyType="next"
              submitBehavior="submit"
              onSubmitEditing={() => setFocus('email')}
            />
          )}
        />
        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, onBlur, value, ref } }) => (
            <TextField
              ref={ref}
              label="Email"
              testID="profile-edit-email"
              value={value}
              onBlur={onBlur}
              onChangeText={onChange}
              error={errors.email?.message}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              textContentType="emailAddress"
              returnKeyType="done"
              onSubmitEditing={handleSubmit(onSubmit)}
            />
          )}
        />
      </View>
      {errors.root?.serverError ? (
        <Text variant="caption" className="text-danger" testID="profile-edit-error">
          {errors.root.serverError.message}
        </Text>
      ) : null}
    </Screen>
  );
}
```

## Server errors

- Whole-form failure: `setError('root.serverError', ...)`. Root errors reset on the next submit.
- Per-field failure from the API: `setError('<field>', { type: 'server', message }, { shouldFocus: true })`.
  A field-level server error **persists** until `clearErrors` or the field re-validates, so clear it in
  that field's `onChangeText`.
- Map `ApiError.problem.kind` to copy; never show raw server messages or stack text.
  `unauthorized` is handled centrally (signs the user out) — don't handle it here.

## Accessibility and testIDs

- testIDs: `<screen>-<field>` for inputs, `<screen>-<field>-error` (generated by `TextField`),
  `<screen>-error` for the root error, `<screen>-submit` for the button.
- Errors must be text (`text-danger` plus a message), never colour alone. `TextField` already sets
  `accessibilityLabel` (with the error appended) and announces new errors.
- Keyboard flow and autofill props: see Rules 6 and 7.

## Test

Form logic lives in the zod schema and `onSubmit`; test those without rendering:

```ts
it('rejects an invalid email', () => {
  expect(schema.safeParse({ name: 'Ada', email: 'nope' }).success).toBe(false);
});
```

Export the schema from a non-route file (`src/services/api/<resource>.ts` or `src/lib/`) when you
want to test it — route files should only export the screen. Cover the mutation's error mapping in
`<resource>.test.ts` (see `api-endpoint`). For the on-screen behaviour (blank submit shows errors,
valid submit navigates), write one e2e test per acceptance criterion with the `e2e-flow` skill.

## Verify

`bun run verify`, then submit the form empty, with a bad value, and with a valid value on a device.
