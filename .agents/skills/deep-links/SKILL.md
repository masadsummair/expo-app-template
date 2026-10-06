---
name: deep-links
description: Add or change deep links in this Expo Router app — custom scheme, https Universal/App Links, +native-intent, link validation, and testing a link on emulator/simulator. Use for "deep link", "universal link", "app link", "open the app from a URL", "URL scheme", "+native-intent", "notification opens screen". Not for in-app navigation (expo-router) or push setup (push-notifications).
---

# Deep links

Expo Router already maps a URL path to the file route (`src/app/(app)/orders/[id].tsx` ← `/orders/42`). This
skill adds the parts a template needs: allow-listing, validation, native config, and testing.

**Files to create.** `src/lib/deep-link.ts`, `src/lib/deep-link.test.ts`, `src/app/+native-intent.tsx`,
`src/app/+not-found.tsx` and the `orders/[id]` route below do not exist in the template. You create them; `orders` is
an example route, so substitute your own. Read the vendored
`expo-router` skill for routing APIs.

## Threat model (non-negotiable)

Any web page or app can fire `expoapptemplate://anything`, and any app can claim a custom scheme. Only verified
https links (Universal / App Links) are origin-bound. So every link path, query param and notification `data.url` is
attacker-controlled:

1. Validate with zod before use (ids via `z.string().regex`, enums via `z.enum`); never trust the route's TypeScript type.
2. Never navigate to a URL taken from a param (`router.push(params.next)` is an open redirect). Allow-list internal paths.
3. No tokens, OAuth codes or magic-link secrets in a custom-scheme URL unless PKCE or single-use with short expiry. Prefer verified https links for auth.
4. A link must never perform a state-changing or destructive action (pay, delete) without an in-app confirmation.
5. Never render a param as HTML or into a WebView.
6. Signed-out users: `Stack.Protected` keeps `(app)` routes unreachable. Do not cache a sensitive intent to replay after sign-in; if you replay one, keep it in memory only and re-run `toInternalPath` on it.

## 1. Allow-list — `src/lib/deep-link.ts`

Single choke point for links and notification taps. Add one pattern per public route; ids must match a strict pattern.

```ts
import type { Href } from 'expo-router';

const TRUSTED_HTTPS_HOSTS = new Set(['example.com']); // your real link domain
const SEGMENT = '[A-Za-z0-9_-]{1,64}';

/** Every route a link may open. Add a pattern per public route; ids must match a strict pattern. */
const ALLOWED_PATHS: readonly RegExp[] = [/^\/$/, new RegExp(`^/orders/${SEGMENT}$`)];

/** A path the router accepts (typed routes). The predicate below is the only place a string becomes one. */
export type InternalPath = Extract<Href, string>;

function isInternalPath(path: string): path is InternalPath {
  return ALLOWED_PATHS.some((allowed) => allowed.test(path));
}

const LINK = /^(?:([a-z][a-z0-9+.-]*):\/\/([^/?#]*))?([^?#]*)/i;

/** `expoapptemplate://orders/42?x=1` | `https://example.com/orders/42` | `/orders/42` -> `/orders/42`, else null. */
export function toInternalPath(link: string): InternalPath | null {
  const match = LINK.exec(link);
  if (!match) return null;
  const [, scheme, authority = '', rest = ''] = match;

  let path: string;
  if (scheme === undefined) {
    path = rest;
  } else if (scheme.toLowerCase() === 'https') {
    if (!TRUSTED_HTTPS_HOSTS.has(authority.toLowerCase())) return null;
    path = rest;
  } else {
    // Custom scheme: `expoapptemplate://orders/42` has "orders" in the authority slot.
    path = `/${authority}${rest}`.replace(/^\/+/, '/');
  }

  if (path === '' && scheme !== undefined) path = '/';
  return isInternalPath(path) ? path : null;
}
```

Query strings are dropped on purpose; the destination screen parses what it needs. Write a Jest test next to it
(`src/lib/deep-link.test.ts`) with `it.each` tables of accepted links and of rejected ones: other hosts,
`example.com.evil.com`, `//evil.com/x`, `/orders/../admin`, `/orders/42/pay`, `/orders/%2e%2e`, `javascript:alert(1)`,
and the empty string. Returning `InternalPath` (not `string`) is what lets `router.push(path)` typecheck under typed routes without a cast.

## 2. Router hook — `src/app/+native-intent.tsx`

Runs for every incoming link before routing. It must never throw (a throw can crash the app) and it cannot see auth
state — auth gating stays in `Stack.Protected`.

