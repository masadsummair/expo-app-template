import { twMerge } from 'tailwind-merge';

/** Joins class names, letting later classes override earlier conflicting ones. */
export function cn(...classes: (string | false | null | undefined)[]): string {
  return twMerge(classes.filter(Boolean).join(' '));
}
