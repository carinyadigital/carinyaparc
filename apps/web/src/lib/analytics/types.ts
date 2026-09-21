/** Canonical analytics event names for blog and participation funnels. */
export const ANALYTICS_EVENTS = {
  subscribeStart: 'subscribe_start',
  subscribeComplete: 'subscribe_complete',
  eventCtaClick: 'event_cta_click',
  eventSignupComplete: 'event_signup_complete',
  articleScrollDepth: 'article_scroll_depth',
} as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

export type ScrollDepth = 25 | 50 | 75 | 100;

export const SCROLL_DEPTH_THRESHOLDS: readonly ScrollDepth[] = [25, 50, 75, 100];

export type SubscribeFunnelParams = {
  source: string;
  interest?: string;
};

/** Attribution when the CTA is on the events listing page. */
export const EVENTS_LISTING_SOURCE = 'events-listing';

export type EventCtaClickParams = {
  event_id: string | number;
  source: string;
};

export type EventSignupCompleteParams = {
  event_id: string | number;
  source: string;
};

export type ArticleScrollDepthParams = {
  depth: ScrollDepth;
};

export type AnalyticsEventParams =
  | SubscribeFunnelParams
  | EventCtaClickParams
  | EventSignupCompleteParams
  | ArticleScrollDepthParams;
