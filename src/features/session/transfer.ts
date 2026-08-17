import type { Answers, ClientConfig } from '@shared/schema';
import { encodeAnswers } from '@/lib/encoding';

/**
 * A link that opens this client's page with these answers already in it. The
 * token sits inside the hash, because hash routing means the part before the
 * hash never changes.
 */
export function buildShareLink(slug: string, answers: Answers): string {
  const { origin, pathname } = window.location;
  return `${origin}${pathname}#/c/${slug}?a=${encodeAnswers(answers)}`;
}

export function answersFileName(config: ClientConfig, answers: Answers): string {
  const day = answers.savedAt.slice(0, 10);
  return `${config.slug}-brand-tone-${day}.json`;
}

/** Saves the answers as a file, which is how a client sends their version back. */
export function downloadAnswers(config: ClientConfig, answers: Answers): void {
  const blob = new Blob([`${JSON.stringify(answers, null, 2)}\n`], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = answersFileName(config, answers);
  document.body.append(anchor);
  anchor.click();
  anchor.remove();

  URL.revokeObjectURL(url);
}

/** Reads a dropped or chosen file. The caller validates whatever comes back. */
export async function readJsonFile(file: File): Promise<unknown> {
  const text = await file.text();
  return JSON.parse(text) as unknown;
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
