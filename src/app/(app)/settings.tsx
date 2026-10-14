import { useMutation } from '@tanstack/react-query';
import { router, Stack } from 'expo-router';
import { useWindowDimensions, View } from 'react-native';

import { Button, Card, Divider, ListItem, Screen, Text } from '@/components/ui';
import { confirm } from '@/lib/confirm';
import { reportError } from '@/lib/crash-reporting';
import * as haptics from '@/lib/haptics';
import { storage } from '@/lib/storage';
import { toast, toastError } from '@/lib/toast';
import { authProvider } from '@/services/auth';
import { useAuthStore } from '@/stores/auth-store';
import { useThemeStore, type ThemePreference } from '@/stores/theme-store';

// At large text sizes three side-by-side buttons wrap their labels unevenly: stack them instead.
const STACK_AT_FONT_SCALE = 1.3;

const themeOptions: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

export default function SettingsScreen() {
  const preference = useThemeStore((s) => s.preference);
  const setPreference = useThemeStore((s) => s.setPreference);
  const signOut = useAuthStore((s) => s.signOut);
  const { fontScale } = useWindowDimensions();
  const stackThemes = fontScale >= STACK_AT_FONT_SCALE;

  const removeAccount = useMutation({
    // Asks the provider to delete the account, then signs out, so the auth store has already moved on by onSuccess.
    mutationFn: () => authProvider.deleteAccount(),
    onSuccess: () => {
      haptics.success();
      toast.success('Account deleted');
      // The account is gone: wipe everything stored locally for it, not just the session.
      storage.clearAll();
      // clearAll also drops the pending-wipe flag; signing out again retries the keychain delete and re-arms it on failure.
      authProvider
        .signOut()
        .catch((error: unknown) => reportError(error, { where: 'settings.deleteAccount' }));
    },
    onError: (e) => {
      haptics.error();
      toastError(e);
    },
  });

  async function onDeleteAccount() {
    const ok = await confirm({
      title: 'Delete account?',
      message: 'This permanently deletes your account and its data. This cannot be undone.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (ok) removeAccount.mutate();
  }

  return (
    <Screen preset="scroll" testID="settings-screen" edges={['bottom']} className="gap-6">
      <Stack.Screen options={{ title: 'Settings' }} />

      <View className="gap-2">
        <Text variant="caption" accessibilityRole="header">
          Appearance
        </Text>
        <View className={stackThemes ? 'gap-2' : 'flex-row gap-2'} accessibilityRole="radiogroup">
          {themeOptions.map((option) => (
            <Button
              key={option.value}
              label={option.label}
              testID={`settings-theme-${option.value}`}
              variant={preference === option.value ? 'primary' : 'secondary'}
              accessibilityRole="radio"
              accessibilityState={{ selected: preference === option.value }}
              wrapperClassName={stackThemes ? undefined : 'flex-1'}
              className={stackThemes ? undefined : 'px-3'}
              onPress={() => {
                haptics.select();
                setPreference(option.value);
              }}
            />
          ))}
        </View>
      </View>

      <Card className="p-0">
        <ListItem
          title="Sign out"
          testID="settings-sign-out"
          icon={{ ios: 'rectangle.portrait.and.arrow.right', android: 'logout' }}
          onPress={signOut}
        />
        <Divider />
        <ListItem
          title="About"
          testID="settings-about"
          icon={{ ios: 'info.circle', android: 'info' }}
          onPress={() => router.push('/about')}
        />
        {__DEV__ ? (
          <>
            <Divider />
            <ListItem
              title="Component catalogue"
              subtitle="Development builds only"
              testID="settings-catalogue"
              icon={{ ios: 'square.grid.2x2', android: 'grid_view' }}
              onPress={() => router.push('/catalogue')}
            />
          </>
        ) : null}
      </Card>

      <View className="gap-2">
        <Text variant="caption" accessibilityRole="header">
          Danger zone
        </Text>
        <Button
          label="Delete account"
          variant="danger"
          testID="settings-delete-account"
          loading={removeAccount.isPending}
          onPress={onDeleteAccount}
        />
      </View>
    </Screen>
  );
}
