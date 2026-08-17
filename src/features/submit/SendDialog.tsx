import { useEffect, useRef } from 'react';

export type SendStatus =
  | { kind: 'idle' }
  | { kind: 'sending' }
  | { kind: 'sent'; emailed: boolean }
  | { kind: 'failed'; reason: string };

type Props = {
  open: boolean;
  clientName: string;
  author: string;
  message: string;
  status: SendStatus;
  onAuthorChange: (author: string) => void;
  onMessageChange: (message: string) => void;
  onSend: () => void;
  onClose: () => void;
  onDownload: () => void;
  onCopyLink: () => void;
};

/**
 * A native dialog, so the browser handles the focus trap, the Escape key and
 * the backdrop rather than this component doing it worse.
 */
export function SendDialog({
  open,
  clientName,
  author,
  message,
  status,
  onAuthorChange,
  onMessageChange,
  onSend,
  onClose,
  onDownload,
  onCopyLink,
}: Props) {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;

    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();
  }, [open]);

  const sending = status.kind === 'sending';

  return (
    <dialog ref={dialog} className="send-dialog" aria-labelledby="send-title" onClose={onClose}>
      <form
        method="dialog"
        onSubmit={(event) => {
          event.preventDefault();
          onSend();
        }}
      >
        <h2 id="send-title" className="send-title">
          Send to the studio
        </h2>

        {status.kind === 'sent' ? (
          <>
            <p>
              Thank you. Your answers for {clientName} are with the studio
              {status.emailed ? '' : ', though the email notification did not go'}.
            </p>
            <div className="notice-actions">
              <button type="button" className="toolbar-button" onClick={onClose}>
                Close
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="send-intro">
              The studio will be told once, when you press send. Nothing is sent while you are still
              filling it in.
            </p>

            <label className="send-field">
              <span>Your name</span>
              <input
                type="text"
                name="author"
                value={author}
                required
                maxLength={120}
                autoComplete="name"
                disabled={sending}
                onChange={(event) => onAuthorChange(event.target.value)}
              />
            </label>

            <label className="send-field">
              <span>Anything to add? (optional)</span>
              <textarea
                name="message"
                value={message}
                rows={3}
                maxLength={2000}
                disabled={sending}
                onChange={(event) => onMessageChange(event.target.value)}
              />
            </label>

            {status.kind === 'failed' && (
              <div className="send-failure" role="alert">
                <p>
                  {status.reason} Nothing has been lost. You can send your answers to the studio
                  another way:
                </p>
                <div className="notice-actions">
                  <button type="button" className="toolbar-button" onClick={onDownload}>
                    Download the file
                  </button>
                  <button type="button" className="toolbar-button" onClick={onCopyLink}>
                    Copy the link
                  </button>
                </div>
              </div>
            )}

            <div className="notice-actions">
              <button type="button" className="toolbar-button" onClick={onClose} disabled={sending}>
                Cancel
              </button>
              <button type="submit" className="toolbar-button" disabled={sending}>
                {sending ? 'Sending…' : 'Send'}
              </button>
            </div>
          </>
        )}
      </form>
    </dialog>
  );
}
