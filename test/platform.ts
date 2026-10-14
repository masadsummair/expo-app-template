import { Platform } from 'react-native';

type OS = 'ios' | 'android';

const original = { OS: Platform.OS, Version: Platform.Version, select: Platform.select };

/**
 * jest-expo runs as iOS and hard-wires Platform.select to the iOS branch, so assigning Platform.OS alone
 * leaves select() on iOS. This sets OS, Version and select together. Call resetPlatform() in afterEach.
 */
export function setPlatform(os: OS, version: string | number = os === 'ios' ? '26.0' : 36): void {
  Object.defineProperty(Platform, 'OS', { value: os, configurable: true });
  Object.defineProperty(Platform, 'Version', { value: version, configurable: true });
  Object.defineProperty(Platform, 'select', {
    value: (spec: Record<string, unknown>) =>
      os in spec ? spec[os] : 'native' in spec ? spec.native : spec.default,
    configurable: true,
  });
}

export function resetPlatform(): void {
  Object.defineProperty(Platform, 'OS', { value: original.OS, configurable: true });
  Object.defineProperty(Platform, 'Version', { value: original.Version, configurable: true });
  Object.defineProperty(Platform, 'select', { value: original.select, configurable: true });
}
