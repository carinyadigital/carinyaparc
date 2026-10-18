import {
  ANALYTICS_EVENTS,
  type ArticleScrolledProperties,
  type ContactFormProperties,
  type EventProperties,
  type NewsletterProperties,
  type ScrollDepth,
} from '@/lib/analytics/types';

import { track } from './client';

function omitUndefined<T extends object>(properties: T): T {
  return Object.fromEntries(
    Object.entries(properties).filter(([, value]) => value !== undefined),
  ) as T;
}

/** Visitor focused an in-flow subscribe form. */
export function trackNewsletterSubscriptionStarted(properties: NewsletterProperties): void {
  track(ANALYTICS_EVENTS.newsletterSubscriptionStarted, omitUndefined(properties));
}

/** Visitor finished an in-flow subscribe. */
export function trackNewsletterSubscribed(properties: NewsletterProperties): void {
  track(ANALYTICS_EVENTS.newsletterSubscribed, omitUndefined(properties));
}

/** Visitor chose an event from a listing or a call to action. */
export function trackEventSelected(properties: EventProperties): void {
  track(ANALYTICS_EVENTS.eventSelected, omitUndefined(properties));
}

/** Visitor completed an on-site event signup. */
export function trackEventSignupCompleted(properties: EventProperties): void {
  track(ANALYTICS_EVENTS.eventSignupCompleted, omitUndefined(properties));
}

/** Reader passed an article depth threshold. */
export function trackArticleScrolled(properties: ArticleScrolledProperties): void {
  track(ANALYTICS_EVENTS.articleScrolled, omitUndefined(properties));
}

/** Contact form came into view. */
export function trackContactFormViewed(properties: ContactFormProperties): void {
  track(ANALYTICS_EVENTS.contactFormViewed, omitUndefined(properties));
}

/** Visitor started filling in the contact form. */
export function trackContactFormStarted(properties: ContactFormProperties): void {
  track(ANALYTICS_EVENTS.contactFormStarted, omitUndefined(properties));
}

/** Visitor sent the contact form. */
export function trackContactFormSubmitted(properties: ContactFormProperties): void {
  track(ANALYTICS_EVENTS.contactFormSubmitted, omitUndefined(properties));
}

/** Contact form was accepted. */
export function trackContactFormCompleted(properties: ContactFormProperties): void {
  track(ANALYTICS_EVENTS.contactFormCompleted, omitUndefined(properties));
}

/** Contact form was sent and did not succeed. */
export function trackContactFormFailed(properties: ContactFormProperties): void {
  track(ANALYTICS_EVENTS.contactFormFailed, omitUndefined(properties));
}

/**
 * The page scroll binder still passes a threshold as `depth`.
 * Record that threshold as `percent_scrolled`.
 */
export function trackArticleScrollDepth(params: { depth: ScrollDepth }): void {
  trackArticleScrolled({ percent_scrolled: params.depth });
}

/**
 * On-site signup still calls this name with an event id and a source.
 * Forward those fields to the catalog helper.
 */
export function trackEventSignupComplete(params: { event_id: string; source: string }): void {
  trackEventSignupCompleted(params);
}
