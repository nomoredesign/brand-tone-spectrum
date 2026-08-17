import type { Theme } from '@shared/schema';
import { resolveColour, type PaletteKey } from './palette';

/**
 * Contrast maths, so the builder can warn about a palette before it reaches a
 * client rather than leaving it to be found by the accessibility check later.
 */

type Rgb = readonly [number, number, number];

/** Accepts #rgb and #rrggbb. Anything else is reported rather than guessed at. */
export function parseHex(colour: string): Rgb | null {
  const value = colour.trim().replace(/^#/, '');

  if (/^[0-9a-f]{3}$/i.test(value)) {
    const [r, g, b] = [...value].map((digit) => parseInt(digit + digit, 16));
    return r === undefined || g === undefined || b === undefined ? null : [r, g, b];
  }

  if (/^[0-9a-f]{6}$/i.test(value)) {
    return [
      parseInt(value.slice(0, 2), 16),
      parseInt(value.slice(2, 4), 16),
      parseInt(value.slice(4, 6), 16),
    ];
  }

  return null;
}

function channel(value: number): number {
  const fraction = value / 255;
  return fraction <= 0.03928 ? fraction / 12.92 : Math.pow((fraction + 0.055) / 1.055, 2.4);
}

function luminance([r, g, b]: Rgb): number {
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** WCAG contrast, from 1 for two identical colours to 21 for black on white. */
export function contrastRatio(a: string, b: string): number | null {
  const first = parseHex(a);
  const second = parseHex(b);
  if (first === null || second === null) return null;

  const one = luminance(first);
  const two = luminance(second);
  const [lighter, darker] = one > two ? [one, two] : [two, one];

  return (lighter + 0.05) / (darker + 0.05);
}

export type ContrastCheck = {
  /** What the pair is, in words a person can act on. */
  label: string;
  foreground: PaletteKey;
  background: PaletteKey;
  /** 4.5 for text, 3 for a line or a border. */
  required: number;
  ratio: number | null;
  passes: boolean;
};

/**
 * Text has to reach 4.5:1 against what sits behind it. The dashed track, the
 * dot and the notes border are interface parts rather than text, so 3:1 is the
 * line for those.
 */
const PAIRS: ReadonlyArray<{
  label: string;
  foreground: PaletteKey;
  background: PaletteKey;
  required: number;
}> = [
  {
    label: 'Labels and headings on the paper',
    foreground: 'ink',
    background: 'paper',
    required: 4.5,
  },
  { label: 'Quieter text on the paper', foreground: 'muted', background: 'paper', required: 4.5 },
  { label: 'The dashed track on the paper', foreground: 'track', background: 'paper', required: 3 },
  { label: 'The dot on the paper', foreground: 'dot', background: 'paper', required: 3 },
  {
    label: 'The notes border on the paper',
    foreground: 'noteBorder',
    background: 'paper',
    required: 3,
  },
  { label: 'Note text on the note', foreground: 'noteInk', background: 'note', required: 4.5 },
  {
    label: 'The note prompt on the note',
    foreground: 'notePlaceholder',
    background: 'note',
    required: 4.5,
  },
  { label: 'The focus ring on the paper', foreground: 'focus', background: 'paper', required: 3 },
];

export function checkTheme(theme: Theme | undefined): ContrastCheck[] {
  return PAIRS.map((pair) => {
    const ratio = contrastRatio(
      resolveColour(theme, pair.foreground),
      resolveColour(theme, pair.background),
    );

    return {
      ...pair,
      ratio,
      // An unreadable colour cannot be shown to pass, so it counts as a failure.
      passes: ratio !== null && ratio >= pair.required,
    };
  });
}

export function failingChecks(theme: Theme | undefined): ContrastCheck[] {
  return checkTheme(theme).filter((check) => !check.passes);
}
