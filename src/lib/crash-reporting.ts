import * as Sentry from '@sentry/react-native';
import type { Breadcrumb, Event as SentryEvent } from '@sentry/react-native';

import { env } from '@/config/env';

const FILTERED = '[Filtered]';
const MAX_DEPTH = 10;
// Keys whose value is a credential or personal data, whatever the value looks like.
// `session` alone or with id/token/key; `sessionCount` and `hasSession` are not secrets.
// `otp` only as a whole name, prefix or suffix, so `rootPath` is not filtered.
const SENSITIVE_KEY =
  /authorization|api[-_]?key|token$|bearer|credential|pwd|passwd|email|password|cookie|secret|jwt|^otp|[-_]otp|otp$|private[-_]?key|^session$|session[-_]?(id|token|key)/i;
// `name=value` pairs inside free text: URLs (query or fragment), query strings, error messages, log lines.
// The value stops at a quote or closing bracket, so a URL inside JSON keeps its closing `"}`.
const PARAM = /((?:^|[^\w.-])([\w.-]+)=)[^&#\s,"')\]}]*/g;
// Matched at the end of the name, so prefixed names count too (`client_secret`, `x_api_key`, `csrf_token`).
// No bare `key`: it would catch `monkey`, and Google browser keys are public anyway.
const SECRET_NAME =
  /(?:api[-_]?key|token|secret|password|passwd|session[-_]?id|verifier|signature|sig|jwt|otp|nonce)$/i;
// `code`, `email` and `session` only as a whole word or after a separator (`auth_code`), or camelCase
// `Code` (`oobCode`), so `zipcode` stays readable.
const SECRET_WORD = /(?:^|[_.-])(?:code|email|session)$/i;
const CAMEL_CODE = /[a-z\d]Code$/;
// HTTP status and error codes are not secrets, and crash reports need them (fetch breadcrumbs carry `status_code`).
const STATUS_CODE = /(?:status|error|response)[-_]?code$/i;
// One check for object keys, JSON keys and param names.
const isSensitive = (name: string) =>
  SENSITIVE_KEY.test(name) ||
  SECRET_NAME.test(name) ||
  (!STATUS_CODE.test(name) && (SECRET_WORD.test(name) || CAMEL_CODE.test(name)));
// A key inside JSON-shaped text, e.g. a logged request body: `{"access_token":"..."}`. The value is a
// string, a number, or true/false/null; every quantifier is a single class, so matching stays linear.
const JSON_PAIR = /"([^"\\]{1,128})"\s*:\s*(?:"(?:[^"\\]|\\.)*"|-?\d[\d.eE+-]*|true|false|null)/g;
// A header line in free text; the optional second token covers a scheme (`Basic`, `Token`, `Bearer`).
const AUTHORIZATION = /\bAuthorization:\s*\S+(?:\s+\S+)?/gi;
const BEARER = /\bBearer\s+[\w.~+/=-]+/gi;
const JWT = /\beyJ[\w-]+\.[\w-]+\.[\w-]+/g;
// Bounded quantifiers keep a long run of word characters with no `@` from going quadratic.
const EMAIL = /[\w.%+-]{1,64}@[\w.-]{1,255}\.[A-Za-z]{2,}/g;

function scrubString(value: string): string {
  return value
    .replace(JSON_PAIR, (pair, key: string) => (isSensitive(key) ? `"${key}":"${FILTERED}"` : pair))
    .replace(PARAM, (param, head: string, name: string) =>
      isSensitive(name) ? `${head}${FILTERED}` : param,
    )
    .replace(AUTHORIZATION, `Authorization: ${FILTERED}`)
    .replace(BEARER, `Bearer ${FILTERED}`)
    .replace(JWT, FILTERED)
    .replace(EMAIL, '[email]');
}

/**
 * Returns a scrubbed copy; the input is never mutated. Only plain objects and arrays are walked.
 * A shared reference reuses its scrubbed copy, so a shared graph cannot fan out; a cycle back to an
 * object still being copied becomes '[Circular]'.
 */
function scrubValue(value: unknown, done: Map<object, unknown>, depth = 0): unknown {
  if (typeof value === 'string') return scrubString(value);
  if (value === null || typeof value !== 'object') return value;
  if (depth >= MAX_DEPTH) return '[Truncated]';
  const isArray = Array.isArray(value);
  if (!isArray) {
    const proto: unknown = Object.getPrototypeOf(value);
    if (proto !== Object.prototype && proto !== null) return value;
  }
  if (done.has(value)) return done.get(value);
  done.set(value, '[Circular]');
  const copy = isArray
    ? value.map((item) => scrubValue(item, done, depth + 1))
    : Object.fromEntries(
        Object.entries(value).map(([key, item]) => [
          key,
          isSensitive(key) ? FILTERED : scrubValue(item, done, depth + 1),
        ]),
      );
  done.set(value, copy);
  return copy;
}

/** Sentry `beforeSend` and `beforeSendTransaction`: strips credentials, cookies and emails from an event. */
export function scrubEvent<T extends SentryEvent>(event: T): T {
  return scrubValue(event, new Map()) as T;
}

/** Sentry `beforeBreadcrumb`: the same scrub for breadcrumbs (fetch URLs, console messages). */
export function scrubBreadcrumb<T extends Breadcrumb>(breadcrumb: T): T {
  return scrubValue(breadcrumb, new Map()) as T;
}

/** Call once at startup. A no-op until EXPO_PUBLIC_SENTRY_DSN is set. */
export function initCrashReporting(): void {
  if (!env.SENTRY_DSN) return;
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.APP_ENV,
    enabled: !__DEV__,
    tracesSampleRate: env.APP_ENV === 'production' ? 0.2 : 1,
    beforeSend: scrubEvent,
    beforeSendTransaction: scrubEvent,
    beforeBreadcrumb: scrubBreadcrumb,
  });
}

/** Sentry learns the opaque user id only, never an email or a name. Pass null on sign-out. */
export function setCrashUser(user: { id: string } | null): void {
  Sentry.setUser(user ? { id: user.id } : null);
}

export function reportError(error: unknown, context?: Record<string, unknown>): void {
  if (__DEV__) console.error(error, context);
  Sentry.captureException(error, context && { extra: context });
}
