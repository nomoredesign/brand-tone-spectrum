import { create } from 'zustand';
import { SCHEMA_VERSION, type Answers, type ClientConfig } from '@shared/schema';
import { defaultAnswers, normaliseValue } from './answers';

/**
 * One store holds the whole session, so no value has to be threaded through the
 * sheet, the row, the track and the notes cell as props.
 */
type SessionState = {
  config: ClientConfig | null;
  /** Where reset returns to: the committed answers if there are any, else the config defaults. */
  startingPoint: Answers | null;
  values: Record<string, number>;
  notes: Record<string, string>;

  initialise: (config: ClientConfig, startingPoint: Answers, current?: Answers) => void;
  setValue: (axisId: string, value: number) => void;
  setNote: (axisId: string, note: string) => void;
  replaceAll: (answers: Answers) => void;
  resetToStart: () => void;
};

export const useSession = create<SessionState>((set, get) => ({
  config: null,
  startingPoint: null,
  values: {},
  notes: {},

  initialise: (config, startingPoint, current) => {
    const answers = current ?? startingPoint;
    set({
      config,
      startingPoint,
      values: { ...answers.values },
      notes: { ...answers.notes },
    });
  },

  setValue: (axisId, value) => {
    const { config, values } = get();
    if (!config) return;
    set({ values: { ...values, [axisId]: normaliseValue(value, config) } });
  },

  setNote: (axisId, note) => {
    set({ notes: { ...get().notes, [axisId]: note } });
  },

  replaceAll: (answers) => {
    set({ values: { ...answers.values }, notes: { ...answers.notes } });
  },

  resetToStart: () => {
    const { startingPoint, config } = get();
    const answers = startingPoint ?? (config ? defaultAnswers(config) : null);
    if (!answers) return;
    set({ values: { ...answers.values }, notes: { ...answers.notes } });
  },
}));

/** The current session as a file the tool can save, share or send. */
export function currentAnswers(state: SessionState, author?: string): Answers {
  return {
    schemaVersion: SCHEMA_VERSION,
    slug: state.config?.slug ?? '',
    savedAt: new Date().toISOString(),
    ...(author !== undefined && author.length > 0 ? { author } : {}),
    values: { ...state.values },
    notes: { ...state.notes },
  };
}

export type { SessionState };
