#!/usr/bin/env bun
/// <reference types="node" />
/**
 * Give the template your own app identity in one step. Dry run by default; --write applies it.
 *
 *   bun scripts/rename.ts --id com.acme.app --name "Acme" --slug acme [--write]
 *
 * --id    reverse-DNS application id (iOS bundle id and Android package). Dev and preview builds append .dev / .preview.
 * --name  display name on the home screen.
 * --slug  Expo slug: lowercase letters, digits and single hyphens. The URL scheme is the slug without hyphens.
 *
 * Touches only: app.config.ts, e2e/support/build-mode.ts, package.json "name", the README title, and the example
 * ids in specs/, the authored skills deep-links, release and e2e-flow, and .claude/agents. Not touched: vendored skills, bun.lock,
 * ios/, android/ (generated; rebuild after renaming), LICENSE (see README). Refuses to run on an app that was
 * already renamed. Run it once, right after you create the repo.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = join(import.meta.dir, '..');
const TEMPLATE = { id: 'com.example.expoapptemplate', name: 'Expo App Template', slug: 'expo-app-template' };

const flags = new Map<string, string>();
const argv = process.argv.slice(2);
const write = argv.includes('--write');
for (let i = 0; i < argv.length; i++) {
  const arg = argv[i]!;
  if (!arg.startsWith('--') || arg === '--write') continue;
  const [key, inline] = arg.slice(2).split(/=(.*)/s);
  flags.set(key!, inline ?? argv[++i] ?? '');
}

function fail(message: string): never {
  console.error(`rename: ${message}`);
  process.exit(1);
}

const id = flags.get('id')?.trim();
const name = flags.get('name')?.trim();
const slug = flags.get('slug')?.trim();
if (!id || !name || !slug) {
  fail('usage: bun scripts/rename.ts --id com.acme.app --name "Acme" --slug acme [--write]');
}
if (!/^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*)+$/.test(id)) {
  fail(`--id "${id}" must be reverse-DNS: lowercase letters and digits, dot-separated, 2+ segments, each starting with a letter (e.g. com.acme.app). No underscores: iOS bundle ids reject them.`);
}
if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
  fail(`--slug "${slug}" must be lowercase letters, digits and single hyphens (e.g. acme-app).`);
}
const scheme = slug.replaceAll('-', '');
if (!/^[a-z]/.test(scheme)) fail(`--slug "${slug}" must start with a letter: the URL scheme (${scheme}) has to.`);
if (/[\r\n\\']/.test(name) || name.length > 30) {
  fail('--name must be one line, at most 30 characters, without quotes or backslashes.');
}

const rel = (path: string) => relative(root, path).replaceAll('\\', '/');
const text = (path: string) => readFileSync(path, 'utf8');
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// What the app is called now, read from app.config.ts so the guard and the replacements agree with the code.
const configPath = join(root, 'app.config.ts');
if (!existsSync(configPath)) fail('app.config.ts not found; run this from a checkout of the template.');
const config = text(configPath);
const current = {
  id: config.match(/const BASE_ID\s*=\s*'([^']+)'/)?.[1],
  name: config.match(/const BASE_NAME\s*=\s*'((?:[^'\\]|\\.)*)'/)?.[1],
  slug: config.match(/\bslug:\s*'([^']+)'/)?.[1],
  scheme: config.match(/\bscheme:\s*'([^']+)'/)?.[1],
};
if (!current.id || current.name === undefined || !current.slug || !current.scheme) {
  fail('could not read BASE_ID, BASE_NAME, slug and scheme from app.config.ts; edit them by hand.');
}

if (current.id === id && current.slug === slug && current.name === name.replaceAll("'", "\\'")) {
  console.log('rename: already named this way, nothing to do.');
  process.exit(0);
}
if (current.id !== TEMPLATE.id || current.slug !== TEMPLATE.slug || current.name !== TEMPLATE.name) {
  fail(
    `already renamed (app.config.ts has ${current.id} / "${current.name}" / ${current.slug}). ` +
      'This script only converts the untouched template; change the identity by hand from here.',
  );
}

// Old text -> new text, in a single pass so a replacement can never be matched again.
const map = new Map<string, string>([
  [current.id, id],
  [`exp+${current.slug}`, `exp+${slug}`],
  [current.scheme, scheme],
]);
const pattern = new RegExp(
  [...map.keys()]
    .sort((a, b) => b.length - a.length)
    .map(escapeRe)
    .join('|'),
  'g',
);
const swap = (s: string) => s.replace(pattern, (m) => map.get(m)!);

const mdFiles = (dir: string): string[] =>
  existsSync(dir) ? readdirSync(dir, { recursive: true, encoding: 'utf8' }).filter((f) => f.endsWith('.md')).map((f) => join(dir, f)) : [];

const edits: { path: string; before: string; after: string }[] = [];
const edit = (path: string, change: (s: string) => string) => {
  if (!existsSync(path)) return;
  const before = text(path);
  const after = change(before);
  if (after !== before) edits.push({ path, before, after });
};
/** Replace one capture group; throws if the line the script expects is gone. */
const setValue = (src: string, re: RegExp, value: string) => {
  if (!re.test(src)) fail(`expected pattern ${re} not found; the file changed shape, edit it by hand.`);
  return src.replace(re, (_, a: string, _old: string, b: string) => `${a}${value}${b}`);
};

