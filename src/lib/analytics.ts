/*
 * Vendor-neutral analytics facade. Everything is a no-op until an adapter is plugged in:
 *   setAnalyticsAdapter({ track, identify, screen })   // e.g. in the root layout
 * No PII by default: event props are primitives only, `identify` takes an opaque user id (never an
 * email or name), and nothing is collected automatically. Adapters must not add PII either.
 */
export type AnalyticsProps = Record<string, string | number | boolean | null>;

export type AnalyticsAdapter = {
  track: (event: string, props?: AnalyticsProps) => void;
  identify: (id: string) => void;
  screen: (name: string) => void;
};

const noop: AnalyticsAdapter = {
  track: () => undefined,
  identify: () => undefined,
  screen: () => undefined,
};

let adapter: AnalyticsAdapter = noop;

/** Pass `null` to restore the no-op adapter. */
export function setAnalyticsAdapter(next: AnalyticsAdapter | null): void {
  adapter = next ?? noop;
}

/** A broken vendor SDK must never crash the app, so adapter errors are swallowed. */
function safely(fn: () => void): void {
  try {
    fn();
  } catch {
    // ignore
  }
}

export function track(event: string, props?: AnalyticsProps): void {
  safely(() => adapter.track(event, props));
}

export function identify(id: string): void {
  safely(() => adapter.identify(id));
}

export function screen(name: string): void {
  safely(() => adapter.screen(name));
}
