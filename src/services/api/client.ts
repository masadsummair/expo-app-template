import type { z } from 'zod';

import { env } from '@/config/env';
import { useAuthStore } from '@/stores/auth-store';

import { ApiError, problemFromError, problemFromStatus, type ApiResult } from './api-problem';

const TIMEOUT_MS = 15_000;
const API_ORIGIN = new URL(env.API_URL).origin;

type RequestOptions<S extends z.ZodType> = {
  /** Absolute path on the API, e.g. `/orders/${encodeURIComponent(id)}`. */
  path: string;
  schema: S;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  /**
   * Cancels the request. Pass TanStack Query's `signal` (`queryFn: ({ signal }) => requestOrThrow({ ..., signal })`)
   * so leaving a screen or a newer fetch aborts the old one. The 15s timeout still applies.
   */
  signal?: AbortSignal;
};

/**
 * Resolves `path` against the API and refuses anything that would leave its origin, so the
 * bearer token can never be sent to another host (e.g. a `//evil.com` or `@evil.com` path
 * built from a deep-link param).
 */
function apiUrl(path: string): string {
  if (!path.startsWith('/') || path.startsWith('//')) {
    throw new Error(`API path must start with a single "/": ${path}`);
  }
  const url = new URL(env.API_URL.replace(/\/$/, '') + path);
  if (url.origin !== API_ORIGIN) throw new Error(`API path escapes the API origin: ${path}`);
  return url.toString();
}

/** Typed request: validates the response body with `schema`; never throws for HTTP/network errors. */
export async function request<S extends z.ZodType>({
  path,
  schema,
  method = 'GET',
  body,
  signal,
}: RequestOptions<S>): Promise<ApiResult<z.infer<S>>> {
  const url = apiUrl(path);
  const token = useAuthStore.getState().token;
  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined && { 'Content-Type': 'application/json' }),
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: signal
        ? AbortSignal.any([signal, AbortSignal.timeout(TIMEOUT_MS)])
        : AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    return problemFromError(error);
  }

  if (!response.ok) return problemFromStatus(response.status);

  // 204 No Content has no body; the schema decides whether `undefined` is acceptable.
  let json: unknown = undefined;
  if (response.status !== 204) {
    try {
      json = await response.json();
    } catch (error) {
      // The timeout can also fire while the body streams in — that is a timeout, not bad data.
      if (error instanceof SyntaxError) {
        return { kind: 'bad-data', message: 'Response was not valid JSON' };
      }
      return problemFromError(error);
    }
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) return { kind: 'bad-data', message: parsed.error.message };
  return { kind: 'ok', data: parsed.data };
}

/** Unwraps a result for TanStack Query: returns data or throws ApiError. */
export async function requestOrThrow<S extends z.ZodType>(
  options: RequestOptions<S>,
): Promise<z.infer<S>> {
  const result = await request(options);
  if (result.kind !== 'ok') throw new ApiError(result);
  return result.data;
}
