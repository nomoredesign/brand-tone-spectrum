import { useState } from 'react';
import { SCHEMA_VERSION, type ClientConfig, type Submission } from '@shared/schema';
import { formatWhen } from '@/lib/format';
import { currentAnswers, useSession } from '@/features/session/store';
import { buildShareLink, copyToClipboard, downloadAnswers } from '@/features/session/transfer';
import { sendSubmission } from './api';
import { loadSentAt, recordSentAt } from './sentRecord';
import { SendDialog, type SendStatus } from './SendDialog';

/**
 * The one button a client presses when they have finished. Nothing goes to the
 * studio before this, so there is one clear message rather than a trickle.
 */
export function SendButton({
  config,
  onMessage,
}: {
  config: ClientConfig;
  onMessage: (message: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [author, setAuthor] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<SendStatus>({ kind: 'idle' });
  const [sentAt, setSentAt] = useState(() => loadSentAt(config.slug));

  function answersNow() {
    return currentAnswers(useSession.getState(), author);
  }

  function handleDownload() {
    downloadAnswers(config, answersNow());
    onMessage('Answers downloaded. Send that file to the studio.');
  }

  async function handleCopyLink() {
    const copied = await copyToClipboard(buildShareLink(config.slug, answersNow()));
    onMessage(
      copied
        ? 'Share link copied. Send that link to the studio.'
        : 'The browser would not let us copy. Use the download instead.',
    );
  }

  async function handleSend() {
    const trimmed = author.trim();
    if (trimmed.length === 0) return;

    setStatus({ kind: 'sending' });

    const submission: Submission = {
      schemaVersion: SCHEMA_VERSION,
      answers: answersNow(),
      author: trimmed,
      ...(message.trim().length > 0 ? { message: message.trim() } : {}),
      clientName: config.clientName,
      // The labels travel with the answers so the studio's email reads properly.
      axisLabels: config.axes.map((axis) => ({
        id: axis.id,
        leftLabel: axis.leftLabel,
        rightLabel: axis.rightLabel,
      })),
      sentFrom: window.location.href,
    };

    const result = await sendSubmission(submission);

    if (!result.ok) {
      setStatus({ kind: 'failed', reason: result.reason });
      return;
    }

    recordSentAt(config.slug, result.receivedAt);
    setSentAt(result.receivedAt);
    setStatus({ kind: 'sent', emailed: result.emailed });
  }

  function handleClose() {
    setOpen(false);
    setStatus({ kind: 'idle' });
  }

  return (
    <>
      {sentAt !== undefined && <p className="toolbar-saved">Sent {formatWhen(sentAt)}</p>}

      <button
        type="button"
        className="toolbar-button toolbar-button-strong"
        onClick={() => setOpen(true)}
      >
        {sentAt === undefined ? 'Send to studio' : 'Send again'}
      </button>

      <SendDialog
        open={open}
        clientName={config.clientName}
        author={author}
        message={message}
        status={status}
        onAuthorChange={setAuthor}
        onMessageChange={setMessage}
        onSend={() => void handleSend()}
        onClose={handleClose}
        onDownload={handleDownload}
        onCopyLink={() => void handleCopyLink()}
      />
    </>
  );
}
