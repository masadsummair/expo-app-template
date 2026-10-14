// Linted as src/components/feature/design-good.tsx.
import { Button, Text } from '@/components/ui';

export function Row({ id }: { id: string }) {
  return (
    <>
      <Button label="Open" testID={`orders-row-${id}`} onPress={() => undefined} />
      <Text variant="heading" className="bg-surface p-4 text-muted">
        Orders
      </Text>
    </>
  );
}
