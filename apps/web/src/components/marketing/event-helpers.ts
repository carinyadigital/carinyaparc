/** Presentation helpers for event cards (port of features/events/components/EventCard.tsx). */
import type { EventEntry } from '@/lib/content/events';
import { eventsListingUrl } from '@/lib/urls';

export function formatEventDate(date: Date): string {
  return new Intl.DateTimeFormat('en-AU', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Australia/Sydney',
  }).format(date);
}

/**
 * Safe href for an event's signup link: the validated external `signupTarget` when set,
 * otherwise the on-site listing anchor.
 */
export function eventSignupHref(event: EventEntry): string {
  const fallback = `${eventsListingUrl()}#event-${event.id}`;
  const target = event.data.signupTarget?.trim();
  if (!target) return fallback;

  try {
    const parsed = new URL(target);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return fallback;
    return target;
  } catch {
    return fallback;
  }
}

export function isExternalEventHref(href: string): boolean {
  return /^https?:\/\//i.test(href);
}