```tsx
import { reportError } from '@/lib/crash-reporting';
import { toInternalPath } from '@/lib/deep-link';

export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  try {
    return toInternalPath(path) ?? '/';
  } catch (error) {
    reportError(error, { where: 'deep-link.redirectSystemPath' });
    return '/';
  }
}
```

`path` is the full incoming URL, `initial` is true when the link launched the app. Rejected links land on `/`
(sign-in when signed out). If a device test shows the dev launcher's `exp+expo-app-template://expo-development-client/…`
link reaching this function and breaking the dev connect flow, pass links starting with `exp+` through unchanged in
`__DEV__` only.

## 3. Validate params in the screen

```tsx
import { Redirect, Stack, useLocalSearchParams } from 'expo-router';
import { z } from 'zod';

import { Screen, Text } from '@/components/ui';

const ParamsSchema = z.object({ id: z.string().regex(/^[A-Za-z0-9_-]{1,64}$/) });

export default function OrderScreen() {
  const parsed = ParamsSchema.safeParse(useLocalSearchParams());
  if (!parsed.success) return <Redirect href="/" />;

  return (
    <Screen testID="order-screen" edges={['bottom']}>
      <Stack.Screen options={{ title: 'Order' }} />
      <Text variant="heading">{`Order ${parsed.data.id}`}</Text>
    </Screen>
  );
}
```

Use `encodeURIComponent(id)` when building an API path from it (`api-endpoint` skill). Add `src/app/+not-found.tsx`
(a `Screen` with a `Link href="/"` and testIDs `not-found-screen` / `not-found-home`) so an unmatched path never dead-ends.

## 4. Native config — `app.config.ts`

- `scheme: 'expoapptemplate'` — lowercase only (uppercase breaks EAS Update). All three variants share it, so with
  dev + preview installed together the OS may open either. If that bites, propose per-variant schemes
  (`expoapptemplate-dev`) — a design decision for the human, not a silent change. The dev client also registers
  `exp+expo-app-template`.
- Verified https links (needs a domain you control):

```ts
ios: { associatedDomains: ['applinks:example.com'] },          // no https://
android: {
  intentFilters: [
    {
      action: 'VIEW',
      autoVerify: true, // required for App Links
      data: [{ scheme: 'https', host: 'example.com', pathPrefix: '/orders' }],
      category: ['BROWSABLE', 'DEFAULT'],
    },
  ],
},
```

Merge into the existing `ios` / `android` objects in `app.config.ts` (do not overwrite `bundleIdentifier`, `package`).
Host `/.well-known/apple-app-site-association` (appID `TEAMID.<bundle id>`, HTTPS, no redirect) and
`/.well-known/assetlinks.json` (package name + signing-cert SHA-256, from `bun run eas credentials -p android` or
Play Console app signing). Bundle ids differ per `APP_ENV`, so each variant you want links for must be listed in both
files. iOS fetches the AASA at install/update only; a path change needs a store release.

**These native fields change the fingerprint: a new build is required, an OTA will not carry them** (`release` skill).

## 5. Test

Android emulator (app must be installed; use the id of the variant under test):

```bash
adb shell am start -a android.intent.action.VIEW -c android.intent.category.BROWSABLE \
  -d "expoapptemplate://orders/42" com.example.expoapptemplate.dev
adb shell pm get-app-links com.example.expoapptemplate.preview   # App Links verification state (Android 12+)
```

iOS simulator (macOS only, needs Xcode; custom schemes; verify Universal Links on a physical device with an EAS build):

```bash
xcrun simctl openurl booted "expoapptemplate://orders/42"
```

For a dev build, connect the dev client first (`adb reverse tcp:8081 tcp:8081`, then open the
`exp+expo-app-template://expo-development-client/?url=…` link — see the `e2e-flow` skill), or the link opens a launcher, not
your screen. Do not use `bunx uri-scheme` (unpinned remote package).

In an e2e test: `await device.openLink('expoapptemplate://orders/42')`, then assert the screen's testID is visible
(`e2e-flow` skill). Test these cases, signed in and signed out: valid link, unknown path (lands on `/`), bad id
(`/orders/..`), a link with `?next=https://evil.com`, cold start (`initial`) and warm start. Signed out, a link to a
protected route must land on sign-in and must not show protected content. Whether it forwards after sign-in is not
automatic — do not assume it.

## Report

List links added, the allow-list patterns, which cases were run on which device/OS, and anything native that needs a
new build. Run `mobile-security-auditor` on the diff.
