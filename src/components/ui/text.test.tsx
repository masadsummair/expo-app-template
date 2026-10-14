import { render, screen } from '@testing-library/react-native';

import { resetPlatform, setPlatform } from '../../../test/platform';
import { Text } from './text';

afterEach(resetPlatform);

describe('Text', () => {
  // iOS body is uncapped (Dynamic Type reaches ~3.6x at AX5); Android's system maximum is 2x.
  it.each([
    ['ios', 'body', undefined],
    ['ios', 'caption', undefined],
    ['ios', 'heading', 1.5],
    ['ios', 'title', 1.5],
    ['ios', 'chrome', 1.3],
    ['android', 'body', 2],
    ['android', 'caption', 2],
    ['android', 'heading', 1.5],
    ['android', 'title', 1.5],
    ['android', 'chrome', 1.3],
  ] as const)('%s %s caps text scaling at %s', async (os, variant, cap) => {
    setPlatform(os);
    await render(<Text variant={variant}>Sample</Text>);
    expect(screen.getByText('Sample').props.maxFontSizeMultiplier).toBe(cap);
  });

  it('body uses the platform body size token', async () => {
    await render(<Text>Sample</Text>);
    expect(screen.getByText('Sample').props.className).toContain('text-body');
  });

  it('exposes title and heading as headers only', async () => {
    await render(
      <>
        <Text variant="title">T</Text>
        <Text variant="heading">H</Text>
        <Text>B</Text>
      </>,
    );
    expect(screen.getByRole('header', { name: 'T' })).toBeTruthy();
    expect(screen.getByRole('header', { name: 'H' })).toBeTruthy();
    expect(screen.getByText('B').props.accessibilityRole).toBeUndefined();
  });
});
