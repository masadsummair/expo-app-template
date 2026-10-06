import { parseFlag } from './flags';

describe('parseFlag', () => {
  it('falls back when unset or unrecognised', () => {
    expect(parseFlag(undefined, false)).toBe(false);
    expect(parseFlag(undefined, true)).toBe(true);
    expect(parseFlag('', true)).toBe(true);
    expect(parseFlag('maybe', false)).toBe(false);
  });

  it('parses true/1 and false/0 case-insensitively', () => {
    expect(parseFlag('true', false)).toBe(true);
    expect(parseFlag(' TRUE ', false)).toBe(true);
    expect(parseFlag('1', false)).toBe(true);
    expect(parseFlag('false', true)).toBe(false);
    expect(parseFlag('0', true)).toBe(false);
  });
});

describe('flags', () => {
  it('example defaults to false', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    expect(require('./flags').flags.example).toBe(false);
  });
});
