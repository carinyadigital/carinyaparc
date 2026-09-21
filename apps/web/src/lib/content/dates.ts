/** Date helpers shared by content pages. Australian English, UTC so builds are deterministic. */

const LONG: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
const SHORT: Intl.DateTimeFormatOptions = { month: 'short', year: 'numeric' };

export function formatContentDate(date: Date): string {
  return date.toLocaleDateString('en-AU', { ...LONG, timeZone: 'UTC' });
}

export function formatJournalListDate(date: Date): string {
  return date.toLocaleDateString('en-AU', { ...SHORT, timeZone: 'UTC' });
}

export function formatEventDateTime(date: Date): string {
  return date.toLocaleString('en-AU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Australia/Sydney',
  });
}

export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function estimateReadTimeMinutes(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

export function formatJournalMeta(date: Date, text: string): string {
  return `${formatJournalListDate(date)} · ${estimateReadTimeMinutes(text)} min`;
}
