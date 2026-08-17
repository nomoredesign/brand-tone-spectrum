import { env, SELF } from 'cloudflare:test';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SCHEMA_VERSION, type Submission } from '@shared/schema';

const ORIGIN = 'https://studio.example.com';
const TOKEN = 'test-studio-token';

type SentEmail = { to: string[]; subject: string; text: string };

let emails: SentEmail[] = [];
let logged: string[] = [];

/**
 * The worker's outbound calls run in this same isolate, so replacing the global
 * fetch is enough to keep every test away from the real Resend, and it lets the
 * email itself be inspected rather than only counted.
 */
beforeEach(async () => {
  emails = [];
  logged = [];

  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.startsWith('https://api.resend.com')) {
        emails.push(JSON.parse(String(init?.body)) as SentEmail);
        return Promise.resolve(new Response(JSON.stringify({ id: 'mail-1' }), { status: 200 }));
      }
      throw new Error(`Unexpected call out to ${url}`);
    }),
  );

  vi.spyOn(console, 'log').mockImplementation((line: unknown) => {
    logged.push(String(line));
  });

  const { keys } = await env.SUBMISSIONS.list({ limit: 1000 });
  await Promise.all(keys.map((key) => env.SUBMISSIONS.delete(key.name)));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function submission(overrides: Partial<Submission> = {}): Submission {
  return {
    schemaVersion: SCHEMA_VERSION,
    answers: {
      schemaVersion: SCHEMA_VERSION,
      slug: 'carnot-ai',
      savedAt: '2026-08-17T14:20:00.000Z',
      values: { 'warm-cool': 3.5 },
      notes: { 'warm-cool': 'Leans cool, but never cold.' },
    },
    author: 'Sam Reed',
    message: 'All done, thank you.',
    clientName: 'CARNOT AI',
    axisLabels: [{ id: 'warm-cool', leftLabel: 'Warm', rightLabel: 'Cool' }],
    sentFrom: 'https://studio.example.com/tool/#/c/carnot-ai',
    ...overrides,
  };
}

function post(body: unknown, origin = ORIGIN): Promise<Response> {
  return SELF.fetch('https://worker.example.com/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: origin },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

function asStudio(path: string): Promise<Response> {
  return SELF.fetch(`https://worker.example.com${path}`, {
    headers: { Origin: ORIGIN, Authorization: `Bearer ${TOKEN}` },
  });
}

describe('origins', () => {
  it('refuses a request that carries no origin', async () => {
    const response = await SELF.fetch('https://worker.example.com/health');
    expect(response.status).toBe(403);
  });

  it('refuses an origin that is not on the list', async () => {
    const response = await SELF.fetch('https://worker.example.com/health', {
      headers: { Origin: 'https://somewhere-else.example' },
    });
    expect(response.status).toBe(403);
    // A refused origin is never echoed back as if it were welcome.
    expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });

  it('refuses a submission from an origin that is not on the list', async () => {
    const response = await post(submission(), 'https://somewhere-else.example');
    expect(response.status).toBe(403);
    expect(emails).toHaveLength(0);
  });

  it('answers a preflight with no content and the CORS headers', async () => {
    const response = await SELF.fetch('https://worker.example.com/submit', {
      method: 'OPTIONS',
      headers: { Origin: ORIGIN },
    });
    expect(response.status).toBe(204);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(ORIGIN);
    expect(response.headers.get('Access-Control-Allow-Methods')).toContain('POST');
  });
});

describe('POST /submit', () => {
  it('stores a valid submission and reports its id', async () => {
    const response = await post(submission());
    expect(response.status).toBe(201);

    const body = (await response.json()) as { id: string; receivedAt: string; emailed: boolean };
    expect(body.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(body.emailed).toBe(true);

    const listed = await env.SUBMISSIONS.list({ prefix: 'sub:carnot-ai:' });
    expect(listed.keys).toHaveLength(1);
  });

  it('sets the time and the id itself, refusing a body that tries to supply them', async () => {
    const response = await post({
      ...submission(),
      id: 'chosen-by-the-browser',
      receivedAt: '1999-01-01T00:00:00.000Z',
    });
    expect(response.status).toBe(400);
  });

  it('refuses a body that is not JSON', async () => {
    expect((await post('this is not json')).status).toBe(400);
  });

  it('refuses a body that is not a submission', async () => {
    expect((await post({ hello: 'world' })).status).toBe(400);
  });

  it('refuses a submission with no author', async () => {
    expect((await post(submission({ author: '' }))).status).toBe(400);
  });

  it('refuses a body over the size limit', async () => {
    const response = await post(JSON.stringify({ padding: 'x'.repeat(300_000) }));
    expect(response.status).toBe(413);
  });

  it('turns a caller away once they pass the hourly limit', async () => {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      expect((await post(submission())).status).toBe(201);
    }
    expect((await post(submission())).status).toBe(429);
  });

  it('keeps the note text out of the logs', async () => {
    await post(submission());

    expect(logged.join('\n')).not.toContain('Leans cool, but never cold.');
    expect(logged.join('\n')).toContain('carnot-ai');
  });
});

describe('the email', () => {
  it('says which client and which person, and lists each pair', async () => {
    await post(submission());
    expect(emails).toHaveLength(1);

    const email = emails[0];
    expect(email?.to).toEqual(['studio@example.com']);
    expect(email?.subject).toContain('CARNOT AI');
    expect(email?.subject).toContain('Sam Reed');
    expect(email?.text).toContain('Warm to Cool: 3.5');
    expect(email?.text).toContain('Leans cool, but never cold.');
    expect(email?.text).toContain('All done, thank you.');
  });

  it('ends with a link that opens the answers, and the inbox link beside it', async () => {
    await post(submission());

    const text = emails[0]?.text ?? '';
    expect(text).toContain('https://studio.example.com/tool/#/c/carnot-ai?a=');
    expect(text).toContain('https://studio.example.com/tool/#/inbox');
  });

  it('still stores the submission when the email will not go', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response('no', { status: 500 }))),
    );

    const response = await post(submission());
    expect(response.status).toBe(201);
    expect(((await response.json()) as { emailed: boolean }).emailed).toBe(false);

    const listed = await env.SUBMISSIONS.list({ prefix: 'sub:carnot-ai:' });
    expect(listed.keys).toHaveLength(1);
  });
});

