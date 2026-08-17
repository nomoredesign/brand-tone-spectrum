import type { ClientConfig } from '@shared/schema';
import { SheetHeader } from '@/components/SheetHeader';
import { SheetFooter } from '@/components/SheetFooter';
import { themeStyle } from '@/lib/theme';
import { useSession } from '@/features/session/store';
import { AxisRow } from './AxisRow';
import { ScaleMarkers } from './ScaleMarkers';

/**
 * The sheet itself. One grid holds the head row and every axis row, so the
 * dashes, the numbers and the notes column all share one set of columns.
 */
export function SpectrumSheet({ config, readOnly }: { config: ClientConfig; readOnly: boolean }) {
  const values = useSession((state) => state.values);
  const notes = useSession((state) => state.notes);
  const setValue = useSession((state) => state.setValue);
  const setNote = useSession((state) => state.setNote);

  return (
    <div className="sheet" style={themeStyle(config.theme)}>
      <SheetHeader />

      <section className="chart" aria-label="Brand tone pairs">
        <div className="chart-head" aria-hidden="true" />
        <div className="chart-head">
          <ScaleMarkers scale={config.scale} />
        </div>
        <div className="chart-head" aria-hidden="true" />
        <p
          className="chart-head chart-head-notes label-caps"
          style={{ color: 'var(--color-muted)' }}
        >
          Notes
        </p>

        {config.axes.map((axis) => (
          <AxisRow
            key={axis.id}
            axis={axis}
            scale={config.scale}
            // An axis the saved answers never mentioned falls back to its start value.
            value={values[axis.id] ?? axis.defaultValue}
            note={notes[axis.id] ?? ''}
            readOnly={readOnly}
            onValueChange={(value) => setValue(axis.id, value)}
            onNoteChange={(note) => setNote(axis.id, note)}
          />
        ))}
      </section>

      <SheetFooter config={config} />
    </div>
  );
}
