/** Human-readable track names. GA4 tags translate these; the site does not. */
export const ANALYTICS_EVENTS = {
  newsletterSubscriptionStarted: 'Newsletter Subscription Started',
  newsletterSubscribed: 'Newsletter Subscribed',
  eventSelected: 'Event Selected',
  eventSignupCompleted: 'Event Signup Completed',
  articleScrolled: 'Article Scrolled',
  contactFormViewed: 'Contact Form Viewed',
  contactFormStarted: 'Contact Form Started',
  contactFormSubmitted: 'Contact Form Submitted',
  contactFormCompleted: 'Contact Form Completed',
  contactFormFailed: 'Contact Form Failed',
} as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

export type ScrollDepth = 25 | 50 | 75 | 100;

export const SCROLL_DEPTH_THRESHOLDS: readonly ScrollDepth[] = [25, 50, 75, 100];

/** Attribution when the call to action is on the events listing page. */
export const EVENTS_LISTING_SOURCE = 'events-listing';

export type SubscribeInterest =
  'restoration' | 'regenerative-farming' | 'community' | 'produce' | 'learning';

export type InquiryType = 'general' | 'tours' | 'volunteer' | 'partnership';

export type ContactErrorCode = 'invalid' | 'rate_limited' | 'unavailable' | 'request_failed';

export type NewsletterProperties = {
  source: string;
  interest?: SubscribeInterest;
};

export type EventProperties = {
  event_id: string;
  source: string;
};

export type ArticleScrolledProperties = {
  percent_scrolled: ScrollDepth;
};

export type ContactFormProperties = {
  form_id: 'contact';
  inquiry_type?: InquiryType;
  error_code?: ContactErrorCode;
};

export type AnalyticsProperties =
  NewsletterProperties | EventProperties | ArticleScrolledProperties | ContactFormProperties;

export type DataLayerTrack = {
  event: AnalyticsEventName;
  properties: AnalyticsProperties;
};
