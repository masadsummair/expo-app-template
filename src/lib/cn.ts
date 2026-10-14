import { extendTailwindMerge } from 'tailwind-merge';

// `text-body` (src/global.css) is a font size. Without this, tailwind-merge reads it as a text colour and
// `text-foreground` would remove it.
const twMerge = extendTailwindMerge({
  extend: { classGroups: { 'font-size': [{ text: ['body'] }] } },
});

/** Joins class names, letting later classes override earlier conflicting ones. */
export function cn(...classes: (string | false | null | undefined)[]): string {
  return twMerge(classes.filter(Boolean).join(' '));
}
