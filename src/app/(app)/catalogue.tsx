import { router, Stack } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { useResolveClassNames } from 'uniwind';

import {
  Avatar,
  Badge,
  Button,
  Card,
  Divider,
  EmptyState,
  ErrorState,
  FormError,
  Icon,
  Image,
  ListItem,
  LoadingView,
  PressableScale,
  RefreshableList,
  Screen,
  SheetHeader,
  Switch,
  Text,
  TextField,
} from '@/components/ui';
import { cn } from '@/lib/cn';
import { confirm } from '@/lib/confirm';
import { toast } from '@/lib/toast';

/** A 1x1 PNG: a deterministic, offline image for the Image and Avatar states. */
const PIXEL_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

/** Every colour token as a literal class, so Tailwind sees each name. Check both themes here. */
const SWATCHES = {
  background: 'bg-background',
  surface: 'bg-surface',
  foreground: 'bg-foreground',
  muted: 'bg-muted',
  border: 'bg-border',
  divider: 'bg-divider',
  primary: 'bg-primary',
  'primary-foreground': 'bg-primary-foreground',
  'primary-pressed': 'bg-primary-pressed',
  danger: 'bg-danger',
  'danger-pressed': 'bg-danger-pressed',
  success: 'bg-success',
  'success-foreground': 'bg-success-foreground',
  warning: 'bg-warning',
  'warning-foreground': 'bg-warning-foreground',
  info: 'bg-info',
  'info-foreground': 'bg-info-foreground',
  ripple: 'bg-ripple',
  scrim: 'bg-scrim',
  selection: 'bg-selection',
} as const;

/** One catalogue section. `id` is the UI export in kebab-case: a test fails if an export has no section. */
function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <View testID={`catalogue-${id}`} className="gap-3">
      <Text variant="caption" accessibilityRole="header">
        {title}
      </Text>
      {children}
    </View>
  );
}

/**
 * Development-only catalogue of every UI kit component in every state (Settings > Component catalogue).
 * Device checks for the design system run here: AX5 / font scale 2, dark mode, Reduce Motion, VoiceOver and
 * TalkBack. Unreachable in release builds (the group layout guards the route with `__DEV__`).
 */
