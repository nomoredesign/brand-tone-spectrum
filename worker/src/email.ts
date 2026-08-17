import { compressToEncodedURIComponent } from 'lz-string';
import type { StoredSubmission } from '@shared/schema';

/**
 * The same compression the share link uses, so a link built here opens in the
 * tool exactly as one copied from the toolbar does.
 */
function answersLink(appUrl: string, submission: StoredSubmission): string {
  const base = appUrl.split('#')[0] ?? appUrl;
  const token = compressToEncodedURIComponent(JSON.stringify(submission.answers));
  return `${base}#/c/${submission.answers.slug}?a=${token}`;
}

function inboxLink(appUrl: string): string {
  const base = appUrl.split('#')[0] ?? appUrl;
  return `${base}#/inbox`;
}

function formatValue(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)));
}

/** Plain text, so it reads the same in every mail client. */
export function buildEmailBody(submission: StoredSubmission, appUrl: string): string {
  const lines: string[] = [
    `${submission.clientName} — brand tone spectrum`,
    '',
    `Filled in by: ${submission.author}`,
    `Received: ${submission.receivedAt}`,
    `Sent from: ${submission.sentFrom}`,
  ];

  if (submission.message !== undefined && submission.message.length > 0) {
    lines.push('', 'Message:', submission.message);
  }

  lines.push('', '---', '');

  for (const axis of submission.axisLabels) {
    const value = submission.answers.values[axis.id];
    const note = submission.answers.notes[axis.id] ?? '';

    lines.push(
      `${axis.leftLabel} to ${axis.rightLabel}: ${value === undefined ? 'not set' : formatValue(value)}`,
    );
    lines.push(note.length > 0 ? `    ${note.replace(/\n/g, '\n    ')}` : '    (no note)');
    lines.push('');
  }

  lines.push('---', '', 'Open these answers in the tool:', answersLink(appUrl, submission));
  lines.push('', 'All submissions:', inboxLink(appUrl));

  return lines.join('\n');
}

export function buildSubject(submission: StoredSubmission): string {
  return `Brand tone spectrum: ${submission.clientName}, from ${submission.author}`;
}

/**
 * Sends the notification through Resend. A failure is reported rather than
 * thrown: the submission is already stored, and telling the client their work
 * was lost because an email did not go would be untrue.
 */
export async function sendNotification(
  submission: StoredSubmission,
  env: { RESEND_API_KEY: string; NOTIFY_EMAIL: string; FROM_EMAIL: string; APP_URL: string },
): Promise<boolean> {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: env.FROM_EMAIL,
      to: [env.NOTIFY_EMAIL],
      subject: buildSubject(submission),
      text: buildEmailBody(submission, env.APP_URL),
    }),
  });

  return response.ok;
}
