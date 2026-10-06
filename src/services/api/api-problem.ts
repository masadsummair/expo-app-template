/*
 * Every API call resolves to `{ kind: 'ok', data }` or an ApiProblem — it never throws.
 * Callers switch on `kind`; `temporary` marks problems worth retrying.
 */
export type ApiProblem =
  | { kind: 'timeout'; temporary: true }
  | { kind: 'cannot-connect'; temporary: true }
  | { kind: 'server'; status: number }
  | { kind: 'unauthorized' }
  | { kind: 'forbidden' }
  | { kind: 'not-found' }
  | { kind: 'rejected'; status: number }
  | { kind: 'bad-data'; message: string }
  | { kind: 'unknown'; temporary: true };

export type ApiResult<T> = { kind: 'ok'; data: T } | ApiProblem;

export function problemFromStatus(status: number): ApiProblem {
  if (status === 401) return { kind: 'unauthorized' };
  if (status === 403) return { kind: 'forbidden' };
  if (status === 404) return { kind: 'not-found' };
  if (status >= 500) return { kind: 'server', status };
  return { kind: 'rejected', status };
}

/** Error names along the `cause` chain — expo/fetch wraps the real reason in FetchError.cause. */
function errorNames(error: unknown): string[] {
  const names: string[] = [];
  let current: unknown = error;
  for (let depth = 0; current instanceof Error && depth < 5; depth++) {
    names.push(current.name);
    current = current.cause;
  }
  return names;
}

/**
 * Classifies a rejected fetch. Expo replaces global fetch with expo/fetch, which rejects with
 * `FetchError` (not the web's TypeError) for network failures and carries the abort reason
 * (e.g. a TimeoutError from AbortSignal.timeout) in `cause`.
 */
export function problemFromError(error: unknown): ApiProblem {
  const names = errorNames(error);
  if (names.includes('TimeoutError')) return { kind: 'timeout', temporary: true };
  if (names.length > 0) return { kind: 'cannot-connect', temporary: true };
  return { kind: 'unknown', temporary: true };
}

/** Converts a problem into an Error so TanStack Query treats it as a failed query. */
export class ApiError extends Error {
  constructor(readonly problem: ApiProblem) {
    super(`API problem: ${problem.kind}`);
    this.name = 'ApiError';
  }
}
