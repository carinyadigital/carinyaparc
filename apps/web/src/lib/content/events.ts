/** Read-side helpers over the `events` collection. Upcoming = starts after build time. */
import { getCollection, type CollectionEntry } from 'astro:content';

import { isPublished } from './posts';

export type EventEntry = CollectionEntry<'events'>;

export async function getUpcomingEvents(now: Date = new Date()): Promise<EventEntry[]> {
  const events = await getCollection('events', isPublished);
  return events
    .filter((event) => event.data.startsAt.getTime() >= now.getTime())
    .sort((a, b) => a.data.startsAt.getTime() - b.data.startsAt.getTime());
}
