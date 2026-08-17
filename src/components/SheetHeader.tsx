/**
 * The section marker is the same for every client: it names this exercise, not
 * the client, and matches the numbering used in the studio's decks.
 */
const SECTION = '02 Brand Foundations';

export function SheetHeader() {
  return (
    <header className="sheet-header">
      <div>
        <p className="label-caps" style={{ color: 'var(--color-muted)' }}>
          {SECTION}
        </p>
        <h1 className="sheet-title">
          <span className="label-caps">Brand Tone</span>
          <span className="sheet-title-display">Spectrum</span>
        </h1>
      </div>

      {/* Repeats the title at the head of the chart, as the original slide does. */}
      <p className="sheet-centre-mark" aria-hidden="true">
        Brand Tone
      </p>

      <div aria-hidden="true" />
    </header>
  );
}
