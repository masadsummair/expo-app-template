import { router, Stack } from 'expo-router';

import { Button, Card, ListItem, Screen, Text } from '@/components/ui';
import { useAuthStore } from '@/stores/auth-store';

export default function HomeScreen() {
  const signOut = useAuthStore((s) => s.signOut);

  return (
    <Screen testID="home-screen" edges={['bottom']} className="gap-4">
      <Stack.Screen options={{ title: 'Home' }} />
      <Text variant="heading">You are signed in</Text>
      <Text variant="caption">Start building your first feature from here.</Text>
      <Card className="p-0">
        <ListItem
          title="Settings"
          subtitle="Appearance, account"
          testID="home-settings"
          icon={{ ios: 'gearshape', android: 'settings' }}
          onPress={() => router.push('/settings')}
        />
      </Card>
      <Button label="Sign out" variant="secondary" testID="home-sign-out" onPress={signOut} />
    </Screen>
  );
}
