import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { SubmissionSummary } from '@shared/schema';
import { encodeAnswers } from '@/lib/encoding';
import { formatWhen } from '@/lib/format';
import { isSubmitConfigured } from '@/lib/env';
import { getSubmission, listSubmissions } from '@/features/submit/api';
import { loadStudioToken, saveStudioToken } from '@/features/submit/sentRecord';

/**
 * The studio's own view of what has come in. It is not linked from anywhere a
 * client sees, and it needs the studio token, which is checked by the worker
 * rather than here.
 */
export function InboxPage() {
  const navigate = useNavigate();
  const [token, setToken] = useState(loadStudioToken);
  const [submissions, setSubmissions] = useState<SubmissionSummary[] | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (studioToken: string) => {
    if (studioToken.length === 0) return;

    setBusy(true);
    setProblem(null);

    const result = await listSubmissions(studioToken);
    setBusy(false);

    if (!result.ok) {
      setProblem(result.reason);
      setSubmissions(null);
      return;
    }

    setSubmissions(result.submissions);
  }, []);

  // Fetching from the worker on arrival is the thing effects are for: the
  // studio should not have to press a button they have already pressed once.
  useEffect(() => {
    const saved = loadStudioToken();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the state here belongs to the request, not to anything rendered above it
    if (saved.length > 0) void load(saved);
  }, [load]);

  async function openInTool(summary: SubmissionSummary) {
    setProblem(null);

    // The list carries only a summary, so the answers are fetched on demand and
    // handed to the tool through the same link the share button builds.
    const result = await getSubmission(token, summary.id);
    if (!result.ok) {
      setProblem(result.reason);
      return;
    }

    const answers = encodeAnswers(result.submission.answers);
    void navigate(`/c/${result.submission.answers.slug}?a=${answers}`);
  }

  if (!isSubmitConfigured) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16">
        <h1 className="font-display text-3xl tracking-tight">Inbox</h1>
        <p className="text-muted mt-4">
          No submission endpoint is set up, so there is nothing to show. See
          <code className="ml-1">docs/SETUP_WORKER.md</code>.
        </p>
        <p className="mt-6">
          <Link to="/" className="underline underline-offset-4">
            Back to the list of clients
          </Link>
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <p className="label-caps text-muted">Nomoredesign</p>
      <h1 className="font-display mt-2 text-3xl tracking-tight">Submissions</h1>

      <form
        className="mt-8 flex flex-wrap items-end gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          saveStudioToken(token);
          void load(token);
        }}
      >
        <label className="flex flex-col gap-1">
          <span className="label-caps text-muted">Studio token</span>
          <input
            type="password"
            value={token}
            autoComplete="off"
            className="border-note-border w-72 rounded border bg-transparent px-2 py-1"
            onChange={(event) => setToken(event.target.value)}
          />
        </label>
        <button type="submit" className="toolbar-button border-note-border rounded-full border">
          {busy ? 'Loading…' : 'Show submissions'}
        </button>
        {token.length > 0 && (
          <button
            type="button"
            className="toolbar-button"
            onClick={() => {
              saveStudioToken('');
              setToken('');
              setSubmissions(null);
            }}
          >
            Forget token
          </button>
        )}
      </form>

      <div role="status" aria-live="polite">
        {problem !== null && <p className="mt-6">{problem}</p>}
      </div>

      {submissions !== null &&
        (submissions.length === 0 ? (
          <p className="text-muted mt-8">Nothing has come in yet.</p>
        ) : (
          <ul className="border-rule mt-8 border-t">
            {submissions.map((submission) => (
              <li key={submission.id} className="border-rule border-b py-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-lg">
                    {submission.clientName}
                    <span className="text-muted"> — {submission.author}</span>
                  </p>
                  <p className="label-caps text-muted">{formatWhen(submission.receivedAt)}</p>
                </div>

                {submission.message !== undefined && submission.message.length > 0 && (
                  <p className="mt-2 text-sm">{submission.message}</p>
                )}

                <button
                  type="button"
                  className="toolbar-button border-note-border mt-3 rounded-full border"
                  onClick={() => void openInTool(submission)}
                >
                  Open in the tool
                </button>
              </li>
            ))}
          </ul>
        ))}

      <p className="mt-10">
        <Link to="/" className="text-muted underline underline-offset-4">
          Back to the list of clients
        </Link>
      </p>
    </main>
  );
}
