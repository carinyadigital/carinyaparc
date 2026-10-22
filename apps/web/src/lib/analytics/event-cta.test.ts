/**
 * @vitest-environment jsdom
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { CONSENT_COOKIE_NAME } from '@/lib/constants';

import { bindEventCtas } from './event-cta';

function setConsentCookie(value: string | null): void {
  document.cookie = `${CONSENT_COOKIE_NAME}=; Path=/; Max-Age=0`;
  if (value) {
    document.cookie = `${CONSENT_COOKIE_NAME}=${value}; Path=/`;
  }
}

function click(selector: string): void {
  document.querySelector(selector)?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
}

describe('event call to action', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    setConsentCookie(null);
    window.dataLayer = [];
  });

  afterEach(() => {
    document.body.innerHTML = '';
    setConsentCookie(null);
    delete window.dataLayer;
  });

  it('pushes Event Selected when consent is accepted', () => {
    setConsentCookie('accepted');
    document.body.innerHTML = `
      <a data-event-cta data-event-id="winter-planting-day" data-event-source="blog:first-planting-day">
        Sign up for this event
      </a>
      <a href="/get-involved/events/">All upcoming events</a>
    `;

    bindEventCtas();
    click('[data-event-cta]');

    expect(window.dataLayer).toEqual([
      { properties: null },
      {
        event: 'Event Selected',
        properties: { event_id: 'winter-planting-day', source: 'blog:first-planting-day' },
      },
    ]);

    click('a[href="/get-involved/events/"]');
    expect(window.dataLayer).toHaveLength(2);
  });

  it('does not push when consent is rejected', () => {
    setConsentCookie('rejected');
    document.body.innerHTML = `
      <a data-event-cta data-event-id="winter-planting-day" data-event-source="events-listing">
        Sign up
      </a>
    `;

    bindEventCtas();
    click('[data-event-cta]');

    expect(window.dataLayer).toEqual([]);
  });

  it('does not push when consent is missing', () => {
    document.body.innerHTML = `
      <a data-event-cta data-event-id="winter-planting-day" data-event-source="events-listing">
        Full — join the waitlist
      </a>
    `;

    bindEventCtas();
    click('[data-event-cta]');

    expect(window.dataLayer).toEqual([]);
  });

  it('uses the events listing when a marker has no source', () => {
    setConsentCookie('accepted');
    document.body.innerHTML = `
      <a data-event-cta data-event-id="open-day">Sign up</a>
    `;

    bindEventCtas();
    click('[data-event-cta]');

    expect(window.dataLayer).toEqual([
      { properties: null },
      {
        event: 'Event Selected',
        properties: { event_id: 'open-day', source: 'events-listing' },
      },
    ]);
  });

  it('ignores a marker with no event id', () => {
    setConsentCookie('accepted');
    document.body.innerHTML = `<a data-event-cta data-event-source="events-listing">Sign up</a>`;

    bindEventCtas();
    click('[data-event-cta]');

    expect(window.dataLayer).toEqual([]);
  });

  it('records one click once when the same marker is bound twice', () => {
    setConsentCookie('accepted');
    document.body.innerHTML = `
      <a data-event-cta data-event-id="open-day" data-event-source="events-listing">Sign up</a>
    `;

    bindEventCtas();
    bindEventCtas();
    click('[data-event-cta]');

    expect(window.dataLayer).toEqual([
      { properties: null },
      {
        event: 'Event Selected',
        properties: { event_id: 'open-day', source: 'events-listing' },
      },
    ]);
  });
});
