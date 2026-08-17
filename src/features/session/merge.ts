import { AnswersSchema, SCHEMA_VERSION, type Answers, type ClientConfig } from '@shared/schema';
import { normaliseValue } from './answers';

export type MergeReport = {
  answers: Answers;
  /** Axis ids in the file that this client config does not have. */
  ignoredAxisIds: string[];
  /** Axes in the config that the file said nothing about. */
  missingAxisIds: string[];
};

/**
 * Lines an incoming file up against the client config in front of us.
 *
 * A config gains and loses pairs over time, so a file will not always match.
 * Neither mismatch is treated as a failure: an unknown axis is dropped, an
 * unmentioned axis falls back to its starting value, and both are reported so
 * the person can be told in a small message.
 */
export function mergeAnswers(config: ClientConfig, incoming: Answers): MergeReport {
  const values: Record<string, number> = {};
  const notes: Record<string, string> = {};
  const missingAxisIds: string[] = [];

  for (const axis of config.axes) {
    const value = incoming.values[axis.id];
    const note = incoming.notes[axis.id];

    if (value === undefined && note === undefined) missingAxisIds.push(axis.id);

    values[axis.id] = value === undefined ? axis.defaultValue : normaliseValue(value, config);
    notes[axis.id] = note ?? '';
  }

  const known = new Set(config.axes.map((axis) => axis.id));
  const ignoredAxisIds = [
    ...new Set([...Object.keys(incoming.values), ...Object.keys(incoming.notes)]),
  ].filter((id) => !known.has(id));

  return {
    answers: {
      schemaVersion: SCHEMA_VERSION,
      slug: config.slug,
      savedAt: incoming.savedAt,
      ...(incoming.author !== undefined ? { author: incoming.author } : {}),
      values,
      notes,
    },
    ignoredAxisIds,
    missingAxisIds,
  };
}

export type ImportResult = { ok: true; report: MergeReport } | { ok: false; reason: string };

/**
 * Validates something a person handed us, then merges it. The slug check is the
 * point of carrying a slug on the file at all: one client's answers must never
 * be applied to another client's chart.
 */
export function importAnswers(config: ClientConfig, raw: unknown): ImportResult {
  const parsed = AnswersSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, reason: 'That file is not a set of answers from this tool.' };
  }

  if (parsed.data.slug !== config.slug) {
    return {
      ok: false,
      reason: `Those answers belong to a different client (${parsed.data.slug}), so they were not loaded.`,
    };
  }

  return { ok: true, report: mergeAnswers(config, parsed.data) };
}

/** Turns the two mismatch lists into one sentence, or nothing when all matched. */
export function describeMergeReport(report: MergeReport, config: ClientConfig): string | undefined {
  const parts: string[] = [];

  if (report.ignoredAxisIds.length > 0) {
    parts.push(
      `${report.ignoredAxisIds.length} pair${report.ignoredAxisIds.length === 1 ? '' : 's'} in the file ${report.ignoredAxisIds.length === 1 ? 'is' : 'are'} not on this chart and ${report.ignoredAxisIds.length === 1 ? 'was' : 'were'} left out`,
    );
  }

  if (report.missingAxisIds.length > 0) {
    const labels = report.missingAxisIds
      .map((id) => config.axes.find((axis) => axis.id === id))
      .filter((axis) => axis !== undefined)
      .map((axis) => `${axis.leftLabel} to ${axis.rightLabel}`);
    parts.push(
      `the file said nothing about ${labels.join(', ')}, so ${labels.length === 1 ? 'it kept its' : 'they kept their'} starting value`,
    );
  }

  if (parts.length === 0) return undefined;

  const sentence = parts.join(', and ');
  return `${sentence.charAt(0).toUpperCase()}${sentence.slice(1)}.`;
}
