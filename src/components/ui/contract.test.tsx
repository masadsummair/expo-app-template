import { render, screen } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import type { AccessibilityRole, AccessibilityState } from 'react-native';

import { resetPlatform, setPlatform } from '../../../test/platform';
import { Avatar } from './avatar';
import { Badge } from './badge';
import { Button } from './button';
import { Divider } from './divider';
import { Icon } from './icon';
import { Image } from './image';
import { ListItem } from './list-item';
import { PressableScale } from './pressable-scale';
import { SheetHeader } from './sheet-header';
import { EmptyState, ErrorState, LoadingView } from './state-views';
import { Switch } from './switch';
import { Text } from './text';
import { TextField } from './text-field';

jest.mock('expo-router', () => ({ router: { back: jest.fn() } }));
jest.mock('@/lib/a11y', () => ({ announce: jest.fn() }));

type Contract = {
  name: string;
  element: ReactElement;
  testID: string;
  /** The accessibility role a screen reader announces. Omitted for inputs (label only). */
  role?: AccessibilityRole;
  /** What a screen reader says. Per platform when the platform owns the wording. */
  label?: string | { ios: string; android: string };
  /** accessibilityState the element must carry. */
  state?: AccessibilityState;
  /** Decorative: hidden from screen readers. */
  hidden?: true;
};

const noop = () => {};

const contracts: Contract[] = [
  {
    name: 'Button',
    element: <Button label="Save" testID="x-save" onPress={noop} />,
    testID: 'x-save',
    role: 'button',
    label: 'Save',
    state: { disabled: false, busy: false },
  },
  {
    name: 'Button (loading)',
    element: <Button label="Save" testID="x-save" loading />,
    testID: 'x-save',
    role: 'button',
    label: 'Save',
    state: { disabled: true, busy: true },
  },
  {
    name: 'Button (disabled)',
    element: <Button label="Save" testID="x-save" disabled />,
    testID: 'x-save',
    role: 'button',
    label: 'Save',
    state: { disabled: true },
  },
  {
    name: 'Switch (on)',
    element: <Switch label="Alerts" value testID="x-alerts" onValueChange={noop} />,
    testID: 'x-alerts',
    role: 'switch',
    label: 'Alerts',
    state: { checked: true },
  },
  {
    name: 'Switch (disabled)',
    element: (
      <Switch label="Alerts" value={false} disabled testID="x-alerts" onValueChange={noop} />
    ),
    testID: 'x-alerts',
    role: 'switch',
    label: 'Alerts',
    state: { checked: false, disabled: true },
  },
  {
    name: 'ListItem (pressable)',
    element: <ListItem title="Profile" subtitle="Edit" testID="x-row" onPress={noop} />,
    testID: 'x-row',
    role: 'button',
    label: 'Profile, Edit',
    state: { disabled: false },
  },
  {
    name: 'ListItem (disabled)',
    element: <ListItem title="Profile" testID="x-row" disabled onPress={noop} />,
    testID: 'x-row',
    role: 'button',
    label: 'Profile',
    state: { disabled: true },
  },
  {
    name: 'PressableScale',
    element: (
      <PressableScale testID="x-card" accessibilityLabel="Open orders">
        <Text>Orders</Text>
      </PressableScale>
    ),
    testID: 'x-card',
    role: 'button',
    label: 'Open orders',
  },
  {
    name: 'TextField',
    element: <TextField label="Email" testID="x-email" />,
    testID: 'x-email',
    label: 'Email',
  },
  {
    name: 'TextField (error)',
    element: <TextField label="Email" testID="x-email" error="Required" />,
    testID: 'x-email',
    label: 'Email, Required',
  },
  {
    name: 'SheetHeader close',
    element: <SheetHeader title="About" testID="x-sheet" />,
    testID: 'x-sheet-close',
    role: 'button',
    label: { ios: 'Done', android: 'Close' },
  },
  {
    name: 'EmptyState action',
    element: (
      <EmptyState testID="x-empty" title="Nothing" action={{ label: 'Add one', onPress: noop }} />
    ),
    testID: 'x-empty-action',
    role: 'button',
    label: 'Add one',
  },
  {
    name: 'ErrorState retry',
    element: <ErrorState testID="x-error" message="Failed" onRetry={noop} />,
    testID: 'x-error-retry',
    role: 'button',
    label: 'Try again',
  },
  {
    name: 'LoadingView',
    element: <LoadingView testID="x-loading" />,
    testID: 'x-loading',
    role: 'progressbar',
    label: 'Loading',
  },
  {
    name: 'Avatar',
    element: <Avatar name="Ada Lovelace" testID="x-avatar" />,
    testID: 'x-avatar',
    role: 'image',
    label: 'Ada Lovelace',
  },
  {
    name: 'Image (labelled)',
    element: (
      <Image
        source={{ uri: 'https://example.com/a.png' }}
        accessibilityLabel="Cover"
        testID="x-image"
      />
    ),
    testID: 'x-image',
    role: 'image',
    label: 'Cover',
  },
  {
    name: 'Icon (labelled)',
    element: (
      <Icon
        name={{ ios: 'gear', android: 'settings' }}
        accessibilityLabel="Settings"
        testID="x-icon"
      />
    ),
    testID: 'x-icon',
    role: 'image',
    label: 'Settings',
  },
  {
    name: 'Text heading',
    element: (
      <Text variant="heading" testID="x-heading">
        Orders
      </Text>
    ),
    testID: 'x-heading',
    role: 'header',
    label: 'Orders',
  },
  {
    name: 'Badge',
    element: <Badge label="New" testID="x-badge" />,
    testID: 'x-badge',
    hidden: true,
  },
  { name: 'Divider', element: <Divider testID="x-divider" />, testID: 'x-divider', hidden: true },
];

describe.each(['ios', 'android'] as const)('UI kit contract on %s', (os) => {
  beforeEach(() => setPlatform(os));
  afterEach(resetPlatform);

  it.each(contracts)('$name exposes its testID, role, label and state', async (contract) => {
    await render(contract.element);
    const node = screen.getByTestId(contract.testID, { includeHiddenElements: true });

    if (contract.hidden) {
      const { accessibilityElementsHidden, importantForAccessibility, accessible } = node.props;
      expect(
        accessibilityElementsHidden === true ||
          accessible === false ||
          importantForAccessibility === 'no' ||
          importantForAccessibility === 'no-hide-descendants',
      ).toBe(true);
      return;
    }

    const label = typeof contract.label === 'string' ? contract.label : contract.label?.[os];
    if (contract.role) {
      expect(screen.getByRole(contract.role, { name: label })).toBeTruthy();
    } else {
      expect(node.props.accessibilityLabel).toBe(label);
    }
    if (contract.state) expect(node.props.accessibilityState).toMatchObject(contract.state);
  });
});
