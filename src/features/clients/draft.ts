import { ClientConfigSchema, type AxisRefs, type ClientConfig, type Theme } from '@shared/schema';
import type { PaletteKey } from '@/lib/palette';
import templateJson from '../../../clients/_template.json';

/**
 * The form's own shape. Numbers are held as strings, because a half typed number
 * is a normal thing for a form to contain and not something to round or reject
 * while a person is still typing.
 *
 * A draft becomes a client config only by going through the same Zod schema the
 * app loads files with, so the builder cannot produce a file the tool refuses.
 */
export type AxisDraft = {
  /** Stable across edits, so React keeps the right row focused while the id changes. */
  key: string;
  id: string;
  leftLabel: string;
  rightLabel: string;
  defaultValue: string;
  notesPlaceholder: string;
  /**
   * Carried through untouched. The form has no way to edit references yet, and
   * editing a client must not quietly delete the ones it already has.
   */
  refs: AxisRefs;
};

export type ClientDraft = {
  slug: string;
  clientName: string;
  projectLine: string;
  dateLine: string;
  studio: { name: string; website: string; social: string; strapline: string };
  scale: { min: string; max: string; step: string; snap: boolean };
  axes: AxisDraft[];
  useTheme: boolean;
  theme: Partial<Record<PaletteKey, string>>;
};

/** The template is the starting point here as well as for the command line script. */
const TEMPLATE: ClientConfig = ClientConfigSchema.parse(templateJson);

function newKey(): string {
  return crypto.randomUUID();
}

/** "Feminine" and "Masculine" become "feminine-masculine". */
export function axisIdFromLabels(left: string, right: string): string {
  return slugify(`${left} ${right}`);
}

/** Turns anything a person types into something usable in a URL. */
export function slugify(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/, '');
}

export function newAxisDraft(): AxisDraft {
  return {
    key: newKey(),
    id: '',
    leftLabel: '',
    rightLabel: '',
    defaultValue: '3',
    notesPlaceholder: '',
    refs: { left: [], right: [] },
  };
}

function axisDraftFrom(axis: ClientConfig['axes'][number]): AxisDraft {
  return {
    key: newKey(),
    id: axis.id,
    leftLabel: axis.leftLabel,
    rightLabel: axis.rightLabel,
    defaultValue: String(axis.defaultValue),
    notesPlaceholder: axis.notesPlaceholder ?? '',
    refs: axis.refs,
  };
}

/** A new client, starting from the template's studio block and its eight pairs. */
export function emptyDraft(studio?: ClientConfig['studio']): ClientDraft {
  return {
    slug: '',
    clientName: '',
    projectLine: TEMPLATE.projectLine,
    dateLine: TEMPLATE.dateLine,
    studio: { ...(studio ?? TEMPLATE.studio) },
    scale: {
      min: String(TEMPLATE.scale.min),
      max: String(TEMPLATE.scale.max),
      step: String(TEMPLATE.scale.step),
      snap: TEMPLATE.scale.snap,
    },
    axes: TEMPLATE.axes.map(axisDraftFrom),
    useTheme: false,
    theme: {},
  };
}

/** An existing client, opened for editing. */
export function draftFromConfig(config: ClientConfig): ClientDraft {
  return {
    slug: config.slug,
    clientName: config.clientName,
    projectLine: config.projectLine,
    dateLine: config.dateLine,
    studio: { ...config.studio },
    scale: {
      min: String(config.scale.min),
      max: String(config.scale.max),
      step: String(config.scale.step),
      snap: config.scale.snap,
    },
    axes: config.axes.map(axisDraftFrom),
    useTheme: config.theme !== undefined,
    theme: { ...(config.theme ?? {}) },
  };
}

export type DraftIssue = { field: string; message: string };

export type BuildResult = { ok: true; config: ClientConfig } | { ok: false; issues: DraftIssue[] };

function toNumber(value: string): number {
  const parsed = Number(value.trim());
  return value.trim().length === 0 || Number.isNaN(parsed) ? Number.NaN : parsed;
}

