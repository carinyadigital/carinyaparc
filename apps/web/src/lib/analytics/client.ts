import { getConsent, onConsentChange } from '@/lib/consent/client';

import { loadGtm } from './gtm';
import { loadVercel } from './vercel';

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

export {
  trackArticleScrollDepth,
  trackEventCtaClick,
  trackEventSignupComplete,
  trackSubscribeComplete,
  trackSubscribeStart,
} from './events';
export { trackEvent, trackEventAsync } from './track';
export {
  ANALYTICS_EVENTS,
  EVENTS_LISTING_SOURCE,
  SCROLL_DEPTH_THRESHOLDS,
  type AnalyticsEventName,
  type AnalyticsEventParams,
  type ArticleScrollDepthParams,
  type EventCtaClickParams,
  type EventSignupCompleteParams,
  type ScrollDepth,
  type SubscribeFunnelParams,
} from './types';
