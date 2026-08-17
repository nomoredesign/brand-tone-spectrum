import {
  LIMITS,
  SCHEMA_VERSION,
  StoredSubmissionSchema,
  SubmissionSchema,
  type StoredSubmission,
  type SubmissionSummary,
} from '@shared/schema';
import { sendNotification } from './email';

export type Env = {
  SUBMISSIONS: KVNamespace;
  ALLOWED_ORIGINS: string;
  FROM_EMAIL: string;
  APP_URL: string;
  RESEND_API_KEY: string;
  STUDIO_TOKEN: string;
  NOTIFY_EMAIL: string;
};

/** Submissions one address may send in an hour before being turned away. */
const PER_HOUR = 10;

/** A year, in seconds. Old submissions fall out of storage on their own. */
const KEEP_FOR = 365 * 24 * 60 * 60;

/* -------------------------------------------------------------------------- */
/* Origins                                                                    */
/* -------------------------------------------------------------------------- */

function allowedOrigin(env: Env, request: Request): string | null {
  const origin = request.headers.get('Origin');
  if (origin === null) return null;

  const allowed = env.ALLOWED_ORIGINS.split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

  // Matched against the list rather than reflected, so an unlisted origin can
  // never be told that it is welcome.
  return allowed.includes(origin) ? origin : null;
}

function corsHeaders(origin: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function json(body: unknown, status: number, origin: string): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
  });
}

/* -------------------------------------------------------------------------- */
/* Guards                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * The one place a challenge would go. Adding Cloudflare Turnstile later means
 * verifying the token here and returning false; nothing else has to change.
 */
async function passesChallenge(_request: Request, _env: Env): Promise<boolean> {
  return true;
}

/**
 * A counter per address per hour. KV is eventually consistent, so a determined
 * caller can slip a few past the line; that is fine for holding back spam, and
 * the alternative costs far more than the problem.
 */
async function withinRateLimit(env: Env, address: string): Promise<boolean> {
  const hour = Math.floor(Date.now() / 3_600_000);
  const key = `rl:${address}:${hour}`;

  const sent = Number((await env.SUBMISSIONS.get(key)) ?? '0');
  if (Number.isFinite(sent) && sent >= PER_HOUR) return false;

  await env.SUBMISSIONS.put(key, String((Number.isFinite(sent) ? sent : 0) + 1), {
    expirationTtl: 3_600,
  });
  return true;
}

function hasStudioToken(request: Request, env: Env): boolean {
  const header = request.headers.get('Authorization') ?? '';
  const supplied = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : '';
  if (supplied.length === 0 || supplied.length !== env.STUDIO_TOKEN.length) return false;

  // Compared in constant time, so a wrong token cannot be found one character
  // at a time by watching how long the answer takes.
  let difference = 0;
  for (let index = 0; index < supplied.length; index += 1) {
    difference |= supplied.charCodeAt(index) ^ env.STUDIO_TOKEN.charCodeAt(index);
  }
  return difference === 0;
}

/* -------------------------------------------------------------------------- */
/* Routes                                                                     */
/* -------------------------------------------------------------------------- */

function summarise(submission: StoredSubmission): SubmissionSummary {
  return {
    id: submission.id,
    receivedAt: submission.receivedAt,
    slug: submission.answers.slug,
    clientName: submission.clientName,
    author: submission.author,
    ...(submission.message !== undefined ? { message: submission.message } : {}),
  };
}

