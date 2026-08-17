const DAY = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long' });
const TIME = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' });

/** e.g. "17 August at 14:20". Used by the saved note and the sent note. */
export function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'an unknown time';
  return `${DAY.format(date)} at ${TIME.format(date)}`;
}

/** e.g. "14:20", for the quiet saved indicator. */
export function formatTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return TIME.format(date);
}
