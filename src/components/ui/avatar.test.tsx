import { render, screen } from '@testing-library/react-native';

import { Avatar, getInitials } from './avatar';

jest.mock('uniwind', () => ({
  withUniwind: (component: unknown) => component,
  useCSSVariable: () => undefined,
}));

describe('getInitials', () => {
  it('uses first and last word', () => {
    expect(getInitials('ada lovelace')).toBe('AL');
    expect(getInitials('  Grace Brewster Hopper ')).toBe('GH');
    expect(getInitials('Plato')).toBe('P');
    expect(getInitials('')).toBe('');
  });
});

describe('Avatar', () => {
  it('falls back to initials without a uri and labels the image with the name', async () => {
    await render(<Avatar name="Ada Lovelace" testID="profile-avatar" />);
    expect(screen.getByText('AL')).toBeTruthy();
    expect(screen.getByRole('image', { name: 'Ada Lovelace' })).toBeTruthy();
  });

  it('renders the image instead of initials when a uri is given', async () => {
    await render(<Avatar name="Ada Lovelace" uri="https://example.com/a.png" />);
    expect(screen.queryByText('AL')).toBeNull();
  });
});
