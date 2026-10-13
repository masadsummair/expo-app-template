#!/usr/bin/env bun
/**
 * Writes docs/standards.md from standards/*.json. docs:check fails when the file is stale.
 * Usage: bun scripts/gen-standards.ts [repoRoot]
 */
import { writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { loadStandards, renderStandards } from './lib/standards';

const root = resolve(process.argv[2] ?? process.cwd());
writeFileSync(join(root, 'docs', 'standards.md'), renderStandards(loadStandards(root)));
console.log('standards:gen wrote docs/standards.md');
