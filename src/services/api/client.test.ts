import { z } from 'zod';

import { authProvider } from '@/services/auth';

import { ApiError } from './api-problem';
import { request, requestOrThrow } from './client';

const User = z.object({ id: z.string(), name: z.string() });

function mockFetch(impl: () => Promise<Partial<Response>>) {
  globalThis.fetch = jest.fn(impl) as unknown as typeof fetch;
}

function jsonResponse(status: number, body?: unknown): Partial<Response> {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe('request', () => {
  it('returns validated data on success', async () => {
    mockFetch(async () => jsonResponse(200, { id: '1', name: 'Ada' }));
    await expect(request({ path: '/me', schema: User })).resolves.toEqual({
      kind: 'ok',
      data: { id: '1', name: 'Ada' },
    });
  });

  it('returns bad-data when the body does not match the schema', async () => {
    mockFetch(async () => jsonResponse(200, { id: 1 }));
    const result = await request({ path: '/me', schema: User });
    expect(result.kind).toBe('bad-data');
  });

  it.each([
    [401, 'unauthorized'],
    [403, 'forbidden'],
    [404, 'not-found'],
    [422, 'rejected'],
    [503, 'server'],
  ])('maps HTTP %i to %s', async (status, kind) => {
    mockFetch(async () => jsonResponse(status));
    const result = await request({ path: '/me', schema: User });
    expect(result.kind).toBe(kind);
  });

  it('maps network failures to cannot-connect', async () => {
    mockFetch(async () => {
      throw new TypeError('Network request failed');
    });
    await expect(request({ path: '/me', schema: User })).resolves.toEqual({
      kind: 'cannot-connect',
      temporary: true,
    });
  });

  it('accepts 204 when the schema allows an empty body', async () => {
    mockFetch(async () => ({ ok: true, status: 204, json: async () => Promise.reject() }));
    await expect(request({ path: '/logout', schema: z.undefined() })).resolves.toEqual({
      kind: 'ok',
      data: undefined,
    });
  });

  it('sends the provider token as a bearer token', async () => {
    jest.spyOn(authProvider, 'getAccessToken').mockResolvedValue('secret-token');
    mockFetch(async () => jsonResponse(200, { id: '1', name: 'Ada' }));
    await request({ path: '/me', schema: User });
    const [, init] = (globalThis.fetch as jest.Mock).mock.calls[0];
    expect(init.headers.Authorization).toBe('Bearer secret-token');
  });

  it('sends no Authorization header when signed out', async () => {
    jest.spyOn(authProvider, 'getAccessToken').mockResolvedValue(null);
    mockFetch(async () => jsonResponse(200, { id: '1', name: 'Ada' }));
    await request({ path: '/me', schema: User });
    const [, init] = (globalThis.fetch as jest.Mock).mock.calls[0];
    expect(init.headers).not.toHaveProperty('Authorization');
  });

  it('asks the provider for a token on every request, so a refreshed token is used', async () => {
    const getAccessToken = jest.spyOn(authProvider, 'getAccessToken');
    getAccessToken.mockResolvedValueOnce('old').mockResolvedValueOnce('new');
    mockFetch(async () => jsonResponse(200, { id: '1', name: 'Ada' }));
    await request({ path: '/me', schema: User });
    await request({ path: '/me', schema: User });
    const sent = (globalThis.fetch as jest.Mock).mock.calls.map(
      ([, init]) => init.headers.Authorization,
    );
    expect(sent).toEqual(['Bearer old', 'Bearer new']);
  });

  it('returns a problem instead of throwing when the token cannot be read', async () => {
    jest.spyOn(authProvider, 'getAccessToken').mockRejectedValue(new Error('refresh failed'));
    mockFetch(async () => jsonResponse(200, { id: '1', name: 'Ada' }));
    const result = await request({ path: '/me', schema: User });
    // Retryable, and not 'unauthorized': a failed token read must never sign the user out.
    expect(result).toEqual({ kind: 'cannot-connect', temporary: true });
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});

describe('request cancellation', () => {
  it('still reports a timeout when a caller signal is passed', async () => {
    globalThis.fetch = jest.fn(async () => {
      throw new DOMException('The operation timed out.', 'TimeoutError');
    }) as unknown as typeof fetch;
    const result = await request({
      path: '/me',
      schema: User,
      signal: new AbortController().signal,
    });
    expect(result.kind).toBe('timeout');
  });

  it('passes a caller signal to fetch, combined with the timeout', async () => {
    let received: AbortSignal | undefined;
    globalThis.fetch = jest.fn(async (_url: string, init?: RequestInit) => {
      received = init?.signal ?? undefined;
      return jsonResponse(200, { id: '1', name: 'Ada' }) as Response;
    }) as unknown as typeof fetch;
    const controller = new AbortController();

    await request({ path: '/me', schema: User, signal: controller.signal });
    expect(received?.aborted).toBe(false);
    controller.abort();
    expect(received?.aborted).toBe(true);
  });
});

describe('request origin guard', () => {
  it.each(['//evil.com/steal', 'evil.com/x', '@evil.com/x', 'https://evil.com/x'])(
    'refuses %s so the bearer token never leaves the API origin',
    async (path) => {
      const getAccessToken = jest.spyOn(authProvider, 'getAccessToken');
      mockFetch(async () => jsonResponse(200, { id: '1', name: 'Ada' }));
      await expect(request({ path, schema: User })).rejects.toThrow();
      expect(getAccessToken).not.toHaveBeenCalled();
      expect(globalThis.fetch).not.toHaveBeenCalled();
    },
  );

  it.each([
    '/orders/../admin',
    '/orders/%2e%2e/admin',
    '/orders/./x',
    '/orders/..\\admin',
    '/%2E%2E',
    '/orders/.\t./admin',
    '/orders/.\n./admin',
  ])('refuses %s so a dot segment cannot reach another endpoint', async (path) => {
    mockFetch(async () => jsonResponse(200, { id: '1', name: 'Ada' }));
    await expect(request({ path, schema: User })).rejects.toThrow();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it.each(['evil.com/x?access_token=abc', '/orders/../admin?access_token=abc'])(
    'keeps the refused path %s out of the error message, which reaches Sentry',
    async (path) => {
      mockFetch(async () => jsonResponse(200, { id: '1', name: 'Ada' }));
      await expect(request({ path, schema: User })).rejects.toMatchObject({
        message: expect.not.stringContaining('abc'),
      });
    },
  );

  it('lets a literal percent sign through instead of throwing a URIError', async () => {
    mockFetch(async () => jsonResponse(200, { id: '1', name: 'Ada' }));
    await request({ path: '/discounts/50%', schema: User });
    expect(globalThis.fetch).toHaveBeenCalled();
  });

  it('throws for an unserialisable body instead of reporting a network problem', async () => {
    mockFetch(async () => jsonResponse(200, { id: '1', name: 'Ada' }));
    const body: Record<string, unknown> = {};
    body.self = body;
    await expect(request({ path: '/me', method: 'POST', body, schema: User })).rejects.toThrow();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('keeps encoded path segments on the API origin', async () => {
    mockFetch(async () => jsonResponse(200, { id: '1', name: 'Ada' }));
    await request({ path: `/users/${encodeURIComponent('../../admin')}`, schema: User });
    const [url] = (globalThis.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe('https://api.test/users/..%2F..%2Fadmin');
  });
});

describe('requestOrThrow', () => {
  it('throws ApiError carrying the problem', async () => {
    mockFetch(async () => jsonResponse(404));
    const promise = requestOrThrow({ path: '/me', schema: User });
    await expect(promise).rejects.toBeInstanceOf(ApiError);
    await expect(promise).rejects.toMatchObject({ problem: { kind: 'not-found' } });
  });
});
