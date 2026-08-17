import type { Theme } from '@shared/schema';

/**
 * The studio's own colours, which a client theme overrides one key at a time.
 *
 * These must match the `@theme` block in src/styles/index.css. A unit test reads
 * that file and compares, so the two cannot drift apart unnoticed.
 */
export const DEFAULT_PALETTE = {
  paper: '#f4efe6',
  ink: '#1a1a1a',
  muted: '#5c5548',
  rule: '#d8d0c2',
  track: '#7a73b0',
  dot: '#453f7a',
  note: '#f6d4c8',
  noteBorder: '#b35f45',
  noteInk: '#1a1a1a',
  notePlaceholder: '#6e5d57',
  focus: '#2f2a55',
} as const;

export type PaletteKey = keyof typeof DEFAULT_PALETTE;

/** The colour actually in force for one key, once a theme has had its say. */
export function resolveColour(theme: Theme | undefined, key: PaletteKey): string {
  const override = theme?.[key];
  return typeof override === 'string' && override.trim().length > 0
    ? override.trim()
    : DEFAULT_PALETTE[key];
}
