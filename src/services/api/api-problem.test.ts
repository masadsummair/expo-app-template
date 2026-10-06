import { problemFromError, problemFromStatus } from './api-problem';

/** Mirrors expo/fetch's FetchError: a plain Error whose `cause` carries the real reason. */
function fetchError(cause?: Error) {
  return new Error('fetch failed: network', { cause });
}

function namedError(name: string) {
  return Object.assign(new Error(name), { name });
}

describe('problemFromError', () => {
  it('maps a timeout nested in FetchError.cause to timeout', () => {
    expect(problemFromError(fetchError(namedError('TimeoutError')))).toEqual({
      kind: 'timeout',
      temporary: true,
    });
  });

  it('maps a bare TimeoutError (body read) to timeout', () => {
    expect(problemFromError(namedError('TimeoutError')).kind).toBe('timeout');
  });

  it('maps expo FetchError network failures to cannot-connect', () => {
    expect(problemFromError(fetchError()).kind).toBe('cannot-connect');
  });

  it('maps the web TypeError to cannot-connect', () => {
    expect(problemFromError(new TypeError('Network request failed')).kind).toBe('cannot-connect');
  });

  it('maps non-Error rejections to unknown', () => {
    expect(problemFromError('boom').kind).toBe('unknown');
  });
});

describe('problemFromStatus', () => {
  it('only treats 5xx as server errors', () => {
    expect(problemFromStatus(500).kind).toBe('server');
    expect(problemFromStatus(499).kind).toBe('rejected');
  });
});
