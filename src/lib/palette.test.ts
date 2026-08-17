import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DEFAULT_PALETTE, resolveColour } from './palette';

/** paper becomes --color-paper, noteBorder becomes --color-note-border. */
function customProperty(key: string): string {
  return `--color-${key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`;
}

describe('the default palette', () => {
  /*
   * The stylesheet is what the browser actually paints and this constant is what
   * the contrast checker reasons about. If they drift, the builder would pass a
   * palette the page then fails, so the two are compared here.
   */
  it('matches the colours in the stylesheet', () => {
    const css = readFileSync(join(process.cwd(), 'src/styles/index.css'), 'utf8');
    const theme = /@theme\s*\{([\s\S]*?)\n\}/.exec(css)?.[1];
    expect(theme).toBeDefined();

    const declared = new Map<string, string>();
    for (const [, name, value] of (theme ?? '').matchAll(/(--color-[a-z-]+):\s*([^;]+);/g)) {
      declared.set(name, value.trim().toLowerCase());
    }

    expect(declared.size).toBeGreaterThan(0);

    for (const [key, value] of Object.entries(DEFAULT_PALETTE)) {
      expect(declared.get(customProperty(key))).toBe(value.toLowerCase());
    }
  });
});

describe('resolveColour', () => {
  it('uses the studio colour when a theme says nothing', () => {
    expect(resolveColour(undefined, 'paper')).toBe(DEFAULT_PALETTE.paper);
    expect(resolveColour({}, 'paper')).toBe(DEFAULT_PALETTE.paper);
  });

  it('uses the theme colour when there is one', () => {
    expect(resolveColour({ paper: '#ffffff' }, 'paper')).toBe('#ffffff');
  });

  it('ignores a blank override rather than painting with nothing', () => {
    expect(resolveColour({ paper: '   ' }, 'paper')).toBe(DEFAULT_PALETTE.paper);
  });
});