async function handleSubmit(request: Request, env: Env, origin: string): Promise<Response> {
  if (!(await passesChallenge(request, env))) {
    return json({ error: 'That did not look like a person.' }, 403, origin);
  }

  const declared = Number(request.headers.get('Content-Length') ?? '0');
  if (Number.isFinite(declared) && declared > LIMITS.submissionBytes) {
    return json({ error: 'That is too large to accept.' }, 413, origin);
  }

  const body = await request.text();
  if (new TextEncoder().encode(body).length > LIMITS.submissionBytes) {
    return json({ error: 'That is too large to accept.' }, 413, origin);
  }

  let parsedBody: unknown;
  try {
    parsedBody = JSON.parse(body);
  } catch {
    return json({ error: 'That was not JSON.' }, 400, origin);
  }

  const parsed = SubmissionSchema.safeParse(parsedBody);
  if (!parsed.success) {
    return json({ error: 'That was not a submission this tool made.' }, 400, origin);
  }

  const address = request.headers.get('CF-Connecting-IP') ?? 'unknown';
  if (!(await withinRateLimit(env, address))) {
    return json({ error: 'Too many submissions from here in the last hour.' }, 429, origin);
  }

  // The time and the id are set here, never taken from the browser.
  const stored: StoredSubmission = StoredSubmissionSchema.parse({
    ...parsed.data,
    id: crypto.randomUUID(),
    receivedAt: new Date().toISOString(),
  });

  const slug = stored.answers.slug;
  const key = `sub:${slug}:${stored.receivedAt}:${stored.id}`;

  await env.SUBMISSIONS.put(key, JSON.stringify(stored), {
    expirationTtl: KEEP_FOR,
    metadata: summarise(stored),
  });
  // A pointer, so one submission can be fetched by id without a scan.
  await env.SUBMISSIONS.put(`idx:${stored.id}`, key, { expirationTtl: KEEP_FOR });

  const emailed = await sendNotification(stored, env);

  // Note text is confidential client material and stays out of the logs.
  console.log(
    JSON.stringify({ event: 'submission', slug, id: stored.id, emailed, result: 'stored' }),
  );

  return json({ id: stored.id, receivedAt: stored.receivedAt, emailed }, 201, origin);
}

async function handleList(request: Request, env: Env, origin: string): Promise<Response> {
  if (!hasStudioToken(request, env)) {
    return json({ error: 'The studio token is missing or wrong.' }, 401, origin);
  }

  const slug = new URL(request.url).searchParams.get('slug');
  const prefix = slug === null || slug.length === 0 ? 'sub:' : `sub:${slug}:`;

  const listed = await env.SUBMISSIONS.list<SubmissionSummary>({ prefix, limit: 200 });

  // Keys sort by the received time, so reversing gives newest first.
  const submissions = listed.keys
    .map((entry) => entry.metadata)
    .filter((entry): entry is SubmissionSummary => entry !== undefined && entry !== null)
    .reverse();

  return json({ submissions }, 200, origin);
}

async function handleOne(
  id: string,
  request: Request,
  env: Env,
  origin: string,
): Promise<Response> {
  if (!hasStudioToken(request, env)) {
    return json({ error: 'The studio token is missing or wrong.' }, 401, origin);
  }

  const key = await env.SUBMISSIONS.get(`idx:${id}`);
  if (key === null) return json({ error: 'No such submission.' }, 404, origin);

  const raw = await env.SUBMISSIONS.get(key);
  if (raw === null) return json({ error: 'No such submission.' }, 404, origin);

  const parsed = StoredSubmissionSchema.safeParse(JSON.parse(raw));
  if (!parsed.success) return json({ error: 'That submission cannot be read.' }, 500, origin);

  return json({ submission: parsed.data }, 200, origin);
}

/* -------------------------------------------------------------------------- */
/* Entry point                                                                */
/* -------------------------------------------------------------------------- */

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = allowedOrigin(env, request);
    if (origin === null) {
      return new Response(JSON.stringify({ error: 'This origin is not allowed.' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    const { pathname } = new URL(request.url);

    if (request.method === 'POST' && pathname === '/submit') {
      return handleSubmit(request, env, origin);
    }

    if (request.method === 'GET' && pathname === '/submissions') {
      return handleList(request, env, origin);
    }

    const one = /^\/submissions\/([A-Za-z0-9-]{1,80})$/.exec(pathname);
    if (request.method === 'GET' && one !== null) {
      const id = one[1];
      if (id !== undefined) return handleOne(id, request, env, origin);
    }

    if (pathname === '/health') {
      return json({ ok: true, schemaVersion: SCHEMA_VERSION }, 200, origin);
    }

    return json({ error: 'No such endpoint.' }, 404, origin);
  },
} satisfies ExportedHandler<Env>;
