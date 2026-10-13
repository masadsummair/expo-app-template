// Linted as app code (src/**): every line below must trip one rule. See eslint-rules.test.ts.
// @ts-ignore
const ignored: number = 'x';
// @ts-expect-error short
const shortReason: number = 'x';
const element = document.getElementById('x')!;
debugger;
console.log('hi');
try {
  JSON.parse('{}');
} catch {}
try {
  JSON.parse('{}');
} catch (error) {
  throw error;
}
const cast = { a: 1 } as unknown as { b: string };
export type Bag = Record<string, unknown>;
export type Keyed = Record<PropertyKey, unknown>;
export type Indexed = { [key: string]: unknown };
export const viaNever = { a: 1 } as never as { b: string };
async function load(): Promise<void> {}
load();
const take = (callback: () => void) => callback();
take(async () => {});
// eslint-disable-next-line no-alert
export const unusedDirective = 1;
export { cast, element, ignored, shortReason };