export default function CatalogueScreen() {
  const [alerts, setAlerts] = useState(true);
  const [refetching, setRefetching] = useState(false);
  const body = useResolveClassNames('text-body');

  function refetch() {
    setRefetching(true);
    setTimeout(() => setRefetching(false), 1500);
  }

  return (
    <Screen preset="scroll" testID="catalogue-screen" edges={['bottom']} className="gap-8">
      <Stack.Screen options={{ title: 'Catalogue' }} />

      <Section id="text" title="Text">
        <Text variant="title">Title</Text>
        <Text variant="heading">Heading</Text>
        <Text>Body text follows the platform size and scales with the system setting.</Text>
        <Text variant="caption">Caption</Text>
        <Text variant="chrome">Chrome (fixed boxes, capped at 1.3x)</Text>
        <Text
          variant="caption"
          testID="catalogue-body-metrics"
        >{`body ${body.fontSize}/${body.lineHeight}`}</Text>
      </Section>

      <Section id="tokens" title="Colour tokens (check light and dark)">
        <View className="flex-row flex-wrap gap-3">
          {Object.entries(SWATCHES).map(([name, swatch]) => (
            <View key={name} className="min-w-20 items-center gap-1">
              <View className={cn('size-10 rounded-lg border border-border', swatch)} />
              <Text variant="chrome" className="text-center">
                {name}
              </Text>
            </View>
          ))}
        </View>
      </Section>

      <Section id="button" title="Button">
        {(['primary', 'secondary', 'ghost', 'danger'] as const).map((variant) => (
          <View key={variant} className="gap-2">
            <Button
              label={`${variant} button`}
              variant={variant}
              testID={`catalogue-button-${variant}`}
              onPress={() => toast.info(`${variant} pressed`)}
            />
            <Button
              label={`${variant} loading`}
              variant={variant}
              loading
              testID={`catalogue-button-${variant}-loading`}
            />
            <Button
              label={`${variant} disabled`}
              variant={variant}
              disabled
              testID={`catalogue-button-${variant}-disabled`}
            />
          </View>
        ))}
        <Button
          label="A long label that has to wrap at the largest text sizes without being cut off"
          testID="catalogue-button-long"
          onPress={() => {}}
        />
      </Section>

      <Section id="text-field" title="TextField">
        <TextField label="Email" testID="catalogue-field" placeholder="you@example.com" />
        <TextField
          label="Password"
          testID="catalogue-field-invalid"
          value="short"
          onChangeText={() => {}}
          error="At least 8 characters"
          secureTextEntry
        />
      </Section>

      <Section id="switch" title="Switch">
        <Switch
          label="Notifications"
          value={alerts}
          onValueChange={setAlerts}
          testID="catalogue-switch-on"
        />
        <Switch
          label="Disabled"
          value={false}
          disabled
          onValueChange={() => {}}
          testID="catalogue-switch-disabled"
        />
      </Section>

      <Section id="list-item" title="ListItem">
        <Card className="p-0">
          <ListItem title="Plain row" subtitle="Not pressable" />
          <Divider />
          <ListItem
            title="Pressable row"
            subtitle="Chevron and highlight on iOS, ripple on Android"
            icon={{ ios: 'gearshape', android: 'settings' }}
            testID="catalogue-row"
            onPress={() => toast.info('Row pressed')}
          />
          <Divider />
          <ListItem
            title="Disabled row"
            testID="catalogue-row-disabled"
            disabled
            onPress={() => {}}
          />
        </Card>
      </Section>

      <Section id="card" title="Card">
        <Card>
          <Text>
            A flat surface. No elevation scale: it reads on iOS and on Material tonal surfaces.
          </Text>
        </Card>
      </Section>

      <Section id="divider" title="Divider">
        <Divider />
      </Section>

      <Section id="pressable-scale" title="PressableScale">
        <PressableScale
          testID="catalogue-scale-card"
          accessibilityLabel="Scale card with an opt-in haptic"
          haptic
          className="rounded-xl bg-surface p-4"
          onPress={() => toast.success('Opted in to a haptic')}
        >
          <Text>Spring press, opt-in haptic</Text>
        </PressableScale>
      </Section>

      <Section id="icon" title="Icon">
        <View className="flex-row items-center gap-4">
          <Icon name={{ ios: 'star', android: 'star' }} size={16} />
          <Icon
            name={{ ios: 'star', android: 'star' }}
            size={24}
            colorClassName="accent-primary"
            accessibilityLabel="Favourite"
            testID="catalogue-icon-labelled"
          />
          <Icon name={{ ios: 'star', android: 'star' }} size={32} />
        </View>
        <View className="flex-row items-center gap-2">
          <Icon name={{ ios: 'star', android: 'star' }} />
          <Text className="flex-1">
            On iOS an icon beside text grows with it, up to 2x. On Android it keeps its size.
          </Text>
        </View>
      </Section>

      <Section id="image" title="Image">
        <Image
          source={{ uri: PIXEL_PNG }}
          accessibilityLabel="Sample image"
          contentFit="cover"
          className="h-16 w-full rounded-xl"
        />
      </Section>

      <Section id="avatar" title="Avatar">
        <View className="flex-row items-center gap-3">
          <Avatar name="Ada Lovelace" size="sm" />
          <Avatar name="Ada Lovelace" />
          <Avatar name="Grace Hopper" size="lg" uri={PIXEL_PNG} />
        </View>
      </Section>

      <Section id="badge" title="Badge">
        <View className="flex-row flex-wrap gap-2">
          <Badge label="Default" />
          <Badge label="Primary" variant="primary" />
          <Badge label="Danger" variant="danger" />
        </View>
      </Section>

      <Section id="form-error" title="FormError">
        <FormError
          message="Could not sign you in. Please try again."
          testID="catalogue-form-error-demo"
        />
      </Section>

      <Section id="loading-view" title="LoadingView">
        <LoadingView testID="catalogue-loading" className="flex-none py-4" />
      </Section>

      <Section id="empty-state" title="EmptyState">
        <EmptyState
          testID="catalogue-empty"
          title="Nothing yet"
          message="Add your first item to see it here."
          action={{ label: 'Add one', onPress: () => {} }}
          className="flex-none"
        />
      </Section>

      <Section id="error-state" title="ErrorState">
        <ErrorState
          testID="catalogue-error"
          message="Something went wrong."
          onRetry={() => {}}
          className="flex-none"
        />
      </Section>

      <Section id="refreshable-list" title="RefreshableList">
        <Text variant="caption">
          Pull down: the spinner shows. The button simulates a background refetch: the spinner must
          not show.
        </Text>
        <Button
          label="Simulate background refetch"
          variant="secondary"
          testID="catalogue-list-background"
          onPress={refetch}
        />
        <View style={{ height: 220 }}>
          <RefreshableList
            data={['First', 'Second', 'Third']}
            renderItem={({ item }) => <ListItem title={item} />}
            refreshing={refetching}
            onRefresh={refetch}
            testID="catalogue-list"
          />
        </View>
      </Section>

      <Section id="sheet-header" title="SheetHeader">
        <SheetHeader title="Sheet title" testID="catalogue-sheet" />
        <Button
          label="Open the About sheet"
          variant="secondary"
          testID="catalogue-open-sheet"
          onPress={() => router.push('/about')}
        />
      </Section>

      <Section id="feedback" title="Toast and confirm">
        <Button
          label="Toast: success"
          variant="secondary"
          testID="catalogue-toast-success"
          onPress={() => toast.success('Saved')}
        />
        <Button
          label="Toast: error"
          variant="secondary"
          testID="catalogue-toast-error"
          onPress={() => toast.error('Could not save')}
        />
        <Button
          label="Toast with action (8 s)"
          variant="secondary"
          testID="catalogue-toast-action"
          onPress={() =>
            toast.info('Update ready', {
              description: 'Restart to get the latest version.',
              action: { label: 'Restart', onPress: () => {} },
            })
          }
        />
        <Button
          label="Toast in 5 s (open a sheet or the keyboard first)"
          variant="secondary"
          testID="catalogue-toast-later"
          onPress={() => setTimeout(() => toast.info('Delayed toast'), 5000)}
        />
        <Button
          label="Confirm dialog"
          variant="secondary"
          testID="catalogue-confirm"
          onPress={() =>
            void confirm({
              title: 'Discard changes?',
              message: 'You cannot undo this.',
              confirmLabel: 'Discard',
              destructive: true,
            })
          }
        />
      </Section>
    </Screen>
  );
}
