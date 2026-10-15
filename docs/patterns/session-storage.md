# Session storage: chunked SecureStore or encrypted MMKV

Optional pattern. Apply it only when your auth SDK asks you for a storage adapter.

## Concept

Some auth SDKs keep the session (access token, refresh token, user object) as one JSON string and ask the app where to store it. Two options:

- **SecureStore (Keychain / Keystore).** On iOS it uses the Keychain. On Android it uses SharedPreferences encrypted with a Keystore key; whether that key is hardware-backed depends on the device (inferred from Android Keystore behaviour, not stated by Expo). Expo enforces no size limit, but notes that some iOS releases historically refused values above roughly 2048 bytes ([Expo](https://docs.expo.dev/versions/v57.0.0/sdk/securestore/)). A session with user metadata can exceed that, so the adapter splits the value into chunks.
- **MMKV encrypted with a key kept in SecureStore.** The key is small, so it fits. MMKV reads are synchronous (no async restore flicker) and have no practical size limit. This is the option planned for the Supabase variant (ADR 0006).

Use the `AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY` accessibility for the SecureStore entries. They are readable in a background launch after the first unlock, and on iOS never restored to another device from a backup. Android ignores that option; the `expo-secure-store` plugin's backup rules keep SecureStore out of Android backups instead (ADR 0006).

Encrypted storage does not cover the HTTP cache. On iOS, the default URL cache kept a plain-text copy of a Supabase sign-in request and response in `Cache.db` (ADR 0004). Disable the URL cache too, as the Supabase variant does.

## Example

```ts
const KEY = 'session.key';
let key = await SecureStore.getItemAsync(KEY);
if (!key) {
  key = bytesToHex(Crypto.getRandomBytes(16)); // 32 hex characters
  await SecureStore.setItemAsync(KEY, key, {
    keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
  });
}
const sessionStorage = createMMKV({ id: 'session', encryptionKey: key, encryptionType: 'AES-256' });

export const authStorage = {
  getItem: (name: string) => sessionStorage.getString(name) ?? null,
  setItem: (name: string, value: string) => sessionStorage.set(name, value),
  removeItem: (name: string) => sessionStorage.remove(name),
};
```

AES-256 uses up to 32 bytes of the key; this 32-character key fills it (16 random bytes as hex, so 128 bits of entropy). The default AES-128 uses only the first 16 bytes. MMKV truncates a longer key without an error ([MMKV](https://github.com/Tencent/MMKV/wiki/android_advance); `AESCrypt.cpp` copies at most the maximum key length). So a 64-character hex key with the default silently becomes a 16-character key, about 64 bits of entropy.

A chunked SecureStore adapter instead stores `name.count` plus `name.0`, `name.1`, ... of about 1.5 KB each, and reassembles them on read.

## Limitations

- If the key is lost (new device restore, keychain reset) the MMKV file cannot be decrypted. Treat a failed decrypt as signed out and delete the file.
- Chunk writes are not atomic. Validate the count and every chunk on read, and treat an incomplete set as signed out.
- A locked keychain (a launch before first unlock) makes the key read fail. Report signed out, then read again when the app returns to the foreground.
- MMKV's encryption is AES, CFB-128 by default with an AES-256 option ([MMKV](https://github.com/Tencent/MMKV/wiki/android_advance)). It protects the file at rest; the key in the keychain is the real boundary.

## Scope

- Fits: SDKs that persist one large session JSON through a storage adapter.
- Does not fit: SDKs that persist their own session in the native keychain (the native Firebase SDK), or apps that keep only a short opaque token (store it in SecureStore directly).
