// Linted as a test file: only the focused/skipped tests below may trip a rule.
describe.only('a', () => {
  it.only('b', () => {});
  it.skip('c', () => {});
  test.skip.each([1])('d %s', () => {});
  test.only.each([1])('e %s', () => {});
  xit('f', () => {});
  fit('g', () => {});
});
const mock = {} as unknown as string;
export type Anything = Record<string, unknown>;
export { mock };
