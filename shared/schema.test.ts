import { describe, expect, it } from 'vitest';
import {
  AnswersSchema,
  ClientConfigSchema,
  SCHEMA_VERSION,
  ScaleSchema,
  SubmissionSchema,
} from './schema';

const studio = {
  name: 'NOMOREDESIGN',
  website: 'nomoredesign.co.uk',
  social: '@nomoredesign',
  strapline: 'Great design, made simple.',
};

function config(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: SCHEMA_VERSION,
    slug: 'a-client',
    clientName: 'A CLIENT',
    projectLine: 'STRATEGY & DESIGN DIRECTION',
    dateLine: 'MARCH 2026',
    studio,
    axes: [{ id: 'warm-cool', leftLabel: 'Warm', rightLabel: 'Cool', defaultValue: 3 }],
    ...overrides,
  };
}

describe('ClientConfigSchema', () => {
  it('accepts a minimal config and fills in the scale', () => {
    const parsed = ClientConfigSchema.parse(config());
    expect(parsed.scale).toEqual({ min: 1, max: 5, step: 0.5, snap: false });
  });

  it('fills in an empty reference list for an axis that has none', () => {
    const parsed = ClientConfigSchema.parse(config());
    expect(parsed.axes[0]?.refs).toEqual({ left: [], right: [] });
  });

  it('rejects a slug that is not lower case and hyphenated', () => {
    expect(ClientConfigSchema.safeParse(config({ slug: 'A Client' })).success).toBe(false);
  });

  it('rejects two axes that share an id', () => {
    const result = ClientConfigSchema.safeParse(
      config({
        axes: [
          { id: 'warm-cool', leftLabel: 'Warm', rightLabel: 'Cool', defaultValue: 3 },
          { id: 'warm-cool', leftLabel: 'Soft', rightLabel: 'Hard', defaultValue: 3 },
        ],
      }),
    );
    expect(result.success).toBe(false);
    expect(JSON.stringify(result.error?.issues)).toContain('Duplicate axis id');
  });

  it('rejects a starting value outside the scale', () => {
    const result = ClientConfigSchema.safeParse(
      config({
        axes: [{ id: 'warm-cool', leftLabel: 'Warm', rightLabel: 'Cool', defaultValue: 9 }],
      }),
    );
    expect(result.success).toBe(false);
  });

  it('rejects an unknown key rather than ignoring it', () => {
    expect(ClientConfigSchema.safeParse(config({ colour: 'red' })).success).toBe(false);
  });

  it('rejects a config with no axes', () => {
    expect(ClientConfigSchema.safeParse(config({ axes: [] })).success).toBe(false);
  });
});

describe('ScaleSchema', () => {
  it('rejects a maximum below the minimum', () => {
    expect(ScaleSchema.safeParse({ min: 5, max: 1 }).success).toBe(false);
  });

  it('rejects a step of zero', () => {
    expect(ScaleSchema.safeParse({ step: 0 }).success).toBe(false);
  });
});

describe('AnswersSchema', () => {
  const answers = {
    schemaVersion: SCHEMA_VERSION,
    slug: 'a-client',
    savedAt: '2026-08-17T14:20:00.000Z',
    values: { 'warm-cool': 3.5 },
    notes: { 'warm-cool': 'Leans cool.' },
  };

  it('accepts a well formed file', () => {
    expect(AnswersSchema.parse(answers).values['warm-cool']).toBe(3.5);
  });

  it('rejects a saved time that is not a date', () => {
    expect(AnswersSchema.safeParse({ ...answers, savedAt: 'yesterday' }).success).toBe(false);
  });

  it('rejects a value that is not a number', () => {
    expect(AnswersSchema.safeParse({ ...answers, values: { 'warm-cool': '3' } }).success).toBe(
      false,
    );
  });
});

describe('SubmissionSchema', () => {
  const submission = {
    schemaVersion: SCHEMA_VERSION,
    answers: {
      schemaVersion: SCHEMA_VERSION,
      slug: 'a-client',
      savedAt: '2026-08-17T14:20:00.000Z',
      values: { 'warm-cool': 3 },
      notes: { 'warm-cool': '' },
    },
    author: 'Sam Reed',
    clientName: 'A CLIENT',
    axisLabels: [{ id: 'warm-cool', leftLabel: 'Warm', rightLabel: 'Cool' }],
    sentFrom: 'https://example.github.io/tool/#/c/a-client',
  };

  it('accepts a complete submission', () => {
    expect(SubmissionSchema.parse(submission).author).toBe('Sam Reed');
  });

  it('requires a name, because the studio needs to know who filled it in', () => {
    expect(SubmissionSchema.safeParse({ ...submission, author: '' }).success).toBe(false);
  });

  it('rejects a received time supplied by the browser', () => {
    const result = SubmissionSchema.safeParse({
      ...submission,
      receivedAt: '2026-08-17T14:20:00.000Z',
    });
    expect(result.success).toBe(false);
  });
});
