import { describe, expect, it } from 'vitest';
import { ClientConfigSchema } from '@shared/schema';
import {
  axisIdFromLabels,
  buildConfig,
  draftFromConfig,
  emptyDraft,
  fileNameFor,
  serialiseConfig,
  slugify,
  type ClientDraft,
} from './draft';

describe('slugify', () => {
  it('turns a client name into something usable in a link', () => {
    expect(slugify('Blue Harbour Coffee')).toBe('blue-harbour-coffee');
    expect(slugify('CARNOT AI')).toBe('carnot-ai');
  });

  it('drops punctuation and accents rather than passing them through', () => {
    expect(slugify('Café & Co.')).toBe('cafe-co');
    expect(slugify('  Spaced   Out  ')).toBe('spaced-out');
  });

  it('never ends on a hyphen, even after being cut to length', () => {
    const long = slugify('a'.repeat(58) + ' bcdef');
    expect(long.endsWith('-')).toBe(false);
    expect(long.length).toBeLessThanOrEqual(60);
  });

  it('gives nothing back for text with no letters or numbers in it', () => {
    expect(slugify('!!!')).toBe('');
  });
});

describe('axisIdFromLabels', () => {
  it('joins the two ends', () => {
    expect(axisIdFromLabels('Feminine', 'Masculine')).toBe('feminine-masculine');
  });
});

function completeDraft(overrides: Partial<ClientDraft> = {}): ClientDraft {
  return {
    ...emptyDraft(),
    slug: 'blue-harbour',
    clientName: 'BLUE HARBOUR',
    ...overrides,
  };
}

describe('buildConfig', () => {
  it('produces a config the app would load', () => {
    const result = buildConfig(completeDraft());
    expect(result.ok).toBe(true);
    if (result.ok) expect(ClientConfigSchema.safeParse(result.config).success).toBe(true);
  });

  it('starts from the template, so the builder and the script agree', () => {
    const result = buildConfig(completeDraft());
    if (!result.ok) throw new Error('expected a valid config');
    expect(result.config.axes).toHaveLength(8);
    expect(result.config.axes[0]?.id).toBe('feminine-masculine');
  });

  it('works out an axis id from the labels when one is left blank', () => {
    const draft = completeDraft();
    const axes = [
      { ...draft.axes[0], id: '', leftLabel: 'Quiet', rightLabel: 'Loud' },
    ] as ClientDraft['axes'];

    const result = buildConfig({ ...draft, axes });
    if (!result.ok) throw new Error('expected a valid config');
    expect(result.config.axes[0]?.id).toBe('quiet-loud');
  });

  it('keeps references on a pair rather than dropping them when a client is edited', () => {
    const withRefs = ClientConfigSchema.parse({
      schemaVersion: 1,
      slug: 'has-refs',
      clientName: 'HAS REFS',
      projectLine: 'STRATEGY',
      dateLine: 'MARCH 2026',
      studio: {
        name: 'NOMOREDESIGN',
        website: 'nomoredesign.co.uk',
        social: '@nomoredesign',
        strapline: 'Great design, made simple.',
      },
      axes: [
        {
          id: 'quiet-loud',
          leftLabel: 'Quiet',
          rightLabel: 'Loud',
          defaultValue: 3,
          refs: {
            left: [{ id: 'one', kind: 'image', src: 'refs/has-refs/a.svg', caption: 'A' }],
            right: [],
          },
        },
      ],
    });

    const result = buildConfig(draftFromConfig(withRefs));
    if (!result.ok) throw new Error('expected a valid config');
    expect(result.config.axes[0]?.refs.left).toHaveLength(1);
  });

  it('trims what a person typed rather than storing the spaces', () => {
    const result = buildConfig(completeDraft({ clientName: '  BLUE HARBOUR  ' }));
    if (!result.ok) throw new Error('expected a valid config');
    expect(result.config.clientName).toBe('BLUE HARBOUR');
  });

  it('leaves the theme off entirely when it is turned off', () => {
    const result = buildConfig(completeDraft({ useTheme: false, theme: { paper: '#ffffff' } }));
    if (!result.ok) throw new Error('expected a valid config');
    expect(result.config.theme).toBeUndefined();
  });

  it('keeps only the theme colours that were actually filled in', () => {
    const result = buildConfig(
      completeDraft({ useTheme: true, theme: { paper: '#ffffff', ink: '  ' } }),
    );
    if (!result.ok) throw new Error('expected a valid config');
    expect(result.config.theme).toEqual({ paper: '#ffffff' });
  });

  it('reports a missing name against the field it belongs to', () => {
    const result = buildConfig(completeDraft({ clientName: '' }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const issue = result.issues.find((entry) => entry.field === 'clientName');
      expect(issue?.message).toBe('The client name is needed.');
    }
  });

  it('says plainly what is wrong with a slug rather than repeating a schema message', () => {
    const result = buildConfig(completeDraft({ slug: 'Not A Slug' }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.find((entry) => entry.field === 'slug')?.message).toContain(
        'lower case',
      );
    }
  });

  it('reports a scale value that is not a number', () => {
    const draft = completeDraft();
    const result = buildConfig({ ...draft, scale: { ...draft.scale, max: 'five' } });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.some((entry) => entry.message.includes('has to be a number'))).toBe(
        true,
      );
    }
  });

  it('refuses a starting value that sits off the scale', () => {
    const draft = completeDraft();
    const axes = [{ ...draft.axes[0], defaultValue: '99' }] as ClientDraft['axes'];
    expect(buildConfig({ ...draft, axes }).ok).toBe(false);
  });

  it('refuses two pairs sharing an id', () => {
    const draft = completeDraft();
    const axes = [draft.axes[0], { ...draft.axes[0], key: 'other' }] as ClientDraft['axes'];
    expect(buildConfig({ ...draft, axes }).ok).toBe(false);
  });

  it('points a fault at the pair it came from', () => {
    const draft = completeDraft();
    const axes = [{ ...draft.axes[0], leftLabel: '' }] as ClientDraft['axes'];

    const result = buildConfig({ ...draft, axes });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.some((entry) => entry.field === 'axes.0.leftLabel')).toBe(true);
    }
  });
});

describe('draftFromConfig', () => {
  it('makes a round trip without changing anything', () => {
    const first = buildConfig(completeDraft());
    if (!first.ok) throw new Error('expected a valid config');

    const second = buildConfig(draftFromConfig(first.config));
    if (!second.ok) throw new Error('expected a valid config');

    expect(second.config).toEqual(first.config);
  });
});

describe('the file it writes', () => {
  it('is named after the slug, which the loader insists on', () => {
    expect(fileNameFor('blue-harbour')).toBe('blue-harbour.json');
  });

  it('is indented and ends with a newline, like the files already in the folder', () => {
    const result = buildConfig(completeDraft());
    if (!result.ok) throw new Error('expected a valid config');

    const text = serialiseConfig(result.config);
    expect(text.endsWith('}\n')).toBe(true);
    expect(text).toContain('\n  "slug": "blue-harbour"');
    expect(ClientConfigSchema.safeParse(JSON.parse(text)).success).toBe(true);
  });
});
