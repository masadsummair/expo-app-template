import { render, screen } from '@testing-library/react-native';
import { Dimensions } from 'react-native';

import { resetPlatform, setPlatform } from '../../../test/platform';
import { Icon } from './icon';

jest.mock('expo-symbols', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return { SymbolView: (props: object) => <View testID="symbol" {...props} /> };
});

const NAME = { ios: 'gear', android: 'settings' } as const;

// The React Native Jest mock pins useWindowDimensions().fontScale at 2, so spying on the hook has no effect.
// useWindowDimensions reads Dimensions.get('window'), which can be spied on.
const setFontScale = (fontScale: number) =>
  jest.spyOn(Dimensions, 'get').mockReturnValue({ width: 400, height: 800, scale: 2, fontScale });

afterEach(() => {
  jest.restoreAllMocks();
  resetPlatform();
});

const symbol = () => screen.getByTestId('symbol', { includeHiddenElements: true });

describe('Icon', () => {
  // iOS icons next to text grow with it, to the same 2x cap as body text (AX5 would otherwise make a 24pt icon 86pt).
  it.each([
    [1, 24],
    [1.5, 36],
    [2, 48],
    [3.4, 48],
  ])('iOS draws the symbol at 24 x min(fontScale %s, 2) = %s', async (fontScale, box) => {
    setPlatform('ios');
    setFontScale(fontScale);
    await render(<Icon name={NAME} size={24} />);
    expect(symbol().props.size).toBe(box);
    expect(symbol().props.style).toBeUndefined();
  });

  it('Android keeps the icon at its size at large text: the font scale is divided out of the glyph, the box pinned', async () => {
    setPlatform('android');
    setFontScale(2);
    await render(<Icon name={NAME} size={24} />);
    // The system scales the glyph's font size (non-linearly on Android 14+), which left a 24dp star at ~61% of a
    // 2x box on the API 36 emulator. Dividing the scale out keeps the glyph and its box at 24.
    expect(symbol().props.size).toBe(12);
    expect(symbol().props.style).toEqual({ width: 24, height: 24 });
  });

  it('Android at default text size is a plain 24 box', async () => {
    setPlatform('android');
    setFontScale(1);
    await render(<Icon name={NAME} size={24} />);
    expect(symbol().props.size).toBe(24);
    expect(symbol().props.style).toEqual({ width: 24, height: 24 });
  });

  it('is hidden from screen readers unless labelled', async () => {
    setPlatform('ios');
    setFontScale(1);
    await render(<Icon name={NAME} testID="icon" />);
    expect(screen.queryByRole('image')).toBeNull();
    await render(<Icon name={NAME} accessibilityLabel="Settings" />);
    expect(screen.getByRole('image', { name: 'Settings' })).toBeTruthy();
  });
});
