// Tests for scripts/check-docs.ts, run against throwaway repo roots. Run: bun test ./test/tooling
import { describe, expect, test } from 'bun:test';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { loadStandards, renderStandards } from '../../scripts/lib/standards';

const ROOT = resolve(import.meta.dir, '../..');

type Files = Record<string, string>;

/** A minimal repo root that passes docs:check, with `files` written over it. */
function makeRoot(files: Files = {}): string {
  const root = mkdtempSync(join(tmpdir(), 'docs-check-'));
  cpSync(join(ROOT, 'standards'), join(root, 'standards'), { recursive: true });
  mkdirSync(join(root, 'docs'));
  writeFileSync(join(root, 'docs/standards.md'), renderStandards(loadStandards(root)));
  writeFileSync(join(root, 'package.json'), JSON.stringify({ scripts: { 'standards:gen': 'x' } }));
  writeFileSync(join(root, '.gitattributes'), '* text=auto eol=lf\n');
  writeFileSync(join(root, 'AGENTS.md'), '# AGENTS.md\n');
  writeFileSync(join(root, 'CLAUDE.md'), '@AGENTS.md\n');
  for (const [rel, content] of Object.entries(files)) writeFileSync(join(root, rel), content);
  return root;
}

function checkDocs(root: string) {
  const r = Bun.spawnSync([process.execPath, join(ROOT, 'scripts/check-docs.ts'), root]);
  return { code: r.exitCode, out: r.stdout.toString() + r.stderr.toString() };
}

describe('docs:check standards block', () => {
  test('passes on the real repo', () => {
    const r = checkDocs(ROOT);
    expect(r.out).toContain('0 error(s), 0 warning(s)');
    expect(r.code).toBe(0);
  });

  test('passes on a fresh generated doc', () => {
    expect(checkDocs(makeRoot()).code).toBe(0);
  });

  test('fails when docs/standards.md is stale', () => {
    const root = makeRoot();
    const doc = readFileSync(join(root, 'docs/standards.md'), 'utf8');
    writeFileSync(join(root, 'docs/standards.md'), doc.replace('Variant: base', 'Variant: hand-edited'));
    const r = checkDocs(root);
    expect(r.code).toBe(1);
    expect(r.out).toContain('docs/standards.md: is stale; run `bun run standards:gen`');
  });

  test('fails when docs/standards.md is missing', () => {
    const root = makeRoot();
    rmSync(join(root, 'docs/standards.md'));
    const r = checkDocs(root);
    expect(r.code).toBe(1);
    expect(r.out).toContain('docs/standards.md: missing; run `bun run standards:gen`');
  });

  test('treats CRLF line endings as the same content', () => {
    const root = makeRoot();
    const doc = readFileSync(join(root, 'docs/standards.md'), 'utf8');
    writeFileSync(join(root, 'docs/standards.md'), doc.replace(/\n/g, '\r\n'));
    expect(checkDocs(root).code).toBe(0);
  });

  test('fails with the file name when a standards file breaks the schema', () => {
    const root = makeRoot();
    writeFileSync(join(root, 'standards/design.json'), JSON.stringify({ rules: { 'core.sneaky': { rule: 'r' } } }));
    const r = checkDocs(root);
    expect(r.code).toBe(1);
    expect(r.out).toContain('standards/design.json');
  });
});

const layout = (body: string) => `# AGENTS.md\n\n## Layout\n\n\`\`\`\n${body}\n\`\`\`\n`;

describe('docs:check Layout block', () => {
  test('fails on a path that does not exist, wherever it sits in the block', () => {
    const root = makeRoot({ 'AGENTS.md': layout('src/ routes gone/ somewhere') });
    mkdirSync(join(root, 'src'));
    const r = checkDocs(root);
    expect(r.code).toBe(1);
    expect(r.out).toContain('Layout lists `gone/` but it does not exist');
  });

  test('ignores prose words and bare file names, accepts existing paths', () => {
    const root = makeRoot({ 'AGENTS.md': layout('src/ routes, client.ts + one file per resource (app)') });
    mkdirSync(join(root, 'src'));
    expect(checkDocs(root).code).toBe(0);
  });
});

describe('docs:check agent registry', () => {
  const withAgent = (files: Files) => {
    const root = makeRoot(files);
    mkdirSync(join(root, '.claude/agents'), { recursive: true });
    writeFileSync(join(root, '.claude/agents/scout.md'), '---\nname: scout\n---\n');
    return root;
  };

  test('an agent named only in docs/ai-kit.md counts as documented', () => {
    expect(checkDocs(withAgent({ 'docs/ai-kit.md': '| `scout` | looks around |\n' })).code).toBe(0);
  });

  test('an agent named nowhere fails', () => {
    const r = checkDocs(withAgent({}));
    expect(r.code).toBe(1);
    expect(r.out).toContain('agent `scout` exists in .claude/agents but is not named in AGENTS.md, CLAUDE.md or docs/ai-kit.md');
  });
});

describe('docs:check size budget', () => {
  const lines = (n: number) => '# AGENTS.md\n' + 'x\n'.repeat(n - 1);

  test('passes right at the ratchet', () => {
    expect(checkDocs(makeRoot({ 'AGENTS.md': lines(150) })).code).toBe(0);
  });

  test('fails one line over the AGENTS.md ratchet', () => {
    const r = checkDocs(makeRoot({ 'AGENTS.md': lines(151) }));
    expect(r.code).toBe(1);
    expect(r.out).toContain('AGENTS.md: 151 lines, ratchet is 150');
  });

  test('fails when CLAUDE.md grows past its ratchet', () => {
    const r = checkDocs(makeRoot({ 'CLAUDE.md': '@AGENTS.md\n' + 'x\n'.repeat(25) }));
    expect(r.code).toBe(1);
    expect(r.out).toContain('CLAUDE.md: 26 lines, ratchet is 25');
  });

  test('counts bytes, not characters: 6,000 three-byte characters are 18,000 bytes', () => {
    const r = checkDocs(makeRoot({ 'AGENTS.md': '—'.repeat(6000) + '\n' }));
    expect(r.code).toBe(1);
    expect(r.out).toContain('AGENTS.md: 18001 bytes, ratchet is 18000');
  });

  test('hard-fails at 32 KiB combined even though the text is only 11,000 characters', () => {
    const r = checkDocs(makeRoot({ 'AGENTS.md': '—'.repeat(11_000) + '\n' }));
    expect(r.code).toBe(1);
    expect(r.out).toContain('AGENTS.md + CLAUDE.md: 33012 bytes together, over the 32 KiB hard limit');
  });
});
