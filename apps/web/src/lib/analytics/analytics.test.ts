/**
 * @vitest-environment jsdom
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CONSENT_COOKIE_NAME } from '@/lib/constants';

import { track } from './client';
import {
  trackArticleScrollDepth,
  trackArticleScrolled,
  trackContactFormFailed,
  trackContactFormViewed,
  trackEventSelected,
  trackEventSignupComplete,
  trackEventSignupCompleted,
  trackNewsletterSubscribed,
  trackNewsletterSubscriptionStarted,
} from './events';
import { ANALYTICS_EVENTS } from './types';

function setConsentCookie(value: string | null): void {
  document.cookie = `${CONSENT_COOKIE_NAME}=; Path=/; Max-Age=0`;
  if (value) {
    document.cookie = `${CONSENT_COOKIE_NAME}=${value}; Path=/`;
  }
}

const RETIRED_EVENT_NAMES = [
  'subscribe_start',
  'subscribe_complete',
  'event_cta_click',
  'event_signup_complete',
  'article_scroll_depth',
  'contact_form_success',
] as const;

describe('analytics helpers', () => {
  beforeEach(() => {
    setConsentCookie(null);
    window.dataLayer = [];
    delete (window as { va?: unknown }).va;
  });

  afterEach(() => {
    setConsentCookie(null);
    delete (window as { dataLayer?: unknown }).dataLayer;
    delete (window as { va?: unknown }).va;
  });

  it('exports the human-readable catalog and not the retired names', () => {
    expect(Object.values(ANALYTICS_EVENTS)).toEqual([
      'Newsletter Subscription Started',
      'Newsletter Subscribed',
      'Event Selected',
      'Event Signup Completed',
      'Article Scrolled',
      'Contact Form Viewed',
      'Contact Form Started',
      'Contact Form Submitted',
      'Contact Form Completed',
      'Contact Form Failed',
    ]);

    for (const retired of RETIRED_EVENT_NAMES) {
      expect(Object.values(ANALYTICS_EVENTS)).not.toContain(retired);
    }
  });

  it('pushes a nested payload, clears the previous properties, and forwards the same object', () => {
    setConsentCookie('accepted');
    window.dataLayer = [{ event: 'earlier', properties: { interest: 'produce' } }];

    const properties = { source: 'blog:test', interest: 'community' as const };
    const va = vi.fn();
    (window as { va?: typeof va }).va = va;

    track(ANALYTICS_EVENTS.newsletterSubscribed, properties);

    expect(window.dataLayer).toEqual([
      { event: 'earlier', properties: { interest: 'produce' } },
      { properties: null },
      { event: 'Newsletter Subscribed', properties },
    ]);
    expect(Object.keys(window.dataLayer?.[2] ?? {})).toEqual(['event', 'properties']);
    expect(va).toHaveBeenCalledTimes(1);
    expect(va).toHaveBeenCalledWith('track', 'Newsletter Subscribed', properties);
    expect(va.mock.calls[0]?.[2]).toBe(properties);
    expect(window.dataLayer?.[2]?.properties).toBe(properties);
  });

  it('does not leave interest on the following event', () => {
    setConsentCookie('accepted');

    trackNewsletterSubscribed({ source: 'blog:slug', interest: 'learning' });
    track(ANALYTICS_EVENTS.articleScrolled, { percent_scrolled: 50 });

    expect(window.dataLayer).toEqual([
      { properties: null },
      {
        event: 'Newsletter Subscribed',
        properties: { source: 'blog:slug', interest: 'learning' },
      },
      { properties: null },
      { event: 'Article Scrolled', properties: { percent_scrolled: 50 } },
    ]);
    expect(window.dataLayer?.[3]?.properties).not.toHaveProperty('interest');
  });

  it('leaves the data layer unchanged when consent is rejected', () => {
    setConsentCookie('rejected');
    window.dataLayer = [{ event: 'earlier' }];
    const va = vi.fn();
    (window as { va?: typeof va }).va = va;

    track(ANALYTICS_EVENTS.newsletterSubscribed, { source: 'blog:test', interest: 'community' });

    expect(window.dataLayer).toEqual([{ event: 'earlier' }]);
    expect(va).not.toHaveBeenCalled();
  });

  it('leaves the data layer unchanged when consent is missing', () => {
    const va = vi.fn();
    (window as { va?: typeof va }).va = va;

    track(ANALYTICS_EVENTS.newsletterSubscriptionStarted, { source: 'blog:test' });

    expect(window.dataLayer).toEqual([]);
    expect(va).not.toHaveBeenCalled();
  });

  it('follows a later change to the cookie', () => {
    setConsentCookie('accepted');
    track(ANALYTICS_EVENTS.newsletterSubscriptionStarted, { source: 'blog:test' });
    expect(window.dataLayer).toEqual([
      { properties: null },
      { event: 'Newsletter Subscription Started', properties: { source: 'blog:test' } },
    ]);

    setConsentCookie('rejected');
    expect(window.dataLayer).toHaveLength(2);
    track(ANALYTICS_EVENTS.newsletterSubscriptionStarted, { source: 'blog:test' });
    expect(window.dataLayer).toHaveLength(2);
  });

  it('skips the data layer when it is absent and still calls Vercel Analytics', () => {
    setConsentCookie('accepted');
    delete (window as { dataLayer?: unknown }).dataLayer;
    const va = vi.fn();
    (window as { va?: typeof va }).va = va;
    const properties = { source: 'blog:test' };

    track(ANALYTICS_EVENTS.newsletterSubscriptionStarted, properties);

    expect(window.dataLayer).toBeUndefined();
    expect(va).toHaveBeenCalledWith('track', 'Newsletter Subscription Started', properties);
  });

  it('skips Vercel Analytics when va is absent and still pushes the data layer', () => {
    setConsentCookie('accepted');

    track(ANALYTICS_EVENTS.newsletterSubscribed, { source: 'stay', interest: 'produce' });

    expect(window.dataLayer).toEqual([
      { properties: null },
      {
        event: 'Newsletter Subscribed',
        properties: { source: 'stay', interest: 'produce' },
      },
    ]);
  });

  it('omits interest when a newsletter start has none', () => {
    setConsentCookie('accepted');

    trackNewsletterSubscriptionStarted({ source: 'blog:slug', interest: undefined });

    expect(window.dataLayer).toEqual([
      { properties: null },
      {
        event: 'Newsletter Subscription Started',
        properties: { source: 'blog:slug' },
      },
    ]);
    expect(window.dataLayer?.[1]?.properties).not.toHaveProperty('interest');
  });

  it('records each scroll threshold as percent_scrolled', () => {
    setConsentCookie('accepted');

    trackArticleScrolled({ percent_scrolled: 25 });
    trackArticleScrolled({ percent_scrolled: 50 });
    trackArticleScrolled({ percent_scrolled: 75 });
    trackArticleScrolled({ percent_scrolled: 100 });
    trackArticleScrollDepth({ depth: 25 });

    expect(window.dataLayer).toEqual([
      { properties: null },
      { event: 'Article Scrolled', properties: { percent_scrolled: 25 } },
      { properties: null },
      { event: 'Article Scrolled', properties: { percent_scrolled: 50 } },
      { properties: null },
      { event: 'Article Scrolled', properties: { percent_scrolled: 75 } },
      { properties: null },
      { event: 'Article Scrolled', properties: { percent_scrolled: 100 } },
      { properties: null },
      { event: 'Article Scrolled', properties: { percent_scrolled: 25 } },
    ]);
  });

  it('records event id as a string with the source', () => {
    setConsentCookie('accepted');

    trackEventSelected({ event_id: 'winter-planting-day', source: 'blog:slug' });
    trackEventSignupCompleted({ event_id: 'winter-planting-day', source: 'events-listing' });
    trackEventSignupComplete({ event_id: 'winter-planting-day', source: 'events-listing' });

    expect(window.dataLayer).toEqual([
      { properties: null },
      {
        event: 'Event Selected',
        properties: { event_id: 'winter-planting-day', source: 'blog:slug' },
      },
      { properties: null },
      {
        event: 'Event Signup Completed',
        properties: { event_id: 'winter-planting-day', source: 'events-listing' },
      },
      { properties: null },
      {
        event: 'Event Signup Completed',
        properties: { event_id: 'winter-planting-day', source: 'events-listing' },
      },
    ]);
  });

  it('omits unset contact fields', () => {
    setConsentCookie('accepted');

    trackContactFormViewed({ form_id: 'contact', inquiry_type: undefined, error_code: undefined });
    trackContactFormFailed({ form_id: 'contact', error_code: 'rate_limited' });

    expect(window.dataLayer).toEqual([
      { properties: null },
      { event: 'Contact Form Viewed', properties: { form_id: 'contact' } },
      { properties: null },
      {
        event: 'Contact Form Failed',
        properties: { form_id: 'contact', error_code: 'rate_limited' },
      },
    ]);
    expect(window.dataLayer?.[1]?.properties).not.toHaveProperty('inquiry_type');
    expect(window.dataLayer?.[1]?.properties).not.toHaveProperty('error_code');
    expect(window.dataLayer?.[3]?.properties).not.toHaveProperty('inquiry_type');
  });
});
