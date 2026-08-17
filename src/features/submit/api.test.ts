import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SCHEMA_VERSION, type Submission } from '@shared/schema';

/*
 * The endpoint is read once when the module loads, so these tests set it before
 * importing the module under test. Every other test in the suite runs with no
 * endpoint at all, which is the state the app has to work in.
 */
const ENDPOINT = 'https://worker.example.com';

function submission(): Submission {
  return {
    schemaVersion: SCHEMA_VERSION,
    answers: {
      schemaVersion: SCHEMA_VERSION,
      slug: 'carnot-ai',
      savedAt: '2026-08-17T14:20:00.000Z',
      values: { 'warm-cool': 3 },
      notes: { 'warm-cool': 'Leans cool.' },
    },
    author: 'Sam Reed',
    clientName: 'CARNOT AI',
    axisLabels: [{ id: 'warm-cool', leftLabel: 'Warm', rightLabel: 'Cool' }],
    sentFrom: 'https://example.com/#/c/carnot-ai',
  };
}

async function loadApi() {
  vi.stubEnv('VITE_SUBMIT_ENDPOINT', ENDPOINT);
  vi.resetModules();
  return import('./api');
}

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('sendSubmission', () => {
  it('reports the id when the studio accepts it', async () => {
    const { sendSubmission } = await loadApi();

    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          Response.json(
            { id: 'abc', receivedAt: '2026-08-17T14:20:00.000Z', emailed: true },
            { status: 201 },
          ),
        ),
      ),
    );

    const result = await sendSubmission(submission());
    expect(result).toEqual({
      ok: true,
      id: 'abc',
      receivedAt: '2026-08-17T14:20:00.000Z',
      emailed: true,
    });
  });

  it('posts to the submit path with the submission as JSON', async () => {
    const { sendSubmission } = await loadApi();
    // Typed parameters, so the recorded call is a tuple rather than an empty one.
    const spy = vi.fn((_url: string, _init: RequestInit) =>
      Promise.resolve(
        Response.json({ id: 'abc', receivedAt: '2026-08-17T14:20:00.000Z', emailed: true }),
      ),
    );
    vi.stubGlobal('fetch', spy);

    await sendSubmission(submission());

    expect(spy).toHaveBeenCalledOnce();
    const [url, init] = spy.mock.calls[0];
    expect(url).toBe(`${ENDPOINT}/submit`);
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toMatchObject({ author: 'Sam Reed' });
  });

  it('reports a reason when the studio cannot be reached', async () => {
    const { sendSubmission } = await loadApi();
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))),
    );

    const result = await sendSubmission(submission());
    expect(result).toEqual({ ok: false, reason: 'The studio could not be reached.' });
  });

  it('reports a reason when the studio refuses the body', async () => {
    const { sendSubmission } = await loadApi();
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(Response.json({ error: 'no' }, { status: 400 }))),
    );

    const result = await sendSubmission(submission());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain('would not accept it');
  });

  it('says so plainly when the caller has sent too many', async () => {
    const { sendSubmission } = await loadApi();
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(Response.json({ error: 'slow down' }, { status: 429 }))),
    );

    const result = await sendSubmission(submission());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain('a lot of submissions');
  });

  it('reports a reason when the answer is not the shape we expect', async () => {
    const { sendSubmission } = await loadApi();
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(Response.json({ nothing: 'useful' }))),
    );

    const result = await sendSubmission(submission());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain('could not read');
  });

  it('refuses to send at all when no endpoint is configured', async () => {
    vi.stubEnv('VITE_SUBMIT_ENDPOINT', '');
    vi.resetModules();
    const { sendSubmission } = await import('./api');

    const spy = vi.fn();
    vi.stubGlobal('fetch', spy);

    const result = await sendSubmission(submission());
    expect(result.ok).toBe(false);
    expect(spy).not.toHaveBeenCalled();
  });
});

describe('listSubmissions', () => {
  it('sends the studio token as a bearer header', async () => {
    const { listSubmissions } = await loadApi();
    const spy = vi.fn((_url: string, _init: RequestInit) =>
      Promise.resolve(Response.json({ submissions: [] })),
    );
    vi.stubGlobal('fetch', spy);

    await listSubmissions('a-token', 'carnot-ai');

    const [url, init] = spy.mock.calls[0];
    expect(url).toBe(`${ENDPOINT}/submissions?slug=carnot-ai`);
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer a-token');
  });

  it('says the token was refused rather than showing an empty list', async () => {
    const { listSubmissions } = await loadApi();
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(Response.json({ error: 'no' }, { status: 401 }))),
    );

    const result = await listSubmissions('wrong');
    expect(result).toEqual({ ok: false, reason: 'That token was not accepted.' });
  });
});
