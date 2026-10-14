// Tests for scripts/lib/standards.ts. Run: bun test ./test/tooling
import { describe, expect, test } from 'bun:test';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { loadStandards, renderStandards, type Standards } from '../../scripts/lib/standards';

const ROOT = resolve(import.meta.dir, '../..');

/** A temp repo root holding a copy of standards/, with one file optionally replaced. */
function tempRoot(replace: Record<string, unknown> = {}): string {
  const root = mkdtempSync(join(tmpdir(), 'standards-'));
  cpSync(join(ROOT, 'standards'), join(root, 'standards'), { recursive: true });
  for (const [name, value] of Object.entries(replace)) {
    writeFileSync(join(root, 'standards', `${name}.json`), JSON.stringify(value));
  }
  return root;
}

const rule = (extra: object = {}) => ({
  rule: 'r',
  why: 'w',
  enforcement: { kind: 'human' },
  ...extra,
});

describe('loadStandards', () => {
  test('loads the real files: 13 core rules, variant base', () => {
    const s = loadStandards(ROOT);
    expect(Object.keys(s.core.rules)).toHaveLength(13);
    expect(s.variant).toEqual({ variant: 'base', rules: {} });
  });

  test('names the file when a rule is missing its why', () => {
    const core = JSON.parse(readFileSync(join(ROOT, 'standards/core.json'), 'utf8'));
    core.rules['core.minimal-abstraction'] = { rule: 'x', enforcement: { kind: 'human' } };
    expect(() => loadStandards(tempRoot({ core }))).toThrow(/standards\/core\.json: .*why/s);
  });

  test('rejects an enforcement key that is a typo (strict objects)', () => {
    const design = {
      rules: { 'design.x': rule({ enforcement: { kind: 'script', chek: 'docs:check' } }) },
    };
    expect(() => loadStandards(tempRoot({ design }))).toThrow(/standards\/design\.json/);
  });

  test('rejects a rule id with the wrong prefix for its file', () => {
    const design = { rules: { 'core.sneaky': rule() } };
    expect(() => loadStandards(tempRoot({ design }))).toThrow(/standards\/design\.json/);
    const variant = { variant: 'base', rules: { 'design.x': rule() } };
    expect(() => loadStandards(tempRoot({ variant }))).toThrow(/standards\/variant\.json/);
  });

  test('rejects invalid JSON with the file name', () => {
    const root = tempRoot();
    mkdirSync(join(root, 'standards'), { recursive: true });
    writeFileSync(join(root, 'standards/variant.json'), '{ not json');
    expect(() => loadStandards(root)).toThrow(/standards\/variant\.json/);
  });
});

describe('renderStandards', () => {
  const base = loadStandards(ROOT);

  test('lists rules sorted by id with their enforcement', () => {
    const md = renderStandards(base);
    const ids = [...md.matchAll(/^### (\S+)$/gm)].map((m) => m[1]);
    expect(ids).toEqual([...ids].sort());
    expect(md).toContain('- Enforced by: script: docs:check');
    expect(md).toContain('- Enforced by: agent: mobile-security-auditor');
    expect(md).toContain('- Enforced by: human');
    // design.json is empty here and gains five rules in PR4: count what is on disk, do not hard-code it.
    const design = Object.keys(base.design.rules).length;
    expect(md).toContain(`Rules: ${13 + design} (core 13, design ${design}, variant 0)`);
  });

  test('is independent of JSON key order and ends with exactly one newline', () => {
    const reversed: Standards = {
      ...base,
      core: { ...base.core, rules: Object.fromEntries(Object.entries(base.core.rules).reverse()) },
    };
    expect(renderStandards(reversed)).toBe(renderStandards(base));
    expect(renderStandards(base).endsWith('\n')).toBe(true);
    expect(renderStandards(base).endsWith('\n\n')).toBe(false);
  });
});

describe('AGENTS.md', () => {
  const text = readFileSync(join(ROOT, 'AGENTS.md'), 'utf8');
  const tags = [
    ...text.matchAll(
      /\[((?:core|intake|backport|auth|release|design|supabase|firebase)\.[a-z0-9-]+)\]/g,
    ),
  ].map((m) => m[1]!);

  test('cites at least one rule by its [rule.id]', () => {
    expect(tags.length).toBeGreaterThan(0);
  });

  test('every [rule.id] tag names a rule that exists', () => {
    const s = loadStandards(ROOT);
    const known = new Set([
      ...Object.keys(s.core.rules),
      ...Object.keys(s.design.rules),
      ...Object.keys(s.variant.rules),
    ]);
    for (const tag of tags) expect(known.has(tag)).toBe(true);
  });
});
