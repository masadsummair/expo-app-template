---
name: push-notifications
description: Add Expo push notifications to this app — expo-notifications plugin, permission and token flow, foreground handler, opening a screen from a tapped notification, credentials, sending, and testing. Use for "push notification", "expo-notifications", "FCM", "APNs", "push token", "notification tap". Not for deep link routing (deep-links) or releases (release).
---

# Push notifications

Remote push needs a native build (it is not in Expo Go on Android) and credentials. Local notifications and the
permission flow can be verified on an emulator; real remote delivery only on a physical device.

## 0. Preconditions — stop and ask if any fail

- `EAS_PROJECT_ID` in `app.config.ts` is set (`bun run eas init` prints it). The token call needs it; without it the code below
  returns `no-project-id` and shows a clear message instead of failing obscurely.
- The `deep-links` skill's `src/lib/deep-link.ts` (`toInternalPath`) exists. It is not in the template: you create it
  by following that skill, because notification taps reuse it. Do that first.
- Paid Apple Developer account for iOS (APNs), a Firebase project for Android (FCM V1).
- You will need a new native build; **this cannot ship over the air** (`release` skill: plugin changes alter the fingerprint).

## 1. Install and configure

Run this yourself (`expo-constants` is already a dependency):

```bash
bunx expo install expo-notifications
```

Add the config plugin in `app.config.ts` `plugins`:

```ts
[
  'expo-notifications',
  {
    icon: './assets/notification-icon.png', // 96x96, all-white with transparency (Android status bar)
    color: '#208AEF',                       // accent for the Android icon
    defaultChannel: 'default',
  },
],
```

Create the icon asset or drop the `icon` key; a coloured or non-transparent icon renders as a grey square.
If `ios/` or `android/` already exist from an earlier build, run `bunx expo prebuild --clean` first (the human
confirms: it deletes and regenerates both folders), then `bun run android` (or `bun run ios` on macOS). Otherwise
use an EAS development build. A stale native folder keeps the old plugin config.

## 2. Credentials (interactive — hand to the human)

- Android: upload an FCM V1 service-account key via `bun run eas credentials -p android`.
  The app has three package ids (`.dev`, `.preview`, and the production id in `app.config.ts`): register all three as
  Android apps in the Firebase project and download one `google-services.json` that holds the three clients.
  Then point `app.config.ts` at it inside the existing `android` block:

  ```ts
  android: { googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? './google-services.json' },
  ```

  Keep the file out of git (`.gitignore` covers it). On EAS, create `GOOGLE_SERVICES_JSON` per environment with `bun run eas env:set --type file`
  (`env-secrets`) and confirm it resolves on the first build. Locally the human drops the file in the repo root.
- iOS: an APNs key. EAS Build creates it interactively on the first development-device or preview build.

## 3. Client code

Create `src/lib/notifications.ts` — handler, permission, token.

```ts
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { z } from 'zod';

export type PushRegistration =
  | { kind: 'ok'; token: string }
  | { kind: 'denied'; canAskAgain: boolean }
  | { kind: 'no-project-id' }
  | { kind: 'error'; error: unknown };

/** Call once at module scope of the root layout. Controls how a foreground notification is shown. */
export function configureNotifications() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

const ProjectIdSchema = z.string().min(1);

/** Ask for permission and return this device's Expo push token. Call from a user action. Never log the token. */
export async function registerForPush(): Promise<PushRegistration> {
  const projectId = ProjectIdSchema.safeParse(
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId,
  );
  if (!projectId.success) return { kind: 'no-project-id' };

  try {
    // Android 13+ shows the permission prompt only after a channel exists.
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
      });
    }
    let permission = await Notifications.getPermissionsAsync();
    if (permission.status !== 'granted') permission = await Notifications.requestPermissionsAsync();
    if (permission.status !== 'granted') return { kind: 'denied', canAskAgain: permission.canAskAgain };

    const { data } = await Notifications.getExpoPushTokenAsync({ projectId: projectId.data });
    return { kind: 'ok', token: data };
  } catch (error) {
    return { kind: 'error', error };
  }
}
```

