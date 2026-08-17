import { useRef, useState } from 'react';
import type { ClientConfig } from '@shared/schema';
import { formatTime } from '@/lib/format';
import { currentAnswers, useSession } from './store';
import { buildShareLink, copyToClipboard, downloadAnswers } from './transfer';

type Props = {
  config: ClientConfig;
  onMessage: (message: string) => void;
  onFileChosen: (file: File) => void;
  /** The send button, supplied by the submit feature when an endpoint is configured. */
  sendButton?: React.ReactNode;
};

/**
 * The small set of actions that move the answers around. It sits in a corner,
 * out of the composition, and the print stylesheet removes it entirely.
 */
export function Toolbar({ config, onMessage, onFileChosen, sendButton }: Props) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [confirmingReset, setConfirmingReset] = useState(false);
  const resetToStart = useSession((state) => state.resetToStart);
  const lastSavedAt = useSession((state) => state.lastSavedAt);

  function answersNow() {
    return currentAnswers(useSession.getState());
  }

  async function handleCopyLink() {
    const link = buildShareLink(config.slug, answersNow());
    const copied = await copyToClipboard(link);
    onMessage(
      copied
        ? 'Share link copied. Anyone who opens it sees these answers.'
        : 'The browser would not let us copy. Use download instead.',
    );
  }

  function handleDownload() {
    downloadAnswers(config, answersNow());
    onMessage('Answers downloaded as a JSON file.');
  }

  function handleReset() {
    if (!confirmingReset) {
      setConfirmingReset(true);
      return;
    }
    resetToStart();
    setConfirmingReset(false);
    onMessage('Back to the starting values.');
  }

  return (
    <div className="toolbar" role="group" aria-label="Actions">
      {lastSavedAt !== null && (
        <p className="toolbar-saved" role="status">
          Saved {formatTime(lastSavedAt)}
        </p>
      )}

      {sendButton}

      <button
        type="button"
        className="toolbar-button"
        onClick={handleReset}
        onBlur={() => setConfirmingReset(false)}
      >
        {confirmingReset ? 'Reset, sure?' : 'Reset'}
      </button>

      <button type="button" className="toolbar-button" onClick={() => void handleCopyLink()}>
        Copy link
      </button>

      <button type="button" className="toolbar-button" onClick={handleDownload}>
        Download
      </button>

      <button type="button" className="toolbar-button" onClick={() => fileInput.current?.click()}>
        Load file
      </button>
      <input
        ref={fileInput}
        type="file"
        accept="application/json,.json"
        className="sr-only"
        aria-label="Load a JSON file of answers"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onFileChosen(file);
          // Clearing it lets the same file be chosen twice in a row.
          event.target.value = '';
        }}
      />

      <button type="button" className="toolbar-button" onClick={() => window.print()}>
        Print
      </button>
    </div>
  );
}
