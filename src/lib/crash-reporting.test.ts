import * as Sentry from '@sentry/react-native';
import type { Breadcrumb, ErrorEvent, TransactionEvent } from '@sentry/react-native';

import { initCrashReporting, scrubBreadcrumb, scrubEvent, setCrashUser } from './crash-reporting';

jest.mock('@/config/env', () => ({
  env: { SENTRY_DSN: 'https://key@o1.ingest.sentry.io/1', APP_ENV: 'production' },
}));

const event = (fields: Partial<ErrorEvent>): ErrorEvent => ({ type: undefined, ...fields });
const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.c2ln-_x';

beforeEach(() => jest.clearAllMocks());

describe('scrubEvent', () => {
  it('filters Authorization and apikey headers and keeps the rest', () => {
    const scrubbed = scrubEvent(
      event({
        request: {
          headers: {
            Authorization: `Bearer ${jwt}`,
            apikey: 'sb_publishable_123',
            Accept: 'application/json',
          },
        },
      }),
    );
    expect(scrubbed.request?.headers).toEqual({
      Authorization: '[Filtered]',
      apikey: '[Filtered]',
      Accept: 'application/json',
    });
  });

  it('filters id, access and refresh tokens and the email on the user', () => {
    const scrubbed = scrubEvent(
      event({
        extra: { idToken: 'a', access_token: 'b', 'refresh-token': 'c', where: 'auth.signOut' },
        user: { id: 'u1', email: 'ada@example.com' },
      }),
    );
    expect(scrubbed.extra).toEqual({
      idToken: '[Filtered]',
      access_token: '[Filtered]',
      'refresh-token': '[Filtered]',
      where: 'auth.signOut',
    });
    expect(scrubbed.user).toEqual({ id: 'u1', email: '[Filtered]' });
  });

  it('filters password, cookie, secret, session and auth_token keys in any case', () => {
    const scrubbed = scrubEvent(
      event({
        extra: {
          Password: 'hunter2',
          'Set-Cookie': 'sid=abc',
          client_secret: 'shh',
          sessionId: 's1',
          AUTH_TOKEN: 'z',
          where: 'auth.signIn',
        },
        request: { cookies: { sid: 'abc' }, headers: { Cookie: 'sid=abc' } },
      }),
    );
    expect(scrubbed.extra).toEqual({
      Password: '[Filtered]',
      'Set-Cookie': '[Filtered]',
      client_secret: '[Filtered]',
      sessionId: '[Filtered]',
      AUTH_TOKEN: '[Filtered]',
      where: 'auth.signIn',
    });
    expect(scrubbed.request).toEqual({
      cookies: '[Filtered]',
      headers: { Cookie: '[Filtered]' },
    });
  });

  it('removes an email from an error message string', () => {
    const scrubbed = scrubEvent(
      event({
        message: 'Sign-in failed for ada@example.com',
        exception: {
          values: [{ type: 'Error', value: 'Sign-in failed for ada@example.com (code 10)' }],
        },
      }),
    );
    expect(scrubbed.message).toBe('Sign-in failed for [email]');
    expect(scrubbed.exception?.values?.[0]?.value).toBe('Sign-in failed for [email] (code 10)');
  });

  it('removes bearer tokens and JWTs from strings', () => {
    const scrubbed = scrubEvent(event({ message: `Bearer ${jwt} then ${jwt}` }));
    expect(scrubbed.message).toBe('Bearer [Filtered] then [Filtered]');
  });

  it('returns a copy and leaves the original event alone', () => {
    const original = event({ extra: { idToken: 'a' } });
    const scrubbed = scrubEvent(original);
    expect(scrubbed).not.toBe(original);
    expect(original.extra).toEqual({ idToken: 'a' });
  });

  it('scrubs a transaction: span data, span URL descriptions and request URL', () => {
    const transaction: TransactionEvent = {
      type: 'transaction',
      transaction: 'GET /auth/v1/user',
      request: { url: `https://p.example.co/auth/v1/user?access_token=${jwt}&page=2` },
      spans: [
        {
          span_id: 'a1',
          trace_id: 't1',
          start_timestamp: 1,
          data: {
            'http.url': 'https://p.example.co/auth/v1/user?refresh_token=abc&page=2',
            'http.request.header.authorization': `Bearer ${jwt}`,
            'http.method': 'GET',
          },
          description: 'GET https://p.example.co/auth/v1/user?apikey=abc&email=ada%40example.com',
        },
      ],
    };
    const scrubbed = scrubEvent(transaction);
    expect(scrubbed.request?.url).toBe(
      'https://p.example.co/auth/v1/user?access_token=[Filtered]&page=2',
    );
    expect(scrubbed.spans?.[0]?.data).toEqual({
      'http.url': 'https://p.example.co/auth/v1/user?refresh_token=[Filtered]&page=2',
      'http.request.header.authorization': '[Filtered]',
      'http.method': 'GET',
    });
    expect(scrubbed.spans?.[0]?.description).toBe(
      'GET https://p.example.co/auth/v1/user?apikey=[Filtered]&email=[Filtered]',
    );
  });

  it('filters secret params in fragments, bare query strings, span data and free text', () => {
    const scrubbed = scrubEvent({
      type: 'transaction',
      message: 'got access_token=abc from the server',
      request: { query_string: 'token=abc&page=2' },
      breadcrumbs: [
        { message: 'myapp://cb#refresh_token=abc' },
        { message: 'https://x/#access_token=abc' },
        { message: 'myapp://cb?code=xyz&state=1' },
        { message: 'https://x/search?page=2&sort=asc' },
      ],
      spans: [
        {
          span_id: 'a1',
          trace_id: 't1',
          start_timestamp: 1,
          data: { 'http.query': 'access_token=abc' },
        },
      ],
    } satisfies TransactionEvent);
    expect(scrubbed.message).toBe('got access_token=[Filtered] from the server');
    expect(scrubbed.request?.query_string).toBe('token=[Filtered]&page=2');
    expect(scrubbed.breadcrumbs?.map((crumb) => crumb.message)).toEqual([
      'myapp://cb#refresh_token=[Filtered]',
      'https://x/#access_token=[Filtered]',
      'myapp://cb?code=[Filtered]&state=1',
      'https://x/search?page=2&sort=asc',
    ]);
    expect(scrubbed.spans?.[0]?.data).toEqual({ 'http.query': 'access_token=[Filtered]' });
  });

  it('leaves a harmless query string unchanged', () => {
    expect(scrubEvent(event({ message: '?page=2&sort=asc' })).message).toBe('?page=2&sort=asc');
  });

  it.each([
    ['?client_secret=ZZZ', '?client_secret=[Filtered]'],
    ['?new_password=x', '?new_password=[Filtered]'],
    ['?x_api_key=K', '?x_api_key=[Filtered]'],
    ['?session_id=S', '?session_id=[Filtered]'],
    ['?oobCode=A', '?oobCode=[Filtered]'],
    ['?code_verifier=V', '?code_verifier=[Filtered]'],
    ['?signature=S', '?signature=[Filtered]'],
    ['?sig=S', '?sig=[Filtered]'],
    ['?csrf_token=t', '?csrf_token=[Filtered]'],
    ['a=1,token=abc', 'a=1,token=[Filtered]'],
  ])('filters the prefixed or comma-separated secret param in %s', (message, expected) => {
    expect(scrubEvent(event({ message })).message).toBe(expected);
  });

  it.each(['?page=2', '?monkey=1', '?zipcode=12345', '?nonces=1', '?nonce_hash=1'])(
    'leaves %s unchanged: a name that only contains a secret word is not a secret',
    (message) => {
      expect(scrubEvent(event({ message })).message).toBe(message);
    },
  );

  it('keeps HTTP status and error codes, which crash reports need', () => {
    const extra = { status_code: 401, statusCode: 500, errorCode: 'E42', response_code: 200 };
    expect(scrubEvent(event({ extra })).extra).toEqual(extra);
    expect(scrubEvent(event({ message: 'failed status_code=503' })).message).toBe(
      'failed status_code=503',
    );
  });

  it.each([
    ['{"access_token":"opaque"}', '{"access_token":"[Filtered]"}'],
    ['{"password": "x", "page": "2"}', '{"password":"[Filtered]", "page": "2"}'],
    ['body {"jwt":"a\\"b","otp":"123456"}', 'body {"jwt":"[Filtered]","otp":"[Filtered]"}'],
  ])('filters a sensitive key inside a JSON string: %s', (message, expected) => {
    expect(scrubEvent(event({ message })).message).toBe(expected);
  });

  it.each(['Authorization: Basic abc', 'Authorization: Token abc', 'authorization:Bearer abc'])(
    'filters the credential in the header line %s',
    (message) => {
      expect(scrubEvent(event({ message: `sent ${message}` })).message).toBe(
        'sent Authorization: [Filtered]',
      );
    },
  );

  it('filters jwt, otp, passwd and private key keys, and keeps a key that only contains "otp"', () => {
    const scrubbed = scrubEvent(
      event({
        extra: {
          jwt: 'a',
          otpCode: 'b',
          passwd: 'c',
          private_key: 'd',
          privateKey: 'e',
          rootPath: '/',
        },
      }),
    );
    expect(scrubbed.extra).toEqual({
      jwt: '[Filtered]',
      otpCode: '[Filtered]',
      passwd: '[Filtered]',
      private_key: '[Filtered]',
      privateKey: '[Filtered]',
      rootPath: '/',
    });
  });

  // A raw nonce plus its ID token can be replayed against the backend until the token expires (ADR 0004).
  it.each([
    'code_verifier',
    'oobCode',
    'signature',
    'auth_code',
    'nonce',
    'rawNonce',
    'hashed_nonce',
  ])('filters %s the same way as an object key, as JSON text and as a URL param', (key) => {
    const scrubbed = scrubEvent(
      event({ extra: { [key]: 'a' }, message: `{"${key}":"a"} ?${key}=a` }),
    );
    expect(scrubbed.extra).toEqual({ [key]: '[Filtered]' });
    expect(scrubbed.message).toBe(`{"${key}":"[Filtered]"} ?${key}=[Filtered]`);
  });

  it.each([
    '(token=abc)',
    '{token=abc}',
    '"token=abc"',
    "'token=abc'",
    '[token=abc]',
    'err:token=abc',
    'a|token=abc',
    'a/token=abc',
  ])('filters a secret param after any non-name character: %s', (message) => {
    expect(scrubEvent(event({ message })).message).toBe(message.replace('abc', '[Filtered]'));
  });

  it('keeps a JSON string that holds a URL valid while filtering its secret param', () => {
    const message = '{"url":"https://x/?a=1&token=abc"}';
    const scrubbed = scrubEvent(event({ message })).message ?? '';
    expect(JSON.parse(scrubbed)).toEqual({ url: 'https://x/?a=1&token=[Filtered]' });
  });

  it.each([
    ['{"otp":123456}', '{"otp":"[Filtered]"}'],
    ['{"password":12345678}', '{"password":"[Filtered]"}'],
    [
      '{"token": null, "secret":true, "page":2}',
      '{"token":"[Filtered]", "secret":"[Filtered]", "page":2}',
    ],
  ])('filters a number, boolean or null under a sensitive JSON key: %s', (message, expected) => {
    expect(scrubEvent(event({ message })).message).toBe(expected);
  });

  it('scrubs 200,000-character inputs crafted against each pattern in well under a second', () => {
    const size = 200_000;
    const crafted = [
      `"${'a'.repeat(127)}`,
      '"password":-1e',
      '"a":"\\',
      '(a',
      '(token=',
      'Authorization: ',
    ].map((unit) => unit.repeat(Math.ceil(size / unit.length)).slice(0, size));
    for (const message of crafted) {
      const start = performance.now();
      scrubEvent(event({ message }));
      expect(performance.now() - start).toBeLessThan(1000);
    }
  });

  it('scrubs a 60,000-character string with no @ in well under a second', () => {
    const long = 'a'.repeat(60_000);
    const start = performance.now();
    const scrubbed = scrubEvent(event({ message: long }));
    expect(performance.now() - start).toBeLessThan(1000);
    expect(scrubbed.message).toBe(long);
  });

  it('keeps an object shared in two places, scrubbed in both', () => {
    const shared = { screen: 'home', access_token: 'secret' };
    const scrubbed = scrubEvent(event({ extra: { first: shared, second: shared } }));
    const expected = { screen: 'home', access_token: '[Filtered]' };
    expect(scrubbed.extra).toEqual({ first: expected, second: expected });
  });

  it('replaces a cyclic object with [Circular] instead of fanning out', () => {
    const cyclic: NonNullable<ErrorEvent['extra']> = {};
    for (let i = 0; i < 10; i += 1) cyclic[`self${i}`] = cyclic;
    const start = performance.now();
    const scrubbed = scrubEvent(event({ extra: { cyclic } }));
    expect(performance.now() - start).toBeLessThan(1000);
    const copy = scrubbed.extra?.cyclic;
    expect(copy).not.toBe(cyclic);
    expect(copy).toEqual(
      Object.fromEntries(Array.from({ length: 10 }, (_, i) => [`self${i}`, '[Circular]'])),
    );
  });

  it('filters any key ending in token, and bearer, credentials and pwd keys', () => {
    const scrubbed = scrubEvent(
      event({
        extra: { bearerToken: 'a', fcmToken: 'b', userToken: 'c', credentials: 'd', pwd: 'e' },
      }),
    );
    expect(scrubbed.extra).toEqual({
      bearerToken: '[Filtered]',
      fcmToken: '[Filtered]',
      userToken: '[Filtered]',
      credentials: '[Filtered]',
      pwd: '[Filtered]',
    });
  });

  it('keeps session keys that hold no secret and filters the ones that do', () => {
    const scrubbed = scrubEvent(
      event({
        extra: {
          sessionCount: 3,
          hasSession: true,
          session: 's',
          session_id: 'a',
          sessionToken: 'b',
        },
      }),
    );
    expect(scrubbed.extra).toEqual({
      sessionCount: 3,
      hasSession: true,
      session: '[Filtered]',
      session_id: '[Filtered]',
      sessionToken: '[Filtered]',
    });
  });
});

