import { compressToEncodedURIComponent } from 'lz-string';
import { describe, expect, it } from 'vitest';
import { SCHEMA_VERSION, type Answers } from '@shared/schema';
import { decodeAnswers, encodeAnswers } from './encoding';

const answers: Answers = {
  schemaVersion: SCHEMA_VERSION,
  slug: 'carnot-ai',
  savedAt: '2026-08-17T14:20:00.000Z',
  author: 'Sam Reed',
  values: { 'warm-cool': 3.5, 'simple-detailed': 2 },
  notes: { 'warm-cool': 'Leans cool, but not cold.', 'simple-detailed': '' },
};

describe('encodeAnswers and decodeAnswers', () => {
  it('makes the round trip without losing anything', () => {
    expect(decodeAnswers(encodeAnswers(answers))).toEqual(answers);
  });

  /*
   * lz-string's alphabet includes "+", which a query string reader turns back
   * into a space. Decoding puts that right, but only a round trip through a real
   * URL proves it, so this is checked rather than assumed.
   */
  it('survives a round trip through a URL query string', () => {
    const token = encodeAnswers(answers);
    const url = new URL(`https://example.com/#/c/carnot-ai?a=${token}`);
    const readBack = new URLSearchParams(url.hash.slice(url.hash.indexOf('?'))).get('a') ?? '';

    expect(readBack).not.toBe('');
    expect(decodeAnswers(readBack)).toEqual(answers);
  });

  it('survives a note with newlines and punctuation', () => {
    const awkward: Answers = {
      ...answers,
      notes: { 'warm-cool': 'One line.\nAnother "line" — with an em dash & an ampersand.' },
    };
    expect(decodeAnswers(encodeAnswers(awkward))?.notes['warm-cool']).toBe(
      awkward.notes['warm-cool'],
    );
  });

  it('reports nothing for an empty token', () => {
    expect(decodeAnswers('')).toBeUndefined();
  });

  it('reports nothing for a token that is not compressed data', () => {
    expect(decodeAnswers('not-a-real-token')).toBeUndefined();
  });

  it('reports nothing for compressed data that is not JSON', () => {
    expect(decodeAnswers(compressToEncodedURIComponent('hello'))).toBeUndefined();
  });

  it('reports nothing for JSON that is not a set of answers', () => {
    const token = compressToEncodedURIComponent(JSON.stringify({ values: { a: 1 } }));
    expect(decodeAnswers(token)).toBeUndefined();
  });
});
