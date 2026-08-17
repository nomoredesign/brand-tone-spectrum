import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import { AnswersSchema, type Answers } from '@shared/schema';

/**
 * Answers travel in the URL so a person can send a filled in version to someone
 * else without a server. lz-string's encoded form is already safe to drop
 * straight into a URL, so nothing is escaped twice.
 */
export function encodeAnswers(answers: Answers): string {
  return compressToEncodedURIComponent(JSON.stringify(answers));
}

/**
 * Anything at all can arrive in a link, so a failure here is expected rather
 * than exceptional and is reported as `undefined` instead of thrown.
 */
export function decodeAnswers(token: string): Answers | undefined {
  if (token.length === 0) return undefined;

  let json: string | null;
  try {
    json = decompressFromEncodedURIComponent(token);
  } catch {
    return undefined;
  }
  if (json === null || json.length === 0) return undefined;

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return undefined;
  }

  const result = AnswersSchema.safeParse(parsed);
  return result.success ? result.data : undefined;
}