edit(configPath, (s) => {
  let out = s;
  out = setValue(out, /(const BASE_ID\s*=\s*')([^']+)(')/, id);
  out = setValue(out, /(const BASE_NAME\s*=\s*')((?:[^'\\]|\\.)*)(')/, name.replaceAll("'", "\\'"));
  out = setValue(out, /(\bslug:\s*')([^']+)(')/, slug);
  out = setValue(out, /(\bscheme:\s*')([^']+)(')/, scheme);
  return out;
});
edit(join(root, 'e2e/support/build-mode.ts'), swap);
edit(join(root, 'package.json'), (s) => setValue(s, /^(\s*"name":\s*")([^"]*)(")/m, slug));
edit(join(root, 'README.md'), (s) => s.replace(/^# .*$/m, () => `# ${name}`));
for (const skill of ['deep-links', 'release', 'e2e-flow']) {
  for (const file of mdFiles(join(root, '.claude/skills', skill))) edit(file, swap);
}
for (const file of mdFiles(join(root, 'specs'))) edit(file, swap);
// app-tester connects the dev client through the `exp+<slug>` scheme.
for (const file of mdFiles(join(root, '.claude/agents'))) edit(file, swap);

for (const { path, before, after } of edits) {
  console.log(`\n${rel(path)}`);
  const a = before.split(/\r?\n/);
  const b = after.split(/\r?\n/);
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) console.log(`  ${String(i + 1).padStart(4)} - ${a[i]}\n  ${String(i + 1).padStart(4)} + ${b[i]}`);
  }
}
console.log(`\nrename: ${edits.length} file(s) ${write ? 'updated' : 'would change'}: id ${id}, name "${name}", slug ${slug}, scheme ${scheme}://`);

if (!write) {
  console.log('Dry run. Re-run with --write to apply.');
  process.exit(0);
}
for (const { path, after } of edits) writeFileSync(path, after);
console.log(
  [
    '',
    'Next:',
    '  1. bun install && bun run skills:sync (package name in bun.lock; renamed ids in the .agents/skills copy).',
    '  2. If ios/ or android/ exist, regenerate them: bunx --no-install expo prebuild --clean (or delete both folders).',
    '  3. bun run eas login, then bun run eas init, and put the project id in EAS_PROJECT_ID in app.config.ts.',
    '  4. Update the LICENSE copyright line if you want; keep the notices in THIRD_PARTY_NOTICES.md.',
    '  5. bun run verify',
  ].join('\n'),
);
