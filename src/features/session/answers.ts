import { SCHEMA_VERSION, type Answers, type ClientConfig } from '@shared/schema';
import { clampToScale, snapToStep } from '@/lib/scale';

/** The starting point for a client who has not filled anything in yet. */
export function defaultAnswers(config: ClientConfig): Answers {
  const values: Record<string, number> = {};
  const notes: Record<string, string> = {};

  for (const axis of config.axes) {
    values[axis.id] = axis.defaultValue;
    notes[axis.id] = '';
  }

  return {
    schemaVersion: SCHEMA_VERSION,
    slug: config.slug,
    savedAt: new Date().toISOString(),
    values,
    notes,
  };
}

/** Keeps a value on the scale, and quantises it when the client config asks for that. */
export function normaliseValue(value: number, config: ClientConfig): number {
  const clamped = clampToScale(value, config.scale);
  return config.scale.snap ? snapToStep(clamped, config.scale) : clamped;
}
