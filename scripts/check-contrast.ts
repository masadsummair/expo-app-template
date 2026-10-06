/**
 * Fails when a design-token pair in src/global.css drops below its WCAG 2.2 contrast minimum.
 * Text needs 4.5:1 (SC 1.4.3); component outlines and the primary fill need 3:1 (SC 1.4.11).
 * Run: bun scripts/check-contrast.ts (part of `bun run verify`).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

type Pair = [foreground: string, background: string, minimum: number];

const PAIRS: Pair[] = [
  ['foreground', 'background', 4.5],
  ['foreground', 'surface', 4.5],
  ['muted', 'background', 4.5],
  ['muted', 'surface', 4.5],
  ['primary-foreground', 'primary', 4.5],
  ['primary-foreground', 'danger', 4.5],
  // 4.5, not 3: ghost buttons render text-primary as text. Primary as a fill is covered by primary-foreground.
  ['primary', 'background', 4.5],
  ['danger', 'background', 4.5],
  ['danger', 'surface', 4.5],
  ['success', 'background', 4.5],
  ['success', 'surface', 4.5],
  ['warning', 'background', 4.5],
  ['warning', 'surface', 4.5],
  ['background', 'warning', 4.5],
  ['info', 'background', 4.5],
  ['info', 'surface', 4.5],
  ['border', 'background', 3],
  ['border', 'surface', 3],
];

const css = readFileSync(join(import.meta.dir, '..', 'src', 'global.css'), 'utf8');

function tokens(variant: 'light' | 'dark'): Map<string, string> {
  const block = css.match(new RegExp(`@variant ${variant}\\s*\\{([^}]*)\\}`))?.[1];
  if (!block) throw new Error(`No @variant ${variant} block in src/global.css`);
  return new Map(
    [...block.matchAll(/--color-([\w-]+):\s*(#[0-9a-fA-F]{6})/g)].map((m) => [m[1]!, m[2]!]),
  );
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

function ratio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

let failures = 0;
for (const variant of ['light', 'dark'] as const) {
  const t = tokens(variant);
  for (const [fg, bg, min] of PAIRS) {
    const a = t.get(fg);
    const b = t.get(bg);
    if (!a || !b) {
      console.error(`ERROR ${variant}: token --color-${!a ? fg : bg} is missing`);
      failures++;
      continue;
    }
    const r = ratio(a, b);
    if (r < min) {
      console.error(`ERROR ${variant}: ${fg} on ${bg} is ${r.toFixed(2)}:1, needs ${min}:1`);
      failures++;
    }
  }
}

console.log(`check-contrast: ${PAIRS.length * 2} pairs, ${failures} failure(s)`);
process.exit(failures ? 1 : 0);
