import { describe, expect, it } from 'vitest';
import { SCHEMA_VERSION, type Answers, type ClientConfig } from '@shared/schema';
import { describeMergeReport, importAnswers, mergeAnswers } from './merge';

const config: ClientConfig = {
  schemaVersion: SCHEMA_VERSION,
  slug: 'a-client',
  clientName: 'A CLIENT',
  projectLine: 'STRATEGY',
  dateLine: 'MARCH 2026',
  studio: {
    name: 'NOMOREDESIGN',
    website: 'nomoredesign.co.uk',
    social: '@nomoredesign',
    strapline: 'Great design, made simple.',
  },
  scale: { min: 1, max: 5, step: 0.5, snap: false },
  axes: [
    {
      id: 'warm-cool',
      leftLabel: 'Warm',
      rightLabel: 'Cool',
      defaultValue: 3,
      refs: { left: [], right: [] },
    },
    {
      id: 'simple-detailed',
      leftLabel: 'Simple',
      rightLabel: 'Detailed',
      defaultValue: 2,
      refs: { left: [], right: [] },
    },
  ],
};

function answers(overrides: Partial<Answers> = {}): Answers {
  return {
    schemaVersion: SCHEMA_VERSION,
    slug: 'a-client',
    savedAt: '2026-08-17T14:20:00.000Z',
    values: { 'warm-cool': 4 },
    notes: { 'warm-cool': 'Cooler than we thought.' },
    ...overrides,
  };
}

describe('mergeAnswers', () => {
  it('keeps the values the file did give', () => {
    const { answers: merged } = mergeAnswers(config, answers());
    expect(merged.values['warm-cool']).toBe(4);
    expect(merged.notes['warm-cool']).toBe('Cooler than we thought.');
  });

  it('falls back to the starting value for a pair the file never mentions', () => {
    const report = mergeAnswers(config, answers());
    expect(report.answers.values['simple-detailed']).toBe(2);
    expect(report.answers.notes['simple-detailed']).toBe('');
    expect(report.missingAxisIds).toEqual(['simple-detailed']);
  });

  it('leaves out a pair this client config does not have', () => {
    const report = mergeAnswers(
      config,
      answers({ values: { 'warm-cool': 4, 'loud-quiet': 5 }, notes: { 'loud-quiet': 'Gone.' } }),
    );
    expect(report.answers.values['loud-quiet']).toBeUndefined();
    expect(report.ignoredAxisIds).toEqual(['loud-quiet']);
  });

  it('pulls a value that is off the scale back onto it', () => {
    const report = mergeAnswers(config, answers({ values: { 'warm-cool': 99 } }));
    expect(report.answers.values['warm-cool']).toBe(5);
  });

  it('reports nothing to say when the file matches the config', () => {
    const report = mergeAnswers(
      config,
      answers({
        values: { 'warm-cool': 4, 'simple-detailed': 2 },
        notes: { 'warm-cool': 'a', 'simple-detailed': 'b' },
      }),
    );
    expect(report.ignoredAxisIds).toEqual([]);
    expect(report.missingAxisIds).toEqual([]);
    expect(describeMergeReport(report, config)).toBeUndefined();
  });

  it('says in words what it left out and what it filled in', () => {
    const report = mergeAnswers(
      config,
      answers({ values: { 'warm-cool': 4, 'loud-quiet': 5 }, notes: {} }),
    );
    const sentence = describeMergeReport(report, config);
    expect(sentence).toContain('not on this chart');
    expect(sentence).toContain('Simple to Detailed');
  });
});

describe('importAnswers', () => {
  it('accepts a file from this client', () => {
    const result = importAnswers(config, answers());
    expect(result.ok).toBe(true);
  });

  it('refuses answers belonging to another client', () => {
    const result = importAnswers(config, answers({ slug: 'someone-else' }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain('someone-else');
  });

  it('refuses something that is not a set of answers at all', () => {
    const result = importAnswers(config, { hello: 'world' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain('not a set of answers');
  });
});
