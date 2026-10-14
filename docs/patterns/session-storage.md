# Session storage: chunked SecureStore or encrypted MMKV

Optional pattern. Apply it only when your auth SDK asks you for a storage adapter.

## Concept

Some auth SDKs keep the session (access token, refresh token, user object) as one JSON string and ask the app where to store it. Two options:

- **SecureStore (Keychain / Keystore).** Hardware-backed, but it holds small values: Expo documents a size limit of about 2 KB per value (UNVERIFIED: current limit). A session with user metadata can exceed it, so the adapter splits the value into chunks.
- **MMKV encrypted with a key kept in SecureStore.** The key is small, so it fits. MMKV reads are synchronous (no async restore flicker) and have no practical size limit. This is the option planned for the Supabase variant (ADR 0006).

Use the `AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY` accessibility for the SecureStore entries: readable in a background launch after the first unlock, and never restored to another device from a backup.

## Example

```ts
const KEY = 'session.key';
let key = await SecureStore.getItemAsync(KEY);
if (!key) {
  key = bytesToHex(Crypto.getRandomBytes(32));
  await SecureStore.setItemAsync(KEY, key, {
    keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
  });
}
const sessionStorage = createMMKV({ id: 'session', encryptionKey: key });

export const authStorage = {
  getItem: (name: string) => sessionStorage.getString(name) ?? null,
  setItem: (name: string, value: string) => sessionStorage.set(name, value),
  removeItem: (name: string) => sessionStorage.remove(name),
};
```

A chunked SecureStore adapter instead stores `name.count` plus `name.0`, `name.1`, ... of about 1.5 KB each, and reassembles them on read.

## Limitations

- If the key is lost (new device restore, keychain reset) the MMKV file cannot be decrypted. Treat a failed decrypt as signed out and delete the file.
- Chunk writes are not atomic. Validate the count and every chunk on read, and treat an incomplete set as signed out.
- A locked keychain (a launch before first unlock) makes the key read fail. Report signed out, then read again when the app returns to the foreground.
- UNVERIFIED: MMKV's encryption is AES (CFB-128 per its docs). It protects the file at rest; the key in the keychain is the real boundary.

## Scope

- Fits: SDKs that persist one large session JSON through a storage adapter.
- Does not fit: SDKs that persist their own session in the native keychain (the native Firebase SDK), or apps that keep only a short opaque token (store it in SecureStore directly).
