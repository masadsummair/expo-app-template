import { AppState } from 'react-native';

type NetworkListener = (state: { isConnected?: boolean }) => void;

const mockState = {
  networkListener: null as NetworkListener | null,
  appStateListener: null as ((s: string) => void) | null,
  initial: Promise.resolve({ isConnected: true } as { isConnected?: boolean }),
  remove: jest.fn(),
};

jest.mock('expo-network', () => ({
  addNetworkStateListener: (l: NetworkListener) => {
    mockState.networkListener = l;
    return { remove: mockState.remove };
  },
  getNetworkStateAsync: () => mockState.initial,
}));


type Managers = typeof import('@tanstack/react-query');

/** Fresh module graph each test so the module-level `installed` flag and the manager singletons reset. */
function load() {
  let managers!: Managers;
  let setup!: typeof import('./query-setup');
  jest.isolateModules(() => {
    /* eslint-disable @typescript-eslint/no-require-imports */
    managers = require('@tanstack/react-query');
    setup = require('./query-setup');
    /* eslint-enable @typescript-eslint/no-require-imports */
  });
  return { ...managers, ...setup };
}

const flush = () => new Promise<void>((r) => setImmediate(r));

beforeEach(() => {
  mockState.networkListener = null;
  mockState.appStateListener = null;
  mockState.initial = Promise.resolve({ isConnected: true });
  mockState.remove.mockClear();
  jest.spyOn(AppState, 'addEventListener').mockImplementation(((_: string, l: (s: string) => void) => {
    mockState.appStateListener = l;
    return { remove: mockState.remove };
  }) as never);
});
afterEach(() => jest.restoreAllMocks());

describe('query-setup', () => {
  it('drives onlineManager from network events', async () => {
    const { onlineManager } = load();
    const unsubscribe = onlineManager.subscribe(() => undefined);
    await flush();
    expect(onlineManager.isOnline()).toBe(true);
    mockState.networkListener?.({ isConnected: false });
    expect(onlineManager.isOnline()).toBe(false);
    mockState.networkListener?.({ isConnected: true });
    expect(onlineManager.isOnline()).toBe(true);
    unsubscribe();
  });

  it('applies the initial network state when no event has arrived', async () => {
    mockState.initial = Promise.resolve({ isConnected: false });
    const { onlineManager } = load();
    const unsubscribe = onlineManager.subscribe(() => undefined);
    await flush();
    expect(onlineManager.isOnline()).toBe(false);
    unsubscribe();
  });

  it('does not let a stale initial read override a listener event', async () => {
    let resolveInitial!: (s: { isConnected?: boolean }) => void;
    mockState.initial = new Promise((r) => (resolveInitial = r));
    const { onlineManager } = load();
    const unsubscribe = onlineManager.subscribe(() => undefined);
    mockState.networkListener?.({ isConnected: false });
    resolveInitial({ isConnected: true }); // stale
    await flush();
    expect(onlineManager.isOnline()).toBe(false);
    unsubscribe();
  });

  it('drives focusManager from AppState', () => {
    const { focusManager } = load();
    const unsubscribe = focusManager.subscribe(() => undefined);
    mockState.appStateListener?.('background');
    expect(focusManager.isFocused()).toBe(false);
    mockState.appStateListener?.('active');
    expect(focusManager.isFocused()).toBe(true);
    unsubscribe();
  });

  it('setupQueryManagers is idempotent', () => {
    const { setupQueryManagers, onlineManager } = load();
    setupQueryManagers();
    setupQueryManagers();
    const unsubscribe = onlineManager.subscribe(() => undefined);
    expect(mockState.networkListener).not.toBeNull();
    unsubscribe();
  });
});