function cleanTheme(draft: ClientDraft): Theme | undefined {
  if (!draft.useTheme) return undefined;

  const entries = Object.entries(draft.theme).filter(
    ([, value]) => typeof value === 'string' && value.trim().length > 0,
  );
  if (entries.length === 0) return undefined;

  return Object.fromEntries(entries.map(([key, value]) => [key, String(value).trim()])) as Theme;
}

/**
 * Reads the Zod issue path back into a field name the form can point at, so a
 * problem is shown beside the thing that caused it rather than in a list at the
 * bottom of the page.
 */
function fieldFor(path: PropertyKey[]): string {
  const [first, second, third] = path;
  if (first === 'axes' && typeof second === 'number') {
    return `axes.${second}.${String(third ?? 'id')}`;
  }
  if (first === 'studio') return `studio.${String(second)}`;
  if (first === 'scale') return `scale.${String(second)}`;
  return String(first ?? 'form');
}

/** What each field is called, for messages a person can act on. */
const FIELD_LABEL: Record<string, string> = {
  clientName: 'The client name',
  slug: 'The slug',
  projectLine: 'The project line',
  dateLine: 'The date line',
  'studio.name': 'The studio name',
  'studio.website': 'The website',
  'studio.social': 'The social handle',
  'studio.strapline': 'The strap line',
  leftLabel: 'The left label',
  rightLabel: 'The right label',
  id: 'The id',
};

/**
 * Zod's own wording is written for a developer reading a stack trace. This is
 * the same fault said in a way the person filling the form in can act on.
 */
function friendlyMessage(field: string, code: string, fallback: string): string {
  const leaf = field.split('.').pop() ?? field;
  const name = FIELD_LABEL[field] ?? FIELD_LABEL[leaf] ?? 'This';

  if (code === 'too_small') return `${name} is needed.`;
  if (code === 'invalid_type') {
    return field.startsWith('scale') || leaf === 'defaultValue'
      ? `${leaf === 'defaultValue' ? 'The starting value' : name} has to be a number.`
      : `${name} is needed.`;
  }
  if (code === 'too_big') return `${name} is too long.`;

  return fallback;
}

export function buildConfig(draft: ClientDraft): BuildResult {
  const candidate = {
    schemaVersion: TEMPLATE.schemaVersion,
    slug: draft.slug.trim(),
    clientName: draft.clientName.trim(),
    projectLine: draft.projectLine.trim(),
    dateLine: draft.dateLine.trim(),
    studio: {
      name: draft.studio.name.trim(),
      website: draft.studio.website.trim(),
      social: draft.studio.social.trim(),
      strapline: draft.studio.strapline.trim(),
    },
    ...(cleanTheme(draft) !== undefined ? { theme: cleanTheme(draft) } : {}),
    scale: {
      min: toNumber(draft.scale.min),
      max: toNumber(draft.scale.max),
      step: toNumber(draft.scale.step),
      snap: draft.scale.snap,
    },
    axes: draft.axes.map((axis) => ({
      // An id left blank is worked out from the labels, which is what a person
      // means by it and saves them inventing one.
      id:
        axis.id.trim().length > 0
          ? axis.id.trim()
          : axisIdFromLabels(axis.leftLabel, axis.rightLabel),
      leftLabel: axis.leftLabel.trim(),
      rightLabel: axis.rightLabel.trim(),
      defaultValue: toNumber(axis.defaultValue),
      ...(axis.notesPlaceholder.trim().length > 0
        ? { notesPlaceholder: axis.notesPlaceholder.trim() }
        : {}),
      // Written back as they came in, never rebuilt from the form.
      refs: axis.refs,
    })),
  };

  const result = ClientConfigSchema.safeParse(candidate);
  if (result.success) return { ok: true, config: result.data };

  return {
    ok: false,
    issues: result.error.issues.map((issue) => {
      const field = fieldFor(issue.path);
      return { field, message: friendlyMessage(field, issue.code, issue.message) };
    }),
  };
}

/** The file name this client must be saved as, which the loader insists on. */
export function fileNameFor(slug: string): string {
  return `${slug}.json`;
}

/** Exactly what goes in the file: two space indented, with a closing newline. */
export function serialiseConfig(config: ClientConfig): string {
  return `${JSON.stringify(config, null, 2)}\n`;
}
