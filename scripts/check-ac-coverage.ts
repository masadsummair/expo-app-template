#!/usr/bin/env bun
/// <reference types="node" />
/**
 * Does every acceptance criterion in a spec have an e2e test?
 * Usage: bun scripts/check-ac-coverage.ts <slug>
 *
 * Reads the `| AC-n |` rows of specs/<slug>.md and looks for the title prefix `AC-n:` anywhere under e2e/.
 * Exit 0 when all are covered, 1 when some are missing, 2 on bad usage.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dir, '..');
const slug = process.argv[2];
if (!slug || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
  console.error('usage: bun scripts/check-ac-coverage.ts <slug>   (kebab-case, e.g. profile-edit)');
  process.exit(2);
}
const specPath = join(root, 'specs', `${slug}.md`);
if (!existsSync(specPath)) {
  console.error(`check-ac-coverage: specs/${slug}.md not found`);
  process.exit(2);
}

const ids = [...new Set([...readFileSync(specPath, 'utf8').matchAll(/^\|\s*(AC-\d+)\s*\|/gm)].map((m) => m[1]!))];
if (ids.length === 0) {
  console.error(`check-ac-coverage: specs/${slug}.md has no acceptance-criteria rows (| AC-1 | ... |)`);
  process.exit(1);
}

const e2eDir = join(root, 'e2e');
const sources = existsSync(e2eDir)
  ? readdirSync(e2eDir, { recursive: true, encoding: 'utf8' })
      .filter((f) => /\.(ts|tsx|js|jsx)$/.test(f))
      .map((f) => readFileSync(join(e2eDir, f), 'utf8'))
  : [];

// `AC-1:` must not match inside `AC-10:`, so anchor on a non-digit before the id.
const missing = ids.filter((id) => !sources.some((s) => new RegExp(`(?<!\\d)${id}:`).test(s)));
for (const id of missing) console.log(`no e2e test titled "${id}: ..." for specs/${slug}.md`);
console.log(`check-ac-coverage: ${ids.length - missing.length}/${ids.length} criteria covered`);
process.exit(missing.length ? 1 : 0);