describe('GET /submissions', () => {
  it('refuses a request with no token', async () => {
    const response = await SELF.fetch('https://worker.example.com/submissions?slug=carnot-ai', {
      headers: { Origin: ORIGIN },
    });
    expect(response.status).toBe(401);
  });

  it('refuses a request with the wrong token', async () => {
    const response = await SELF.fetch('https://worker.example.com/submissions?slug=carnot-ai', {
      headers: { Origin: ORIGIN, Authorization: 'Bearer not-the-token' },
    });
    expect(response.status).toBe(401);
  });

  it('lists what has been received, newest first', async () => {
    await post(submission({ author: 'First Person' }));
    await post(submission({ author: 'Second Person' }));

    const response = await asStudio('/submissions?slug=carnot-ai');
    expect(response.status).toBe(200);

    const body = (await response.json()) as { submissions: { author: string }[] };
    expect(body.submissions).toHaveLength(2);
    expect(body.submissions[0]?.author).toBe('Second Person');
  });

  it('does not include the answers in the list', async () => {
    await post(submission());

    const body = (await (await asStudio('/submissions?slug=carnot-ai')).json()) as {
      submissions: Record<string, unknown>[];
    };
    expect(body.submissions[0]).not.toHaveProperty('answers');
  });
});

describe('GET /submissions/:id', () => {
  it('returns one whole submission to the studio', async () => {
    const created = await post(submission());
    const { id } = (await created.json()) as { id: string };

    const response = await asStudio(`/submissions/${id}`);
    expect(response.status).toBe(200);

    const body = (await response.json()) as {
      submission: { answers: { notes: Record<string, string> } };
    };
    expect(body.submission.answers.notes['warm-cool']).toBe('Leans cool, but never cold.');
  });

  it('refuses a request with no token', async () => {
    const response = await SELF.fetch('https://worker.example.com/submissions/anything', {
      headers: { Origin: ORIGIN },
    });
    expect(response.status).toBe(401);
  });

  it('reports an id it has never seen', async () => {
    expect((await asStudio('/submissions/00000000-0000')).status).toBe(404);
  });
});
