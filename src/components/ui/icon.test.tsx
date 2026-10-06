import { render, screen } from '@testing-library/react-native';
import * as ReactNative from 'react-native';
import { Platform } from 'react-native';

import { Icon } from './icon';

jest.mock('expo-symbols', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return { SymbolView: (props: object) => <View testID="symbol" {...props} /> };
});

const NAME = { ios: 'gear', android: 'settings' } as const;

const setOS = (os: 'ios' | 'android') =>
  Object.defineProperty(Platform, 'OS', { value: os, configurable: true });

const setFontScale = (fontScale: number) =>
  jest
    .spyOn(ReactNative, 'useWindowDimensions')
    .mockReturnValue({ width: 400, height: 800, scale: 2, fontScale });

afterEach(() => jest.restoreAllMocks());

describe('Icon', () => {
  it('divides the Android font scale out of the glyph and pins the box', async () => {
    setOS('android');
    setFontScale(2);
    await render(<Icon name={NAME} size={24} />);
    const symbol = screen.getByTestId('symbol', { includeHiddenElements: true });
    expect(symbol.props.size).toBe(12);
    expect(symbol.props.style).toEqual({ width: 24, height: 24 });
  });

  it('leaves iOS symbols alone at any font scale', async () => {
    setOS('ios');
    setFontScale(2);
    await render(<Icon name={NAME} size={24} />);
    const symbol = screen.getByTestId('symbol', { includeHiddenElements: true });
    expect(symbol.props.size).toBe(24);
    expect(symbol.props.style).toBeUndefined();
  });

  it('is hidden from screen readers unless labelled', async () => {
    setOS('ios');
    setFontScale(1);
    await render(<Icon name={NAME} testID="icon" />);
    expect(screen.queryByRole('image')).toBeNull();
    await render(<Icon name={NAME} accessibilityLabel="Settings" />);
    expect(screen.getByRole('image', { name: 'Settings' })).toBeTruthy();
  });
});
