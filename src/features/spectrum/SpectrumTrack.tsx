import type { KeyboardEvent } from 'react';
import type { Scale } from '@shared/schema';
import { clampToScale, describeValue, formatValue, snapToStep, trackOffset } from '@/lib/scale';

type Props = {
  scale: Scale;
  value: number;
  leftLabel: string;
  rightLabel: string;
  readOnly: boolean;
  onChange: (value: number) => void;
};

/**
 * A native range input carries the interaction and a drawn line carries the look.
 * The input already handles dragging, clicking anywhere on the track, touch and
 * screen readers, so none of that is rebuilt here.
 *
 * Keyboard steps are handled explicitly rather than left to the browser: when a
 * client config turns snapping off the input's own step is `any`, and the arrow
 * keys would otherwise move by a hundredth of the range.
 */
export function SpectrumTrack({ scale, value, leftLabel, rightLabel, readOnly, onChange }: Props) {
  function moveTo(next: number) {
    onChange(snapToStep(clampToScale(next, scale), scale));
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    const moves: Record<string, number | undefined> = {
      ArrowLeft: value - scale.step,
      ArrowDown: value - scale.step,
      ArrowRight: value + scale.step,
      ArrowUp: value + scale.step,
      PageDown: value - scale.step * 2,
      PageUp: value + scale.step * 2,
      Home: scale.min,
      End: scale.max,
    };

    const next = moves[event.key];
    if (next === undefined) return;

    event.preventDefault();
    moveTo(next);
  }

  const offset = trackOffset(value, scale);

  return (
    <div className="track">
      <span className="track-value" style={{ insetInlineStart: offset }} aria-hidden="true">
        {formatValue(value)}
      </span>
      <span className="track-dot" style={{ insetInlineStart: offset }} aria-hidden="true" />
      <input
        className="track-input"
        type="range"
        min={scale.min}
        max={scale.max}
        step={scale.snap ? scale.step : 'any'}
        value={value}
        disabled={readOnly}
        aria-label={`${leftLabel} to ${rightLabel}`}
        aria-valuetext={describeValue(value, scale, leftLabel, rightLabel)}
        onChange={(event) => onChange(Number(event.target.value))}
        onKeyDown={handleKeyDown}
      />
    </div>
  );
}