describe('scrubBreadcrumb', () => {
  it('filters secrets and emails in a request URL and message, and keeps the rest', () => {
    const crumb: Breadcrumb = {
      category: 'fetch',
      message: 'GET for ada@example.com',
      data: {
        url: 'https://p.example.co/auth/v1/user?apikey=abc&email=ada%40example.com&page=2',
        method: 'GET',
      },
    };
    expect(scrubBreadcrumb(crumb)).toEqual({
      category: 'fetch',
      message: 'GET for [email]',
      data: {
        url: 'https://p.example.co/auth/v1/user?apikey=[Filtered]&email=[Filtered]&page=2',
        method: 'GET',
      },
    });
  });
});

describe('initCrashReporting', () => {
  it('scrubs events, transactions and breadcrumbs before they leave the device', () => {
    initCrashReporting();
    expect(Sentry.init).toHaveBeenCalledWith(
      expect.objectContaining({
        beforeSend: scrubEvent,
        beforeSendTransaction: scrubEvent,
        beforeBreadcrumb: scrubBreadcrumb,
      }),
    );
  });
});

describe('setCrashUser', () => {
  it('sends the id only', () => {
    const user = { id: 'u1', email: 'ada@example.com', name: 'Ada' };
    setCrashUser(user);
    expect(Sentry.setUser).toHaveBeenCalledWith({ id: 'u1' });
  });

  it('clears the user on sign-out', () => {
    setCrashUser(null);
    expect(Sentry.setUser).toHaveBeenCalledWith(null);
  });
});
