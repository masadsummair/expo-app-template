import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { View } from 'react-native';
import { z } from 'zod';

import { Button, Screen, Text, TextField } from '@/components/ui';
import { env } from '@/config/env';
import { useAuthStore } from '@/stores/auth-store';

const schema = z.object({
  email: z.email('Enter a valid email'),
  password: z.string().min(8, 'At least 8 characters'),
});

type FormValues = z.infer<typeof schema>;

export default function SignInScreen() {
  const signIn = useAuthStore((s) => s.signIn);
  const {
    control,
    handleSubmit,
    setError,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  // TODO(auth): replace with your auth provider (Clerk, Supabase, Better Auth, ...).
  // The mock accepts any credentials, so it refuses to run in production builds.
  const onSubmit = async (_values: FormValues) => {
    if (env.APP_ENV === 'production') {
      setError('root', { message: 'Sign-in is not configured for this build.' });
      return;
    }
    await signIn('dev-token');
  };

  return (
    <Screen
      preset="scroll"
      testID="sign-in-screen"
      className="justify-center gap-6"
      // Pinned above the keyboard, so Sign in stays reachable on short screens and at large text sizes.
      footer={
        <Button
          label="Sign in"
          testID="sign-in-submit"
          loading={isSubmitting}
          onPress={handleSubmit(onSubmit)}
        />
      }
    >
      <Text variant="title">Sign in</Text>
      <View className="gap-4">
        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, onBlur, value, ref } }) => (
            <TextField
              ref={ref}
              label="Email"
              testID="sign-in-email"
              value={value}
              returnKeyType="next"
              submitBehavior="submit"
              onSubmitEditing={() => setFocus('password')}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.email?.message}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              textContentType="emailAddress"
            />
          )}
        />
        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, onBlur, value, ref } }) => (
            <TextField
              ref={ref}
              label="Password"
              testID="sign-in-password"
              value={value}
              returnKeyType="go"
              // Go on the keyboard: ignore repeats while a submit is in flight (the button is disabled then).
              onSubmitEditing={() => {
                if (!isSubmitting) void handleSubmit(onSubmit)();
              }}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.password?.message}
              secureTextEntry
              autoComplete="current-password"
              textContentType="password"
            />
          )}
        />
      </View>
      {errors.root ? (
        <Text variant="caption" className="text-danger" testID="sign-in-error">
          {errors.root.message}
        </Text>
      ) : null}
    </Screen>
  );
}
