import { ApiError } from './api-problem';
import { deleteAccount } from './account';

function mockFetch(status: number) {
  globalThis.fetch = jest.fn(async () => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => Promise.reject(new SyntaxError('no body')),
  })) as unknown as typeof fetch;
}

describe('deleteAccount', () => {
  it('sends DELETE /account and resolves on 204', async () => {
    mockFetch(204);
    await expect(deleteAccount()).resolves.toBeUndefined();
    const [url, init] = (globalThis.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe('https://api.test/account');
    expect(init.method).toBe('DELETE');
  });

  it('treats 200 with a JSON body as deleted too', async () => {
    globalThis.fetch = jest.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ status: 'queued' }),
    })) as unknown as typeof fetch;
    await expect(deleteAccount()).resolves.toBeUndefined();
  });

  it('throws ApiError when the server refuses', async () => {
    mockFetch(500);
    await expect(deleteAccount()).rejects.toBeInstanceOf(ApiError);
  });
});
