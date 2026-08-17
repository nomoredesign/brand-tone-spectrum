import { describe, expect, it } from 'vitest';
import { SCHEMA_VERSION, type Answers } from '@shared/schema';
import { clearAnswers, loadAnswers, saveAnswers, storageKey } from './storage';

const answers: Answers = {
  schemaVersion: SCHEMA_VERSION,
  slug: 'carnot-ai',
  savedAt: '2026-08-17T14:20:00.000Z',
  values: { 'warm-cool': 3.5 },
  notes: { 'warm-cool': 'Leans cool.' },
};

describe('storage', () => {
  it('puts the schema version in the key, so old data is never misread', () => {
    expect(storageKey('carnot-ai')).toBe(`brand-tone/v${SCHEMA_VERSION}/carnot-ai`);
  });

  it('keeps one client apart from another', () => {
    saveAnswers('carnot-ai', answers);
    expect(loadAnswers('demo-studio')).toBeUndefined();
  });

  it('restores what it saved', () => {
    saveAnswers('carnot-ai', answers);
    expect(loadAnswers('carnot-ai')).toEqual(answers);
  });

  it('forgets answers when they are cleared', () => {
    saveAnswers('carnot-ai', answers);
    clearAnswers('carnot-ai');
    expect(loadAnswers('carnot-ai')).toBeUndefined();
  });

  it('ignores a stored file whose slug does not match its key', () => {
    localStorage.setItem(
      storageKey('carnot-ai'),
      JSON.stringify({ ...answers, slug: 'demo-studio' }),
    );
    expect(loadAnswers('carnot-ai')).toBeUndefined();
  });

  it('ignores stored text that is not JSON', () => {
    localStorage.setItem(storageKey('carnot-ai'), 'not json');
    expect(loadAnswers('carnot-ai')).toBeUndefined();
  });

  it('ignores stored JSON that is not a set of answers', () => {
    localStorage.setItem(storageKey('carnot-ai'), JSON.stringify({ values: 'wrong' }));
    expect(loadAnswers('carnot-ai')).toBeUndefined();
  });

  it('reports a refusal rather than throwing when storage will not take it', () => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = () => {
      throw new Error('quota exceeded');
    };

    try {
      expect(saveAnswers('carnot-ai', answers)).toBe(false);
    } finally {
      Storage.prototype.setItem = original;
    }
  });
});
