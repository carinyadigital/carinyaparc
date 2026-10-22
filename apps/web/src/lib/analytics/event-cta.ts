import { trackEventSelected } from './events';
import { EVENTS_LISTING_SOURCE } from './types';

const bound = new WeakSet<HTMLElement>();

/**
 * Listen for clicks on `[data-event-cta]` and record Event Selected.
 * `data-event-id` is the event slug. `data-event-source` is the placement.
 * A marker with no source is the events listing. A marker with no event id is ignored.
 * A second bind on the same element does not record the click twice.
 */
export function bindEventCtas(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>('[data-event-cta]').forEach((element) => {
    if (bound.has(element)) {
      return;
    }

    bound.add(element);
    element.addEventListener('click', () => {
      const eventId = element.dataset.eventId?.trim();
      if (!eventId) {
        return;
      }

      const source = element.dataset.eventSource?.trim() || EVENTS_LISTING_SOURCE;
      trackEventSelected({ event_id: eventId, source });
    });
  });
}
