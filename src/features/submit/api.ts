import {
  SubmissionSummarySchema,
  StoredSubmissionSchema,
  type StoredSubmission,
  type Submission,
  type SubmissionSummary,
} from '@shared/schema';
import { submitEndpoint } from '@/lib/env';
import { z } from 'zod';

/** Long enough for a slow connection, short enough that nobody sits and waits. */
const TIMEOUT_MS = 15_000;

export type SendResult =
  { ok: true; id: string; receivedAt: string; emailed: boolean } | { ok: false; reason: string };

const SendResponseSchema = z.object({
  id: z.string().min(1),
  receivedAt: z.iso.datetime({ offset: true }),
  emailed: z.boolean(),
});

/**
 * Posts one finished set of answers to the studio's worker.
 *
 * Every failure comes back as a reason rather than an exception, because the
 * caller has to keep the client's work either way and offer them another way
 * to send it.
 */
export async function sendSubmission(submission: Submission): Promise<SendResult> {
  if (submitEndpoint === undefined) {
    return { ok: false, reason: 'No submission endpoint is set up.' };
  }

  let response: Response;
  try {
    response = await fetch(`${submitEndpoint}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(submission),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    return { ok: false, reason: 'The studio could not be reached.' };
  }

  if (!response.ok) {
    return {
      ok: false,
      reason:
        response.status === 429
          ? 'The studio has had a lot of submissions from here in the last hour.'
          : 'The studio received the request but would not accept it.',
    };
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return { ok: false, reason: 'The studio sent back something we could not read.' };
  }

  const parsed = SendResponseSchema.safeParse(body);
  if (!parsed.success) {
    return { ok: false, reason: 'The studio sent back something we could not read.' };
  }

  return { ok: true, ...parsed.data };
}

export type ListResult =
  { ok: true; submissions: SubmissionSummary[] } | { ok: false; reason: string };

async function studioFetch(path: string, token: string): Promise<Response | null> {
  if (submitEndpoint === undefined) return null;

  try {
    return await fetch(`${submitEndpoint}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    return null;
  }
}

export async function listSubmissions(token: string, slug?: string): Promise<ListResult> {
  const query = slug === undefined || slug.length === 0 ? '' : `?slug=${encodeURIComponent(slug)}`;
  const response = await studioFetch(`/submissions${query}`, token);

  if (response === null) return { ok: false, reason: 'The studio could not be reached.' };
  if (response.status === 401) return { ok: false, reason: 'That token was not accepted.' };
  if (!response.ok) return { ok: false, reason: 'The studio would not answer that request.' };

  const parsed = z
    .object({ submissions: z.array(SubmissionSummarySchema) })
    .safeParse(await response.json());

  return parsed.success
    ? { ok: true, submissions: parsed.data.submissions }
    : { ok: false, reason: 'The list came back in a shape we did not expect.' };
}

export type OneResult = { ok: true; submission: StoredSubmission } | { ok: false; reason: string };

export async function getSubmission(token: string, id: string): Promise<OneResult> {
  const response = await studioFetch(`/submissions/${encodeURIComponent(id)}`, token);

  if (response === null) return { ok: false, reason: 'The studio could not be reached.' };
  if (response.status === 401) return { ok: false, reason: 'That token was not accepted.' };
  if (!response.ok) return { ok: false, reason: 'That submission could not be fetched.' };

  const parsed = z.object({ submission: StoredSubmissionSchema }).safeParse(await response.json());

  return parsed.success
    ? { ok: true, submission: parsed.data.submission }
    : { ok: false, reason: 'That submission came back in a shape we did not expect.' };
}
