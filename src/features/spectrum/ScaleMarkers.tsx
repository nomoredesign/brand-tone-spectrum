import type { Scale } from '@shared/schema';
import { markerValues, trackOffset } from '@/lib/scale';

/**
 * The numbers that run across the top of the chart. They use the same offset
 * maths as the dot, so a dot sitting on 3 lines up with the 3 above it.
 */
export function ScaleMarkers({ scale }: { scale: Scale }) {
  return (
    <div className="scale-markers" aria-hidden="true">
      {markerValues(scale).map((value) => (
        <span
          key={value}
          className="scale-marker"
          style={{ insetInlineStart: trackOffset(value, scale) }}
        >
          {value}
        </span>
      ))}
    </div>
  );
}
