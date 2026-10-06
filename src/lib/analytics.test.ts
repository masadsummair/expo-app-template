import { identify, screen, setAnalyticsAdapter, track } from './analytics';

afterEach(() => setAnalyticsAdapter(null));

describe('analytics', () => {
  it('is a safe no-op without an adapter', () => {
    expect(() => {
      track('signed_in');
      identify('u1');
      screen('Home');
    }).not.toThrow();
  });

  it('forwards calls to the adapter', () => {
    const adapter = { track: jest.fn(), identify: jest.fn(), screen: jest.fn() };
    setAnalyticsAdapter(adapter);
    track('purchase', { plan: 'pro', count: 1 });
    identify('user-1');
    screen('Settings');
    expect(adapter.track).toHaveBeenCalledWith('purchase', { plan: 'pro', count: 1 });
    expect(adapter.identify).toHaveBeenCalledWith('user-1');
    expect(adapter.screen).toHaveBeenCalledWith('Settings');
  });

  it('swaps adapters and restores the no-op with null', () => {
    const a = { track: jest.fn(), identify: jest.fn(), screen: jest.fn() };
    const b = { track: jest.fn(), identify: jest.fn(), screen: jest.fn() };
    setAnalyticsAdapter(a);
    setAnalyticsAdapter(b);
    track('x');
    expect(a.track).not.toHaveBeenCalled();
    expect(b.track).toHaveBeenCalledTimes(1);
    setAnalyticsAdapter(null);
    track('y');
    expect(b.track).toHaveBeenCalledTimes(1);
  });

  it('swallows adapter errors', () => {
    setAnalyticsAdapter({
      track: () => {
        throw new Error('vendor down');
      },
      identify: jest.fn(),
      screen: jest.fn(),
    });
    expect(() => track('x')).not.toThrow();
  });
});
