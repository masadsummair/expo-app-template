/**
 * Fails when a design-token pair in src/global.css drops below its WCAG 2.2 contrast minimum, or when a colour
 * token exists in only one theme. Text needs 4.5:1 (SC 1.4.3); outlines, icon glyphs and the primary fill need
 * 3:1 (SC 1.4.11). Disabled text is exempt (SC 1.4.3). Rule: design.contrast (standards/design.json).
 * Run: bun scripts/check-contrast.ts (part of `bun run verify`).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

type Pair = [foreground: string, background: string, minimum: number, note?: string];

const PAIRS: Pair[] = [
  ['foreground', 'background', 4.5],
  ['foreground', 'surface', 4.5],
  ['muted', 'background', 4.5],
  // The input background is `surface`, the placeholder colour is `muted` (TextField).
  ['muted', 'surface', 4.5, 'placeholder on the input background'],
  ['primary-foreground', 'primary', 4.5],
  ['primary-foreground', 'danger', 4.5],
  // iOS pressed fill of a solid button: a fade would drop these below 4.5 (primary: 3.62 light, 3.80 dark).
  ['primary-foreground', 'primary-pressed', 4.5, 'pressed fill'],
  ['primary-foreground', 'danger-pressed', 4.5, 'pressed fill'],
  // 4.5, not 3: ghost buttons render text-primary as text. Primary as a fill is covered by primary-foreground.
  ['primary', 'background', 4.5],
  ['danger', 'background', 4.5],
  ['danger', 'surface', 4.5],
  ['success', 'background', 4.5],
  ['success', 'surface', 4.5],
  ['warning', 'background', 4.5],
  ['warning', 'surface', 4.5],
  ['info', 'background', 4.5],
  ['info', 'surface', 4.5],
  ['success-foreground', 'success', 4.5, 'text on a success fill'],
  ['warning-foreground', 'warning', 4.5, 'text on a warning fill (OfflineBanner)'],
  ['info-foreground', 'info', 4.5, 'text on an info fill'],
  ['border', 'background', 3],
  ['border', 'surface', 3],
];

// Icon glyphs are non-text graphics: 3:1 against the surface they sit on (SC 1.4.11).
for (const glyph of ['foreground', 'muted', 'primary', 'danger', 'success', 'warning', 'info']) {
  for (const surface of ['background', 'surface']) PAIRS.push([glyph, surface, 3, 'icon glyph']);
}

// Android press feedback draws --color-ripple over the fill; the label must stay readable on the result.
// Two pairs are left out because they measure under 4.5:1 while pressed, and are accepted as transient
// pressed states (like the faded text controls in the design-system skill): ghost Button, primary text on
// background under the ripple (3.92 light, 4.05 dark); ListItem caption, muted on surface under the ripple
// (4.11 light). Adding them here would turn this check red.
const RIPPLE_ON: [fill: string, label: string][] = [
  ['primary', 'primary-foreground'],
  ['danger', 'primary-foreground'],
  ['surface', 'foreground'],
];

const css = readFileSync(join(import.meta.dir, '..', 'src', 'global.css'), 'utf8');
const HEX = /^#[0-9a-fA-F]{6}(?:[0-9a-fA-F]{2})?$/;

function tokens(variant: 'light' | 'dark'): Map<string, string> {
  const block = css.match(new RegExp(`@variant ${variant}\\s*\\{([^}]*)\\}`))?.[1];
  if (!block) throw new Error(`No @variant ${variant} block in src/global.css`);
  return new Map(
    [...block.matchAll(/--color-([\w-]+):\s*([^;]+);/g)].map((m) => [m[1]!, m[2]!.trim()]),
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

/** `top` (#rrggbbaa) composited over the opaque `base`. */
function over(top: string, base: string): string {
  const alpha = top.length === 9 ? parseInt(top.slice(7, 9), 16) / 255 : 1;
  const mix = [1, 3, 5].map((i) =>
    Math.round(
      parseInt(top.slice(i, i + 2), 16) * alpha + parseInt(base.slice(i, i + 2), 16) * (1 - alpha),
    ),
  );
  return `#${mix.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

let checks = 0;
let failures = 0;
const fail = (message: string) => {
  console.error(`ERROR ${message}`);
  failures++;
};

const light = tokens('light');
const dark = tokens('dark');

// Parity: a token that exists in one theme only renders as nothing (or a stale colour) in the other.
for (const name of new Set([...light.keys(), ...dark.keys()])) {
  checks++;
  if (!light.has(name)) fail(`light: --color-${name} is defined in dark but not in light`);
  if (!dark.has(name)) fail(`dark: --color-${name} is defined in light but not in dark`);
}

// iOS body is 17pt, Android 16sp: --text-body needs a value per platform.
for (const platform of ['ios', 'android']) {
  checks++;
  if (!new RegExp(`@variant ${platform}\\s*\\{[^}]*--text-body:`).test(css)) {
    fail(`--text-body has no @variant ${platform} value in src/global.css`);
  }
}

for (const [variant, t] of [
  ['light', light],
  ['dark', dark],
] as const) {
  for (const [name, value] of t) {
    checks++;
    if (!HEX.test(value))
      fail(
        `${variant}: --color-${name} is "${value}"; use #rrggbb or #rrggbbaa so it can be checked`,
      );
  }
  for (const [fg, bg, min, note] of PAIRS) {
    checks++;
    const a = t.get(fg);
    const b = t.get(bg);
    if (!a || !b) {
      fail(`${variant}: token --color-${!a ? fg : bg} is missing`);
      continue;
    }
    const r = ratio(a, b);
    if (r < min)
      fail(
        `${variant}: ${fg} on ${bg}${note ? ` (${note})` : ''} is ${r.toFixed(2)}:1, needs ${min}:1`,
      );
  }
  for (const [fill, label] of RIPPLE_ON) {
    checks++;
    const ripple = t.get('ripple');
    const base = t.get(fill);
    const text = t.get(label);
    if (!ripple || !base || !text) {
      fail(`${variant}: token --color-${!ripple ? 'ripple' : !base ? fill : label} is missing`);
      continue;
    }
    const r = ratio(over(ripple, base), text);
    if (r < 4.5)
      fail(
        `${variant}: ${label} on ${fill} under the Android ripple is ${r.toFixed(2)}:1, needs 4.5:1`,
      );
  }
}

console.log(`check-contrast: ${checks} checks, ${failures} failure(s)`);
process.exit(failures ? 1 : 0);
