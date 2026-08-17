type Props = {
  value: string;
  leftLabel: string;
  rightLabel: string;
  placeholder: string | undefined;
  readOnly: boolean;
  onChange: (value: string) => void;
};

/**
 * The sticky note from the original slide, pinned into its own column so it can
 * never sit on top of the chart.
 *
 * The cell grows with the text using a hidden copy of the same string in the
 * same grid cell, so there is no measuring in JavaScript, and the box still
 * stretches to the shared row height the chart grid works out.
 */
export function NotesCell({
  value,
  leftLabel,
  rightLabel,
  placeholder,
  readOnly,
  onChange,
}: Props) {
  const label = `Notes on ${leftLabel} to ${rightLabel}`;

  if (readOnly) {
    return (
      <div className="notes-cell" data-value={value}>
        <p className="notes-static" aria-label={label}>
          {value}
        </p>
      </div>
    );
  }

  return (
    <div className="notes-cell" data-value={value}>
      <textarea
        className="notes-input"
        value={value}
        aria-label={label}
        placeholder={placeholder}
        rows={1}
        onChange={(event) => onChange(event.target.value)}
      />
      {/* The printed page shows the words, not an empty form control. */}
      <p className="notes-static print-only" aria-hidden="true">
        {value}
      </p>
    </div>
  );
}
