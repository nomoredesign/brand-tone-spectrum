import { describe, expect, it } from 'vitest';
import { checkTheme, contrastRatio, failingChecks, parseHex } from './contrast';

describe('parseHex', () => {
  it('reads both the short and the long form', () => {
    expect(parseHex('#fff')).toEqual([255, 255, 255]);
    expect(parseHex('#ffffff')).toEqual([255, 255, 255]);
    expect(parseHex('1a1a1a')).toEqual([26, 26, 26]);
  });

  it('reports anything it cannot read rather than guessing', () => {
    expect(parseHex('rebeccapurple')).toBeNull();
    expect(parseHex('rgb(0,0,0)')).toBeNull();
    expect(parseHex('#12345')).toBeNull();
    expect(parseHex('')).toBeNull();
  });
});

describe('contrastRatio', () => {
  it('gives the known ends of the range', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrastRatio('#777777', '#777777')).toBeCloseTo(1, 5);
  });

  it('does not care which way round the two colours are given', () => {
    expect(contrastRatio('#1a1a1a', '#f4efe6')).toBe(contrastRatio('#f4efe6', '#1a1a1a'));
  });

  it('reports nothing when a colour cannot be read', () => {
    expect(contrastRatio('not a colour', '#ffffff')).toBeNull();
  });
});

describe('checkTheme', () => {
  it('passes the studio palette, which is what the defaults were chosen for', () => {
    expect(failingChecks(undefined)).toEqual([]);
  });

  it('passes the demo client palette', () => {
    const demo = {
      paper: '#F1F0EC',
      ink: '#171717',
      muted: '#55564E',
      track: '#6E7A9A',
      dot: '#2E3A5C',
      note: '#DDE7DC',
      noteBorder: '#4E6B4C',
      notePlaceholder: '#5A6459',
      focus: '#2E3A5C',
    };
    expect(failingChecks(demo)).toEqual([]);
  });

  it('catches text that is too pale to read', () => {
    const failures = failingChecks({ ink: '#e8e4dc' });
    expect(failures.map((check) => check.label)).toContain('Labels and headings on the paper');
  });

  it('catches a track that fades into the paper', () => {
    // The pale lavender the original slide uses is not strong enough on its own.
    const failures = failingChecks({ track: '#b9b3d6' });
    expect(failures.map((check) => check.label)).toContain('The dashed track on the paper');
  });

  it('holds a line to 3 for parts that are not text, and 4.5 for parts that are', () => {
    const checks = checkTheme(undefined);
    expect(checks.find((check) => check.foreground === 'track')?.required).toBe(3);
    expect(checks.find((check) => check.foreground === 'ink')?.required).toBe(4.5);
  });

  it('treats a colour it cannot read as a failure rather than a pass', () => {
    const failures = failingChecks({ ink: 'not a colour' });
    expect(failures.some((check) => check.ratio === null)).toBe(true);
  });
});
