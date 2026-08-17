import { AnswersSchema, SCHEMA_VERSION, type Answers } from '@shared/schema';

/**
 * The key carries the schema version, so a future change to the shape of the
 * answers cannot be read back as if it were the current one. Old keys simply
 * stop being read.
 */
export function storageKey(slug: string): string {
  return `brand-tone/v${SCHEMA_VERSION}/${slug}`;
}

/**
 * Private browsing and a full disk both make localStorage throw rather than
 * return, so every call here is wrapped. Losing the convenience of a saved
 * draft is acceptable; taking the page down with it is not.
 */
export function loadAnswers(slug: string): Answers | undefined {
  let raw: string | null;
  try {
    raw = localStorage.getItem(storageKey(slug));
  } catch {
    return undefined;
  }
  if (raw === null) return undefined;

  try {
    const result = AnswersSchema.safeParse(JSON.parse(raw));
    if (!result.success || result.data.slug !== slug) return undefined;
    return result.data;
  } catch {
    return undefined;
  }
}

export function saveAnswers(slug: string, answers: Answers): boolean {
  try {
    localStorage.setItem(storageKey(slug), JSON.stringify(answers));
    return true;
  } catch {
    return false;
  }
}

export function clearAnswers(slug: string): void {
  try {
    localStorage.removeItem(storageKey(slug));
  } catch {
    // Nothing useful to do: the draft simply stays where it is.
  }
}
