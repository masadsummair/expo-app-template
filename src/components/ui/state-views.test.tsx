import { fireEvent, render, screen } from '@testing-library/react-native';

import { EmptyState, ErrorState, LoadingView } from './state-views';

describe('LoadingView', () => {
  it('is a polite progressbar labelled Loading', async () => {
    await render(<LoadingView testID="home-loading" />);
    const view = screen.getByTestId('home-loading');
    expect(view.props.accessibilityRole).toBe('progressbar');
    expect(view.props.accessibilityLabel).toBe('Loading');
    expect(view.props.accessibilityLiveRegion).toBe('polite');
  });
});

describe('EmptyState', () => {
  it('shows title and message, and no action by default', async () => {
    await render(<EmptyState testID="home-empty" title="Nothing yet" message="Add one" />);
    expect(screen.getByText('Nothing yet')).toBeTruthy();
    expect(screen.getByText('Add one')).toBeTruthy();
    expect(screen.queryByTestId('home-empty-action')).toBeNull();
  });

  it('runs the action when pressed', async () => {
    const onPress = jest.fn();
    await render(
      <EmptyState testID="home-empty" title="Nothing yet" action={{ label: 'Add', onPress }} />,
    );
    await fireEvent.press(screen.getByTestId('home-empty-action'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

describe('ErrorState', () => {
  it('is an alert and retry calls onRetry', async () => {
    const onRetry = jest.fn();
    await render(<ErrorState testID="home-error" message="Boom" onRetry={onRetry} />);
    expect(screen.getByTestId('home-error').props.accessibilityRole).toBe('alert');
    expect(screen.getByText('Boom')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('home-error-retry'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
