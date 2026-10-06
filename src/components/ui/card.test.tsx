import { render, screen } from '@testing-library/react-native';

import { Text } from './text';
import { Card } from './card';
import { Divider } from './divider';

describe('Card and Divider', () => {
  it('Card renders children without a role', async () => {
    await render(
      <Card testID="c">
        <Text>Inside</Text>
      </Card>,
    );
    expect(screen.getByText('Inside')).toBeTruthy();
    expect(screen.getByTestId('c').props.accessibilityRole).toBeUndefined();
  });

  it('Divider is hidden from accessibility', async () => {
    await render(<Divider testID="d" />);
    const el = screen.getByTestId('d');
    expect(el.props.accessible).toBe(false);
    expect(el.props.importantForAccessibility).toBe('no');
  });
});
