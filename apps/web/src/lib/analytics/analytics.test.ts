/**
 * @vitest-environment jsdom
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CONSENT_COOKIE_NAME } from '@/lib/constants';

import {
  trackArticleScrollDepth,
  trackEventCtaClick,
  trackEventSignupComplete,
  trackSubscribeComplete,
  trackSubscribeStart,
} from './events';
import { trackEventAsync } from './track';
import { ANALYTICS_EVENTS } from './types';

function setConsentCookie(value: string | null): void {
  document.cookie = `${CONSENT_COOKIE_NAME}=; Path=/; Max-Age=0`;
  if (value) {
    document.cookie = `${CONSENT_COOKIE_NAME}=${value}; Path=/`;
  }
}

describe('analytics helpers', () => {
  beforeEach(() => {
    setConsentCookie(null);
    window.dataLayer = [];
    delete (window as { va?: unknown }).va;
  });

  afterEach(() => {
    setConsentCookie(null);
    delete (window as { dataLayer?: unknown }).dataLayer;
  });

  it('trackEventAsync follows a later change to the cookie', () => {
    setConsentCookie('accepted');
    expect(
      trackEventAsync(ANALYTICS_EVENTS.subscribeStart, {
        source: 'blog:test',
      }),
    ).toBe(true);

    setConsentCookie('rejected');
    window.dataLayer = [];

    expect(
      trackEventAsync(ANALYTICS_EVENTS.subscribeStart, {
        source: 'blog:test',
      }),
    ).toBe(false);
    expect(window.dataLayer).toEqual([]);
  });

  it('trackEventAsync no-ops without consent (no dataLayer push)', () => {
    setConsentCookie('rejected');

    const pushed = trackEventAsync(ANALYTICS_EVENTS.subscribeStart, {
      source: 'blog:test',
    });

    expect(pushed).toBe(false);
    expect(window.dataLayer).toEqual([]);
  });

  it('trackEventAsync pushes to dataLayer and va when consent is accepted', () => {
    setConsentCookie('accepted');

    const va = vi.fn();
    (window as { va?: typeof va }).va = va;

    const pushed = trackEventAsync(ANALYTICS_EVENTS.subscribeComplete, {
      source: 'blog:test',
      interest: 'community',
    });

    expect(pushed).toBe(true);
    expect(window.dataLayer).toEqual([
      {
        event: 'subscribe_complete',
        source: 'blog:test',
        interest: 'community',
      },
    ]);
    expect(va).toHaveBeenCalledWith('track', 'subscribe_complete', {
      source: 'blog:test',
      interest: 'community',
    });
  });

  it('typed subscribe helpers omit undefined interest', () => {
    setConsentCookie('accepted');

    trackSubscribeStart({ source: 'blog:slug' });
    trackSubscribeComplete({ source: 'blog:slug', interest: 'learning' });
    trackArticleScrollDepth({ depth: 25 });

    expect(window.dataLayer).toEqual([
      { event: 'subscribe_start', source: 'blog:slug' },
      { event: 'subscribe_complete', source: 'blog:slug', interest: 'learning' },
      { event: 'article_scroll_depth', depth: 25 },
    ]);
  });

  it('typed participation helpers push event_id and source', () => {
    setConsentCookie('accepted');

    trackEventCtaClick({ event_id: 'winter-planting-day', source: 'blog:slug' });
    trackEventSignupComplete({ event_id: 'winter-planting-day', source: 'events-listing' });

    expect(window.dataLayer).toEqual([
      { event: 'event_cta_click', event_id: 'winter-planting-day', source: 'blog:slug' },
      { event: 'event_signup_complete', event_id: 'winter-planting-day', source: 'events-listing' },
    ]);
  });
});
