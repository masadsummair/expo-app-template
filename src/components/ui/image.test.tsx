import { render, screen } from '@testing-library/react-native';

import { Icon } from './icon';
import { Image } from './image';

jest.mock('uniwind', () => ({
  withUniwind: (component: unknown) => component,
  useCSSVariable: () => undefined,
}));

describe('Image', () => {
  it('is decorative without a label', async () => {
    await render(<Image testID="img" source={{ uri: 'https://example.com/a.png' }} />);
    expect(screen.getByTestId('img', { includeHiddenElements: true }).props.accessible).toBe(false);
  });

  it('is an image with a label', async () => {
    await render(
      <Image
        testID="img"
        accessibilityLabel="Cover"
        source={{ uri: 'https://example.com/a.png' }}
      />,
    );
    expect(screen.getByRole('image', { name: 'Cover' })).toBeTruthy();
  });
});

describe('Icon', () => {
  const name = { ios: 'star', android: 'star' } as const;

  it('is decorative by default', async () => {
    await render(<Icon name={name} testID="icon" />);
    expect(screen.queryByTestId('icon')).toBeNull();
    expect(screen.getByTestId('icon', { includeHiddenElements: true })).toBeTruthy();
  });

  it('is an image when labelled', async () => {
    await render(<Icon name={name} testID="icon" accessibilityLabel="Favourite" />);
    expect(screen.getByRole('image', { name: 'Favourite' })).toBeTruthy();
  });
});
