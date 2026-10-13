// Linted as app code (src/**): none of this may trip a rule.
function Row(_props: { onPress: () => void }) {
  return null;
}
async function load(): Promise<void> {}
// @ts-expect-error this assignment is wrong on purpose
export const typed: number = 'x';
console.warn('allowed');
console.error('allowed');
void load();
export function Screen() {
  return <Row onPress={async () => await load()} />;
}
