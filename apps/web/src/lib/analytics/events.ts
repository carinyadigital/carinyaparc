import {
  ANALYTICS_EVENTS,
  type ArticleScrollDepthParams,
  type EventCtaClickParams,
  type EventSignupCompleteParams,
  type SubscribeFunnelParams,
} from '@/lib/analytics/types';

import { track } from './client';

function omitUndefined(params: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined));
}

/** First interaction with an in-flow subscribe form. */
export function trackSubscribeStart(params: SubscribeFunnelParams): void {
  track(ANALYTICS_EVENTS.subscribeStart, omitUndefined({ ...params }));
}

/** Successful subscribe API response. */
export function trackSubscribeComplete(params: SubscribeFunnelParams): void {
  track(ANALYTICS_EVENTS.subscribeComplete, omitUndefined({ ...params }));
}

/** In-article get-involved CTA click. */
export function trackEventCtaClick(params: EventCtaClickParams): void {
  track(ANALYTICS_EVENTS.eventCtaClick, { ...params });
}

/** Successful event signup. */
export function trackEventSignupComplete(params: EventSignupCompleteParams): void {
  track(ANALYTICS_EVENTS.eventSignupComplete, { ...params });
}

/** Article scroll depth threshold (25 / 50 / 75 / 100). */
export function trackArticleScrollDepth(params: ArticleScrollDepthParams): void {
  track(ANALYTICS_EVENTS.articleScrollDepth, { depth: params.depth });
}
