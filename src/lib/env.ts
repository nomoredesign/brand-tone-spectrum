/**
 * The submission endpoint is the one piece of configuration that decides whether
 * the send button and the inbox exist at all. It is read once, here, so no other
 * module has to reason about empty strings or trailing slashes.
 */
function readEndpoint(): string | undefined {
  const raw = import.meta.env.VITE_SUBMIT_ENDPOINT;
  if (typeof raw !== 'string') return undefined;

  const trimmed = raw.trim().replace(/\/+$/, '');
  return trimmed.length > 0 ? trimmed : undefined;
}

export const submitEndpoint = readEndpoint();

export const isSubmitConfigured = submitEndpoint !== undefined;
