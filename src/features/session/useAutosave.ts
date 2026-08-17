import { useEffect } from 'react';
import { currentAnswers, useSession } from './store';
import { saveAnswers } from './storage';

/** Long enough that a sentence is one write, short enough to feel immediate. */
const PAUSE_MS = 600;

/**
 * Keeps the browser's copy up to date after a short pause, so typing a note is
 * not a write to storage on every key press.
 *
 * It subscribes to the store rather than reading it through the component, so a
 * page that is only showing the sheet does not re-render on every save.
 */
export function useAutosave(slug: string | undefined, enabled: boolean): void {
  useEffect(() => {
    if (!slug || !enabled) return;

    let timer: ReturnType<typeof setTimeout> | undefined;

    const unsubscribe = useSession.subscribe((state, previous) => {
      // Only an edit a person made is worth saving. The counter goes back to
      // nought when a session loads, so opening the page writes nothing, and
      // marking a save does not move it, so this cannot set off a loop.
      const edited = state.revision !== previous.revision && state.revision > 0;
      if (!edited || !state.initialised || state.config?.slug !== slug) return;

      clearTimeout(timer);
      timer = setTimeout(() => {
        // Read again rather than closing over the snapshot, so the write is
        // always the newest answers even if edits landed while waiting.
        const latest = useSession.getState();
        const answers = currentAnswers(latest);
        if (saveAnswers(slug, answers)) latest.markSaved(answers.savedAt);
      }, PAUSE_MS);
    });

    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, [slug, enabled]);
}
