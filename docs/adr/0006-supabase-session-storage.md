# 0006 · Supabase session storage

Status: Accepted, to be implemented on the `supabase` branch (PR6) · 2026-10-13

## Context

supabase-js persists the session (access and refresh tokens) through a storage adapter. Tokens must follow `core.tokens-in-keychain`. Two options were compared in the `session-storage` pattern doc: chunked `expo-secure-store`, and MMKV encrypted with a key held in `expo-secure-store`.

## Decision

Store the session in MMKV, encrypted with a 32-character key (AES-256; 16 random bytes as hex, so 128 bits of entropy) that lives in `expo-secure-store` with `AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY`. If decryption fails, treat the user as signed out and start clean.

Client options: `autoRefreshToken`, `persistSession`, `detectSessionInUrl: false`. `startAutoRefresh` and `stopAutoRefresh` follow `AppState`, with the listener registered once.

## Consequences

- MMKV reads and writes are synchronous. That narrows the refresh race in supabase-js issue #2731.
- On iOS, `AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY` keeps the key out of device backups and available to background refresh after the first unlock. Android ignores that option. There, the `expo-secure-store` config plugin's default backup rules keep SecureStore out of backups. They back up only shared preferences, so the MMKV files are not backed up either (read from the plugin's rules XML). If an app changes the rules to include MMKV, a restored file without its key must read as signed out, per the Decision above.
- A lost key means a forced sign-in, which is acceptable.
- Open supabase-js refresh issues are tracked here: #2731, #2715 and #2748.
- iOS HTTP cache: encrypted storage is not enough on iOS by itself. The local Supabase Auth (GoTrue v2.197.0) token responses carry no `no-store`, so iOS's URL cache kept a plain-text copy of the sign-in request and response in `Cache.db` (ADR 0004, spike S1). That covers the Google ID token, the raw nonce, the access and refresh tokens, and the email. Hosted Supabase is untested. PR6 disables that cache.

## Alternatives considered

- **Chunked `expo-secure-store`:** keeps everything in the keychain, but every read is asynchronous, so it does not narrow #2731.
- **Plain MMKV or AsyncStorage:** rejected by `core.tokens-in-keychain`.
