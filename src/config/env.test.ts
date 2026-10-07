const flags = globalThis as unknown as { __DEV__: boolean };
const realDev = flags.__DEV__;
const realEnv = { ...process.env };

function loadEnv() {
  let loaded: typeof import('./env') | undefined;
  jest.isolateModules(() => {
    loaded = jest.requireActual<typeof import('./env')>('./env');
  });
  return loaded?.env;
}

afterEach(() => {
  flags.__DEV__ = realDev;
  process.env = { ...realEnv };
});

describe('env', () => {
  it('defaults APP_ENV to development in dev builds', () => {
    flags.__DEV__ = true;
    delete process.env.EXPO_PUBLIC_APP_ENV;
    expect(loadEnv()?.APP_ENV).toBe('development');
  });

  it('defaults APP_ENV to production outside dev builds, so a missing variable fails closed', () => {
    flags.__DEV__ = false;
    delete process.env.EXPO_PUBLIC_APP_ENV;
    expect(loadEnv()?.APP_ENV).toBe('production');
  });

  it('requires https outside development', () => {
    flags.__DEV__ = false;
    delete process.env.EXPO_PUBLIC_APP_ENV;
    process.env.EXPO_PUBLIC_API_URL = 'http://api.test';
    expect(loadEnv).toThrow('https://');
  });

  it('uses an explicit EXPO_PUBLIC_APP_ENV', () => {
    process.env.EXPO_PUBLIC_APP_ENV = 'preview';
    expect(loadEnv()?.APP_ENV).toBe('preview');
  });
});
