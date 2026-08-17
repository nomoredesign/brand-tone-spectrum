import type { CSSProperties } from 'react';
import type { Theme } from '@shared/schema';

/** Style objects may carry custom properties as well as ordinary declarations. */
type CssVars = CSSProperties & Partial<Record<`--${string}`, string>>;

/**
 * Each theme key maps to exactly one custom property. Setting them on the sheet
 * re-skins everything inside it, because every colour in the stylesheet reads
 * from these rather than from a literal.
 */
const CUSTOM_PROPERTY: ReadonlyArray<readonly [keyof Theme, `--${string}`]> = [
  ['paper', '--color-paper'],
  ['ink', '--color-ink'],
  ['muted', '--color-muted'],
  ['rule', '--color-rule'],
  ['track', '--color-track'],
  ['dot', '--color-dot'],
  ['note', '--color-note'],
  ['noteBorder', '--color-note-border'],
  ['noteInk', '--color-note-ink'],
  ['notePlaceholder', '--color-note-placeholder'],
  ['focus', '--color-focus'],
  ['fontDisplay', '--font-display'],
  ['fontBody', '--font-body'],
];

export function themeStyle(theme: Theme | undefined): CssVars {
  const style: CssVars = {};
  if (!theme) return style;

  for (const [key, property] of CUSTOM_PROPERTY) {
    const value = theme[key];
    if (typeof value === 'string' && value.length > 0) style[property] = value;
  }

  return style;
}
