/**
 * Fails when an installed native dependency declares a required-reason API (in its
 * PrivacyInfo.xcprivacy) that app.config.ts `ios.privacyManifests` does not list. Apple doesn't merge
 * the manifests of static CocoaPods dependencies, and a missing reason gets the build rejected by
 * App Store Connect (https://docs.expo.dev/guides/apple-privacy/).
 * Run: bun scripts/check-privacy-manifest.ts (part of `bun run verify`).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import appConfig from '../app.config';

const root = join(import.meta.dir, '..');
const SKIP = /\/(example|Example|examples|fixtures|__tests__|test)\//;

function findManifests(dir: string, depth = 0, out: string[] = []): string[] {
  if (depth > 6) return out;
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const name of entries) {
    // Normalise: on Windows join() yields backslashes, but SKIP and the package parsing below split on '/'.
    const path = join(dir, name).replaceAll('\\', '/');
    if (name === 'PrivacyInfo.xcprivacy') {
      if (!SKIP.test(path)) out.push(path);
      continue;
    }
    if (name.startsWith('.') || name === 'android') continue;
    try {
      if (statSync(path).isDirectory()) findManifests(path, depth + 1, out);
    } catch {
      // broken symlink etc.
    }
  }
  return out;
}

// What the dependencies declare: category -> reasons -> packages.
const declared = new Map<string, Map<string, Set<string>>>();
for (const file of findManifests(join(root, 'node_modules'))) {
  const xml = readFileSync(file, 'utf8');
  const pkg = file.split('node_modules/').pop()!.split('/').slice(0, file.includes('node_modules/@') ? 2 : 1).join('/');
  const re =
    /<key>NSPrivacyAccessedAPIType<\/key>\s*<string>([^<]+)<\/string>\s*<key>NSPrivacyAccessedAPITypeReasons<\/key>\s*<array>([\s\S]*?)<\/array>/g;
  for (const m of xml.matchAll(re)) {
    const reasons = [...m[2]!.matchAll(/<string>([^<]+)<\/string>/g)].map((r) => r[1]!);
    const byReason = declared.get(m[1]!) ?? new Map<string, Set<string>>();
    for (const reason of reasons) byReason.set(reason, (byReason.get(reason) ?? new Set()).add(pkg));
    declared.set(m[1]!, byReason);
  }
}

// What the app config lists.
const config = appConfig({ config: {} } as Parameters<typeof appConfig>[0]);
const listed = new Map<string, Set<string>>();
for (const entry of config.ios?.privacyManifests?.NSPrivacyAccessedAPITypes ?? []) {
  listed.set(entry.NSPrivacyAccessedAPIType, new Set(entry.NSPrivacyAccessedAPITypeReasons));
}

let missing = 0;
for (const [category, reasons] of declared) {
  for (const [reason, packages] of reasons) {
    if (!listed.get(category)?.has(reason)) {
      console.error(
        `ERROR app.config.ts ios.privacyManifests is missing ${category} reason ${reason} (needed by ${[...packages].join(', ')})`,
      );
      missing++;
    }
  }
}

console.log(`check-privacy-manifest: ${declared.size} API categories declared by dependencies, ${missing} missing`);
process.exit(missing ? 1 : 0);
