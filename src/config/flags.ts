/*
 * Build-time feature flags from EXPO_PUBLIC_FLAG_* env vars (inlined into the bundle: not secret,
 * not remotely toggleable). Each must be read as a literal `process.env.EXPO_PUBLIC_FLAG_X`
 * expression — destructuring or dynamic access returns undefined. Add new flags to .env.example.
 * Truthy values: "true" or "1" (case-insensitive); anything else falls back to the default.
 */
export function parseFlag(raw: string | undefined, fallback: boolean): boolean {
  if (raw === undefined) return fallback;
  const value = raw.trim().toLowerCase();
  if (value === 'true' || value === '1') return true;
  if (value === 'false' || value === '0') return false;
  return fallback;
}

export const flags = {
  /** Example flag — copy this line to add more. */
  example: parseFlag(process.env.EXPO_PUBLIC_FLAG_EXAMPLE, false),
};

export type FeatureFlag = keyof typeof flags;
