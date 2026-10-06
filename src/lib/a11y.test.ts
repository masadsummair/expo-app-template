import { AccessibilityInfo, Platform } from 'react-native';

import { announce } from './a11y';

const spy = jest
  .spyOn(AccessibilityInfo, 'announceForAccessibilityWithOptions')
  .mockImplementation(() => {});

const setOS = (os: 'ios' | 'android') => Object.defineProperty(Platform, 'OS', { value: os, configurable: true });

afterEach(() => spy.mockClear());

describe('announce', () => {
  it('announces on iOS by default (Android relies on live regions)', () => {
    setOS('ios');
    announce('Enter a valid email');
    expect(spy).toHaveBeenCalledWith('Enter a valid email', { queue: true });

    setOS('android');
    announce('Enter a valid email');
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("announces on both platforms with target 'all' (e.g. toasts)", () => {
    setOS('android');
    announce('Saved', 'all');
    expect(spy).toHaveBeenCalledWith('Saved', { queue: true });
  });

  it('ignores empty messages', () => {
    setOS('ios');
    announce('');
    expect(spy).not.toHaveBeenCalled();
  });
});
