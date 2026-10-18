/**
 * @vitest-environment jsdom
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CONSENT_COOKIE_NAME } from '@/lib/constants';

vi.mock('@vercel/analytics', () => ({
  inject: vi.fn(),
}));

vi.mock('@vercel/speed-insights', () => ({
  injectSpeedInsights: vi.fn(),
}));

function clearConsentCookie(): void {
  document.cookie = `${CONSENT_COOKIE_NAME}=; Path=/; Max-Age=0`;
}

async function loadAnalyticsClient() {
  vi.resetModules();
  const consent = await import('@/lib/consent/client');
  const analytics = await import('./client');
  const vercelAnalytics = await import('@vercel/analytics');
  const speedInsights = await import('@vercel/speed-insights');

  return {
    initAnalytics: analytics.initAnalytics,
    setConsent: consent.setConsent,
    inject: vercelAnalytics.inject as ReturnType<typeof vi.fn>,
    injectSpeedInsights: speedInsights.injectSpeedInsights as ReturnType<typeof vi.fn>,
  };
}

describe('initAnalytics', () => {
  beforeEach(() => {
    clearConsentCookie();
    document.getElementById('gtm-script')?.remove();
    delete (window as { dataLayer?: unknown }).dataLayer;
  });

  afterEach(() => {
    clearConsentCookie();
    document.getElementById('gtm-script')?.remove();
    vi.unstubAllEnvs();
  });

  it('loads nothing when no consent is stored', async () => {
    vi.stubEnv('PUBLIC_GTM_ID', 'GTM-TEST123');
    const { initAnalytics, inject, injectSpeedInsights } = await loadAnalyticsClient();

    initAnalytics();
    await Promise.resolve();

    expect(document.getElementById('gtm-script')).toBeNull();
    expect(window.dataLayer).toBeUndefined();
    expect(inject).not.toHaveBeenCalled();
    expect(injectSpeedInsights).not.toHaveBeenCalled();
  });

  it('loads nothing when consent was rejected', async () => {
    vi.stubEnv('PUBLIC_GTM_ID', 'GTM-TEST123');
    document.cookie = `${CONSENT_COOKIE_NAME}=rejected; Path=/`;
    const { initAnalytics, inject } = await loadAnalyticsClient();

    initAnalytics();
    await Promise.resolve();

    expect(document.getElementById('gtm-script')).toBeNull();
    expect(inject).not.toHaveBeenCalled();
  });

  it('loads GTM and Vercel when consent is already accepted', async () => {
    vi.stubEnv('PUBLIC_GTM_ID', 'GTM-TEST123');
    document.cookie = `${CONSENT_COOKIE_NAME}=accepted; Path=/`;
    const { initAnalytics, inject, injectSpeedInsights } = await loadAnalyticsClient();

    initAnalytics();

    expect(document.getElementById('gtm-script')?.getAttribute('src')).toContain('GTM-TEST123');
    expect(window.dataLayer?.[0]).toMatchObject({ event: 'gtm.js' });
    await vi.waitFor(() => {
      expect(inject).toHaveBeenCalledOnce();
      expect(injectSpeedInsights).toHaveBeenCalledOnce();
    });
  });

  it('loads on this page when the visitor accepts', async () => {
    vi.stubEnv('PUBLIC_GTM_ID', 'GTM-TEST123');
    const { initAnalytics, setConsent, inject, injectSpeedInsights } = await loadAnalyticsClient();

    initAnalytics();
    expect(document.getElementById('gtm-script')).toBeNull();

    setConsent('accepted');

    expect(document.getElementById('gtm-script')?.getAttribute('src')).toContain('GTM-TEST123');
    await vi.waitFor(() => {
      expect(inject).toHaveBeenCalledOnce();
      expect(injectSpeedInsights).toHaveBeenCalledOnce();
    });
  });

  it('skips GTM when no container id is set and still loads Vercel', async () => {
    vi.stubEnv('PUBLIC_GTM_ID', '');
    document.cookie = `${CONSENT_COOKIE_NAME}=accepted; Path=/`;
    const { initAnalytics, inject } = await loadAnalyticsClient();

    initAnalytics();

    expect(document.getElementById('gtm-script')).toBeNull();
    await vi.waitFor(() => {
      expect(inject).toHaveBeenCalledOnce();
    });
  });

  it('loads once however many times consent is granted', async () => {
    vi.stubEnv('PUBLIC_GTM_ID', 'GTM-TEST123');
    const { initAnalytics, setConsent, inject } = await loadAnalyticsClient();

    initAnalytics();
    initAnalytics();
    setConsent('accepted');
    setConsent('accepted');

    expect(document.querySelectorAll('#gtm-script')).toHaveLength(1);
    await vi.waitFor(() => {
      expect(inject).toHaveBeenCalledOnce();
    });
  });
});
