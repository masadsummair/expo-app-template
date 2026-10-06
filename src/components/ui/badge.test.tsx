import { render, screen } from '@testing-library/react-native';

import { Badge } from './badge';

describe('Badge', () => {
  it('renders its label but is hidden from accessibility', async () => {
    await render(<Badge label="New" variant="primary" testID="row-badge" />);
    expect(screen.queryByText('New')).toBeNull();
    expect(screen.getByText('New', { includeHiddenElements: true })).toBeTruthy();
  });
});
