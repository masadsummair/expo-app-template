import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

import * as haptics from './haptics';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(async () => undefined),
  selectionAsync: jest.fn(async () => undefined),
  notificationAsync: jest.fn(async () => undefined),
  performAndroidHapticsAsync: jest.fn(async () => undefined),
  ImpactFeedbackStyle: { Light: 'light' },
  NotificationFeedbackType: { Success: 'success', Error: 'error' },
  AndroidHaptics: {
    Virtual_Key: 'virtual-key',
    Segment_Tick: 'segment-tick',
    Toggle_On: 'toggle-on',
    Toggle_Off: 'toggle-off',
    Confirm: 'confirm',
    Reject: 'reject',
  },
}));

const setOS = (os: 'ios' | 'android') =>
  Object.defineProperty(Platform, 'OS', { value: os, configurable: true });

afterEach(() => jest.clearAllMocks());

describe('haptics', () => {
  it('uses UIFeedbackGenerator styles on iOS', () => {
    setOS('ios');
    haptics.tap();
    haptics.select();
    haptics.toggle(true);
    haptics.success();
    haptics.error();
    expect(Haptics.impactAsync).toHaveBeenCalledWith('light');
    expect(Haptics.selectionAsync).toHaveBeenCalledTimes(2);
    expect(Haptics.notificationAsync).toHaveBeenCalledWith('success');
    expect(Haptics.notificationAsync).toHaveBeenCalledWith('error');
    expect(Haptics.performAndroidHapticsAsync).not.toHaveBeenCalled();
  });

  it('uses Android haptic constants on Android (not the vibrator)', () => {
    setOS('android');
    haptics.tap();
    haptics.select();
    haptics.toggle(true);
    haptics.toggle(false);
    haptics.success();
    haptics.error();
    const calls = (Haptics.performAndroidHapticsAsync as jest.Mock).mock.calls.map((c) => c[0]);
    expect(calls).toEqual(['virtual-key', 'segment-tick', 'toggle-on', 'toggle-off', 'confirm', 'reject']);
    expect(Haptics.impactAsync).not.toHaveBeenCalled();
  });


  it('never throws when the native call fails', () => {
    setOS('ios');
    (Haptics.impactAsync as jest.Mock).mockRejectedValueOnce(new Error('no motor'));
    expect(() => haptics.tap()).not.toThrow();
  });
});
