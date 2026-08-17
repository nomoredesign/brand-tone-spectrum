import type { Scale } from '@shared/schema';

/**
 * Value maths for the spectrum, kept in one place because the dot, the number
 * markers, the keyboard steps and the spoken description all have to agree.
 */

export function clampToScale(value: number, scale: Scale): number {
  if (!Number.isFinite(value)) return scale.min;
  return Math.min(scale.max, Math.max(scale.min, value));
}

/** Rounds to the nearest step counted from the minimum, then trims float noise. */
export function snapToStep(value: number, scale: Scale): number {
  const steps = Math.round((value - scale.min) / scale.step);
  const snapped = scale.min + steps * scale.step;
  return clampToScale(Number(snapped.toFixed(6)), scale);
}

/** Where the value sits along the track, from 0 at the left to 1 at the right. */
export function fractionOf(value: number, scale: Scale): number {
  const span = scale.max - scale.min;
  if (span <= 0) return 0;
  return (clampToScale(value, scale) - scale.min) / span;
}

/**
 * A native range thumb travels between half a thumb width in from each end, so
 * the dot and the number markers are offset the same way. Without this they
 * drift apart from each other by up to half a thumb at the ends.
 */
export function trackOffset(value: number, scale: Scale): string {
  const fraction = fractionOf(value, scale);
  const percent = (fraction * 100).toFixed(4);
  return `calc(${percent}% + (0.5 - ${fraction.toFixed(6)}) * var(--thumb-size))`;
}

/** The whole numbers that run across the top of the chart, e.g. 1 to 5. */
export function markerValues(scale: Scale): number[] {
  const first = Math.ceil(scale.min);
  const last = Math.floor(scale.max);
  const markers: number[] = [];
  for (let value = first; value <= last; value += 1) markers.push(value);
  return markers;
}

/** "3" rather than "3.0", but "3.5" when it lands between the numbers. */
export function formatValue(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)));
}

/**
 * What a screen reader says for the current position. A bare number tells you
 * very little on a scale whose ends are words, so the ends are named.
 */
export function describeValue(
  value: number,
  scale: Scale,
  leftLabel: string,
  rightLabel: string,
): string {
  const fraction = fractionOf(value, scale);

  let position: string;
  if (fraction <= 0) position = `at ${leftLabel}`;
  else if (fraction < 0.25) position = `close to ${leftLabel}`;
  else if (fraction < 0.45) position = `leaning to ${leftLabel}`;
  else if (fraction <= 0.55) position = 'midway';
  else if (fraction < 0.75) position = `leaning to ${rightLabel}`;
  else if (fraction < 1) position = `close to ${rightLabel}`;
  else position = `at ${rightLabel}`;

  return `${formatValue(value)} of ${formatValue(scale.max)}, ${position}`;
}
