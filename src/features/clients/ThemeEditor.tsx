import type { Theme } from '@shared/schema';
import { checkTheme } from '@/lib/contrast';
import { DEFAULT_PALETTE, type PaletteKey } from '@/lib/palette';

type Props = {
  enabled: boolean;
  theme: Partial<Record<PaletteKey, string>>;
  onToggle: (enabled: boolean) => void;
  onChange: (theme: Partial<Record<PaletteKey, string>>) => void;
};

const FIELDS: ReadonlyArray<{ key: PaletteKey; label: string }> = [
  { key: 'paper', label: 'The sheet' },
  { key: 'ink', label: 'Text' },
  { key: 'muted', label: 'Quieter text' },
  { key: 'rule', label: 'Hairlines' },
  { key: 'track', label: 'The dashed track' },
  { key: 'dot', label: 'The dot' },
  { key: 'note', label: 'The notes box' },
  { key: 'noteBorder', label: 'The notes border' },
  { key: 'noteInk', label: 'Note text' },
  { key: 'notePlaceholder', label: 'The note prompt' },
  { key: 'focus', label: 'The focus ring' },
];

/**
 * Colours, with the contrast checked as they are typed. A palette that fails is
 * far cheaper to catch here than after it has gone out to a client, and the
 * accessibility check in the test run would only fail the build later anyway.
 */
export function ThemeEditor({ enabled, theme, onToggle, onChange }: Props) {
  const checks = enabled ? checkTheme(theme as Theme) : [];
  const failures = checks.filter((check) => !check.passes);

  return (
    <fieldset className="builder-fieldset">
      <legend className="builder-legend">Colours</legend>

      <label className="builder-checkbox">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(event) => onToggle(event.target.checked)}
        />
        <span>Give this client its own colours</span>
      </label>

      {enabled && (
        <>
          <p className="builder-hint">
            Anything left blank keeps the studio default. Fonts have to be faces the client's own
            machine has, so they are left to the file.
          </p>

          <div className="theme-grid">
            {FIELDS.map((field) => {
              const value = theme[field.key] ?? '';
              return (
                <label key={field.key} className="builder-field">
                  <span>{field.label}</span>
                  <span className="theme-input">
                    <input
                      type="color"
                      aria-label={`${field.label} colour`}
                      value={value.length > 0 ? value : DEFAULT_PALETTE[field.key]}
                      onChange={(event) => onChange({ ...theme, [field.key]: event.target.value })}
                    />
                    <input
                      type="text"
                      aria-label={`${field.label} colour as a hex code`}
                      value={value}
                      placeholder={DEFAULT_PALETTE[field.key]}
                      onChange={(event) => onChange({ ...theme, [field.key]: event.target.value })}
                    />
                  </span>
                </label>
              );
            })}
          </div>

          <div role="status" aria-live="polite">
            {failures.length === 0 ? (
              <p className="builder-hint">Every pair has enough contrast.</p>
            ) : (
              <div className="builder-problem">
                <p>
                  {failures.length} pair{failures.length === 1 ? '' : 's'} of colours will be hard
                  to read:
                </p>
                <ul>
                  {failures.map((check) => (
                    <li key={check.label}>
                      {check.label} —{' '}
                      {check.ratio === null
                        ? 'that is not a colour we can read'
                        : `${check.ratio.toFixed(2)}:1, needs ${check.required}:1`}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </>
      )}
    </fieldset>
  );
}
