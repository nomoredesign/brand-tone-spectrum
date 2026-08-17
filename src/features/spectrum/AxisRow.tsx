import type { Axis, Scale } from '@shared/schema';
import { SpectrumTrack } from './SpectrumTrack';
import { NotesCell } from './NotesCell';

type Props = {
  axis: Axis;
  scale: Scale;
  value: number;
  note: string;
  readOnly: boolean;
  onValueChange: (value: number) => void;
  onNoteChange: (note: string) => void;
};

/**
 * A count of the visual references held against one end of the pair. Phase one
 * only reports that they exist; phase two opens the tray when the label is
 * clicked.
 */
function RefCount({ count, side }: { count: number; side: string }) {
  if (count === 0) return null;
  return (
    <span className="axis-ref-count">
      <span aria-hidden="true">{count}</span>
      <span className="sr-only">
        {count} {count === 1 ? 'reference' : 'references'} for {side}
      </span>
    </span>
  );
}

/**
 * One pair. The wrapper does not lay anything out at desktop width: its cells
 * belong to the chart grid so that every dashed line and every notes cell in
 * the chart shares one set of columns.
 */
export function AxisRow({
  axis,
  scale,
  value,
  note,
  readOnly,
  onValueChange,
  onNoteChange,
}: Props) {
  return (
    <div className="axis-row">
      <div className="axis-label axis-label-left">
        {axis.leftLabel}
        <RefCount count={axis.refs.left.length} side={axis.leftLabel} />
      </div>

      <SpectrumTrack
        scale={scale}
        value={value}
        leftLabel={axis.leftLabel}
        rightLabel={axis.rightLabel}
        readOnly={readOnly}
        onChange={onValueChange}
      />

      <div className="axis-label axis-label-right">
        {axis.rightLabel}
        <RefCount count={axis.refs.right.length} side={axis.rightLabel} />
      </div>

      <NotesCell
        value={note}
        leftLabel={axis.leftLabel}
        rightLabel={axis.rightLabel}
        placeholder={axis.notesPlaceholder}
        readOnly={readOnly}
        onChange={onNoteChange}
      />
    </div>
  );
}
