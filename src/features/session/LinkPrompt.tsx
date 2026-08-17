type Props = {
  onKeepMine: () => void;
  onUseLink: () => void;
};

/**
 * Someone has opened a share link on a browser that already holds answers.
 * Overwriting silently would throw away their work, so nothing changes until
 * they say which set to keep.
 */
export function LinkPrompt({ onKeepMine, onUseLink }: Props) {
  return (
    <div className="notice" role="alertdialog" aria-label="Answers from a link">
      <p>
        This link carries a filled in version, and your browser already has answers for this client.
        Which would you like to see?
      </p>
      <div className="notice-actions">
        <button type="button" className="toolbar-button" onClick={onKeepMine}>
          Keep mine
        </button>
        <button type="button" className="toolbar-button" onClick={onUseLink}>
          Use the link
        </button>
      </div>
    </div>
  );
}
