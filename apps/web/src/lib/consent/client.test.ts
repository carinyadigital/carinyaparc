/**
 * @vitest-environment jsdom
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CONSENT_COOKIE_NAME } from '@/lib/constants';

import { getConsent, onConsentChange, setConsent } from './client';
import type { ConsentChoice } from './types';

describe('consent', () => {
  const unsubscribe: Array<() => void> = [];

  beforeEach(() => {
    document.cookie = `${CONSENT_COOKIE_NAME}=; Path=/; Max-Age=0`;
  });

  afterEach(() => {
    for (const stop of unsubscribe) {
      stop();
    }
    unsubscribe.length = 0;
    document.cookie = `${CONSENT_COOKIE_NAME}=; Path=/; Max-Age=0`;
    vi.unstubAllEnvs();
  });

  it('returns null when the cookie is missing', () => {
    expect(getConsent()).toBeNull();
  });

  it('round-trips accepted and rejected values', () => {
    setConsent('accepted');
    expect(getConsent()).toBe('accepted');

    setConsent('rejected');
    expect(getConsent()).toBe('rejected');
  });

  it('treats unknown cookie values as unset', () => {
    document.cookie = `${CONSENT_COOKIE_NAME}=maybe; Path=/`;
    expect(getConsent()).toBeNull();
  });

  it('reads the cookie on every call', () => {
    setConsent('accepted');
    document.cookie = `${CONSENT_COOKIE_NAME}=rejected; Path=/`;
    expect(getConsent()).toBe('rejected');
  });

  it('notifies listeners when a choice is stored and stops after unsubscribe', () => {
    const heard: ConsentChoice[] = [];
    const stop = onConsentChange((choice) => {
      heard.push(choice);
    });

    setConsent('accepted');
    setConsent('rejected');
    stop();
    setConsent('accepted');

    expect(heard).toEqual(['accepted', 'rejected']);
    expect(getConsent()).toBe('accepted');
  });

  it('notifies every listener', () => {
    const first = vi.fn();
    const second = vi.fn();
    unsubscribe.push(onConsentChange(first), onConsentChange(second));

    setConsent('rejected');

    expect(first).toHaveBeenCalledWith('rejected');
    expect(second).toHaveBeenCalledWith('rejected');
  });
});
