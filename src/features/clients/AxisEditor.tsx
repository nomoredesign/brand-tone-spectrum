import type { AxisDraft, DraftIssue } from './draft';
import { axisIdFromLabels, newAxisDraft } from './draft';

type Props = {
  axes: AxisDraft[];
  issues: DraftIssue[];
  /** Tells the page a field has been visited, so faults appear only after that. */
  onTouch: (field: string) => void;
  onChange: (axes: AxisDraft[]) => void;
};

function issueFor(issues: DraftIssue[], field: string): string | undefined {
  return issues.find((issue) => issue.field === field)?.message;
}

/**
 * The pairs, in the order they appear on the chart. Adding, removing and
 * reordering are the whole point: the eight in the template are a starting
 * point, not a fixed set.
 */
export function AxisEditor({ axes, issues, onTouch, onChange }: Props) {
  function update(index: number, patch: Partial<AxisDraft>) {
    onChange(axes.map((axis, position) => (position === index ? { ...axis, ...patch } : axis)));
  }

  function move(index: number, by: number) {
    const target = index + by;
    if (target < 0 || target >= axes.length) return;

    const reordered = [...axes];
    const [moved] = reordered.splice(index, 1);
    if (moved) reordered.splice(target, 0, moved);
    onChange(reordered);
  }

  return (
    <fieldset className="builder-fieldset">
      <legend className="builder-legend">The pairs</legend>
      <p className="builder-hint">
        Rename them, reorder them, add or remove as many as the project needs. The id is what saved
        answers are keyed on, so leave it alone once a client has started filling the chart in.
      </p>

      <ol className="axis-list">
        {axes.map((axis, index) => {
          const suggestedId = axisIdFromLabels(axis.leftLabel, axis.rightLabel);
          const idProblem = issueFor(issues, `axes.${index}.id`);
          const valueProblem = issueFor(issues, `axes.${index}.defaultValue`);
          const leftProblem = issueFor(issues, `axes.${index}.leftLabel`);
          const rightProblem = issueFor(issues, `axes.${index}.rightLabel`);

          return (
            <li key={axis.key} className="axis-item">
              <div className="axis-item-grid">
                <label className="builder-field">
                  <span>Left</span>
                  <input
                    type="text"
                    value={axis.leftLabel}
                    maxLength={60}
                    onBlur={() => onTouch(`axes.${index}.leftLabel`)}
                    onChange={(event) => update(index, { leftLabel: event.target.value })}
                  />
                </label>

                <label className="builder-field">
                  <span>Right</span>
                  <input
                    type="text"
                    value={axis.rightLabel}
                    maxLength={60}
                    onBlur={() => onTouch(`axes.${index}.rightLabel`)}
                    onChange={(event) => update(index, { rightLabel: event.target.value })}
                  />
                </label>

                <label className="builder-field builder-field-narrow">
                  <span>Starts at</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={axis.defaultValue}
                    onBlur={() => onTouch(`axes.${index}.defaultValue`)}
                    onChange={(event) => update(index, { defaultValue: event.target.value })}
                  />
                </label>

                <div className="axis-actions">
                  <button
                    type="button"
                    className="toolbar-button"
                    disabled={index === 0}
                    aria-label={`Move ${axis.leftLabel || 'this pair'} up`}
                    onClick={() => move(index, -1)}
                  >
                    Up
                  </button>
                  <button
                    type="button"
                    className="toolbar-button"
                    disabled={index === axes.length - 1}
                    aria-label={`Move ${axis.leftLabel || 'this pair'} down`}
                    onClick={() => move(index, 1)}
                  >
                    Down
                  </button>
                  <button
                    type="button"
                    className="toolbar-button"
                    disabled={axes.length === 1}
                    aria-label={`Remove ${axis.leftLabel || 'this pair'}`}
                    onClick={() => onChange(axes.filter((_, position) => position !== index))}
                  >
                    Remove
                  </button>
                </div>
              </div>

              <div className="axis-item-grid">
                <label className="builder-field">
                  <span>Id</span>
                  <input
                    type="text"
                    value={axis.id}
                    placeholder={suggestedId}
                    maxLength={60}
                    onBlur={() => onTouch(`axes.${index}.id`)}
                    onChange={(event) => update(index, { id: event.target.value })}
                  />
                </label>

                <label className="builder-field builder-field-wide">
                  <span>Prompt inside the notes box (optional)</span>
                  <input
                    type="text"
                    value={axis.notesPlaceholder}
                    maxLength={200}
                    onChange={(event) => update(index, { notesPlaceholder: event.target.value })}
                  />
                </label>
              </div>

              {axis.refs.left.length + axis.refs.right.length > 0 && (
                <p className="builder-hint">
                  {axis.refs.left.length + axis.refs.right.length} reference
                  {axis.refs.left.length + axis.refs.right.length === 1 ? '' : 's'} on this pair,
                  kept as they are.
                </p>
              )}

              {[leftProblem, rightProblem, idProblem, valueProblem]
                .filter((problem) => problem !== undefined)
                .map((problem) => (
                  <p key={problem} className="builder-problem">
                    {problem}
                  </p>
                ))}
            </li>
          );
        })}
      </ol>

      <button
        type="button"
        className="toolbar-button border-note-border rounded-full border"
        onClick={() => onChange([...axes, newAxisDraft()])}
      >
        Add a pair
      </button>
    </fieldset>
  );
}
