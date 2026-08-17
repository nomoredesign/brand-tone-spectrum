import { z } from 'zod';

/**
 * Schemas shared by the browser app and the Cloudflare Worker.
 *
 * Both sides import this file through a path alias, so the shape of a submission
 * cannot drift: a change here either type checks on both sides or on neither.
 *
 * Every stored shape carries `schemaVersion`, so saved data written by an older
 * build can be recognised and migrated rather than silently misread.
 */
export const SCHEMA_VERSION = 1;

/** Upper bounds keep a stored or posted payload small enough to reason about. */
export const LIMITS = {
  noteLength: 5_000,
  authorLength: 120,
  messageLength: 2_000,
  maxAxes: 40,
  /** The worker rejects a body larger than this. */
  submissionBytes: 256 * 1024,
} as const;

const slug = z
  .string()
  .min(1)
  .max(60)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lower case words joined by hyphens');

const axisId = z
  .string()
  .min(1)
  .max(60)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lower case words joined by hyphens');

/* -------------------------------------------------------------------------- */
/* Client config                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Colour and font overrides. Each key maps to one CSS custom property on the
 * sheet, so a client config can re-skin the tool without a code change.
 */
export const ThemeSchema = z
  .object({
    paper: z.string().optional(),
    ink: z.string().optional(),
    muted: z.string().optional(),
    rule: z.string().optional(),
    track: z.string().optional(),
    dot: z.string().optional(),
    note: z.string().optional(),
    noteBorder: z.string().optional(),
    noteInk: z.string().optional(),
    notePlaceholder: z.string().optional(),
    focus: z.string().optional(),
    fontDisplay: z.string().optional(),
    fontBody: z.string().optional(),
  })
  .strict();

export const ScaleSchema = z
  .object({
    min: z.number().finite().default(1),
    max: z.number().finite().default(5),
    step: z.number().finite().positive().default(0.5),
    snap: z.boolean().default(false),
  })
  .strict()
  .refine((s) => s.max > s.min, { message: 'max must be greater than min' })
  .refine((s) => (s.max - s.min) / s.step <= 200, {
    message: 'step is too small for the range',
  });

/**
 * A visual reference shown against one end of an axis. Read in phase one to show
 * a count next to a label; displayed in the tray in phase two.
 */
export const ReferenceSchema = z
  .object({
    id: z.string().min(1).max(60),
    kind: z.enum(['image', 'link']),
    src: z.string().min(1).max(500),
    thumb: z.string().min(1).max(500).optional(),
    caption: z.string().min(1).max(200),
    credit: z.string().max(200).optional(),
  })
  .strict();

export const AxisRefsSchema = z
  .object({
    left: z.array(ReferenceSchema).max(40).default([]),
    right: z.array(ReferenceSchema).max(40).default([]),
  })
  .strict();

export const AxisSchema = z
  .object({
    id: axisId,
    leftLabel: z.string().min(1).max(60),
    rightLabel: z.string().min(1).max(60),
    defaultValue: z.number().finite(),
    notesPlaceholder: z.string().max(200).optional(),
    refs: AxisRefsSchema.default({ left: [], right: [] }),
  })
  .strict();

export const StudioSchema = z
  .object({
    name: z.string().min(1).max(80),
    website: z.string().min(1).max(120),
    social: z.string().min(1).max(80),
    strapline: z.string().min(1).max(120),
  })
  .strict();

export const ClientConfigSchema = z
  .object({
    schemaVersion: z.number().int().positive(),
    slug,
    clientName: z.string().min(1).max(80),
    projectLine: z.string().min(1).max(120),
    dateLine: z.string().min(1).max(60),
    studio: StudioSchema,
    theme: ThemeSchema.optional(),
    scale: ScaleSchema.default({ min: 1, max: 5, step: 0.5, snap: false }),
    axes: z.array(AxisSchema).min(1).max(LIMITS.maxAxes),
  })
  .strict()
  .superRefine((config, ctx) => {
    const seen = new Set<string>();
    for (const [index, axis] of config.axes.entries()) {
      if (seen.has(axis.id)) {
        ctx.addIssue({
          code: 'custom',
          path: ['axes', index, 'id'],
          message: `Duplicate axis id "${axis.id}"`,
        });
      }
      seen.add(axis.id);

      if (axis.defaultValue < config.scale.min || axis.defaultValue > config.scale.max) {
        ctx.addIssue({
          code: 'custom',
          path: ['axes', index, 'defaultValue'],
          message: `defaultValue must sit between ${config.scale.min} and ${config.scale.max}`,
        });
      }
    }
  });

/* -------------------------------------------------------------------------- */
/* Answers                                                                    */
/* -------------------------------------------------------------------------- */

/** What a person creates by using the tool. */
export const AnswersSchema = z
  .object({
    schemaVersion: z.number().int().positive(),
    /** Carried so an imported file cannot be applied to the wrong client. */
    slug,
    savedAt: z.iso.datetime({ offset: true }),
    author: z.string().max(LIMITS.authorLength).optional(),
    values: z.record(axisId, z.number().finite()),
    notes: z.record(axisId, z.string().max(LIMITS.noteLength)),
  })
  .strict();

/* -------------------------------------------------------------------------- */
/* Submission                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * An ordered copy of the axis labels travels with the submission, so the worker
 * can write a readable email without holding a copy of the client files.
 */
export const AxisLabelSchema = z
  .object({
    id: axisId,
    leftLabel: z.string().min(1).max(60),
    rightLabel: z.string().min(1).max(60),
  })
  .strict();

export const SubmissionSchema = z
  .object({
    schemaVersion: z.number().int().positive(),
    answers: AnswersSchema,
    /** Required here even though it is optional on answers: the studio needs a name. */
    author: z.string().min(1).max(LIMITS.authorLength),
    message: z.string().max(LIMITS.messageLength).optional(),
    clientName: z.string().min(1).max(80),
    axisLabels: z.array(AxisLabelSchema).min(1).max(LIMITS.maxAxes),
    sentFrom: z.string().min(1).max(500),
  })
  .strict();

/** What the worker stores. The time and the id are set by the worker, never the browser. */
export const StoredSubmissionSchema = SubmissionSchema.extend({
  id: z.string().min(1).max(80),
  receivedAt: z.iso.datetime({ offset: true }),
}).strict();

/** The row shape the inbox page lists, without the answers body. */
export const SubmissionSummarySchema = z
  .object({
    id: z.string().min(1).max(80),
    receivedAt: z.iso.datetime({ offset: true }),
    slug,
    clientName: z.string().min(1).max(80),
    author: z.string().min(1).max(LIMITS.authorLength),
    message: z.string().max(LIMITS.messageLength).optional(),
  })
  .strict();

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

export type Theme = z.infer<typeof ThemeSchema>;
export type Scale = z.infer<typeof ScaleSchema>;
export type Reference = z.infer<typeof ReferenceSchema>;
export type AxisRefs = z.infer<typeof AxisRefsSchema>;
export type Axis = z.infer<typeof AxisSchema>;
export type Studio = z.infer<typeof StudioSchema>;
export type ClientConfig = z.infer<typeof ClientConfigSchema>;
export type Answers = z.infer<typeof AnswersSchema>;
export type AxisLabel = z.infer<typeof AxisLabelSchema>;
export type Submission = z.infer<typeof SubmissionSchema>;
export type StoredSubmission = z.infer<typeof StoredSubmissionSchema>;
export type SubmissionSummary = z.infer<typeof SubmissionSummarySchema>;
