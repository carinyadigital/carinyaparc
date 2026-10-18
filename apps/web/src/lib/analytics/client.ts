import { getConsent, onConsentChange } from '@/lib/consent/client';

import { loadGtm, pushToDataLayer } from './gtm';
import type { AnalyticsEventName, AnalyticsProperties } from './types';
import { loadVercel, trackVercel } from './vercel';

let analyticsLoaded = false;

/** Load each analytics vendor once on this page, however many times consent is found or granted. */
function loadAnalytics(): void {
  if (analyticsLoaded) {
    return;
  }

  analyticsLoaded = true;
  loadGtm();
  loadVercel();
}

/** Start analytics on this page. Loads immediately when consent was already given, and when the visitor accepts, without a reload. */
export function initAnalytics(): void {
  if (getConsent() === 'accepted') {
    loadAnalytics();
  }

  onConsentChange((choice) => {
    if (choice === 'accepted') {
      loadAnalytics();
    }
  });
}

/** Send one event to each analytics vendor that is present. Does nothing unless the visitor has accepted. */
export function track(event: AnalyticsEventName, properties: AnalyticsProperties): void {
  if (getConsent() !== 'accepted') {
    return;
  }

  pushToDataLayer(event, properties);
  trackVercel(event, properties);
}

export { bindPageArticleScrollDepth } from './scroll-depth';
export {
  trackArticleScrollDepth,
  trackArticleScrolled,
  trackContactFormCompleted,
  trackContactFormFailed,
  trackContactFormStarted,
  trackContactFormSubmitted,
  trackContactFormViewed,
  trackEventSelected,
  trackEventSignupComplete,
  trackEventSignupCompleted,
  trackNewsletterSubscribed,
  trackNewsletterSubscriptionStarted,
} from './events';
export {
  ANALYTICS_EVENTS,
  EVENTS_LISTING_SOURCE,
  SCROLL_DEPTH_THRESHOLDS,
  type AnalyticsEventName,
  type AnalyticsProperties,
  type ArticleScrolledProperties,
  type ContactErrorCode,
  type ContactFormProperties,
  type DataLayerTrack,
  type EventProperties,
  type InquiryType,
  type NewsletterProperties,
  type ScrollDepth,
  type SubscribeInterest,
} from './types';
