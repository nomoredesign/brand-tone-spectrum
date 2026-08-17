import { describe, expect, it } from 'vitest';
import type { Scale } from '@shared/schema';
import {
  clampToScale,
  describeValue,
  formatValue,
  fractionOf,
  markerValues,
  snapToStep,
} from './scale';

const scale: Scale = { min: 1, max: 5, step: 0.5, snap: false };

describe('clampToScale', () => {
  it('holds a value inside the ends', () => {
    expect(clampToScale(0, scale)).toBe(1);
    expect(clampToScale(9, scale)).toBe(5);
    expect(clampToScale(3.2, scale)).toBe(3.2);
  });

  it('falls back to the minimum for a value that is not a number', () => {
    expect(clampToScale(Number.NaN, scale)).toBe(1);
  });
});

describe('snapToStep', () => {
  it('rounds to the nearest step counted from the minimum', () => {
    expect(snapToStep(3.2, scale)).toBe(3);
    expect(snapToStep(3.3, scale)).toBe(3.5);
    expect(snapToStep(4.99, scale)).toBe(5);
  });

  it('leaves no floating point noise behind', () => {
    const tenths: Scale = { min: 0, max: 1, step: 0.1, snap: true };
    expect(snapToStep(0.7000000001, tenths)).toBe(0.7);
  });
});

describe('fractionOf', () => {
  it('reports nought at the left end and one at the right', () => {
    expect(fractionOf(1, scale)).toBe(0);
    expect(fractionOf(5, scale)).toBe(1);
    expect(fractionOf(3, scale)).toBe(0.5);
  });
});

describe('markerValues', () => {
  it('lists the whole numbers on the scale', () => {
    expect(markerValues(scale)).toEqual([1, 2, 3, 4, 5]);
  });

  it('skips numbers outside a part scale', () => {
    expect(markerValues({ min: 1.5, max: 4.5, step: 0.5, snap: false })).toEqual([2, 3, 4]);
  });
});

describe('formatValue', () => {
  it('drops a trailing nought but keeps a half', () => {
    expect(formatValue(3)).toBe('3');
    expect(formatValue(3.5)).toBe('3.5');
  });
});

describe('describeValue', () => {
  it('names both ends so a bare number is not the only clue', () => {
    expect(describeValue(3, scale, 'Feminine', 'Masculine')).toBe('3 of 5, midway');
    expect(describeValue(1, scale, 'Feminine', 'Masculine')).toBe('1 of 5, at Feminine');
    expect(describeValue(5, scale, 'Feminine', 'Masculine')).toBe('5 of 5, at Masculine');
    expect(describeValue(4.5, scale, 'Feminine', 'Masculine')).toBe('4.5 of 5, close to Masculine');
    expect(describeValue(2, scale, 'Feminine', 'Masculine')).toBe('2 of 5, leaning to Feminine');
  });
});
