/** Read-side helpers over the `events` collection. Upcoming = starts after build time. */
import { getCollection, type CollectionEntry } from 'astro:content';

import { isPublished } from './posts';

export type EventEntry = CollectionEntry<'events'>;

let publishedEvents: Promise<EventEntry[]> | undefined;

/** Published events, loaded once per build (several pages ask for the next event). */
function getPublishedEvents(): Promise<EventEntry[]> {
  publishedEvents ??= getCollection('events', isPublished);
  return publishedEvents;
}

export async function getUpcomingEvents(now: Date = new Date()): Promise<EventEntry[]> {
  const events = await getPublishedEvents();
  return events
    .filter((event) => event.data.startsAt.getTime() >= now.getTime())
    .sort((a, b) => a.data.startsAt.getTime() - b.data.startsAt.getTime());
}
