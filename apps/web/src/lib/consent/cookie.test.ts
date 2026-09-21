/**
 * @vitest-environment jsdom
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CONSENT_COOKIE_NAME } from '@/lib/constants';

import { readConsentCookie, writeConsentCookie } from './cookie';

describe('consent cookie', () => {
  beforeEach(() => {
    document.cookie = `${CONSENT_COOKIE_NAME}=; Path=/; Max-Age=0`;
  });

  afterEach(() => {
    document.cookie = `${CONSENT_COOKIE_NAME}=; Path=/; Max-Age=0`;
    vi.unstubAllEnvs();
  });

  it('returns null when the cookie is missing', () => {
    expect(readConsentCookie()).toBeNull();
  });

  it('round-trips accepted and rejected values', () => {
    writeConsentCookie('accepted');
    expect(readConsentCookie()).toBe('accepted');

    writeConsentCookie('rejected');
    expect(readConsentCookie()).toBe('rejected');
  });

  it('treats unknown cookie values as unset', () => {
    document.cookie = `${CONSENT_COOKIE_NAME}=maybe; Path=/`;
    expect(readConsentCookie()).toBeNull();
  });
});