Rules: call `configureNotifications()` in `src/app/_layout.tsx` next to `initCrashReporting()`. Request permission
behind a button or a pre-prompt screen, never at launch (`denied` + `canAskAgain: false` → offer
`Linking.openSettings()`). Handle every `kind` in the UI, including `error` (emulators without Play services land there)
and `no-project-id`. On a simulator or emulator without push support, `error` is the expected result.

**Send the token to your backend** through `src/services/api` (`api-endpoint` skill), as a mutation with a zod-parsed
response. The token is an identifier, not a credential: keep it out of MMKV, logs and Sentry; call a delete endpoint on
sign-out so the next user on the device does not receive the previous user's pushes.

```ts
export function useRegisterPushToken() {
  return useMutation({
    mutationFn: (token: string) =>
      requestOrThrow({
        path: '/push-tokens',
        method: 'POST',
        body: { token, platform: Platform.OS },
        schema: z.object({ id: z.string() }),
      }),
  });
}
```

## 4. Open a screen from a tapped notification

Create `src/hooks/use-notification-links.ts`; mount `useNotificationLinks()` in `src/app/(app)/_layout.tsx` so a tap while signed
out cannot reach protected routes. `useLastNotificationResponse` covers the cold-start tap.

```ts
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';

import { toInternalPath } from '@/lib/deep-link';

export function useNotificationLinks() {
  const response = Notifications.useLastNotificationResponse();
  const handled = useRef<string | null>(null);

  useEffect(() => {
    if (!response || response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
    const { identifier, content } = response.notification.request;
    if (handled.current === identifier) return;
    handled.current = identifier;

    // data.url comes from your backend, which may relay user content: untrusted.
    const url: unknown = content.data?.url;
    const path = typeof url === 'string' ? toInternalPath(url) : null;
    if (path) router.push(path);
  }, [response]);
}
```

Never pass `data.url` straight to `router.push`: it is an open redirect / unintended navigation. Same rules as `deep-links`.

## 5. Sending (server side only)

`POST https://exp.host/--/api/v2/push/send` with `{ to: "ExponentPushToken[...]", title, body, data: { url: "/orders/42" } }` (`/orders/42` is an example route you create; see `deep-links`).
Limits: 100 messages per request, 600/s per project, 4096-byte payload. Fetch receipts about 15 minutes later and stop
sending to tokens that return `DeviceNotRegistered`. Turn on push security (an access token) in the EAS dashboard and keep that
token on the server only — never in `EXPO_PUBLIC_*`, never in the app.

## 6. Test

| What | Where |
|---|---|
| Permission prompt, channel creation, handler, tap routing | emulator or simulator, with a local notification |
| Real remote delivery (FCM/APNs) | physical device only, via https://expo.dev/notifications or the send API |
| Android remote | emulator image must include Google Play (Play Store variant) |

Local trigger for the tap path, in a dev-only button (do not ship it): schedule one with
`Notifications.scheduleNotificationAsync({ content: { title: 'Test', body: 'Tap to open', data: { url: '/orders/42' } },
trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 5 } })`, background the app, tap it.
Check cold start (kill the app first) and warm start, signed in and signed out, and a hostile `data.url` such as
`https://evil.com` (must be ignored).

In e2e, grant or deny the OS permission with `app.permissions: { notifications: 'grant' }` in
`e2e.config.ts` (applied before the app starts; simulator/emulator only) — see the `e2e-flow` skill. Prefer a release-style build; on the Android
emulator the dev-build splash can fail to show.

## Report

State what was built, which `kind` outcomes the UI handles, which devices were tested, and that a new native build and
credentials are required before this works for users. Run `mobile-security-auditor` on the diff.
