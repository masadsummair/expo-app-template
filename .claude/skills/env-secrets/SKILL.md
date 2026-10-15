---
name: env-secrets
description: Add or change an environment variable end to end — src/config/env.ts schema, .env.example, EAS environment variable with the right visibility, and the app.config.ts build check. Use for "add an env var", "EAS secret", "EXPO_PUBLIC", "SENTRY_AUTH_TOKEN", "eas env". Not for releases (release) or token storage (use expo-secure-store).
---

# Env vars and secrets

Everything `EXPO_PUBLIC_*` is inlined into the JS bundle in plain text — anyone who downloads the app can read it.
The question is never "how do I hide it" but "does this value belong on the device at all".

## 1. Classify the value

| Value | Where it lives |
|---|---|
| Publishable: API base URL, Sentry DSN, analytics write key, Stripe/Supabase publishable or anon key, feature flag | `EXPO_PUBLIC_*` (this skill, steps 2–5) |
| Build-job credential: `SENTRY_AUTH_TOKEN`, private npm token, signing material | EAS variable, visibility `secret`, **no** `EXPO_PUBLIC_` prefix. Used by the build, never by app code |
| True secret: third-party API secret, service-role key, OAuth client secret, push access token | Your server. The app calls your API; the server holds the secret. Never in the bundle, never in `app.config.ts` `extra` |
| User session token | `expo-secure-store` at runtime, owned by the auth provider (`src/services/auth`), never an env var |

If a value is in the third or fourth row, stop and propose a server endpoint (`api-endpoint` skill) instead.

## 2. Schema — `src/config/env.ts`

Add the field to the zod schema and read it as a **literal** `process.env.EXPO_PUBLIC_X` in the `safeParse` input
(destructuring or `process.env[name]` is not inlined and yields `undefined` in a bundle).

```ts
const schema = z.object({
  // ...existing fields
  SUPPORT_EMAIL: z.email(),
  CHECKOUT_ENABLED: z.enum(['true', 'false']).default('false').transform((v) => v === 'true'),
});

const parsed = schema.safeParse({
  // ...existing fields
  SUPPORT_EMAIL: process.env.EXPO_PUBLIC_SUPPORT_EMAIL,
  CHECKOUT_ENABLED: process.env.EXPO_PUBLIC_CHECKOUT_ENABLED,
});
```

Env values are strings: parse booleans and numbers explicitly. Optional vars use `.optional()` (as `SENTRY_DSN` does);
required vars fail app start with a readable zod message. Import `env` from `@/config/env` — never read
`process.env.EXPO_PUBLIC_*` outside that file.

## 3. `.env.example`

Add `EXPO_PUBLIC_SUPPORT_EMAIL=help@example.com` with a placeholder, plus a comment if optional. Real `.env*` files are
gitignored except `.env.example`; do not create or read a real `.env` yourself (a hook denies it). Ask the human to
create `.env` for local dev.

## 4. EAS variable

EAS picks a build's environment from the profile: `environment` if set, else `distribution: store` → `production`,
`developmentClient` → `development`, otherwise `preview` (from eas-cli 24.11.0 source and the EAS docs). For today's four
profiles that reads `development*` → `development`, `preview` → `preview`, `production` → `production`. A value must exist
in each environment whose builds need it:

(Blocks are bash; in PowerShell replace the trailing `\` with a backtick or put the command on one line.)

```bash
bun run eas env:set --name EXPO_PUBLIC_SUPPORT_EMAIL --value help@example.com \
  --visibility plaintext --environment development --environment preview --environment production --non-interactive
bun run eas env:list --environment preview        # verify (never add --include-sensitive: it prints sensitive values)
```

Writing to `production` is a human gate: show the exact command and wait. Rules:

- `EXPO_PUBLIC_*` must be `plaintext` or `sensitive`. `secret` variables are absent from EAS CLI config resolution,
  `eas update` and `env:pull`; they are provided only to EAS Build and EAS Workflows jobs ([Expo](https://docs.expo.dev/eas/environment-variables/)). A `secret` `EXPO_PUBLIC_*` would therefore be
  `undefined` when `app.config.ts` is evaluated locally, and a guard like step 5's throws. Do not give it the prefix.
- `secret` is for build-job credentials only (row 2 above).
- Local values: the human runs `bun run eas env:pull --environment development --path .env.local` in their own
  terminal (a hook denies any `.env*` path in agent commands). Never print or read the file. `secret` variables are not pulled.
- Add an explicit `"environment": "development" | "preview" | "production"` to each `eas.json` build profile instead of
  relying on EAS's implicit mapping — propose it, do not edit `eas.json` silently.

## 5. Fail the build, not the launch

`app.config.ts` already throws when `EXPO_PUBLIC_API_URL` is missing outside development, and `env.ts` requires https
there. If the new variable is required for a working release, add the same kind of guard next to it:

```ts
if (APP_ENV !== 'development' && !process.env.EXPO_PUBLIC_SUPPORT_EMAIL) {
  throw new Error(`EXPO_PUBLIC_SUPPORT_EMAIL is not set for the "${APP_ENV}" build.`);
}
```

Never read a `secret` variable in `app.config.ts`, and never copy any env value into `extra` — `extra` is also public.

## Platform variables: `APP_ENV` and `EXPO_PUBLIC_APP_ENV`

Both are set in each `eas.json` profile `env`. `APP_ENV` selects bundle ids in `app.config.ts`; `EXPO_PUBLIC_APP_ENV` is
read by `env.ts`. `eas update` does not read the profile `env`, so pass both on the command line (see the `release`
skill) or define them as plaintext EAS variables per environment. Do not change them without asking.

## The EAS project id: `EAS_PROJECT_ID`

A plain variable, not secret and not `EXPO_PUBLIC_`. `app.config.ts` writes it into `extra.eas.projectId` and
`updates.url`, so it ships in the app config. That is the one deliberate exception to "never copy an env value into
`extra`", and it is fine because the id is public (it is in the update URL). `.env.example` carries only an empty
`EAS_PROJECT_ID=`; the real value never goes into git. Expo CLI reads it from your gitignored `.env`; EAS CLI does not
read `.env`, so set it in the shell for `bun run eas ...` (bash `export`, PowerShell `$env:`; per terminal or in a shell profile; `docs/setup.md` step 4).

## 6. Verify

```bash
bun run typecheck && bun run test
```

Add a Jest test for any new transform (`env.ts` runs at import; load it inside `jest.isolateModules` after setting
`process.env.EXPO_PUBLIC_*`). A changed `EXPO_PUBLIC_*` value only reaches users via a new build or an `eas update`
published with `--environment`; it does not change the fingerprint.

## If a secret reached the bundle or git

Treat it as public: rotate it at the provider first, then remove it from the code and the EAS environment. Deleting
the commit does not un-leak it. Run the `mobile-security-auditor` agent on the fix.
