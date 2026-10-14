import { render } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import AppLayout from '@/app/(app)/_layout';

import { resetPlatform, setPlatform } from '../platform';

type ScreenProps = { name: string; options?: { contentStyle?: unknown } };
const mockScreens: ScreenProps[] = [];

jest.mock('expo-router', () => {
  function Stack({ children }: { children?: ReactNode }) {
    return children ?? null;
  }
  Stack.Screen = function Screen(props: ScreenProps) {
    mockScreens.push(props);
    return null;
  };
  Stack.Protected = function Protected({ children }: { children?: ReactNode }) {
    return children ?? null;
  };
  return { Stack };
});
jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);
jest.mock('@/components/offline-banner', () => ({ OfflineBanner: () => null }));

afterEach(() => {
  resetPlatform();
  mockScreens.length = 0;
});

async function aboutOptions() {
  await render(<AppLayout />);
  return mockScreens.find((s) => s.name === 'about')?.options;
}

describe('(app) layout: about form sheet', () => {
  it('iOS 26: sets a transparent contentStyle, because native-stack paints the Screen view otherwise', async () => {
    setPlatform('ios', '26.0');
    expect((await aboutOptions())?.contentStyle).toEqual({ backgroundColor: 'transparent' });
  });

  it('Android: leaves contentStyle unset', async () => {
    setPlatform('android', 36);
    expect((await aboutOptions())?.contentStyle).toBeUndefined();
  });
});
