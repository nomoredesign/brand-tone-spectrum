import { create } from 'zustand';
import { SCHEMA_VERSION, type Answers, type ClientConfig } from '@shared/schema';
import { defaultAnswers, normaliseValue } from './answers';

/**
 * One store holds the whole session, so no value has to be threaded through the
 * sheet, the row, the track and the notes cell as props.
 */
type SessionState = {
  config: ClientConfig | null;
  /** False until a client page has worked out where to start from. */
  initialised: boolean;
  /** Where reset returns to: the committed answers if there are any, else the config defaults. */
  startingPoint: Answers | null;
  values: Record<string, number>;
  notes: Record<string, string>;
  /**
   * Counts edits a person made. Loading a session replaces the values and the
   * notes wholesale, so a bare reference check cannot tell an edit from a fresh
   * start, and the browser would save on every page load.
   */
  revision: number;
  /** When the browser last kept a copy, for the quiet saved indicator. */
  lastSavedAt: string | null;

  initialise: (config: ClientConfig, startingPoint: Answers, current?: Answers) => void;
  setValue: (axisId: string, value: number) => void;
  setNote: (axisId: string, note: string) => void;
  replaceAll: (answers: Answers) => void;
  resetToStart: () => void;
  markSaved: (savedAt: string) => void;
};

export const useSession = create<SessionState>((set, get) => ({
  config: null,
  initialised: false,
  startingPoint: null,
  values: {},
  notes: {},
  revision: 0,
  lastSavedAt: null,

  initialise: (config, startingPoint, current) => {
    const answers = current ?? startingPoint;
    set({
      config,
      initialised: true,
      startingPoint,
      values: { ...answers.values },
      notes: { ...answers.notes },
      revision: 0,
      lastSavedAt: null,
    });
  },

  setValue: (axisId, value) => {
    const { config, values, revision } = get();
    if (!config) return;
    set({
      values: { ...values, [axisId]: normaliseValue(value, config) },
      revision: revision + 1,
    });
  },

  setNote: (axisId, note) => {
    const { notes, revision } = get();
    set({ notes: { ...notes, [axisId]: note }, revision: revision + 1 });
  },

  replaceAll: (answers) => {
    set({
      values: { ...answers.values },
      notes: { ...answers.notes },
      revision: get().revision + 1,
    });
  },

  resetToStart: () => {
    const { startingPoint, config, revision } = get();
    const answers = startingPoint ?? (config ? defaultAnswers(config) : null);
    if (!answers) return;
    set({
      values: { ...answers.values },
      notes: { ...answers.notes },
      revision: revision + 1,
    });
  },

  markSaved: (savedAt) => set({ lastSavedAt: savedAt }),
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
