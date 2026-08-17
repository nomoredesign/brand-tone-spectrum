import { useEffect, useRef, useState } from 'react';
import type { ClientConfig } from '@shared/schema';
import { copyToClipboard } from '@/lib/files';
import { getCommittedAnswers } from '@/lib/clients';
import { clearAnswers, loadAnswers } from '@/features/session/storage';

type Props = {
  client: ClientConfig | null;
  onClose: () => void;
};

/**
 * Removing a client means deleting files from the repository, which a static
 * page cannot do. So this says precisely which files, offers the command, and
 * deals with the one part it can: the copy saved in this browser.
 */
export function RemoveClientDialog({ client, onClose }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [answersCleared, setAnswersCleared] = useState(false);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;

    if (client && !element.open) element.showModal();
    if (!client && element.open) element.close();
  }, [client]);

  if (!client) return <dialog ref={dialog} className="send-dialog" />;

  const hasCommittedAnswers = getCommittedAnswers(client.slug) !== undefined;
  const hasLocalAnswers = !answersCleared && loadAnswers(client.slug) !== undefined;
  const hasRefs = client.axes.some((axis) => axis.refs.left.length + axis.refs.right.length > 0);

  const files = [
    `clients/${client.slug}.json`,
    ...(hasCommittedAnswers ? [`clients/${client.slug}.answers.json`] : []),
    ...(hasRefs ? [`public/refs/${client.slug}/`] : []),
  ];

  const command = `git rm -r ${files.join(' ')}\ngit commit -m "Remove ${client.clientName}"\ngit push`;

  return (
    <dialog ref={dialog} className="send-dialog" aria-labelledby="remove-title" onClose={onClose}>
      <h2 id="remove-title" className="send-title">
        Remove {client.clientName}
      </h2>

      <p>
        Clients are files in the repository, so removing one means deleting {files.length}{' '}
        {files.length === 1 ? 'file' : 'files'} and pushing:
      </p>

      <ul className="builder-steps">
        {files.map((file) => (
          <li key={file}>
            <code>{file}</code>
          </li>
        ))}
      </ul>

      <pre className="remove-command">{command}</pre>

      <p className="builder-hint">
        Anyone holding the old link will get the no such client page once that is deployed.
        Submissions already received are kept by the worker either way.
      </p>

      {hasLocalAnswers && (
        <p className="builder-hint">
          This browser also holds a filled in copy for {client.clientName}, which the commands above
          will not touch.
        </p>
      )}

      <div className="notice-actions">
        <button
          type="button"
          className="toolbar-button"
          onClick={() => {
            void copyToClipboard(command).then((copied) =>
              setNotice(copied ? 'Commands copied.' : 'The browser would not let us copy.'),
            );
          }}
        >
          Copy the commands
        </button>

        {hasLocalAnswers && (
          <button
            type="button"
            className="toolbar-button"
            onClick={() => {
              clearAnswers(client.slug);
              setAnswersCleared(true);
              setNotice('The copy saved in this browser has been forgotten.');
            }}
          >
            Forget the saved answers
          </button>
        )}

        <button
          type="button"
          className="toolbar-button border-note-border rounded-full border"
          onClick={onClose}
        >
          Close
        </button>
      </div>

      <div role="status" aria-live="polite">
        {notice !== null && <p className="builder-hint">{notice}</p>}
      </div>
    </dialog>
  );
}
