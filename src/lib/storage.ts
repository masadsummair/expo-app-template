import { createMMKV } from 'react-native-mmkv';

/*
 * Fast synchronous key-value storage for NON-sensitive data (preferences, cache, flags).
 * Tokens and credentials go in expo-secure-store — never here.
 */
export const storage = createMMKV();

export function loadJSON<T>(key: string): T | null {
  const raw = storage.getString(key);
  if (raw === undefined) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function saveJSON(key: string, value: unknown): void {
  storage.set(key, JSON.stringify(value));
}
