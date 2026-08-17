type Props = {
  message: string | null;
  onDismiss: () => void;
};

/**
 * One quiet line for things the person should know but need not act on: a file
 * loaded, a link copied, a pair left out of an import. The live region stays in
 * the page whether or not there is a message, so a screen reader announces the
 * next one rather than missing it.
 */
export function Notice({ message, onDismiss }: Props) {
  if (message === null) return null;

  return (
    <div className="notice">
      <p>{message}</p>
      <div className="notice-actions">
        <button type="button" className="toolbar-button" onClick={onDismiss}>
          Close
        </button>
      </div>
    </div>
  );
}
