import { SCHEMA_VERSION } from '@shared/schema';

/**
 * When this client last sent their answers to the studio. Kept apart from the
 * answers themselves, because it describes what happened to them rather than
 * what they say.
 */
function key(slug: string): string {
  return `brand-tone/v${SCHEMA_VERSION}/${slug}/sent`;
}

export function loadSentAt(slug: string): string | undefined {
  try {
    const raw = localStorage.getItem(key(slug));
    if (raw === null) return undefined;
    return Number.isNaN(new Date(raw).getTime()) ? undefined : raw;
  } catch {
    return undefined;
  }
}

export function recordSentAt(slug: string, sentAt: string): void {
  try {
    localStorage.setItem(key(slug), sentAt);
  } catch {
    // The send still happened; only the reminder of it is lost.
  }
}

const TOKEN_KEY = 'brand-tone/studio-token';

/** The studio's own token, kept so the inbox does not ask on every visit. */
export function loadStudioToken(): string {
  try {
    return localStorage.getItem(TOKEN_KEY) ?? '';
  } catch {
    return '';
  }
}

export function saveStudioToken(token: string): void {
  try {
    if (token.length === 0) localStorage.removeItem(TOKEN_KEY);
    else localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // Nothing to do: the studio will be asked for it again next time.
  }
}
