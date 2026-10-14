import { resetPlatform, setPlatform } from '../../test/platform';
import { hasLiquidGlass, sheetContentStyle } from './platform';

afterEach(resetPlatform);

describe('hasLiquidGlass', () => {
  it.each([
    ['ios', '26.0', true],
    ['ios', '27.1', true],
    ['ios', '25.4', false],
    ['ios', '18.4', false],
    ['android', 36, false],
  ] as const)('%s %s -> %s', (os, version, expected) => {
    setPlatform(os, version);
    expect(hasLiquidGlass()).toBe(expected);
  });
});

describe('sheetContentStyle', () => {
  it('iOS 26: transparent, so the native Screen view does not cover the Liquid Glass', () => {
    setPlatform('ios', '26.0');
    expect(sheetContentStyle()).toEqual({ backgroundColor: 'transparent' });
  });

  it.each([
    ['ios', '25.4'],
    ['android', 36],
  ] as const)('%s %s: undefined, so native-stack keeps the app background', (os, version) => {
    setPlatform(os, version);
    expect(sheetContentStyle()).toBeUndefined();
  });
});
