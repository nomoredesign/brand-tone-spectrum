import type { ClientConfig } from '@shared/schema';
import { StudioMark } from './StudioMark';

/** The four blocks that run across the bottom of the original slide. */
export function SheetFooter({ config }: { config: ClientConfig }) {
  return (
    <footer className="sheet-footer label-caps" style={{ color: 'var(--color-muted)' }}>
      <div>
        <p style={{ color: 'var(--color-ink)' }}>{config.clientName}</p>
        <p>{config.projectLine}</p>
        <p>{config.dateLine}</p>
      </div>

      <div>
        <p style={{ color: 'var(--color-ink)' }}>{config.studio.name}</p>
        <p>{config.studio.website}</p>
        <p>{config.studio.social}</p>
      </div>

      <div>
        <StudioMark />
      </div>

      <div>
        <p>{config.studio.strapline}</p>
      </div>
    </footer>
  );
}
